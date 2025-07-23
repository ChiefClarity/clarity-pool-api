import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { WeatherData, WeatherForecast } from './interfaces/weather.interface';
import { EnvironmentData } from '../reports/interfaces/report.interface';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(
    private httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.apiKey = process.env.WEATHER_API_KEY || '';
    const weatherEnabled = process.env.WEATHER_ENABLED !== 'false';

    if (!weatherEnabled || this.apiKey === 'disabled') {
      this.logger.warn('Weather service is disabled - using mock data');
      this.apiKey = ''; // Clear API key to force mock data
    } else if (!this.apiKey) {
      this.logger.warn('OpenWeather API key not configured - using mock data');
    }
  }

  async getWeatherData(lat: number, lon: number): Promise<EnvironmentData> {
    try {
      const cacheKey = `weather_${lat}_${lon}`;

      // Check cache first
      const cached = await this.cacheManager.get<EnvironmentData>(cacheKey);
      if (cached) {
        this.logger.log('Returning cached weather data');
        return cached;
      }

      if (!this.apiKey) {
        return this.getMockWeatherData();
      }

      // Fetch current weather and forecast with retry logic
      const weatherData = await this.fetchWithRetry(async () => {
        const [current, forecast] = await Promise.all([
          this.fetchCurrentWeather(lat, lon),
          this.fetchForecast(lat, lon),
        ]);

        return this.transformWeatherData(current, forecast);
      });

      // Cache the result
      await this.cacheManager.set(cacheKey, weatherData);

      return weatherData;
    } catch (error) {
      this.logger.error('Failed to fetch weather data:', error);
      return this.getMockWeatherData();
    }
  }

  private async fetchCurrentWeather(lat: number, lon: number): Promise<any> {
    const url = new URL(`${this.apiUrl}/weather`);
    url.searchParams.append('lat', lat.toString());
    url.searchParams.append('lon', lon.toString());
    url.searchParams.append('appid', this.apiKey);
    url.searchParams.append('units', 'imperial');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Weather API error: ${response.status} - ${JSON.stringify(data)}`,
      );
    }

    return data;
  }

  private async fetchForecast(lat: number, lon: number): Promise<any> {
    const url = new URL(`${this.apiUrl}/forecast`);
    url.searchParams.append('lat', lat.toString());
    url.searchParams.append('lon', lon.toString());
    url.searchParams.append('appid', this.apiKey);
    url.searchParams.append('units', 'imperial');
    url.searchParams.append('cnt', '40');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Weather API error: ${response.status} - ${JSON.stringify(data)}`,
      );
    }

    return data;
  }

  private transformWeatherData(current: any, forecast: any): EnvironmentData {
    // Transform current weather
    const currentTemp = Math.round(current.main.temp);
    const currentConditions = current.weather[0].description;

    // Transform forecast data (group by day)
    const dailyForecasts = this.groupForecastByDay(forecast.list);

    return {
      temperature: currentTemp,
      conditions: currentConditions,
      forecast: dailyForecasts,
    };
  }

  private groupForecastByDay(forecastList: any[]): WeatherForecast[] {
    const dailyMap = new Map<string, any[]>();

    // Group forecasts by date
    forecastList.forEach((item) => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0];

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }

      dailyMap.get(dateKey)!.push(item);
    });

    // Calculate daily averages
    const dailyForecasts: WeatherForecast[] = [];

    dailyMap.forEach((dayItems, dateKey) => {
      const avgTemp = Math.round(
        dayItems.reduce((sum, item) => sum + item.main.temp, 0) /
          dayItems.length,
      );

      // Find most common weather condition
      const conditionCounts = new Map<string, number>();
      dayItems.forEach((item) => {
        const condition = item.weather[0].main;
        conditionCounts.set(
          condition,
          (conditionCounts.get(condition) || 0) + 1,
        );
      });

      let mostCommonCondition = '';
      let maxCount = 0;
      conditionCounts.forEach((count, condition) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonCondition = condition;
        }
      });

      // Calculate precipitation probability
      const maxPrecipitation =
        Math.max(...dayItems.map((item) => item.pop || 0)) * 100;

      dailyForecasts.push({
        date: new Date(dateKey),
        temp: avgTemp,
        conditions: mostCommonCondition,
        precipitation: Math.round(maxPrecipitation),
      });
    });

    // Sort by date and return first 7 days
    return dailyForecasts
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 7);
  }

  private async fetchWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000,
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }

        this.logger.warn(
          `Weather API request failed, retrying... (${i + 1}/${maxRetries})`,
        );
        await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }

    throw new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getMockWeatherData(): EnvironmentData {
    const today = new Date();
    const forecast: WeatherForecast[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      forecast.push({
        date,
        temp: 75 + Math.floor(Math.random() * 20),
        conditions: ['Clear', 'Partly Cloudy', 'Cloudy', 'Rain'][
          Math.floor(Math.random() * 4)
        ],
        precipitation: Math.floor(Math.random() * 30),
      });
    }

    return {
      temperature: 78,
      conditions: 'Partly cloudy',
      forecast,
    };
  }
}

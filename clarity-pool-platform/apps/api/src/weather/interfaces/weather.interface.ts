export interface WeatherData {
  temp: number;
  conditions: string;
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  date: Date;
  temp: number;
  conditions: string;
  precipitation: number;
}

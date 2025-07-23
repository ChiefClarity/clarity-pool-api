import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { WeatherService } from './weather.service';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      ttl: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
    }),
  ],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}

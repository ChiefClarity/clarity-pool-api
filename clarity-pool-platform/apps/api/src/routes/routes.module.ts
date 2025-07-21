import { Module } from '@nestjs/common';
import { RouteIntelligenceService } from './route-intelligence.service';
import { RoutesController } from './routes.controller';
import { BookingModule } from '../booking/booking.module';
import { PoolbrainModule } from '../poolbrain/poolbrain.module';

@Module({
  imports: [BookingModule, PoolbrainModule],
  controllers: [RoutesController],
  providers: [
    RouteIntelligenceService,
    {
      provide: 'CACHE_MANAGER',
      useValue: {
        get: async (key: string) => null,
        set: async (key: string, value: any, ttl?: number) => {},
      },
    },
  ],
})
export class RoutesModule {}
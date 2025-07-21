import { Module, CacheModule } from '@nestjs/common';
import { RoutesController } from './routes.controller';
import { RouteIntelligenceService } from './route-intelligence.service';
import { BookingModule } from '../booking/booking.module';
import { PoolbrainModule } from '../poolbrain/poolbrain.module';

@Module({
  imports: [
    BookingModule,
    PoolbrainModule,
    CacheModule.register({
      ttl: 3600, // 1 hour default TTL
    }),
  ],
  controllers: [RoutesController],
  providers: [RouteIntelligenceService],
  exports: [RouteIntelligenceService],
})
export class RoutesModule {}
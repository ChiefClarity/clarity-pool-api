import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PoolbrainModule } from '../poolbrain/poolbrain.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PoolbrainModule, EmailModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
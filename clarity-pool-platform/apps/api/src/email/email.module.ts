import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { BookingEmailTemplate } from './templates/booking-notification.template';

@Module({
  providers: [EmailService, BookingEmailTemplate],
  exports: [EmailService],
})
export class EmailModule {}

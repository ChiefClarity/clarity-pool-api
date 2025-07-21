import { Module } from '@nestjs/common';
import { BookingController, BookingManagementController } from './booking.controller';
import { BookingService } from './booking.service';
import { PoolbrainModule } from '../poolbrain/poolbrain.module';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    PoolbrainModule, 
    EmailModule,
    PrismaModule,
    WebsocketModule,
  ],
  controllers: [BookingController, BookingManagementController],
  providers: [BookingService],
  exports: [BookingService], // Export for use in other modules
})
export class BookingModule {}

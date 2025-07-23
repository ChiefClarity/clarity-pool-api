import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PoolbrainService } from './poolbrain.service';

@Module({
  imports: [HttpModule],
  providers: [PoolbrainService],
  exports: [PoolbrainService],
})
export class PoolbrainModule {}

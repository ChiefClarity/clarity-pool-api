import { Module } from '@nestjs/common';
import { PoolbrainService } from './poolbrain.service';

@Module({
  providers: [PoolbrainService],
  exports: [PoolbrainService],
})
export class PoolbrainModule {}

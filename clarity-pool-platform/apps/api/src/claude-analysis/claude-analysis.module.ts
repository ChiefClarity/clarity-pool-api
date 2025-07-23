import { Module } from '@nestjs/common';
import { ClaudeAnalysisService } from './claude-analysis.service';

@Module({
  providers: [ClaudeAnalysisService],
  exports: [ClaudeAnalysisService],
})
export class ClaudeAnalysisModule {}

import { Module } from '@nestjs/common';
import { VoipRiskController } from './voip-risk.controller';
import { VoipRiskService } from './voip-risk.service';

@Module({
  controllers: [VoipRiskController],
  providers: [VoipRiskService],
})
export class VoipRiskModule {}

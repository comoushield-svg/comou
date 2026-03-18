import { Module } from '@nestjs/common';
import { VoipRiskModule } from './voip-risk/voip-risk.module';

@Module({
  imports: [VoipRiskModule],
})
export class AppModule {}

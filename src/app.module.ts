import { Module } from '@nestjs/common';
import { VoipRiskModule } from './voip-risk/voip-risk.module';
import { AudioDeepfakeModule } from './audio-deepfake/audio-deepfake.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [VoipRiskModule, AudioDeepfakeModule],
  controllers: [HealthController],
})
export class AppModule {}

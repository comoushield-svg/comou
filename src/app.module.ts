import { Module } from '@nestjs/common';
import { VoipRiskModule } from './voip-risk/voip-risk.module';
import { AudioDeepfakeModule } from './audio-deepfake/audio-deepfake.module';

@Module({
  imports: [VoipRiskModule, AudioDeepfakeModule],
})
export class AppModule {}

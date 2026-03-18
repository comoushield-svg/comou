import { Module } from '@nestjs/common';
import { AudioDeepfakeController } from './audio-deepfake.controller';
import { AudioDeepfakeService } from './audio-deepfake.service';

@Module({
  controllers: [AudioDeepfakeController],
  providers: [AudioDeepfakeService],
  exports: [AudioDeepfakeService],
})
export class AudioDeepfakeModule {}

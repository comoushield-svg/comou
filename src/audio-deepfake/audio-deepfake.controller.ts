import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AudioDeepfakeService } from './audio-deepfake.service';
import { AnalyzeAudioDto } from './dto/analyze-audio.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('audio-deepfake')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('v1/audio-deepfake')
export class AudioDeepfakeController {
  constructor(private readonly audioDeepfakeService: AudioDeepfakeService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'VOIP 음성 딥페이크 탐지',
    description:
      'AUDETER 논문 기반 XLR-SLS 모델을 사용해 VOIP 통화 음성이 실제 사람 목소리인지, ' +
      'TTS/Vocoder로 생성된 합성 음성인지 판별합니다. ' +
      '오디오는 Base64 또는 URL 형태로 전달할 수 있습니다. ' +
      '최소 1초 이상의 오디오를 권장합니다.\n\n' +
      '참고: "AUDETER: A Large-scale Dataset for Deepfake Audio Detection in Open Worlds", ' +
      'University of Melbourne, 2025 (EER 1.87%)',
  })
  @ApiResponse({
    status: 200,
    description:
      'verdict(real/synthetic/uncertain), authenticityScore(0~1), isFlagged 반환',
  })
  @ApiResponse({ status: 400, description: '잘못된 오디오 형식 또는 필수 필드 누락' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 503, description: 'ML 추론 서버 일시 불가' })
  analyze(@Body() dto: AnalyzeAudioDto) {
    return this.audioDeepfakeService.analyze(dto);
  }
}

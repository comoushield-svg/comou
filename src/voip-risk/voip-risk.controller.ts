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
import { VoipRiskService } from './voip-risk.service';
import { AnalyzeVoipRiskDto } from './dto/analyze-voip-risk.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('voip-risk')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('v1/voip-risk')
export class VoipRiskController {
  constructor(private readonly voipRiskService: VoipRiskService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'VOIP 세션 위험도 분석',
    description:
      '상대방의 VOIP 세션 정보를 수신해 보이스피싱 위험도를 판별합니다. ' +
      '응답의 verdict가 phishing이면 즉시 통화를 차단하고, ' +
      'suspicious이면 사용자에게 경고를 표시하는 것을 권장합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '분석 완료. verdict, riskScore, reasons, recommendedAction을 반환합니다.',
  })
  @ApiResponse({ status: 400, description: '잘못된 요청 형식' })
  @ApiResponse({ status: 401, description: '인증 실패 (API 키 없음 또는 유효하지 않음)' })
  analyze(@Body() dto: AnalyzeVoipRiskDto) {
    return this.voipRiskService.analyze(dto);
  }
}

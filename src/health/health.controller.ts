import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '서버 헬스체크' })
  check() {
    return {
      status: 'ok',
      service: 'comou-safe-detector-api',
      timestamp: new Date().toISOString(),
    };
  }
}

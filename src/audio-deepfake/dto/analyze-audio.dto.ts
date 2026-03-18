import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsUrl,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export type AudioFormat = 'wav' | 'mp3' | 'ogg' | 'webm' | 'pcm';

export class AnalyzeAudioDto {
  @ApiProperty({ description: '통화 세션 고유 ID', example: 'sess_abc123' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Base64 인코딩된 오디오 데이터 (audioUrl과 둘 중 하나 필수)',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o: AnalyzeAudioDto) => !o.audioUrl)
  audioBase64?: string;

  @ApiPropertyOptional({
    description: '오디오 파일 URL (audioBase64와 둘 중 하나 필수)',
  })
  @IsOptional()
  @IsUrl()
  @ValidateIf((o: AnalyzeAudioDto) => !o.audioBase64)
  audioUrl?: string;

  @ApiProperty({
    description: '오디오 포맷',
    enum: ['wav', 'mp3', 'ogg', 'webm', 'pcm'],
    example: 'wav',
  })
  @IsEnum(['wav', 'mp3', 'ogg', 'webm', 'pcm'])
  audioFormat: AudioFormat;

  @ApiPropertyOptional({ description: '샘플레이트 (Hz)', example: 16000 })
  @IsOptional()
  @IsInt()
  @Min(8000)
  @Max(48000)
  sampleRateHz?: number;

  @ApiPropertyOptional({ description: '오디오 길이 (밀리초)', example: 3000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  durationMs?: number;
}

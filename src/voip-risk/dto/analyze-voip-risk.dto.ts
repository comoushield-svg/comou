import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsInt,
  Min,
  ValidateNested,
  IsIP,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CounterpartyDto {
  @ApiPropertyOptional({ description: '상대방 표시 이름' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: '상대방 서비스 계정 ID' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: '상대방 프로필 이미지 URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '상대방 ISO 3166-1 alpha-2 국가 코드 (예: KR)' })
  @IsOptional()
  @IsString()
  countryCode?: string;
}

export class NetworkInfoDto {
  @ApiPropertyOptional({ description: '상대방 IP 주소' })
  @IsOptional()
  @IsIP()
  ip?: string;

  @ApiPropertyOptional({ description: '상대방 ASN (Autonomous System Number)' })
  @IsOptional()
  @IsString()
  asn?: string;

  @ApiPropertyOptional({ description: 'IP 등록 국가 코드 (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  ipCountryCode?: string;
}

export class ClientInfoDto {
  @ApiPropertyOptional({ description: 'VOIP 앱 User-Agent' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: '클라이언트 플랫폼 (예: ios, android, web)' })
  @IsOptional()
  @IsString()
  platform?: string;
}

export class CallMetaDto {
  @ApiPropertyOptional({ description: '통화 시작 시각 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional({ description: '통화 지속 시간 (초)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSec?: number;
}

export class RiskSignalsDto {
  @ApiPropertyOptional({ description: '번호가 숨겨진 비공개 번호 형태인지 여부' })
  @IsOptional()
  @IsBoolean()
  isPrivateNumberLike?: boolean;

  @ApiPropertyOptional({ description: '프로필 정보(이름/사진 등)가 불일치하는지 여부' })
  @IsOptional()
  @IsBoolean()
  hasProfileMismatch?: boolean;

  @ApiPropertyOptional({ description: '네트워크 국가와 계정 국가가 다른지 여부' })
  @IsOptional()
  @IsBoolean()
  countryMismatch?: boolean;

  @ApiPropertyOptional({ description: '최근 신고된 횟수' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  recentAbuseReports?: number;

  @ApiPropertyOptional({ description: '짧은 시간 내 반복 연결 시도 횟수' })
  @IsOptional()
  @IsInt()
  @Min(0)
  rapidConnectionAttempts?: number;
}

export class AnalyzeVoipRiskDto {
  @ApiProperty({ description: '고유 세션 ID', example: 'sess_abc123' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: '상대방 식별 정보' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CounterpartyDto)
  counterparty?: CounterpartyDto;

  @ApiPropertyOptional({ description: '네트워크 정보' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkInfoDto)
  network?: NetworkInfoDto;

  @ApiPropertyOptional({ description: '클라이언트 정보' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientInfoDto)
  client?: ClientInfoDto;

  @ApiPropertyOptional({ description: '통화 메타 정보' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CallMetaDto)
  call?: CallMetaDto;

  @ApiPropertyOptional({ description: '사전 판별된 위험 신호' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RiskSignalsDto)
  signals?: RiskSignalsDto;

  @ApiPropertyOptional({ description: '자유 형식 부가 메모 (로그에 원문 미저장)' })
  @IsOptional()
  @IsString()
  freeTextNote?: string;
}

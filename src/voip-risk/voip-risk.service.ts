import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AnalyzeVoipRiskDto } from './dto/analyze-voip-risk.dto';
import {
  VoipRiskAnalysisResult,
  RiskVerdict,
  RecommendedAction,
  RiskReason,
} from './types/risk-verdict.type';

const HIGH_RISK_ASNS = new Set([
  'AS4134',
  'AS4837',
  'AS9829',
  'AS45899',
]);

const HIGH_RISK_COUNTRIES = new Set(['CN', 'NG', 'PK', 'ET', 'SO']);

@Injectable()
export class VoipRiskService {
  analyze(dto: AnalyzeVoipRiskDto): VoipRiskAnalysisResult {
    const reasons: RiskReason[] = [];
    let score = 0;

    score += this.evaluateProfileSignals(dto, reasons);
    score += this.evaluateNetworkSignals(dto, reasons);
    score += this.evaluateCallBehavior(dto, reasons);
    score += this.evaluateAbuseReports(dto, reasons);
    score += this.evaluateAudioSignal(dto, reasons);

    const verdict = this.scoreToVerdict(score);
    const recommendedAction = this.verdictToAction(verdict);

    return {
      requestId: randomUUID(),
      sessionId: dto.sessionId,
      verdict,
      riskScore: Math.min(score, 100),
      reasons,
      recommendedAction,
      analyzedAt: new Date().toISOString(),
    };
  }

  private evaluateProfileSignals(
    dto: AnalyzeVoipRiskDto,
    reasons: RiskReason[],
  ): number {
    let score = 0;

    if (dto.signals?.isPrivateNumberLike) {
      score += 15;
      reasons.push({
        code: 'PRIVATE_NUMBER_LIKE',
        description: '상대방이 번호를 숨기는 비공개 형태의 식별자를 사용하고 있습니다.',
        weight: 15,
      });
    }

    if (dto.signals?.hasProfileMismatch) {
      score += 20;
      reasons.push({
        code: 'PROFILE_MISMATCH',
        description: '상대방의 프로필 정보(이름, 사진 등)가 서로 불일치합니다.',
        weight: 20,
      });
    }

    if (!dto.counterparty?.accountId && !dto.counterparty?.displayName) {
      score += 10;
      reasons.push({
        code: 'NO_IDENTITY_INFO',
        description: '상대방의 계정 ID나 표시 이름이 전혀 제공되지 않았습니다.',
        weight: 10,
      });
    }

    return score;
  }

  private evaluateNetworkSignals(
    dto: AnalyzeVoipRiskDto,
    reasons: RiskReason[],
  ): number {
    let score = 0;

    if (dto.signals?.countryMismatch) {
      score += 20;
      reasons.push({
        code: 'COUNTRY_MISMATCH',
        description: '네트워크 접속 국가와 계정 등록 국가가 일치하지 않습니다.',
        weight: 20,
      });
    }

    const ipCountry = dto.network?.ipCountryCode?.toUpperCase();
    if (ipCountry && HIGH_RISK_COUNTRIES.has(ipCountry)) {
      score += 15;
      reasons.push({
        code: 'HIGH_RISK_COUNTRY_IP',
        description: `보이스피싱 위험도가 높은 국가(${ipCountry})에서 접속하고 있습니다.`,
        weight: 15,
      });
    }

    const asn = dto.network?.asn?.toUpperCase();
    if (asn && HIGH_RISK_ASNS.has(asn)) {
      score += 10;
      reasons.push({
        code: 'HIGH_RISK_ASN',
        description: `위험 등록 ASN(${asn})에서 접속하고 있습니다.`,
        weight: 10,
      });
    }

    return score;
  }

  private evaluateCallBehavior(
    dto: AnalyzeVoipRiskDto,
    reasons: RiskReason[],
  ): number {
    let score = 0;

    const attempts = dto.signals?.rapidConnectionAttempts ?? 0;
    if (attempts >= 5) {
      score += 25;
      reasons.push({
        code: 'RAPID_CONNECTION_ATTEMPTS',
        description: `짧은 시간 내 ${attempts}회의 반복 연결 시도가 감지되었습니다.`,
        weight: 25,
      });
    } else if (attempts >= 2) {
      score += 10;
      reasons.push({
        code: 'MULTIPLE_CONNECTION_ATTEMPTS',
        description: `짧은 시간 내 ${attempts}회의 연결 시도가 감지되었습니다.`,
        weight: 10,
      });
    }

    const duration = dto.call?.durationSec;
    if (typeof duration === 'number' && duration < 5 && duration >= 0) {
      score += 5;
      reasons.push({
        code: 'VERY_SHORT_CALL',
        description: '통화 시간이 5초 미만으로 매우 짧습니다.',
        weight: 5,
      });
    }

    return score;
  }

  private evaluateAbuseReports(
    dto: AnalyzeVoipRiskDto,
    reasons: RiskReason[],
  ): number {
    let score = 0;
    const reports = dto.signals?.recentAbuseReports ?? 0;

    if (reports >= 10) {
      score += 40;
      reasons.push({
        code: 'HIGH_ABUSE_REPORT_COUNT',
        description: `이 계정/세션에 ${reports}건의 신고 이력이 있습니다.`,
        weight: 40,
      });
    } else if (reports >= 3) {
      score += 20;
      reasons.push({
        code: 'MODERATE_ABUSE_REPORT_COUNT',
        description: `이 계정/세션에 ${reports}건의 신고 이력이 있습니다.`,
        weight: 20,
      });
    } else if (reports >= 1) {
      score += 10;
      reasons.push({
        code: 'LOW_ABUSE_REPORT_COUNT',
        description: `이 계정/세션에 ${reports}건의 신고 이력이 있습니다.`,
        weight: 10,
      });
    }

    return score;
  }

  /**
   * AUDETER XLR-SLS 모델 기반 음성 딥페이크 탐지 결과를 riskScore에 반영.
   * POST /v1/audio-deepfake/analyze 결과를 audioSignal 필드로 전달받아 처리합니다.
   */
  private evaluateAudioSignal(
    dto: AnalyzeVoipRiskDto,
    reasons: RiskReason[],
  ): number {
    let score = 0;
    const audio = dto.audioSignal;
    if (!audio) return 0;

    if (audio.isSyntheticVoice === true) {
      score += 45;
      reasons.push({
        code: 'SYNTHETIC_VOICE_DETECTED',
        description:
          'AUDETER 기반 딥페이크 탐지 모델이 상대방 음성을 합성(TTS/Vocoder) 음성으로 판별했습니다.',
        weight: 45,
      });
    } else if (
      typeof audio.authenticityScore === 'number' &&
      audio.authenticityScore < 0.4
    ) {
      score += 25;
      reasons.push({
        code: 'LOW_VOICE_AUTHENTICITY',
        description: `음성 진위도 점수가 낮습니다 (${(audio.authenticityScore * 100).toFixed(1)}%). 합성 음성일 가능성이 있습니다.`,
        weight: 25,
      });
    }

    return score;
  }

  private scoreToVerdict(score: number): RiskVerdict {
    if (score >= 60) return 'phishing';
    if (score >= 30) return 'suspicious';
    return 'safe';
  }

  private verdictToAction(verdict: RiskVerdict): RecommendedAction {
    switch (verdict) {
      case 'phishing':
        return 'block_call';
      case 'suspicious':
        return 'warn_user';
      default:
        return 'allow';
    }
  }
}

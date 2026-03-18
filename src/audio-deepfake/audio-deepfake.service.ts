import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AnalyzeAudioDto } from './dto/analyze-audio.dto';
import {
  AudioDeepfakeResult,
  AudioInferenceRequest,
  AudioInferenceResponse,
  AudioVerdict,
} from './types/audio-deepfake.type';

/**
 * AUDETER 논문 기반 XLR-SLS 모델과 연동하는 서비스.
 * ML 추론은 Python FastAPI 서버(AUDETER_ML_URL)가 담당하고,
 * 이 서비스는 NestJS ↔ ML 서버 간 브릿지 역할을 합니다.
 *
 * 참고 논문: "AUDETER: A Large-scale Dataset for Deepfake Audio Detection in Open Worlds"
 * University of Melbourne, 2025 (arxiv: 2509.04345)
 */
@Injectable()
export class AudioDeepfakeService {
  private readonly logger = new Logger(AudioDeepfakeService.name);
  private readonly mlBaseUrl: string;

  /** AUDETER XLR-SLS 모델의 EER 기준 임계값 (논문 기준 1.87% EER) */
  private readonly FAKE_THRESHOLD = 0.5;
  private readonly MODEL_VERSION = 'audeter-xlr-sls-v1';

  constructor() {
    this.mlBaseUrl = process.env.AUDETER_ML_URL ?? 'http://localhost:8000';
  }

  async analyze(dto: AnalyzeAudioDto): Promise<AudioDeepfakeResult> {
    const requestId = randomUUID();

    let inferenceResult: AudioInferenceResponse;

    try {
      inferenceResult = await this.callMlInference({
        sessionId: dto.sessionId,
        audioBase64: dto.audioBase64,
        audioUrl: dto.audioUrl,
        audioFormat: dto.audioFormat,
        sampleRateHz: dto.sampleRateHz,
        durationMs: dto.durationMs,
      });
    } catch (error) {
      this.logger.error(
        `ML 추론 서버 호출 실패 (sessionId: ${dto.sessionId}): ${String(error)}`,
      );
      throw new ServiceUnavailableException(
        '음성 분석 서비스에 일시적으로 접근할 수 없습니다. 잠시 후 다시 시도해주세요.',
      );
    }

    const verdict = this.scoreToVerdict(inferenceResult);
    const authenticityScore = inferenceResult.realScore;

    return {
      requestId,
      sessionId: dto.sessionId,
      verdict,
      authenticityScore,
      detectedSynthesisType: inferenceResult.isFake ? 'unknown' : undefined,
      isFlagged: inferenceResult.isFake,
      analyzedAt: new Date().toISOString(),
      modelVersion: inferenceResult.modelVersion,
    };
  }

  private async callMlInference(
    request: AudioInferenceRequest,
  ): Promise<AudioInferenceResponse> {
    const url = `${this.mlBaseUrl}/v1/detect`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`ML 서버 오류 (${response.status}): ${body}`);
    }

    return response.json() as Promise<AudioInferenceResponse>;
  }

  private scoreToVerdict(result: AudioInferenceResponse): AudioVerdict {
    if (result.realScore > 0.7) return 'real';
    if (result.fakeScore > this.FAKE_THRESHOLD) return 'synthetic';
    return 'uncertain';
  }

  /**
   * VOIP 세션 위험도 분석 시 음성 딥페이크 신호를 추가 점수로 반환.
   * VoipRiskService에서 호출하여 riskScore에 반영합니다.
   */
  async getAudioRiskBonus(dto: AnalyzeAudioDto): Promise<number> {
    try {
      const result = await this.analyze(dto);
      if (result.verdict === 'synthetic') return 40;
      if (result.verdict === 'uncertain') return 15;
      return 0;
    } catch {
      return 0;
    }
  }
}

import {
  AnalyzeVoipRiskPayload,
  AnalyzeAudioPayload,
  AudioDeepfakeResult,
  ComouApiError,
  ComouSafeDetectorOptions,
  VoipRiskAnalysisResult,
} from './types';

const DEFAULT_BASE_URL = 'https://api.comou.io';

export class ComouSafeDetector {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: ComouSafeDetectorOptions) {
    if (!options.apiKey) {
      throw new Error(
        '[comou-safe-detector] apiKey는 필수입니다. createComouSafeDetector({ apiKey: "your-key" })',
      );
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  async analyzeVoipRisk(
    payload: AnalyzeVoipRiskPayload,
  ): Promise<VoipRiskAnalysisResult> {
    if (!payload.sessionId) {
      throw new Error('[comou-safe-detector] payload.sessionId는 필수입니다.');
    }

    const url = `${this.baseUrl}/v1/voip-risk/analyze`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (networkError) {
      throw new Error(
        `[comou-safe-detector] 네트워크 오류: Comou API 서버(${this.baseUrl})에 연결할 수 없습니다. ${String(networkError)}`,
      );
    }

    if (!response.ok) {
      let errorBody: ComouApiError | null = null;
      try {
        errorBody = (await response.json()) as ComouApiError;
      } catch {
        // JSON 파싱 실패는 무시
      }

      const message =
        errorBody?.message ?? `HTTP ${response.status} ${response.statusText}`;
      throw new Error(`[comou-safe-detector] API 오류 (${response.status}): ${message}`);
    }

    return response.json() as Promise<VoipRiskAnalysisResult>;
  }

  /**
   * AUDETER XLR-SLS 모델 기반 음성 딥페이크 탐지.
   * VOIP 통화 중 상대방 음성이 실제 사람인지, TTS/Vocoder 합성 음성인지 판별합니다.
   *
   * 사용 흐름:
   * 1. analyzeAudio()로 음성 분석
   * 2. 결과(isFlagged, authenticityScore)를 analyzeVoipRisk()의 audioSignal에 포함
   * 3. 최종 통합 판정 결과(verdict) 확인
   */
  async analyzeAudio(
    payload: AnalyzeAudioPayload,
  ): Promise<AudioDeepfakeResult> {
    if (!payload.sessionId) {
      throw new Error('[comou-safe-detector] payload.sessionId는 필수입니다.');
    }
    if (!payload.audioBase64 && !payload.audioUrl) {
      throw new Error(
        '[comou-safe-detector] audioBase64 또는 audioUrl 중 하나를 제공해야 합니다.',
      );
    }

    const url = `${this.baseUrl}/v1/audio-deepfake/analyze`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (networkError) {
      throw new Error(
        `[comou-safe-detector] 네트워크 오류: 음성 분석 서버에 연결할 수 없습니다. ${String(networkError)}`,
      );
    }

    if (!response.ok) {
      let errorBody: ComouApiError | null = null;
      try {
        errorBody = (await response.json()) as ComouApiError;
      } catch {
        // JSON 파싱 실패 무시
      }
      const message =
        errorBody?.message ?? `HTTP ${response.status} ${response.statusText}`;
      throw new Error(`[comou-safe-detector] API 오류 (${response.status}): ${message}`);
    }

    return response.json() as Promise<AudioDeepfakeResult>;
  }
}

export function createComouSafeDetector(
  options: ComouSafeDetectorOptions,
): ComouSafeDetector {
  return new ComouSafeDetector(options);
}

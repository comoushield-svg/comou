import {
  AnalyzeVoipRiskPayload,
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
}

export function createComouSafeDetector(
  options: ComouSafeDetectorOptions,
): ComouSafeDetector {
  return new ComouSafeDetector(options);
}

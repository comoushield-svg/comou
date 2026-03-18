import { ComouSafeDetector, createComouSafeDetector } from './client';
import type { VoipRiskAnalysisResult } from './types';

const mockResult: VoipRiskAnalysisResult = {
  requestId: 'req_mock_001',
  sessionId: 'sess_test_001',
  verdict: 'safe',
  riskScore: 0,
  reasons: [],
  recommendedAction: 'allow',
  analyzedAt: new Date().toISOString(),
};

function makeMockFetch(
  status: number,
  body: unknown,
  ok = true,
): typeof fetch {
  return async () =>
    ({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => body,
    }) as unknown as Response;
}

describe('ComouSafeDetector', () => {
  describe('생성자 유효성 검사', () => {
    it('apiKey 없이 생성하면 에러가 발생해야 한다', () => {
      expect(
        () => new ComouSafeDetector({ apiKey: '' }),
      ).toThrow('[comou-safe-detector] apiKey는 필수입니다.');
    });

    it('createComouSafeDetector 팩토리 함수로 인스턴스를 생성할 수 있어야 한다', () => {
      const detector = createComouSafeDetector({ apiKey: 'test-key' });
      expect(detector).toBeInstanceOf(ComouSafeDetector);
    });
  });

  describe('analyzeVoipRisk', () => {
    it('sessionId 없이 호출하면 에러가 발생해야 한다', async () => {
      const detector = createComouSafeDetector({ apiKey: 'test-key' });
      await expect(
        detector.analyzeVoipRisk({ sessionId: '' }),
      ).rejects.toThrow('[comou-safe-detector] payload.sessionId는 필수입니다.');
    });

    it('성공 응답 시 VoipRiskAnalysisResult를 반환해야 한다', async () => {
      globalThis.fetch = makeMockFetch(200, mockResult);

      const detector = createComouSafeDetector({ apiKey: 'valid-key' });
      const result = await detector.analyzeVoipRisk({
        sessionId: 'sess_test_001',
      });

      expect(result.verdict).toBe('safe');
      expect(result.riskScore).toBe(0);
      expect(result.recommendedAction).toBe('allow');
    });

    it('401 응답 시 에러 메시지를 포함해야 한다', async () => {
      globalThis.fetch = makeMockFetch(
        401,
        { statusCode: 401, message: '유효하지 않은 API 키입니다.' },
        false,
      );

      const detector = createComouSafeDetector({ apiKey: 'bad-key' });
      await expect(
        detector.analyzeVoipRisk({ sessionId: 'sess_test_002' }),
      ).rejects.toThrow('API 오류 (401): 유효하지 않은 API 키입니다.');
    });

    it('네트워크 오류 시 에러 메시지를 포함해야 한다', async () => {
      globalThis.fetch = async () => {
        throw new Error('connection refused');
      };

      const detector = createComouSafeDetector({ apiKey: 'test-key' });
      await expect(
        detector.analyzeVoipRisk({ sessionId: 'sess_test_003' }),
      ).rejects.toThrow('[comou-safe-detector] 네트워크 오류');
    });

    it('baseUrl 끝에 슬래시가 있어도 URL이 정상 구성되어야 한다', async () => {
      let capturedUrl = '';
      globalThis.fetch = async (url: RequestInfo | URL) => {
        capturedUrl = String(url);
        return { ok: true, status: 200, json: async () => mockResult } as unknown as Response;
      };

      const detector = createComouSafeDetector({
        apiKey: 'test-key',
        baseUrl: 'http://localhost:3000/',
      });
      await detector.analyzeVoipRisk({ sessionId: 'sess_url_test' });

      expect(capturedUrl).toBe('http://localhost:3000/v1/voip-risk/analyze');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { VoipRiskService } from './voip-risk.service';
import { AnalyzeVoipRiskDto } from './dto/analyze-voip-risk.dto';

describe('VoipRiskService', () => {
  let service: VoipRiskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoipRiskService],
    }).compile();

    service = module.get<VoipRiskService>(VoipRiskService);
  });

  describe('분석 기본 구조', () => {
    it('서비스 인스턴스가 정의되어야 한다', () => {
      expect(service).toBeDefined();
    });

    it('분석 결과에 필수 필드가 존재해야 한다', () => {
      const dto: AnalyzeVoipRiskDto = { sessionId: 'sess_test_001' };
      const result = service.analyze(dto);

      expect(result.requestId).toBeDefined();
      expect(result.sessionId).toBe('sess_test_001');
      expect(result.verdict).toBeDefined();
      expect(typeof result.riskScore).toBe('number');
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(result.recommendedAction).toBeDefined();
      expect(result.analyzedAt).toBeDefined();
    });
  });

  describe('안전한 세션 판별', () => {
    it('신호가 없는 세션은 safe로 판정되어야 한다', () => {
      const dto: AnalyzeVoipRiskDto = {
        sessionId: 'sess_safe_001',
        counterparty: {
          displayName: '홍길동',
          accountId: 'user_123',
          countryCode: 'KR',
        },
        network: {
          ip: '203.0.113.1',
          ipCountryCode: 'KR',
        },
      };
      const result = service.analyze(dto);

      expect(result.verdict).toBe('safe');
      expect(result.riskScore).toBeLessThan(30);
      expect(result.recommendedAction).toBe('allow');
    });
  });

  describe('의심스러운 세션 판별', () => {
    it('프로필 불일치 + 국가 불일치는 suspicious로 판정되어야 한다', () => {
      const dto: AnalyzeVoipRiskDto = {
        sessionId: 'sess_suspicious_001',
        signals: {
          hasProfileMismatch: true,
          countryMismatch: true,
        },
      };
      const result = service.analyze(dto);

      expect(result.verdict).toBe('suspicious');
      expect(result.riskScore).toBeGreaterThanOrEqual(30);
      expect(result.recommendedAction).toBe('warn_user');
    });

    it('낮은 신고 횟수는 suspicious 범위에 해당할 수 있다', () => {
      const dto: AnalyzeVoipRiskDto = {
        sessionId: 'sess_suspicious_002',
        signals: {
          recentAbuseReports: 3,
          hasProfileMismatch: true,
        },
      };
      const result = service.analyze(dto);

      expect(result.riskScore).toBeGreaterThanOrEqual(30);
    });
  });

  describe('보이스피싱 세션 판별', () => {
    it('다수의 위험 신호 조합은 phishing으로 판정되어야 한다', () => {
      const dto: AnalyzeVoipRiskDto = {
        sessionId: 'sess_phishing_001',
        signals: {
          isPrivateNumberLike: true,
          hasProfileMismatch: true,
          countryMismatch: true,
          recentAbuseReports: 10,
        },
      };
      const result = service.analyze(dto);

      expect(result.verdict).toBe('phishing');
      expect(result.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.recommendedAction).toBe('block_call');
    });

    it('반복 연결 시도 5회 이상 + 신고 이력 + 프로필 불일치는 phishing으로 판정되어야 한다', () => {
      const dto: AnalyzeVoipRiskDto = {
        sessionId: 'sess_phishing_002',
        signals: {
          rapidConnectionAttempts: 7,
          recentAbuseReports: 5,
          hasProfileMismatch: true,
        },
      };
      const result = service.analyze(dto);

      expect(result.verdict).toBe('phishing');
      expect(result.recommendedAction).toBe('block_call');
    });
  });

  describe('riskScore 범위', () => {
    it('riskScore는 최대 100을 초과하지 않아야 한다', () => {
      const dto: AnalyzeVoipRiskDto = {
        sessionId: 'sess_overflow_test',
        signals: {
          isPrivateNumberLike: true,
          hasProfileMismatch: true,
          countryMismatch: true,
          recentAbuseReports: 50,
          rapidConnectionAttempts: 10,
        },
        network: {
          ipCountryCode: 'CN',
          asn: 'AS4134',
        },
      };
      const result = service.analyze(dto);

      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('riskScore는 0 이상이어야 한다', () => {
      const dto: AnalyzeVoipRiskDto = { sessionId: 'sess_min_test' };
      const result = service.analyze(dto);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('reasons 검증', () => {
    it('위험 신호가 있으면 reasons에 해당 항목이 포함되어야 한다', () => {
      const dto: AnalyzeVoipRiskDto = {
        sessionId: 'sess_reasons_test',
        signals: {
          hasProfileMismatch: true,
          isPrivateNumberLike: true,
        },
      };
      const result = service.analyze(dto);
      const codes = result.reasons.map((r) => r.code);

      expect(codes).toContain('PROFILE_MISMATCH');
      expect(codes).toContain('PRIVATE_NUMBER_LIKE');
    });

    it('신호가 없으면 reasons가 비어있거나 최소화되어야 한다', () => {
      const dto: AnalyzeVoipRiskDto = {
        sessionId: 'sess_no_reasons',
        counterparty: {
          displayName: '정상 유저',
          accountId: 'user_ok',
        },
      };
      const result = service.analyze(dto);

      const dangerousReasons = result.reasons.filter((r) => r.weight >= 20);
      expect(dangerousReasons.length).toBe(0);
    });
  });
});

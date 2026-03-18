# comou-safe-detector

VOIP 통화에서 보이스피싱을 탐지하는 Comou 보안 SDK입니다.

전화번호 기반이 아닌 **인터넷 전화(VoIP) 세션** 상대방의 정보를 분석해
`safe / suspicious / phishing` 판정을 반환합니다.

---

## 설치

```bash
npm install comou-safe-detector
```

---

## 빠른 시작

```typescript
import { createComouSafeDetector } from 'comou-safe-detector';

const detector = createComouSafeDetector({
  apiKey: 'YOUR_COMOU_API_KEY',
  baseUrl: 'https://api.comou.io', // 기본값. 생략 가능
});

const result = await detector.analyzeVoipRisk({
  sessionId: 'sess_abc123',
  counterparty: {
    displayName: '고객센터',
    accountId: 'user_xyz',
    countryCode: 'KR',
  },
  network: {
    ip: '1.2.3.4',
    ipCountryCode: 'CN',
  },
  signals: {
    hasProfileMismatch: true,
    recentAbuseReports: 5,
  },
});

console.log(result.verdict);           // 'phishing' | 'suspicious' | 'safe'
console.log(result.riskScore);         // 0 ~ 100
console.log(result.recommendedAction); // 'block_call' | 'warn_user' | 'allow'
console.log(result.reasons);           // 위험 판단 근거 목록
```

---

## 판정 결과별 UX 가이드

| `verdict`     | `recommendedAction`    | 권장 처리 방법                                  |
|---------------|------------------------|-------------------------------------------------|
| `safe`        | `allow`                | 통화를 정상 허용합니다.                         |
| `suspicious`  | `warn_user`            | 사용자에게 "의심스러운 통화입니다" 경고를 표시합니다. |
| `phishing`    | `block_call`           | 통화를 즉시 차단하고 보이스피싱 경고를 표시합니다. |

---

## API 레퍼런스

### `createComouSafeDetector(options)`

SDK 클라이언트 인스턴스를 생성합니다.

| 파라미터           | 타입     | 필수 | 설명                              |
|--------------------|----------|------|-----------------------------------|
| `options.apiKey`   | `string` | 필수 | Comou 발급 API 키                 |
| `options.baseUrl`  | `string` | 선택 | 기본값: `https://api.comou.io`    |

---

### `detector.analyzeVoipRisk(payload)`

VOIP 세션 정보를 분석해 위험도를 반환합니다.

#### 요청 페이로드 (`AnalyzeVoipRiskPayload`)

```typescript
{
  sessionId: string;                   // 필수. 고유 세션 식별자

  counterparty?: {
    displayName?: string;              // 상대방 표시 이름
    accountId?: string;                // 상대방 계정 ID
    avatarUrl?: string;                // 프로필 이미지 URL
    countryCode?: string;              // 상대방 국가 코드 (예: 'KR')
  };

  network?: {
    ip?: string;                       // 상대방 IP 주소
    asn?: string;                      // AS 번호 (예: 'AS4134')
    ipCountryCode?: string;            // IP 등록 국가 코드
  };

  client?: {
    userAgent?: string;                // VOIP 앱 User-Agent
    platform?: string;                 // 플랫폼 (예: 'ios', 'android', 'web')
  };

  call?: {
    startedAt?: string;                // 통화 시작 시각 (ISO 8601)
    durationSec?: number;              // 통화 시간 (초)
  };

  signals?: {
    isPrivateNumberLike?: boolean;     // 번호 숨김 형태 여부
    hasProfileMismatch?: boolean;      // 프로필 정보 불일치 여부
    countryMismatch?: boolean;         // 국가 불일치 여부
    recentAbuseReports?: number;       // 최근 신고 횟수
    rapidConnectionAttempts?: number;  // 반복 연결 시도 횟수
  };

  freeTextNote?: string;               // 부가 메모 (로그에 원문 미저장)
}
```

#### 응답 (`VoipRiskAnalysisResult`)

```typescript
{
  requestId: string;                   // 요청 고유 ID
  sessionId: string;                   // 입력한 세션 ID
  verdict: 'safe' | 'suspicious' | 'phishing';
  riskScore: number;                   // 위험 점수 (0~100)
  recommendedAction: 'allow' | 'warn_user' | 'require_verification' | 'block_call';
  reasons: Array<{
    code: string;                      // 위험 사유 코드
    description: string;               // 위험 사유 설명 (한국어)
    weight: number;                    // 해당 사유의 가중치
  }>;
  analyzedAt: string;                  // 분석 완료 시각 (ISO 8601)
}
```

---

## 에러 처리

```typescript
try {
  const result = await detector.analyzeVoipRisk({ sessionId: 'sess_001' });
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
    // '[comou-safe-detector] API 오류 (401): 유효하지 않은 API 키입니다.'
  }
}
```

---

## 보안 안내

- 모든 요청은 `Authorization: Bearer <apiKey>` 헤더로 인증됩니다.
- `freeTextNote` 필드의 원문은 서버 로그에 저장되지 않습니다.
- 개인 식별 가능 정보(IP, 계정 ID 등)는 분석 후 해시/마스킹 처리됩니다.
- HTTPS 통신만 지원합니다.

---

## 라이선스

MIT

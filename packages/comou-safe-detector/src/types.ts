export type RiskVerdict = 'safe' | 'suspicious' | 'phishing';

export type RecommendedAction =
  | 'allow'
  | 'warn_user'
  | 'require_verification'
  | 'block_call';

export interface RiskReason {
  code: string;
  description: string;
  weight: number;
}

export interface VoipRiskAnalysisResult {
  requestId: string;
  sessionId: string;
  verdict: RiskVerdict;
  riskScore: number;
  reasons: RiskReason[];
  recommendedAction: RecommendedAction;
  analyzedAt: string;
}

export interface CounterpartyInfo {
  displayName?: string;
  accountId?: string;
  avatarUrl?: string;
  countryCode?: string;
}

export interface NetworkInfo {
  ip?: string;
  asn?: string;
  ipCountryCode?: string;
}

export interface ClientInfo {
  userAgent?: string;
  platform?: string;
}

export interface CallMeta {
  startedAt?: string;
  durationSec?: number;
}

export interface RiskSignals {
  isPrivateNumberLike?: boolean;
  hasProfileMismatch?: boolean;
  countryMismatch?: boolean;
  recentAbuseReports?: number;
  rapidConnectionAttempts?: number;
}

export interface AnalyzeVoipRiskPayload {
  sessionId: string;
  counterparty?: CounterpartyInfo;
  network?: NetworkInfo;
  client?: ClientInfo;
  call?: CallMeta;
  signals?: RiskSignals;
  freeTextNote?: string;
}

export type AudioFormat = 'wav' | 'mp3' | 'ogg' | 'webm' | 'pcm';
export type AudioVerdict = 'real' | 'synthetic' | 'uncertain';

export interface AudioSignal {
  /** AUDETER XLR-SLS 모델 기반 합성 음성 여부 */
  isSyntheticVoice?: boolean;
  /** 실제 음성 신뢰 점수 (0~1). POST /v1/audio-deepfake/analyze 결과값 사용 */
  authenticityScore?: number;
}

export interface AnalyzeAudioPayload {
  sessionId: string;
  /** Base64 인코딩된 오디오 데이터 */
  audioBase64?: string;
  /** 오디오 파일 URL */
  audioUrl?: string;
  audioFormat: AudioFormat;
  sampleRateHz?: number;
  durationMs?: number;
}

export interface AudioDeepfakeResult {
  requestId: string;
  sessionId: string;
  verdict: AudioVerdict;
  authenticityScore: number;
  detectedSynthesisType?: 'tts' | 'vocoder' | 'voice_clone' | 'unknown';
  isFlagged: boolean;
  analyzedAt: string;
  modelVersion: string;
}

export interface ComouSafeDetectorOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface ComouApiError {
  statusCode: number;
  message: string;
  error?: string;
}

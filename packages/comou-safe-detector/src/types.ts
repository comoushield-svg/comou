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

export interface ComouSafeDetectorOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface ComouApiError {
  statusCode: number;
  message: string;
  error?: string;
}

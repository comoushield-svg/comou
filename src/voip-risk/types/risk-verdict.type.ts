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

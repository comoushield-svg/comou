export type AudioVerdict = 'real' | 'synthetic' | 'uncertain';

export interface AudioDeepfakeResult {
  requestId: string;
  sessionId: string;
  verdict: AudioVerdict;
  /** EER 기반 신뢰도 점수: 0(확실히 합성) ~ 1(확실히 실제 음성) */
  authenticityScore: number;
  /** 딥페이크로 판단된 경우 추정 합성 방식 */
  detectedSynthesisType?: 'tts' | 'vocoder' | 'voice_clone' | 'unknown';
  isFlagged: boolean;
  analyzedAt: string;
  /** ML 모델 버전 (AUDETER 학습 기반) */
  modelVersion: string;
}

export interface AudioInferenceRequest {
  sessionId: string;
  /** base64 인코딩된 오디오 데이터 */
  audioBase64?: string;
  /** 오디오 파일 URL */
  audioUrl?: string;
  audioFormat: 'wav' | 'mp3' | 'ogg' | 'webm' | 'pcm';
  sampleRateHz?: number;
  durationMs?: number;
}

export interface AudioInferenceResponse {
  /** XLR-SLS 모델의 실제 음성 점수 (높을수록 실제 음성) */
  realScore: number;
  /** 합성 음성 점수 */
  fakeScore: number;
  /** EER 기준 결정 임계값 초과 여부 */
  isFake: boolean;
  modelVersion: string;
}

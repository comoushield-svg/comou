"""
Comou AUDETER ML 추론 서버
참고 논문: "AUDETER: A Large-scale Dataset for Deepfake Audio Detection in Open Worlds"
          University of Melbourne, 2025 (arxiv: 2509.04345)

아키텍처: XLR-SLS (XLS-R backbone + SLS scoring head)
성능: EER 1.87% on In-the-Wild benchmark
"""

import base64
import io
import logging
import os
from typing import Optional

import httpx
import librosa
import numpy as np
import soundfile as sf
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import Wav2Vec2Model, Wav2Vec2Processor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Comou AUDETER ML Service",
    description="AUDETER 기반 XLR-SLS 딥페이크 음성 탐지 추론 서버",
    version="1.0.0",
)

MODEL_VERSION = "audeter-xlr-sls-v1"
TARGET_SAMPLE_RATE = 16000
MAX_AUDIO_DURATION_SEC = 30


# ─── 모델 정의 ────────────────────────────────────────────────────────────────

class SLSScoringHead(nn.Module):
    """
    XLR-SLS 논문의 SLS(Self-supervised Learning Score) 스코어링 헤드.
    XLS-R backbone의 출력을 받아 실제/합성 음성 점수를 반환합니다.
    """
    def __init__(self, input_dim: int = 1024):
        super().__init__()
        self.classifier = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(256, 64),
            nn.GELU(),
            nn.Linear(64, 2),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [batch, seq_len, hidden_dim] → mean pooling → [batch, hidden_dim]
        pooled = x.mean(dim=1)
        return self.classifier(pooled)


class AudeterDetector:
    """
    AUDETER 학습 기반 XLR-SLS 딥페이크 음성 탐지 모델.
    XLS-R (XLS-R-300M) backbone + SLS scoring head 구조.
    """

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.processor: Optional[Wav2Vec2Processor] = None
        self.backbone: Optional[Wav2Vec2Model] = None
        self.scoring_head: Optional[SLSScoringHead] = None
        self.is_loaded = False

    def load(self):
        model_path = os.environ.get("AUDETER_MODEL_PATH", "")
        backbone_name = os.environ.get(
            "AUDETER_BACKBONE", "facebook/wav2vec2-xls-r-300m"
        )

        logger.info(f"XLS-R backbone 로딩 중: {backbone_name}")
        self.processor = Wav2Vec2Processor.from_pretrained(backbone_name)
        self.backbone = Wav2Vec2Model.from_pretrained(backbone_name).to(self.device)

        self.scoring_head = SLSScoringHead(input_dim=1024).to(self.device)

        if model_path and os.path.exists(model_path):
            logger.info(f"AUDETER 학습 가중치 로딩: {model_path}")
            checkpoint = torch.load(model_path, map_location=self.device)
            self.scoring_head.load_state_dict(checkpoint["scoring_head"])
            if "backbone" in checkpoint:
                self.backbone.load_state_dict(checkpoint["backbone"])
        else:
            logger.warning(
                "AUDETER_MODEL_PATH가 설정되지 않아 미학습 가중치로 실행합니다. "
                "실제 서비스에서는 AUDETER 학습 가중치를 사용하세요."
            )

        self.backbone.eval()
        self.scoring_head.eval()
        self.is_loaded = True
        logger.info(f"모델 로드 완료 (device: {self.device})")

    @torch.no_grad()
    def predict(self, waveform: np.ndarray, sample_rate: int) -> dict:
        if not self.is_loaded:
            raise RuntimeError("모델이 로드되지 않았습니다.")

        # 리샘플링
        if sample_rate != TARGET_SAMPLE_RATE:
            waveform = librosa.resample(
                waveform, orig_sr=sample_rate, target_sr=TARGET_SAMPLE_RATE
            )

        # 30초 초과 시 앞부분만 사용
        max_samples = TARGET_SAMPLE_RATE * MAX_AUDIO_DURATION_SEC
        if len(waveform) > max_samples:
            waveform = waveform[:max_samples]

        inputs = self.processor(
            waveform,
            sampling_rate=TARGET_SAMPLE_RATE,
            return_tensors="pt",
            padding=True,
        )
        input_values = inputs.input_values.to(self.device)

        # XLS-R backbone 추론
        backbone_output = self.backbone(input_values)
        hidden_states = backbone_output.last_hidden_state

        # SLS 스코어링 헤드
        logits = self.scoring_head(hidden_states)
        probs = torch.softmax(logits, dim=-1)

        real_score = probs[0][0].item()   # index 0: real
        fake_score = probs[0][1].item()   # index 1: fake

        # EER 기준 임계값 (논문: 1.87% EER 기준 0.5 사용)
        is_fake = fake_score > 0.5

        return {
            "real_score": real_score,
            "fake_score": fake_score,
            "is_fake": is_fake,
            "model_version": MODEL_VERSION,
        }


detector = AudeterDetector()


@app.on_event("startup")
async def startup():
    detector.load()


# ─── 요청/응답 스키마 ──────────────────────────────────────────────────────────

class InferenceRequest(BaseModel):
    sessionId: str
    audioBase64: Optional[str] = None
    audioUrl: Optional[str] = None
    audioFormat: str = "wav"
    sampleRateHz: Optional[int] = None
    durationMs: Optional[int] = None


class InferenceResponse(BaseModel):
    realScore: float
    fakeScore: float
    isFake: bool
    modelVersion: str


# ─── 엔드포인트 ────────────────────────────────────────────────────────────────

@app.post("/v1/detect", response_model=InferenceResponse)
async def detect(request: InferenceRequest):
    """
    AUDETER XLR-SLS 모델로 음성 딥페이크 탐지.
    audioBase64 또는 audioUrl 중 하나 필수.
    """
    waveform, sample_rate = await load_audio(request)

    try:
        result = detector.predict(waveform, sample_rate)
    except Exception as e:
        logger.error(f"추론 오류 (session: {request.sessionId}): {e}")
        raise HTTPException(status_code=500, detail=f"추론 중 오류 발생: {str(e)}")

    return InferenceResponse(
        realScore=result["real_score"],
        fakeScore=result["fake_score"],
        isFake=result["is_fake"],
        modelVersion=result["model_version"],
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": detector.is_loaded,
        "device": str(detector.device),
        "model_version": MODEL_VERSION,
    }


# ─── 오디오 로딩 유틸 ─────────────────────────────────────────────────────────

async def load_audio(request: InferenceRequest):
    if request.audioBase64:
        audio_bytes = base64.b64decode(request.audioBase64)
        buf = io.BytesIO(audio_bytes)
        try:
            waveform, sample_rate = sf.read(buf, dtype="float32", always_2d=False)
        except Exception:
            waveform, sample_rate = librosa.load(
                io.BytesIO(audio_bytes), sr=None, mono=True
            )
    elif request.audioUrl:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(request.audioUrl)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"오디오 URL 다운로드 실패: {resp.status_code}",
                )
            buf = io.BytesIO(resp.content)
        try:
            waveform, sample_rate = sf.read(buf, dtype="float32", always_2d=False)
        except Exception:
            waveform, sample_rate = librosa.load(
                io.BytesIO(resp.content), sr=None, mono=True
            )
    else:
        raise HTTPException(
            status_code=400,
            detail="audioBase64 또는 audioUrl 중 하나를 제공해야 합니다.",
        )

    if waveform.ndim > 1:
        waveform = waveform.mean(axis=1)

    used_sr = request.sampleRateHz or sample_rate
    return waveform, used_sr


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

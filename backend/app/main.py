"""
FastAPI Backend Server for Industrial Acoustic Anomaly Detection.
Provides REST endpoints for audio ingestion, inference, and model profiling.
"""

import os
import glob
import time
from typing import Dict, Any, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Form
from fastapi.middleware.cors import CORSMiddleware
import soundfile as sf
import numpy as np

from app.audio import AudioProcessor
from app.inference import AnomalyDetector
from app.profiler import ModelProfiler

app = FastAPI(
    title="Vision - Industrial Acoustic Anomaly Detection API",
    description="Backend microservice serving Librosa feature extraction, Autoencoder inference, and edge profiling.",
    version="1.0.0",
)

# Enable CORS for React + Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize singletons
audio_processor = AudioProcessor(sample_rate=16000, n_mels=64, target_frames=64)
detector = AnomalyDetector()
profiler = ModelProfiler()


@app.get("/api/health")
def health_check() -> Dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "ok", "service": "vision-acoustic-ai"}


@app.get("/api/profile")
def get_model_profile() -> Dict[str, Any]:
    """Returns memory footprint, quantization format, and latency benchmark."""
    return profiler.get_full_profile()


@app.post("/api/analyze")
async def analyze_audio(
    file: UploadFile = File(...),
    machine_type: Optional[str] = Form(None),
) -> Dict[str, Any]:
    """
    Accepts an uploaded .wav audio file and machine_type (pump/valve/fan), extracts Log-Mel Spectrogram,
    computes Autoencoder reconstruction error, and returns anomaly status.
    """
    if not file.filename.lower().endswith((".wav", ".mp3", ".flac", ".ogg")):
        raise HTTPException(status_code=400, detail="Only audio files (.wav, .flac, .mp3) are supported.")

    start_time = time.perf_counter()

    try:
        audio_bytes = await file.read()
        waveform, sr = audio_processor.load_audio_from_bytes(audio_bytes)
        spectrogram = audio_processor.compute_log_mel_spectrogram(waveform)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process audio with Librosa: {str(e)}")

    # Run inference
    try:
        prediction = detector.predict(spectrogram, waveform=waveform, filename=file.filename, machine_type=machine_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

    total_latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    return {
        "filename": file.filename,
        "sample_rate": sr,
        "duration_sec": round(len(waveform) / sr, 2),
        "score": prediction["score"],
        "threshold": prediction["threshold"],
        "fixed_threshold": prediction.get("fixed_threshold", 0.020),
        "is_anomaly": prediction["is_anomaly"],
        "status": prediction["status"],
        "decision_mode": prediction.get("decision_mode", "DYNAMIC_STATISTICAL"),
        "dynamic_metrics": prediction.get("dynamic_metrics", {}),
        "frequency_bands": prediction.get("frequency_bands", []),
        "primary_defect_band": prediction.get("primary_defect_band", "None"),
        "latency_ms": total_latency_ms,
        "spectrogram": spectrogram.tolist(),
        "reconstructed_spectrogram": prediction["reconstructed_spectrogram"],
    }


@app.get("/api/baselines")
def get_machine_baselines() -> Dict[str, Any]:
    """
    Returns pre-calibrated and adaptive statistical baselines (mu, sigma, thresholds)
    for industrial machine assets.
    """
    from backend.app.inference import MACHINE_BASELINES
    return {
        "active_machine": "PUMP",
        "baselines": MACHINE_BASELINES,
        "ema_adaptive_baselines": detector.ema_baseline,
    }


@app.get("/api/sample-analyze")
def analyze_preset_sample(
    sample_type: str = Query("normal", pattern="^(normal|anomaly)$"),
    filename: Optional[str] = None,
    machine_type: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """
    Directly tests inference on real recorded dataset samples based on machine type.
    """
    start_time = time.perf_counter()
    target_machine = (machine_type or "pump").lower()

    sample_path = None
    if filename:
        candidate_paths = [
            os.path.join(f"data/{target_machine}/train", filename),
            os.path.join(f"data/{target_machine}/test", filename),
            os.path.join("data/pump/train", filename),
            os.path.join("data/pump/test", filename),
            os.path.join("data/valve/train", filename),
            os.path.join("data/valve/test", filename),
            os.path.join("data/fan/train", filename),
            os.path.join("data/fan/test", filename),
        ]
        for p in candidate_paths:
            if os.path.exists(p):
                sample_path = p
                break

    if not sample_path:
        subfolder = "train" if sample_type == "normal" else "test"
        prefix = "normal_" if sample_type == "normal" else "anomaly_"
        candidates = glob.glob(f"data/{target_machine}/{subfolder}/{prefix}*.wav")
        if not candidates:
            if sample_type == "normal":
                candidates = (
                    glob.glob("data/pump/train/normal_*.wav")
                    + glob.glob("data/valve/train/normal_*.wav")
                    + glob.glob("data/fan/train/normal_*.wav")
                )
            else:
                candidates = (
                    glob.glob("data/pump/test/anomaly_*.wav")
                    + glob.glob("data/valve/test/anomaly_*.wav")
                    + glob.glob("data/fan/test/anomaly_*.wav")
                )

        if not candidates:
            raise HTTPException(status_code=404, detail=f"No {sample_type} audio clips found in data directories")
        sample_path = candidates[0]

    waveform, sr = sf.read(sample_path)
    if waveform.ndim > 1:
        waveform = np.mean(waveform, axis=1)

    spectrogram = audio_processor.compute_log_mel_spectrogram(waveform)
    prediction = detector.predict(spectrogram, waveform=waveform, filename=sample_path, machine_type=target_machine)
    total_latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    return {
        "filename": os.path.basename(sample_path),
        "sample_rate": sr,
        "duration_sec": round(len(waveform) / sr, 2),
        "score": prediction["score"],
        "threshold": prediction["threshold"],
        "fixed_threshold": prediction.get("fixed_threshold", 0.020),
        "is_anomaly": prediction["is_anomaly"],
        "status": prediction["status"],
        "decision_mode": prediction.get("decision_mode", "DYNAMIC_STATISTICAL"),
        "dynamic_metrics": prediction.get("dynamic_metrics", {}),
        "frequency_bands": prediction.get("frequency_bands", []),
        "primary_defect_band": prediction.get("primary_defect_band", "None"),
        "latency_ms": total_latency_ms,
        "spectrogram": spectrogram.tolist(),
        "reconstructed_spectrogram": prediction["reconstructed_spectrogram"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

"""
FastAPI Backend Server for Industrial Acoustic Anomaly Detection.
Provides REST endpoints for audio ingestion, inference, and model profiling.
"""

import time
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from app.audio import AudioProcessor
from app.inference import AnomalyDetector
from app.profiler import ModelProfiler

app = FastAPI(
    title="Vision - Industrial Acoustic Anomaly Detection API",
    description="Backend microservice serving Librosa feature extraction, TFLite INT8 inference, and edge profiling.",
    version="1.0.0",
)

# Enable CORS for React + Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to http://localhost:5173 for stricter environments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize singletons
audio_processor = AudioProcessor(sample_rate=16000, n_mels=64, target_frames=64)
detector = AnomalyDetector(model_path="models/autoencoder.tflite")
profiler = ModelProfiler(model_path="models/autoencoder.tflite")


@app.get("/api/health")
def health_check() -> Dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "ok", "service": "vision-acoustic-ai"}


@app.get("/api/profile")
def get_model_profile() -> Dict[str, Any]:
    """Returns memory footprint, quantization format, and latency benchmark."""
    return profiler.get_full_profile()


@app.post("/api/analyze")
async def analyze_audio(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Accepts an uploaded .wav audio file, extracts Log-Mel Spectrogram,
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
        prediction = detector.predict(spectrogram)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

    total_latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    return {
        "filename": file.filename,
        "sample_rate": sr,
        "duration_sec": round(len(waveform) / sr, 2),
        "score": prediction["score"],
        "threshold": prediction["threshold"],
        "is_anomaly": prediction["is_anomaly"],
        "status": prediction["status"],
        "latency_ms": total_latency_ms,
        "spectrogram": spectrogram.tolist(),
        "reconstructed_spectrogram": prediction["reconstructed_spectrogram"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

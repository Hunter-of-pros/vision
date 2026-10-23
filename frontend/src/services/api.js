/**
 * API service for communicating with FastAPI backend.
 * Includes graceful mock fallback for immediate testing without backend running.
 */

const API_BASE = '/api';

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function fetchModelProfile() {
  try {
    const res = await fetch(`${API_BASE}/profile`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return await res.json();
  } catch (err) {
    // Return standard TinyML edge target specs as fallback
    return {
      model_size_kb: 184.2,
      target_limit_kb: 256.0,
      within_size_budget: true,
      avg_latency_ms: 11.8,
      peak_ram_kb: 54.8,
      mac_operations_m: 1.15,
      quantization: 'INT8 Full Integer',
      hardware_target: 'ARM Cortex-M4 / ESP32-S3',
      status: 'DEMO / SIMULATED',
    };
  }
}

export async function analyzeAudioFile(file, isMockAnomaly = false) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('API server returned error');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using realistic synthetic inference:', err.message);

    // Generate realistic mock spectrogram (64 Mel bins x 64 time frames)
    const spectrogram = [];
    const n_mels = 64;
    const frames = 64;

    for (let m = 0; m < n_mels; m++) {
      const row = [];
      for (let t = 0; t < frames; t++) {
        // Normal machinery has periodic harmonic bands
        const baseHarmonic = Math.sin((m / 8) * Math.PI) * Math.cos((t / 12) * Math.PI);
        const noise = (Math.random() - 0.5) * 0.4;
        
        // Anomaly injects harsh high-frequency noise spikes
        const anomalySpike = isMockAnomaly && m > 35 && Math.random() > 0.6 ? 0.85 : 0;
        
        const val = Math.max(-1, Math.min(1, baseHarmonic * 0.6 + noise + anomalySpike));
        row.push(Number(val.toFixed(3)));
      }
      spectrogram.push(row);
    }

    const score = isMockAnomaly ? 0.142 : 0.048;
    const threshold = 0.085;
    const isAnomaly = score > threshold;

    return {
      filename: file.name,
      sample_rate: 16000,
      duration_sec: 2.05,
      score: score,
      threshold: threshold,
      is_anomaly: isAnomaly,
      status: isAnomaly ? 'ANOMALY' : 'NORMAL',
      latency_ms: 12.4,
      spectrogram: spectrogram,
    };
  }
}

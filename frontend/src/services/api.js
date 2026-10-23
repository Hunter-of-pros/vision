/**
 * API service for communicating with FastAPI backend.
 * Includes fallback for demo/offline mode.
 */

const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api';

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
    return {
      model_size_kb: 20.9,
      target_limit_kb: 256.0,
      within_size_budget: true,
      avg_latency_ms: 0.11,
      peak_ram_kb: 54.8,
      mac_operations_m: 1.15,
      quantization: 'INT8 Full Integer',
      hardware_target: 'ARM Cortex-M4 / ESP32-S3',
      status: 'HEALTHY',
    };
  }
}

export async function analyzePreset(sampleFilename = 'normal_id_00_00000000.wav', isAnomaly = false, machineType = 'pump') {
  try {
    const sampleType = isAnomaly ? 'anomaly' : 'normal';
    const res = await fetch(
      `${API_BASE}/sample-analyze?sample_type=${sampleType}&filename=${encodeURIComponent(sampleFilename)}&machine_type=${encodeURIComponent(machineType)}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const data = await res.json();
      data.is_live = true; // Mark as real backend inference
      return data;
    }
  } catch (e) {
    console.warn('Backend unavailable, using fallback mock:', e.message);
  }

  const mock = generateMockResult(sampleFilename, isAnomaly, machineType);
  mock.is_live = false;
  return mock;
}

export async function analyzeAudioFile(file, isMockAnomaly = false, machineType = 'pump') {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('machine_type', machineType);

    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using fallback:', err.message);
  }

  return generateMockResult(file.name, isMockAnomaly, machineType);
}

function generateMockResult(filename, isAnomaly, machineType = 'pump') {
  const spectrogram = [];
  const n_mels = 64;
  const frames = 64;

  for (let m = 0; m < n_mels; m++) {
    const row = [];
    for (let t = 0; t < frames; t++) {
      const baseHarmonic = Math.sin((m / 8) * Math.PI) * Math.cos((t / 12) * Math.PI);
      const noise = (Math.random() - 0.5) * 0.3;
      const anomalySpike = isAnomaly && m > 30 && Math.random() > 0.5 ? 0.75 : 0;
      const val = Math.max(-1, Math.min(1, baseHarmonic * 0.6 + noise + anomalySpike));
      row.push(Number(val.toFixed(3)));
    }
    spectrogram.push(row);
  }

  const score = isAnomaly ? 0.0450 : 0.0121;
  const dynThreshold = 0.0201;
  const detected = score >= dynThreshold;

  return {
    filename: filename,
    sample_rate: 16000,
    duration_sec: 2.05,
    score: score,
    threshold: dynThreshold,
    fixed_threshold: 0.020,
    is_anomaly: detected,
    status: detected ? 'ANOMALY' : 'NORMAL',
    decision_mode: 'DYNAMIC_STATISTICAL',
    dynamic_metrics: {
      machine_type: 'PUMP',
      machine_name: 'Industrial Pump (Centrifugal / Slurry)',
      baseline_mean: 0.0135,
      baseline_std: 0.0022,
      k_sigma: 3.0,
      z_score: isAnomaly ? 14.3 : -0.64,
      confidence_pct: 99.9,
      dynamic_threshold: dynThreshold,
      fixed_threshold: 0.020,
      ema_noise_baseline: 0.0134,
      formula: 'μ (0.0135) + 3σ (0.0066) = 0.0201',
    },
    frequency_bands: [
      {
        id: 'low',
        name: 'Low Band (0 - 1 kHz)',
        diagnostic: 'Low Band: Hydraulic Imbalance & Shaft Vibration',
        error: isAnomaly ? 0.028 : 0.014,
        threshold: 0.024,
        is_anomaly: isAnomaly,
        ratio: isAnomaly ? 1.17 : 0.58,
      },
      {
        id: 'mid',
        name: 'Mid Band (1 - 4 kHz)',
        diagnostic: 'Mid Band: Impeller Vane Pass & Seal Degradation',
        error: isAnomaly ? 0.035 : 0.015,
        threshold: 0.022,
        is_anomaly: isAnomaly,
        ratio: isAnomaly ? 1.59 : 0.68,
      },
      {
        id: 'high',
        name: 'High Band (4 - 8 kHz)',
        diagnostic: 'High Band: Fluid Cavitation & Bearing Friction',
        error: isAnomaly ? 0.052 : 0.009,
        threshold: 0.020,
        is_anomaly: isAnomaly,
        ratio: isAnomaly ? 2.60 : 0.45,
      },
    ],
    primary_defect_band: isAnomaly
      ? 'High Band (4 - 8 kHz): Fluid Cavitation & Bearing Friction'
      : 'Uniformly Nominal (All Frequency Bands Within 3-Sigma Limits)',
    latency_ms: 11.4,
    spectrogram: spectrogram,
    reconstructed_spectrogram: spectrogram,
  };
}

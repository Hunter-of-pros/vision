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
  const sampleType = isAnomaly ? 'anomaly' : 'normal';
  const res = await fetch(
    `${API_BASE}/sample-analyze?sample_type=${sampleType}&filename=${encodeURIComponent(sampleFilename)}&machine_type=${encodeURIComponent(machineType)}`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) {
    throw new Error(`Real analysis failed: ${res.statusText}`);
  }
  const data = await res.json();
  data.is_live = true;
  return data;
}

export async function analyzeAudioFile(file, isMockAnomaly = false, machineType = 'pump') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('machine_type', machineType);

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    throw new Error(`Failed to process audio file: ${res.statusText}`);
  }
  const data = await res.json();
  data.is_live = true;
  return data;
}

export async function fetchLLMAdvice({
  machineType = 'pump',
  score = 0.02,
  threshold = 0.0201,
  zScore = 0,
  isAnomaly = false,
  primaryDefect = 'Uniformly Nominal',
  frequencyBands = [],
  apiKey = null,
}) {
  const res = await fetch(`${API_BASE}/llm-advice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      machine_type: machineType,
      score,
      threshold,
      z_score: zScore,
      is_anomaly: isAnomaly,
      primary_defect: primaryDefect,
      frequency_bands: frequencyBands,
      api_key: apiKey || undefined,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`Gemini 3.5 Flash request failed (${res.status}): ${res.statusText}`);
  }
  return await res.json();
}


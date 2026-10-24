import React, { useEffect, useRef } from 'react';
import { AlertOctagon, CheckCircle2, BarChart2, ShieldAlert, Volume2 } from 'lucide-react';

// Pre-synthesized 8kHz base64 WAV double-beep (880Hz & 1250Hz) fallback
const FALLBACK_BEEP_DATA_URI =
  'data:audio/wav;base64,UklGRhQLAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YfAKAACAzPLfnUwVFEmZ3fLPhDcOH2Cx6u27aiUNL3nG8eOkUhgSQpLZ89SLPBAbWarm78FyKg0qcsHv5qpZGxA8i9Tz2ZJCEhhSpOPxxnkvDSVqu+3qsWAfDjeEz/LdmUkUFUyd3/LMgDQOIWO06+y3ZyMOMXzJ8uGgTxYTRZbb89GHOg8dXK7o7r5uJw0sdcTw5adWGhE/jtbz1o4/ERpWp+XwxHUsDSduvu7orlwdDzqH0fPblkUTFk+g4fLJfDEOI2e37Ou0YyEONIDM8t+dTBUUSZnd8s+ENw4fYLHq7btqJQ0vecbx46RSGBJCktnz1Is8EBtZqubvwXIqDSpywe/mqlkbEDyL1PPZkkISGFKk4/HGeS8NJWq77eqxYB8ON4TP8t2ZSRQVTJ3f8syANA4hY7Tr7LdnIw4xfMny4aBPFhNFltvz0Yc6Dx1crujuvm4nDSx1xPDlp1YaET+O1vPWjj8RGlan5fDEdSwNJ26+7uiuXB0POofR89uWRRMWT6Dh8sl8MQ4jZ7fs67RjIQ40gMzy351MFRRJmd3yz4Q3Dh9gsertu2olDS95xvHjpFIYEkKS2fPUizwQG1mq5u/BcioNKnLB7+aqWRsQPIvU89mSQhIYUqTj8cZ5Lw0larvt6rFgHw43hM/y3ZlJFBVMnd/yzIA0DiFjtOvst2cjDjF8yfLhoE8WgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

let sharedAudioCtx = null;

function getSharedAudioContext() {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  return sharedAudioCtx;
}

// Automatically unlock audio context on initial user click
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

function playHtmlAudioFallback() {
  try {
    const audio = new Audio(FALLBACK_BEEP_DATA_URI);
    audio.volume = 0.6;
    audio.play().catch((err) => console.warn('HTML5 Audio fallback blocked:', err));
  } catch (err) {
    console.warn('HTML5 Audio init failed:', err);
  }
}

/**
 * Generates an unmistakable industrial warning alarm:
 * Pulse 1: 950 Hz, Pulse 2: 1250 Hz (high alert), Pulse 3: 950 Hz
 */
export function playAnomalyAlertBeep() {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) {
      playHtmlAudioFallback();
      return;
    }

    const triggerTones = () => {
      const now = ctx.currentTime;
      const playTone = (freq, startOffset, duration, volume = 0.38) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle'; // Rich audible harmonics
        osc.frequency.setValueAtTime(freq, now + startOffset);

        gain.gain.setValueAtTime(0.0001, now + startOffset);
        gain.gain.linearRampToValueAtTime(volume, now + startOffset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration);
      };

      // 3-pulse industrial warning chirp
      playTone(950, 0.00, 0.12, 0.40);
      playTone(1250, 0.15, 0.15, 0.45);
      playTone(950, 0.34, 0.13, 0.40);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => triggerTones()).catch(() => playHtmlAudioFallback());
    } else {
      triggerTones();
    }
  } catch (err) {
    console.warn('Anomaly audio alert failed, using HTML5 fallback:', err);
    playHtmlAudioFallback();
  }
}

export default function AnomalyGauge({ score = 0, threshold = 0.020, isAnomaly = false, analysisResult = null }) {
  const dynMetrics = analysisResult?.dynamic_metrics || null;
  const bands = analysisResult?.frequency_bands || [];
  const primaryDefect = analysisResult?.primary_defect_band || 'Uniformly Nominal';

  const numScore = typeof score === 'number' ? score : parseFloat(score) || 0;
  const dynamicThreshold = dynMetrics?.dynamic_threshold || (typeof threshold === 'number' ? threshold : parseFloat(threshold)) || 0.0201;
  const activeThreshold = dynamicThreshold;

  // True anomaly state: honor backend analysisResult decision first, then status string, then threshold comparison
  const activeIsAnomaly = analysisResult?.is_anomaly !== undefined
    ? Boolean(analysisResult.is_anomaly)
    : analysisResult?.status
    ? String(analysisResult.status).toLowerCase() === 'anomaly'
    : typeof isAnomaly === 'boolean'
    ? isAnomaly
    : numScore >= activeThreshold;

  // Crosses threshold check
  const crossesThreshold = Boolean(activeIsAnomaly || numScore >= activeThreshold);

  const lastAlertKeyRef = useRef(null);

  // Automatically trigger beep sound whenever score crosses threshold or anomaly is registered
  useEffect(() => {
    if (analysisResult && crossesThreshold) {
      const alertKey = `${analysisResult.filename || 'sample'}_${numScore}_${crossesThreshold}`;
      if (lastAlertKeyRef.current !== alertKey) {
        lastAlertKeyRef.current = alertKey;
        playAnomalyAlertBeep();
      }
    }
  }, [analysisResult, crossesThreshold, numScore]);

  // Meter percentage (0 to 0.20 range)
  const maxScale = 0.20;
  const percentage = Math.min(100, Math.max(0, (score / maxScale) * 100));
  const thresholdPercentage = Math.min(100, Math.max(0, (activeThreshold / maxScale) * 100));

  const zScore = dynMetrics?.z_score !== undefined ? dynMetrics.z_score : (score - 0.0135) / 0.0022;

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Top Status Pill */}
      <div style={{ marginBottom: '16px' }}>
        {activeIsAnomaly ? (
          <div
            className="status-pill status-anomaly"
            onClick={playAnomalyAlertBeep}
            style={{ cursor: 'pointer' }}
            title="Alarm beep sounded · Click to replay"
          >
            <AlertOctagon size={16} /> Anomaly Detected <Volume2 size={14} style={{ marginLeft: '4px', opacity: 0.9 }} />
          </div>
        ) : (
          <div className="status-pill status-normal">
            <CheckCircle2 size={16} /> Normal Operating Acoustic
          </div>
        )}
      </div>

      {/* Numerical Score Indicator */}
      <div style={{ margin: '14px 0 16px 0' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Autoencoder Reconstruction Error (MSE)
        </div>
        <div
          style={{
            fontSize: '44px',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: activeIsAnomaly ? 'var(--danger)' : 'var(--accent-cyan)',
            letterSpacing: '-0.03em',
            margin: '2px 0',
          }}
        >
          {numScore.toFixed(4)}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span>
            Adaptive Threshold (μ + 3σ):{' '}
            <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{activeThreshold.toFixed(4)}</strong>
          </span>
          {dynMetrics?.machine_type && (
            <span style={{ fontSize: '10px', background: 'rgba(56,189,248,0.15)', color: 'var(--accent-cyan)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
              {dynMetrics.machine_type}
            </span>
          )}
        </div>
      </div>

      {/* Primary Progress Bar / Gauge */}
      <div
        style={{
          width: '100%',
          height: '14px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '9999px',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: activeIsAnomaly
              ? 'linear-gradient(90deg, var(--warning), var(--danger))'
              : 'linear-gradient(90deg, var(--accent-blue), var(--success))',
            borderRadius: '9999px',
            transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />

        {/* Dynamic / Active Threshold Marker */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${thresholdPercentage}%`,
            width: '2px',
            background: '#ffffff',
            boxShadow: '0 0 8px #ffffff',
            zIndex: 2,
          }}
          title={`Active Threshold: ${activeThreshold.toFixed(4)}`}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginTop: '6px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>0.00 (Normal)</span>
        <span style={{ color: '#fff' }}>Threshold: {activeThreshold.toFixed(4)}</span>
        <span>0.20+ (Severe)</span>
      </div>

      {/* Dynamic Statistical Metrics & Ambient Drift Card */}
      <div className="dynamic-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            <BarChart2 size={14} /> Statistical Baseline Calibration
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {dynMetrics?.formula || 'μ + 3.0σ'}
          </span>
        </div>

        <div className="stat-pills-row">
          <div className="stat-pill-item">
            <div className="stat-pill-title">Baseline Mean (μ)</div>
            <div className="stat-pill-val">{dynMetrics?.baseline_mean?.toFixed(4) || '0.0135'}</div>
          </div>
          <div className="stat-pill-item">
            <div className="stat-pill-title">Std Dev (σ)</div>
            <div className="stat-pill-val">{dynMetrics?.baseline_std?.toFixed(4) || '0.0022'}</div>
          </div>
          <div className="stat-pill-item">
            <div className="stat-pill-title">Z-Score Deviation</div>
            <div
              className="stat-pill-val"
              style={{ color: zScore >= 3.0 ? 'var(--danger)' : zScore < 0 ? 'var(--success)' : 'var(--text-primary)' }}
            >
              {zScore > 0 ? `+${zScore.toFixed(2)}σ` : `${zScore.toFixed(2)}σ`}
            </div>
          </div>
        </div>

        {/* Ambient Noise Drift Tracker */}
        {dynMetrics?.ema_noise_baseline && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
            <span>Adaptive Ambient Noise Floor (EMA):</span>
            <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              {dynMetrics.ema_noise_baseline.toFixed(4)}
            </strong>
          </div>
        )}

        {/* Multi-Band Frequency Residuals Inspector */}
        {bands && bands.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
              3-Band Frequency Residuals (Mel Bins 0–63)
            </div>

            <div className="bands-container">
              {bands.map((b) => {
                const bandPercent = Math.min(100, Math.max(0, (b.error / (b.threshold * 2)) * 100));
                const trip = b.is_anomaly;

                return (
                  <div key={b.id} className={`band-row ${trip ? 'anomaly-trip' : ''}`}>
                    <div className="band-header">
                      <span className="band-title">{b.name}</span>
                      <span className={`band-tag ${trip ? 'alert' : 'nominal'}`}>
                        {trip ? 'Trip (>3σ Anomaly)' : 'Nominal'}
                      </span>
                    </div>

                    <div className="band-meter-bg">
                      <div
                        className="band-meter-fill"
                        style={{
                          width: `${bandPercent}%`,
                          background: trip
                            ? 'linear-gradient(90deg, var(--warning), var(--danger))'
                            : 'linear-gradient(90deg, var(--accent-blue), var(--success))',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Error: {b.error.toFixed(4)}</span>
                      <span>Limit (3σ): {b.threshold.toFixed(4)}</span>
                    </div>

                    <div className="band-diagnostic-text">{b.diagnostic}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Root Cause Banner */}
        <div className={`root-cause-banner ${activeIsAnomaly ? 'alert' : 'nominal'}`}>
          <div style={{ marginTop: '2px' }}>
            {activeIsAnomaly ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
          </div>
          <div>
            <strong>{activeIsAnomaly ? 'Primary Acoustic Defect Root Cause:' : 'Acoustic Health Assessment:'}</strong>
            <div style={{ marginTop: '2px' }}>{primaryDefect}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

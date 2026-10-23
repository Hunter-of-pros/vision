import React from 'react';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function AnomalyGauge({ score = 0, threshold = 0.085, isAnomaly = false }) {
  // Clamp score for visual meter (0 to 0.20 range)
  const maxScale = 0.20;
  const percentage = Math.min(100, Math.max(0, (score / maxScale) * 100));
  const thresholdPercentage = (threshold / maxScale) * 100;

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '16px' }}>
        {isAnomaly ? (
          <div className="status-pill status-anomaly">
            <AlertOctagon size={16} /> Anomaly Detected
          </div>
        ) : (
          <div className="status-pill status-normal">
            <CheckCircle2 size={16} /> Normal Operating Acoustic
          </div>
        )}
      </div>

      {/* Numerical score indicator */}
      <div style={{ margin: '20px 0' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Autoencoder Reconstruction Error (MSE)
        </div>
        <div
          style={{
            fontSize: '44px',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: isAnomaly ? 'var(--danger)' : 'var(--accent-cyan)',
            letterSpacing: '-0.03em',
            margin: '4px 0',
          }}
        >
          {score.toFixed(4)}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Decision Threshold: <strong style={{ color: '#fff' }}>{threshold.toFixed(3)}</strong>
        </div>
      </div>

      {/* Progress Bar / Gauge */}
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
            background: isAnomaly
              ? 'linear-gradient(90deg, var(--warning), var(--danger))'
              : 'linear-gradient(90deg, var(--accent-blue), var(--success))',
            borderRadius: '9999px',
            transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />

        {/* Threshold marker tick */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${thresholdPercentage}%`,
            width: '2px',
            background: '#ffffff',
            boxShadow: '0 0 8px #ffffff',
          }}
          title="Threshold marker"
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
        <span style={{ color: '#fff' }}>Threshold: {threshold}</span>
        <span>0.20+ (Severe)</span>
      </div>
    </div>
  );
}

import React, { useEffect, useRef } from 'react';

export default function Spectrogram({ spectrogramMatrix, title = 'Log-Mel Spectrogram (64 Mel Bins)' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !spectrogramMatrix || spectrogramMatrix.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const height = spectrogramMatrix.length;      // 64 bins (frequencies)
    const width = spectrogramMatrix[0].length;    // 64 frames (time)

    // Compute display dimensions matching container
    const displayWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 600;
    const displayHeight = 220;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Find matrix min & max for dynamic high-contrast scaling
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const v = spectrogramMatrix[r][c];
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
    const valRange = maxVal - minVal > 1e-4 ? maxVal - minVal : 1;

    // Colormap function (Vibrant Magma / Inferno industrial thermal gradient)
    const getColor = (normalizedVal) => {
      const v = Math.max(0, Math.min(1, normalizedVal));
      let r, g, b;
      if (v < 0.25) {
        // Deep indigo / purple
        r = Math.floor(v * 4 * 60);
        g = Math.floor(v * 4 * 15);
        b = Math.floor(80 + v * 4 * 120);
      } else if (v < 0.6) {
        // Hot Magenta / Pink
        const t = (v - 0.25) / 0.35;
        r = Math.floor(60 + t * 185);
        g = Math.floor(15 + t * 45);
        b = Math.floor(200 - t * 70);
      } else if (v < 0.85) {
        // Bright Orange / Amber
        const t = (v - 0.6) / 0.25;
        r = Math.floor(245 + t * 10);
        g = Math.floor(60 + t * 130);
        b = Math.floor(130 - t * 110);
      } else {
        // Radiant Yellow / White
        const t = (v - 0.85) / 0.15;
        r = 255;
        g = Math.floor(190 + t * 65);
        b = Math.floor(20 + t * 210);
      }
      return `rgb(${r},${g},${b})`;
    };

    const cellWidth = displayWidth / width;
    const cellHeight = displayHeight / height;

    // Draw cells (inverted Y so lowest frequencies are at the bottom)
    for (let row = 0; row < height; row++) {
      const sourceRow = height - 1 - row;
      const y = Math.floor(row * cellHeight);
      const h = Math.ceil(cellHeight) + 1;

      for (let col = 0; col < width; col++) {
        const val = spectrogramMatrix[sourceRow][col];
        const norm = (val - minVal) / valRange;
        ctx.fillStyle = getColor(norm);
        const x = Math.floor(col * cellWidth);
        const w = Math.ceil(cellWidth) + 1;
        ctx.fillRect(x, y, w, h);
      }
    }
  }, [spectrogramMatrix]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
          Librosa 64-Mel × 64-Frame
        </span>
      </div>

      <div className="spectrogram-container">
        <canvas ref={canvasRef} className="spectrogram-canvas" />
        <div className="spectrogram-legend">
          <span>8000 Hz (Nyquist)</span>
          <span>Time: 0.0s → 2.0s</span>
          <span>0 Hz (DC)</span>
        </div>
      </div>
    </div>
  );
}

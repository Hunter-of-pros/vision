import React, { useState, useRef } from 'react';
import { Upload, Music, AlertTriangle, CheckCircle, FileAudio } from 'lucide-react';

export default function AudioUploader({ onFileSelected, onSampleSelected, isAnalyzing, selectedFileName }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file) => {
    if (file && (file.type.includes('audio') || file.name.endsWith('.wav') || file.name.endsWith('.mp3'))) {
      onFileSelected(file);
    } else {
      alert('Please select a valid .wav or audio file.');
    }
  };

  return (
    <div>
      <div
        className={`dropzone ${isDragging ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".wav,.mp3,.flac"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="upload-icon">
          <Upload size={24} />
        </div>
        <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
          {selectedFileName ? selectedFileName : 'Drop factory audio clip (.wav) here'}
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Supports 16kHz standard industrial machine sounds (MIMII / ToyADMOS)
        </p>
      </div>

      <div className="sample-selector">
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Or test with benchmark presets:
        </span>
        <div className="sample-buttons">
          <button
            type="button"
            className="btn-sample"
            disabled={isAnalyzing}
            onClick={() => onSampleSelected('fan_normal_id00.wav', false)}
          >
            <CheckCircle size={14} color="var(--success)" /> Normal Fan Sound
          </button>
          <button
            type="button"
            className="btn-sample"
            disabled={isAnalyzing}
            onClick={() => onSampleSelected('pump_normal_id02.wav', false)}
          >
            <CheckCircle size={14} color="var(--success)" /> Normal Pump
          </button>
          <button
            type="button"
            className="btn-sample"
            disabled={isAnalyzing}
            onClick={() => onSampleSelected('bearing_damage_anomaly.wav', true)}
          >
            <AlertTriangle size={14} color="var(--danger)" /> Damaged Bearing (Anomaly)
          </button>
          <button
            type="button"
            className="btn-sample"
            disabled={isAnalyzing}
            onClick={() => onSampleSelected('valve_leak_anomaly.wav', true)}
          >
            <AlertTriangle size={14} color="var(--danger)" /> Valve Leak (Anomaly)
          </button>
        </div>
      </div>
    </div>
  );
}

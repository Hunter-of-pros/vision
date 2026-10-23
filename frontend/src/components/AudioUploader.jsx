import React, { useState, useRef, useEffect } from 'react';
import { Upload, AlertTriangle, CheckCircle, Cpu, Radio } from 'lucide-react';

const MACHINE_OPTIONS = [
  {
    id: 'pump',
    name: 'Industrial Pump',
    icon: '🚰',
    subtitle: 'Centrifugal / Slurry Pump',
    freqFocus: 'High: Cavitation · Low: Shaft Imbalance',
    thresholdText: 'τ = 0.0201',
    samples: [
      { label: 'Normal Pump (ID 00)', file: 'normal_id_00_00000000.wav', isAnomaly: false },
      { label: 'Normal Pump (ID 02)', file: 'normal_id_02_00000000.wav', isAnomaly: false },
      { label: 'Anomaly Pump (ID 00)', file: 'anomaly_id_00_00000000.wav', isAnomaly: true },
      { label: 'Anomaly Pump (ID 02)', file: 'anomaly_id_02_00000000.wav', isAnomaly: true },
    ],
  },
  {
    id: 'valve',
    name: 'Solenoid Valve',
    icon: '⚙️',
    subtitle: 'Pneumatic / Hydraulic Actuator',
    freqFocus: 'High: Air Leak · Mid: Spool Stiction',
    thresholdText: 'τ = 0.0155',
    samples: [
      { label: 'Normal Valve (ID 00)', file: 'normal_id_00_00000000.wav', isAnomaly: false },
      { label: 'Normal Valve (ID 02)', file: 'normal_id_02_00000000.wav', isAnomaly: false },
      { label: 'Anomaly Valve (ID 00)', file: 'anomaly_id_00_00000000.wav', isAnomaly: true },
      { label: 'Anomaly Valve (ID 02)', file: 'anomaly_id_02_00000000.wav', isAnomaly: true },
    ],
  },
  {
    id: 'fan',
    name: 'Ventilation Fan',
    icon: '🌀',
    subtitle: 'Industrial Rotor & Blower',
    freqFocus: 'Low: Rotor Imbalance · High: Friction',
    thresholdText: 'τ = 0.0179',
    samples: [
      { label: 'Normal Fan (ID 00)', file: 'normal_id_00_00000000.wav', isAnomaly: false },
      { label: 'Normal Fan (ID 02)', file: 'normal_id_02_00000000.wav', isAnomaly: false },
      { label: 'Anomaly Fan (ID 00)', file: 'anomaly_id_00_00000000.wav', isAnomaly: true },
      { label: 'Anomaly Fan (ID 02)', file: 'anomaly_id_02_00000000.wav', isAnomaly: true },
    ],
  },
];

export default function AudioUploader({
  onFileSelected,
  onSampleSelected,
  selectedMachine = 'pump',
  onMachineChange,
  isAnalyzing,
  selectedFileName,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedMachine]);

  const activeMachine = MACHINE_OPTIONS.find((m) => m.id === selectedMachine) || MACHINE_OPTIONS[0];

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
      {/* Step 1: Machine Selector */}
      <div className="machine-selector-section">
        <div className="machine-selector-header">
          <span className="machine-selector-title">
            <Radio size={14} color="var(--accent-cyan)" />
            Step 1 · Choose Machine Asset
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Frequency profile auto-adapts
          </span>
        </div>

        <div className="machine-cards-grid">
          {MACHINE_OPTIONS.map((m) => {
            const isSelected = m.id === selectedMachine;
            return (
              <button
                key={m.id}
                type="button"
                className={`machine-select-card ${isSelected ? 'active' : ''}`}
                onClick={() => onMachineChange && onMachineChange(m.id)}
              >
                <div className="machine-card-top">
                  <span className="machine-card-name">
                    <span>{m.icon}</span> {m.name}
                  </span>
                  <span className="machine-card-badge">{m.thresholdText}</span>
                </div>
                <div className="machine-card-sub">{m.subtitle}</div>
                <div className="machine-card-freq">{m.freqFocus}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Upload Option */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Upload size={13} color="var(--accent-purple)" />
          Step 2 · Upload {activeMachine.name} Audio Clip
        </div>

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
            {selectedFileName ? selectedFileName : `Drop ${activeMachine.name} audio clip (.wav) here`}
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Analyzes 64-band Log-Mel frequencies against calibrated {activeMachine.name} baseline ({activeMachine.thresholdText})
          </p>
        </div>
      </div>

      {/* Preset Real Factory Samples for Chosen Machine */}
      <div className="sample-selector">
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Or test with real MIMII {activeMachine.name} recordings:
        </span>
        <div className="sample-buttons">
          {activeMachine.samples.map((s, idx) => (
            <button
              key={idx}
              type="button"
              className="btn-sample"
              disabled={isAnalyzing}
              onClick={() => onSampleSelected(s.file, s.isAnomaly, activeMachine.id)}
            >
              {s.isAnomaly ? (
                <AlertTriangle size={14} color="var(--danger)" />
              ) : (
                <CheckCircle size={14} color="var(--success)" />
              )}
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

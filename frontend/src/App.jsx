import React, { useState, useEffect } from 'react';
import { Activity, Radio, Cpu, RefreshCw, Info, ShieldCheck, AlertTriangle, Volume2 } from 'lucide-react';
import AudioUploader from './components/AudioUploader';
import Spectrogram from './components/Spectrogram';
import AnomalyGauge from './components/AnomalyGauge';
import MetricsCard from './components/MetricsCard';
import LLMAdvisorCard from './components/LLMAdvisorCard';
import AnomalyActionMenu from './components/AnomalyActionMenu';
import MachinePrognosticsCard from './components/MachinePrognosticsCard';
import { analyzeAudioFile, analyzePreset, fetchModelProfile, checkBackendHealth } from './services/api';
import { playAnomalyAlarm, unlockAudioContext } from './services/sound';

export default function App() {
  const [selectedMachine, setSelectedMachine] = useState('pump');
  const [selectedMachineId, setSelectedMachineId] = useState('p001');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load initial model profile, check backend status, and auto-load nominal baseline
  useEffect(() => {
    async function init() {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);
      const profile = await fetchModelProfile();
      setProfileData(profile);

      // Auto-load initial baseline sample so spectrogram graph and normal status display immediately
      try {
        const defaultSample = 'normal_id_00_00000000.wav';
        setSelectedFile({ name: defaultSample });
        const result = await analyzePreset(defaultSample, false, 'pump', 'p001');
        if (result) {
          setAnalysisResult(result);
        }
      } catch (err) {
        console.warn('Initial preset analysis auto-load skipped:', err);
      }
    }
    init();
  }, []);

  const handleFileSelect = async (file) => {
    unlockAudioContext();
    setSelectedFile(file);
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeAudioFile(file, false, selectedMachine, selectedMachineId);
      setAnalysisResult(result);
      setRefreshTrigger((prev) => prev + 1);

      // Trigger alarm buzzer if anomaly or crosses threshold
      const isAnom = Boolean(
        result?.is_anomaly ||
        result?.status === 'anomaly' ||
        (result?.score !== undefined && result?.threshold !== undefined && result.score >= result.threshold)
      );
      if (isAnom) {
        playAnomalyAlarm();
      }
    } catch (err) {
      console.error(err);
      setAnalysisError(err.message || 'Failed to analyze uploaded audio clip. Please check backend connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSampleSelect = async (sampleName, isAnomaly, machineOverride) => {
    unlockAudioContext();
    const machine = machineOverride || selectedMachine;
    setSelectedFile({ name: sampleName });
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzePreset(sampleName, isAnomaly, machine, selectedMachineId);
      setAnalysisResult(result);
      setRefreshTrigger((prev) => prev + 1);

      // Trigger alarm buzzer if anomaly or crosses threshold
      const isAnom = Boolean(
        result?.is_anomaly ||
        result?.status === 'anomaly' ||
        isAnomaly ||
        (result?.score !== undefined && result?.threshold !== undefined && result.score >= result.threshold)
      );
      if (isAnom) {
        playAnomalyAlarm();
      }
    } catch (err) {
      console.error(err);
      setAnalysisError(err.message || 'Failed to process sample audio clip. Please check backend connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMachineTypeChange = (machineType) => {
    setSelectedMachine(machineType);
    setSelectedFile(null);
    setAnalysisResult(null);
    const prefix = machineType === 'pump' ? 'p' : machineType === 'valve' ? 'v' : 'f';
    setSelectedMachineId(`${prefix}001`);
  };

  const handleMachineIdChange = (newMachineId) => {
    setSelectedMachineId(newMachineId);
  };

  const handleAnomalyAssigned = (targetMachineId) => {
    setSelectedMachineId(targetMachineId);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <Radio size={26} />
          </div>
          <div>
            <h1 className="brand-title">VISION</h1>
            <p className="brand-subtitle">TinyML Industrial Acoustic Anomaly Detector & Predictive Maintenance Hub</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => {
              unlockAudioContext();
              playAnomalyAlarm();
            }}
            className="header-badge"
            style={{
              cursor: 'pointer',
              background: 'rgba(239, 68, 68, 0.15)',
              borderColor: 'var(--danger)',
              color: '#fca5a5',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Click to test your speaker sound with the acoustic anomaly warning alarm"
          >
            <Volume2 size={14} color="var(--danger)" />
            <span>TEST ALARM BEEP</span>
          </button>

          <div className="header-badge">
            <span className="pulse-dot" style={{ backgroundColor: backendOnline ? 'var(--success)' : 'var(--accent-cyan)' }} />
            {backendOnline ? 'BACKEND CONNECTED' : 'EDGE DEMO ENGINE'}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="dashboard-grid">
        {/* Left Column: Audio Ingestion & Spectrogram */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card: Audio Uploader with Machine Asset Selection */}
          <div className="glass-panel">
            <div className="card-header">
              <h2 className="card-title">
                <Radio size={18} color="var(--accent-cyan)" />
                1 · Audio Processor & Asset Selector
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Inspector's Ears</span>
            </div>
            <div className="card-body">
              <AudioUploader
                selectedMachine={selectedMachine}
                onMachineChange={handleMachineTypeChange}
                selectedMachineId={selectedMachineId}
                onMachineIdChange={handleMachineIdChange}
                refreshTrigger={refreshTrigger}
                onFileSelected={handleFileSelect}
                onSampleSelected={handleSampleSelect}
                isAnalyzing={isAnalyzing}
                selectedFileName={selectedFile?.name}
              />
            </div>
          </div>

          {/* Card: Spectrogram Heatmap */}
          <div className="glass-panel">
            <div className="card-header">
              <h2 className="card-title">
                <Activity size={18} color="var(--accent-purple)" />
                Frequency Spectrum Analysis
              </h2>
              {isAnalyzing && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent-cyan)' }}>
                  <RefreshCw size={14} className="pulse-dot" /> Computing FFT...
                </span>
              )}
            </div>
            <div className="card-body">
              {analysisResult ? (
                <Spectrogram spectrogramMatrix={analysisResult.spectrogram} />
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <Activity size={32} color="var(--accent-purple)" style={{ opacity: 0.35, marginBottom: '10px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    No Audio Clip Loaded
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    Upload or select a sample above to compute 64-band Log-Mel frequencies
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Brain, Decision & Anomaly Action Menu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card: AI Decision & Reconstruction Gauge */}
          <div className="glass-panel">
            <div className="card-header">
              <h2 className="card-title">
                <Cpu size={18} color="var(--accent-blue)" />
                2 · The AI Brain (PyTorch Autoencoder)
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Reconstruction Engine</span>
            </div>
            <div className="card-body">
              {analysisError && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid var(--danger)',
                    color: '#fca5a5',
                    fontSize: '13px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '4px' }}>
                      Audio Analysis Request Failed
                    </div>
                    <div>{analysisError}</div>
                  </div>
                </div>
              )}
              {analysisResult ? (
                <>
                  <AnomalyGauge
                    score={analysisResult.score}
                    threshold={analysisResult.threshold}
                    isAnomaly={analysisResult.is_anomaly}
                    analysisResult={analysisResult}
                  />

                  {/* Interactive Anomaly Action Menu if Anomaly is detected */}
                  {analysisResult.is_anomaly && (
                    <AnomalyActionMenu
                      analysisResult={analysisResult}
                      selectedMachineType={selectedMachine}
                      currentMachineId={selectedMachineId}
                      onAnomalyAssigned={handleAnomalyAssigned}
                    />
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '52px 20px', color: 'var(--text-muted)' }}>
                  <Cpu size={36} color="var(--accent-cyan)" style={{ opacity: 0.35, marginBottom: '12px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Ready to Inspect {selectedMachine === 'pump' ? 'Pump' : selectedMachine === 'valve' ? 'Valve' : 'Fan'} ({selectedMachineId})
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '6px', color: 'var(--text-muted)' }}>
                    Baseline calibrated at τ = {selectedMachine === 'pump' ? '0.0201' : selectedMachine === 'valve' ? '0.0155' : '0.0179'}. Awaiting audio input.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card: Digital Factory Inspector Explanation */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
              <Info size={16} /> How the Digital Inspector Decides:
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              The <strong>Autoencoder</strong> compressed this audio down to an 8×8 bottleneck and reconstructed the original sound. Normal machine hum reconstructs easily (low error). When damaged gears, bearing rattles, or fluid leaks occur, high reconstruction error triggers the <strong>🔴 ANOMALY</strong> alert, allowing you to log it to the machine's historical record.
            </p>
          </div>
        </div>
      </main>

      {/* Machine Asset Prognostics & Predictive Fault Analysis */}
      <MachinePrognosticsCard
        machineId={selectedMachineId}
        machineType={selectedMachine}
        refreshTrigger={refreshTrigger}
      />

      {/* Gemini LLM Anomaly Diagnostics & Maintenance Advisory */}
      {analysisResult && (
        <LLMAdvisorCard
          machineType={selectedMachine}
          analysisResult={analysisResult}
        />
      )}

      {/* Edge Performance & Profiler Section */}
      <section className="glass-panel">
        <div className="card-header">
          <h2 className="card-title">
            <ShieldCheck size={18} color="var(--success)" />
            3 & 4 · The Shrink Tool (TFLite INT8) & Profiler Metrics
          </h2>
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Target: &lt; 256 KB Flash
          </span>
        </div>
        <div className="card-body" style={{ paddingTop: '8px' }}>
          <MetricsCard profile={profileData} />
        </div>
      </section>
    </div>
  );
}

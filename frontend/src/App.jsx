import React, { useState, useEffect } from 'react';
import { Activity, Radio, Cpu, RefreshCw, Info, ShieldCheck } from 'lucide-react';
import AudioUploader from './components/AudioUploader';
import Spectrogram from './components/Spectrogram';
import AnomalyGauge from './components/AnomalyGauge';
import MetricsCard from './components/MetricsCard';
import { analyzeAudioFile, analyzePreset, fetchModelProfile, checkBackendHealth } from './services/api';

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Load initial model profile and check backend status
  useEffect(() => {
    async function init() {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);
      const profile = await fetchModelProfile();
      setProfileData(profile);

      // Trigger an initial normal demonstration analysis with real fan recording
      handleSampleSelect('normal_id_00_00000000.wav', false);
    }
    init();
  }, []);

  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    setIsAnalyzing(true);
    try {
      const result = await analyzeAudioFile(file, false);
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSampleSelect = async (sampleName, isAnomaly) => {
    setSelectedFile({ name: sampleName });
    setIsAnalyzing(true);
    try {
      const result = await analyzePreset(sampleName, isAnomaly);
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
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
            <p className="brand-subtitle">TinyML Industrial Acoustic Anomaly Detector</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
          {/* Card: Audio Uploader */}
          <div className="glass-panel">
            <div className="card-header">
              <h2 className="card-title">
                <Radio size={18} color="var(--accent-cyan)" />
                1 · Audio Processor (Librosa)
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Inspector's Ears</span>
            </div>
            <div className="card-body">
              <AudioUploader
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
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Upload audio to render Log-Mel frequency spectrum
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Brain & Anomaly Decision */}
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
              {analysisResult ? (
                <AnomalyGauge
                  score={analysisResult.score}
                  threshold={analysisResult.threshold}
                  isAnomaly={analysisResult.is_anomaly}
                  analysisResult={analysisResult}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Awaiting inference input...
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
              The <strong>Autoencoder</strong> compressed this audio down to an 8×8 bottleneck and tried to reconstruct the original sound. Normal machine hum reconstructs easily (low error). When damaged gears, bearing rattles, or air leaks occur, the AI cannot reconstruct the unexpected patterns, producing a high error spike that triggers the <strong>🔴 ANOMALY</strong> alert.
            </p>
          </div>
        </div>
      </main>

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

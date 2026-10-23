import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, Wrench, ShieldCheck, Key, RefreshCw, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchLLMAdvice } from '../services/api';

export default function LLMAdvisorCard({
  machineType = 'pump',
  analysisResult = null,
}) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('vision_gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [adviceData, setAdviceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const isAnomaly = analysisResult?.is_anomaly ?? (analysisResult?.score >= analysisResult?.threshold);
  const score = analysisResult?.score || 0;
  const threshold = analysisResult?.threshold || 0.0201;
  const zScore = analysisResult?.dynamic_metrics?.z_score || 0;
  const primaryDefect = analysisResult?.primary_defect_band || 'Uniformly Nominal';
  const bands = analysisResult?.frequency_bands || [];

  const handleSaveKey = (val) => {
    setApiKey(val);
    if (val) {
      localStorage.setItem('vision_gemini_api_key', val);
    } else {
      localStorage.removeItem('vision_gemini_api_key');
    }
  };

  const loadAdvice = async (customKey = apiKey) => {
    if (!analysisResult) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchLLMAdvice({
        machineType,
        score,
        threshold,
        zScore,
        primaryDefect,
        frequencyBands: bands,
        apiKey: customKey || undefined,
      });
      if (res && res.advice) {
        setAdviceData(res);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to generate LLM advice. Please check your connection or API key.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch advice whenever a new analysisResult arrives
  useEffect(() => {
    if (analysisResult) {
      loadAdvice(apiKey);
    } else {
      setAdviceData(null);
    }
  }, [analysisResult, machineType]);

  if (!analysisResult) {
    return null;
  }

  const advice = adviceData?.advice;
  const isGeminiLive = adviceData?.source === 'gemini';

  return (
    <div className="glass-panel llm-advisor-container" style={{ marginTop: '24px' }}>
      {/* Header */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--accent-cyan)" />
          Gemini 3.5 Flash Industrial Advisor
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '3px 8px',
              borderRadius: '9999px',
              background: isGeminiLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.12)',
              color: isGeminiLive ? 'var(--success)' : 'var(--accent-cyan)',
              border: `1px solid ${isGeminiLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span className="pulse-dot" style={{ background: isGeminiLive ? 'var(--success)' : 'var(--accent-cyan)' }} />
            {isGeminiLive ? adviceData?.model_used || 'Gemini 3.5 Flash' : 'Gemini 3.5 Flash'}
          </span>

          <button
            type="button"
            className="btn-key-toggle"
            onClick={() => setShowKeyInput(!showKeyInput)}
            title="Configure Gemini API Key"
          >
            <Key size={12} />
            {apiKey ? 'API Key Set' : 'Add Gemini Key'}
            {showKeyInput ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <button
            type="button"
            className="btn-refresh-llm"
            disabled={isLoading}
            onClick={() => loadAdvice(apiKey)}
            title="Re-run Gemini Analysis"
          >
            <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} />
            {isLoading ? 'Analyzing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Optional Gemini API Key Drawer */}
      {showKeyInput && (
        <div className="api-key-drawer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
            <Key size={14} color="var(--accent-cyan)" />
            Custom Gemini API Key (Optional)
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.4 }}>
            Enter your Google Gemini API key to query Gemini 3.8 Flash live. If left blank, the backend environment key or built-in industrial engineering engine is utilized.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              placeholder="AIzaSy..."
              className="api-key-input"
              value={apiKey}
              onChange={(e) => handleSaveKey(e.target.value)}
            />
            {apiKey && (
              <button
                type="button"
                className="btn-clear-key"
                onClick={() => handleSaveKey('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary Banner */}
      {advice?.summary && (
        <div className={`llm-summary-banner ${isAnomaly ? 'anomaly' : 'normal'}`}>
          <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#f1f5f9' }}>
            <strong>Executive AI Diagnosis:</strong> {advice.summary}
          </div>
        </div>
      )}

      {/* 3 Core Output Pillars */}
      {advice && (
        <div className="llm-advice-grid">
          {/* 1. Root Causes */}
          <div className="advice-pillar pillar-causes">
            <div className="pillar-header">
              <AlertTriangle size={16} color="var(--danger)" />
              <span>Root Causes for Anomaly</span>
            </div>
            <p className="pillar-subtitle">Primary mechanical, fluid, or electrical drivers of the defect:</p>
            <ul className="pillar-list">
              {advice.root_causes?.map((item, idx) => (
                <li key={idx} className="pillar-list-item">
                  <span className="bullet-indicator bullet-causes" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. Possible Solutions */}
          <div className="advice-pillar pillar-solutions">
            <div className="pillar-header">
              <Wrench size={16} color="var(--accent-cyan)" />
              <span>Possible Immediate Solutions</span>
            </div>
            <p className="pillar-subtitle">Actionable corrective steps for technicians on the plant floor:</p>
            <ul className="pillar-list">
              {advice.possible_solutions?.map((item, idx) => (
                <li key={idx} className="pillar-list-item">
                  <span className="bullet-indicator bullet-solutions" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Preventive Measures */}
          <div className="advice-pillar pillar-prevention">
            <div className="pillar-header">
              <ShieldCheck size={16} color="var(--success)" />
              <span>Preventive Measures</span>
            </div>
            <p className="pillar-subtitle">Condition monitoring and maintenance protocols to avoid recurrence:</p>
            <ul className="pillar-list">
              {advice.preventive_measures?.map((item, idx) => (
                <li key={idx} className="pillar-list-item">
                  <span className="bullet-indicator bullet-prevention" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {errorMsg && (
        <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '12px', textAlign: 'center' }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}

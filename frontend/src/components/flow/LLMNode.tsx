import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { type NodeProps } from '@xyflow/react';
import { Brain, ChevronDown, ChevronRight, Shield, RefreshCw, Clock } from 'lucide-react';

const VENDOR_MODELS: Record<string, string[]> = {
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  google: ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'],
  mistral: ['mistral-small-latest', 'open-mistral-nemo', 'mistral-large-latest'],
  ollama: ['llama3.2', 'phi3', 'qwen2.5', 'mistral', 'gemma2'],
  openrouter: ['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free', 'deepseek/deepseek-v4-flash:free', 'google/gemma-4-31b-it:free', 'meta-llama/llama-3.2-3b-instruct:free'],
};

export default function LLMNode({ data, selected }: NodeProps) {
  const d = data as any;
  const [showFallback, setShowFallback] = useState(!!d.fallback_vendor);
  const [showRetry, setShowRetry] = useState(!!d.retry_max);
  const [showTimeout, setShowTimeout] = useState(!!d.timeout);

  return (
    <div className={`flow-node node-llm ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-header">
        <Brain size={13} />
        LLM Node
        <span className="badge badge-purple" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>{d.vendor || 'groq'}</span>
      </div>
      <div className="flow-node-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Primary Model */}
        <select
          className="input-field"
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
          value={d.vendor || 'groq'}
          onChange={(e) => d.onChange?.({ ...d, vendor: e.target.value, model: VENDOR_MODELS[e.target.value][0] })}
        >
          {Object.keys(VENDOR_MODELS).map((v) => (
            <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
          ))}
        </select>
        <select
          className="input-field"
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
          value={d.model || VENDOR_MODELS[d.vendor || 'groq'][0]}
          onChange={(e) => d.onChange?.({ ...d, model: e.target.value })}
        >
          {(VENDOR_MODELS[d.vendor || 'groq'] || []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: 60 }}>Temp: {d.temperature ?? 0.7}</span>
          <input
            type="range" min="0" max="1" step="0.1"
            value={d.temperature ?? 0.7}
            onChange={(e) => d.onChange?.({ ...d, temperature: parseFloat(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
          />
        </div>
        <textarea
          className="input-field"
          style={{ fontSize: '0.72rem', padding: '0.4rem', minHeight: 52, resize: 'none' }}
          placeholder="System prompt..."
          value={d.system_prompt || ''}
          onChange={(e) => d.onChange?.({ ...d, system_prompt: e.target.value })}
        />

        {/* ─── Fallback Model ─── */}
        <div className="collapsible-section">
          <div className="collapsible-header" onClick={() => setShowFallback(!showFallback)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Shield size={10} /> Fallback Model
            </span>
            {showFallback ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </div>
          <div className={`collapsible-body ${showFallback ? 'expanded' : 'collapsed'}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingTop: '0.4rem' }}>
              <select
                className="input-field"
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.4rem' }}
                value={d.fallback_vendor || ''}
                onChange={(e) => d.onChange?.({
                  ...d,
                  fallback_vendor: e.target.value,
                  fallback_model: e.target.value ? VENDOR_MODELS[e.target.value]?.[0] || '' : '',
                })}
              >
                <option value="">None</option>
                {Object.keys(VENDOR_MODELS).map((v) => (
                  <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                ))}
              </select>
              {d.fallback_vendor && (
                <select
                  className="input-field"
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.4rem' }}
                  value={d.fallback_model || ''}
                  onChange={(e) => d.onChange?.({ ...d, fallback_model: e.target.value })}
                >
                  {(VENDOR_MODELS[d.fallback_vendor] || []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* ─── Retry ─── */}
        <div className="collapsible-section">
          <div className="collapsible-header" onClick={() => setShowRetry(!showRetry)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <RefreshCw size={10} /> Retry
            </span>
            {showRetry ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </div>
          <div className={`collapsible-body ${showRetry ? 'expanded' : 'collapsed'}`}>
            <div style={{ display: 'flex', gap: '0.4rem', paddingTop: '0.4rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Retries</div>
                <input
                  type="number"
                  className="input-field"
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.4rem' }}
                  value={d.retry_max ?? 0}
                  min={0} max={10}
                  onChange={(e) => d.onChange?.({ ...d, retry_max: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Backoff (s)</div>
                <input
                  type="number"
                  className="input-field"
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.4rem' }}
                  value={d.retry_backoff ?? 1.5}
                  min={0.5} max={30} step={0.5}
                  onChange={(e) => d.onChange?.({ ...d, retry_backoff: parseFloat(e.target.value) || 1.5 })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Timeout ─── */}
        <div className="collapsible-section">
          <div className="collapsible-header" onClick={() => setShowTimeout(!showTimeout)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={10} /> Timeout
            </span>
            {showTimeout ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </div>
          <div className={`collapsible-body ${showTimeout ? 'expanded' : 'collapsed'}`}>
            <div style={{ paddingTop: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="number"
                  className="input-field"
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.4rem', width: 64 }}
                  value={d.timeout ?? ''}
                  placeholder="120"
                  min={5} max={600}
                  onChange={(e) => d.onChange?.({ ...d, timeout: parseInt(e.target.value) || undefined })}
                />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>seconds</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

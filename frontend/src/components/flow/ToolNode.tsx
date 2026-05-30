import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { type NodeProps } from '@xyflow/react';
import { Wrench, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

const BUILT_IN_TOOLS = [
  { name: 'web_search', label: 'Web Search' },
  { name: 'wikipedia',  label: 'Wikipedia' },
  { name: 'calculator', label: 'Calculator' },
  { name: 'python_repl', label: 'Python REPL' },
  { name: 'http_request', label: 'HTTP Request' },
];

export default function ToolNode({ data, selected }: NodeProps) {
  const d = data as any;
  const customTools: Array<{ name: string; label: string }> = d._customTools || [];
  const allTools = [...BUILT_IN_TOOLS, ...customTools];
  const [showRetry, setShowRetry] = useState(!!d.retry_max);

  return (
    <div className={`flow-node node-tool ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-header">
        <Wrench size={13} />
        Tool Node
      </div>
      <div className="flow-node-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <select
          className="input-field"
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
          value={d.tool_name || 'calculator'}
          onChange={(e) => d.onChange?.({ ...d, tool_name: e.target.value })}
        >
          {BUILT_IN_TOOLS.length > 0 && (
            <optgroup label="Built-in Tools">
              {BUILT_IN_TOOLS.map((t) => (
                <option key={t.name} value={t.name}>{t.label}</option>
              ))}
            </optgroup>
          )}
          {customTools.length > 0 && (
            <optgroup label="My Custom Tools">
              {customTools.map((t) => (
                <option key={t.name} value={t.name}>{t.label}</option>
              ))}
            </optgroup>
          )}
        </select>
        {d.tool_name === 'web_search' && (
          <input
            type="text"
            className="input-field"
            style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}
            placeholder="Tavily API key (optional)"
            value={d.tool_config?.api_key || ''}
            onChange={(e) => d.onChange?.({ ...d, tool_config: { ...d.tool_config, api_key: e.target.value } })}
          />
        )}
        <div className="badge badge-success" style={{ alignSelf: 'flex-start' }}>
          {allTools.find((t) => t.name === d.tool_name)?.label || d.tool_name || 'Tool'}
        </div>

        {/* Retry */}
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
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

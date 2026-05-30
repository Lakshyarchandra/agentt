import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { type NodeProps } from '@xyflow/react';
import { LogOut, Braces, ChevronDown, ChevronRight } from 'lucide-react';

const SCHEMA_TEMPLATES: Record<string, object> = {
  'Simple Object': {
    type: 'object',
    properties: {
      result: { type: 'string', description: 'The main result' },
      confidence: { type: 'number', description: 'Confidence score 0-1' },
    },
    required: ['result'],
  },
  'List Response': {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of items',
      },
      count: { type: 'integer' },
    },
    required: ['items'],
  },
  'Analysis': {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
      key_points: { type: 'array', items: { type: 'string' } },
      score: { type: 'number', minimum: 0, maximum: 10 },
    },
    required: ['summary', 'sentiment'],
  },
};

export default function OutputNode({ data, selected }: NodeProps) {
  const d = data as any;
  const [showStructured, setShowStructured] = useState(!!d.structured_output_enabled);

  return (
    <div className={`flow-node node-output ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-header">
        <LogOut size={13} />
        Output Node
        {d.structured_output_enabled && (
          <span className="badge badge-info" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>JSON</span>
        )}
      </div>
      <div className="flow-node-body">
        <input
          type="text"
          className="input-field"
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
          placeholder="Output label..."
          value={d.label || 'Agent Output'}
          onChange={(e) => d.onChange?.({ ...d, label: e.target.value })}
        />
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          Terminal output of the agent graph
        </div>

        {/* Structured Output */}
        <div className="collapsible-section">
          <div className="collapsible-header" onClick={() => setShowStructured(!showStructured)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Braces size={10} /> Structured Output
            </span>
            {showStructured ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </div>
          <div className={`collapsible-body ${showStructured ? 'expanded' : 'collapsed'}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingTop: '0.4rem' }}>
              {/* Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Enable JSON Schema</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={d.structured_output_enabled || false}
                    onChange={(e) => d.onChange?.({ ...d, structured_output_enabled: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {d.structured_output_enabled && (
                <>
                  {/* Template presets */}
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {Object.keys(SCHEMA_TEMPLATES).map((name) => (
                      <button
                        key={name}
                        onClick={() => d.onChange?.({
                          ...d,
                          structured_output_schema: JSON.stringify(SCHEMA_TEMPLATES[name], null, 2),
                        })}
                        style={{
                          padding: '0.15rem 0.4rem', fontSize: '0.65rem',
                          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                          borderRadius: 4, color: 'var(--text-secondary)', cursor: 'pointer',
                          fontFamily: 'Inter, sans-serif',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                      >
                        {name}
                      </button>
                    ))}
                  </div>

                  {/* Schema editor */}
                  <textarea
                    className="input-field"
                    style={{
                      fontSize: '0.68rem', padding: '0.4rem',
                      minHeight: 80, resize: 'none',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    placeholder='{"type": "object", "properties": {...}}'
                    value={
                      typeof d.structured_output_schema === 'string'
                        ? d.structured_output_schema
                        : d.structured_output_schema
                          ? JSON.stringify(d.structured_output_schema, null, 2)
                          : ''
                    }
                    onChange={(e) => d.onChange?.({ ...d, structured_output_schema: e.target.value })}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

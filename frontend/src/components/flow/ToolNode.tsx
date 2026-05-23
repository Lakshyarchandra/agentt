import { Handle, Position } from '@xyflow/react';
import { type NodeProps } from '@xyflow/react';
import { Wrench } from 'lucide-react';

const TOOLS = [
  { name: 'web_search', label: 'Web Search' },
  { name: 'wikipedia',  label: 'Wikipedia' },
  { name: 'calculator', label: 'Calculator' },
  { name: 'python_repl', label: 'Python REPL' },
  { name: 'http_request', label: 'HTTP Request' },
];

export default function ToolNode({ data, selected }: NodeProps) {
  const d = data as any;
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
          {TOOLS.map((t) => (
            <option key={t.name} value={t.name}>{t.label}</option>
          ))}
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
          {TOOLS.find((t) => t.name === d.tool_name)?.label || 'Tool'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

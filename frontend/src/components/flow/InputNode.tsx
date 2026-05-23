import { Handle, Position } from '@xyflow/react';
import { type NodeProps } from '@xyflow/react';
import { LogIn } from 'lucide-react';

export default function InputNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <div className={`flow-node node-input ${selected ? 'selected' : ''}`}>
      <div className="flow-node-header">
        <LogIn size={13} />
        Input Node
      </div>
      <div className="flow-node-body">
        <input
          type="text"
          className="input-field"
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
          placeholder="Input label..."
          value={d.label || 'User Input'}
          onChange={(e) => d.onChange?.({ ...d, label: e.target.value })}
        />
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          Entry point of the agent graph
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

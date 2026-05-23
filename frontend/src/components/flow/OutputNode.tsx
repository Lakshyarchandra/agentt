import { Handle, Position } from '@xyflow/react';
import { type NodeProps } from '@xyflow/react';
import { LogOut } from 'lucide-react';

export default function OutputNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <div className={`flow-node node-output ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-header">
        <LogOut size={13} />
        Output Node
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
      </div>
    </div>
  );
}

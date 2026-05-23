import { Handle, Position } from '@xyflow/react';
import { type NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

export default function PromptNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <div className={`flow-node node-prompt ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-header">
        <MessageSquare size={13} />
        Prompt Node
        <span className="badge badge-info" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
          {d.role || 'system'}
        </span>
      </div>
      <div className="flow-node-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <select
          className="input-field"
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
          value={d.role || 'system'}
          onChange={(e) => d.onChange?.({ ...d, role: e.target.value })}
        >
          <option value="system">System</option>
          <option value="human">Human</option>
        </select>
        <textarea
          className="input-field"
          style={{ fontSize: '0.72rem', padding: '0.4rem', minHeight: 80, resize: 'none' }}
          placeholder="Enter prompt template... Use {variable} for dynamic values."
          value={d.template || ''}
          onChange={(e) => d.onChange?.({ ...d, template: e.target.value })}
        />
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

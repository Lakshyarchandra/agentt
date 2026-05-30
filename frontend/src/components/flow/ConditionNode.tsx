import { Handle, Position } from '@xyflow/react';
import { type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

const CONDITION_TYPES = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_empty', label: 'Not Empty' },
  { value: 'regex', label: 'Regex Match' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'length_gt', label: 'Length >' },
];

export default function ConditionNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <div className={`flow-node node-condition ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-header">
        <GitBranch size={13} />
        Condition
        <span className="badge badge-warning" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
          {d.condition_type || 'not_empty'}
        </span>
      </div>
      <div className="flow-node-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <select
          className="input-field"
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
          value={d.condition_type || 'not_empty'}
          onChange={(e) => d.onChange?.({ ...d, condition_type: e.target.value })}
        >
          {CONDITION_TYPES.map((ct) => (
            <option key={ct.value} value={ct.value}>{ct.label}</option>
          ))}
        </select>

        {d.condition_type !== 'not_empty' && (
          <input
            type="text"
            className="input-field"
            style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}
            placeholder={
              d.condition_type === 'regex' ? 'Regex pattern...' :
              d.condition_type === 'length_gt' ? 'Min length...' :
              'Value to match...'
            }
            value={d.condition_value || ''}
            onChange={(e) => d.onChange?.({ ...d, condition_value: e.target.value })}
          />
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
          <div style={{
            flex: 1, padding: '0.3rem 0.5rem', borderRadius: 6,
            background: 'rgba(16,185,129,0.12)', color: '#34d399',
            fontSize: '0.68rem', fontWeight: 600, textAlign: 'center',
          }}>
            ✓ True
          </div>
          <div style={{
            flex: 1, padding: '0.3rem 0.5rem', borderRadius: 6,
            background: 'rgba(239,68,68,0.12)', color: '#fca5a5',
            fontSize: '0.68rem', fontWeight: 600, textAlign: 'center',
          }}>
            ✗ False
          </div>
        </div>
      </div>
      <div style={{ position: 'relative', height: 16 }}>
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          style={{ left: '30%', background: '#10b981' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          style={{ left: '70%', background: '#ef4444' }}
        />
      </div>
    </div>
  );
}

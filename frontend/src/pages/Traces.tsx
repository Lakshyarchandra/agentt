import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Trash2, ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { tracesApi } from '../api/client';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, { badge: string; icon: React.ElementType; color: string }> = {
  completed: { badge: 'badge-success', icon: CheckCircle, color: '#10b981' },
  failed:    { badge: 'badge-danger',  icon: XCircle,    color: '#ef4444' },
  running:   { badge: 'badge-warning', icon: Loader2,    color: '#f59e0b' },
};

function StepBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    llm_call: 'badge-purple', llm_response: 'badge-purple',
    tool_call: 'badge-info', observation: 'badge-success', error: 'badge-danger',
  };
  return <span className={`badge ${colors[type] || 'badge-default'}`}>{type.replace('_', ' ')}</span>;
}

export default function Traces() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const { data: traces = [], isLoading } = useQuery({
    queryKey: ['traces'],
    queryFn: () => tracesApi.list({ limit: 100 }).then((r) => r.data),
  });

  const { data: fullTrace } = useQuery({
    queryKey: ['trace', expandedId],
    queryFn: () => tracesApi.get(expandedId!).then((r) => r.data),
    enabled: !!expandedId,
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this trace?')) return;
    try {
      await tracesApi.delete(id);
      qc.invalidateQueries({ queryKey: ['traces'] });
      if (expandedId === id) setExpandedId(null);
      toast.success('Trace deleted');
    } catch {
      toast.error('Failed to delete trace');
    }
  };

  const toggleStep = (i: number) => {
    setExpandedSteps((s) => {
      const next = new Set(s);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History size={28} />
            Execution Traces
          </h1>
          <p>Browse and inspect all past agent executions</p>
        </div>
        <div className="badge badge-purple" style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem' }}>
          {traces.length} traces
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : traces.length === 0 ? (
        <div className="empty-state card">
          <History size={64} />
          <h3>No traces yet</h3>
          <p>Run an agent to generate execution traces</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {traces.map((trace: any) => {
            const statusStyle = STATUS_STYLES[trace.status] || STATUS_STYLES.completed;
            const StatusIcon = statusStyle.icon;
            const isExpanded = expandedId === trace.id;

            return (
              <div
                key={trace.id}
                className="card"
                id={`trace-${trace.id}`}
                style={{ padding: '1rem 1.25rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => { setExpandedId(isExpanded ? null : trace.id); setExpandedSteps(new Set()); }}
              >
                {/* Summary row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <StatusIcon size={18} color={statusStyle.color} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {trace.input_text}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge ${statusStyle.badge}`}>{trace.status}</span>
                      {trace.duration_ms && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {(trace.duration_ms / 1000).toFixed(2)}s
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Clock size={10} />
                        {new Date(trace.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={(e) => handleDelete(trace.id, e)}
                      data-tooltip="Delete"
                      id={`btn-delete-trace-${trace.id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                    {isExpanded ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Expanded trace */}
                {isExpanded && fullTrace && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
                    {/* Output */}
                    {fullTrace.output_text && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Output</div>
                        <div className="trace-pre" style={{ maxHeight: 200, background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)', color: '#86efac' }}>
                          {fullTrace.output_text}
                        </div>
                      </div>
                    )}
                    {/* Error */}
                    {fullTrace.error_message && (
                      <div className="trace-pre" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: '1rem' }}>
                        Error: {fullTrace.error_message}
                      </div>
                    )}
                    {/* Steps */}
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Execution Steps ({fullTrace.steps?.length || 0})
                    </div>
                    {(fullTrace.steps || []).map((step: any, i: number) => {
                      const open = expandedSteps.has(i);
                      return (
                        <div
                          key={i}
                          onClick={() => toggleStep(i)}
                          style={{
                            padding: '0.5rem 0.75rem', marginBottom: '0.3rem',
                            background: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer', border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <StepBadge type={step.type} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flex: 1 }}>
                              {step.tool_name || step.node_id || ''}
                            </span>
                            {step.duration_ms && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{step.duration_ms}ms</span>}
                            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </div>
                          {open && (
                            <div style={{ marginTop: '0.5rem' }}>
                              {step.input && <div className="trace-pre" style={{ marginBottom: '0.25rem' }}><strong>Input:</strong> {step.input}</div>}
                              {step.output && <div className="trace-pre"><strong>Output:</strong> {step.output}</div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

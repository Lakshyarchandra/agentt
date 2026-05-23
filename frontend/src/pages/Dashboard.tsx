import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Bot, Play, Pencil, Trash2, Clock, Zap, Activity } from 'lucide-react';
import { agentsApi } from '../api/client';
import { useAgentStore } from '../store/agentStore';
import toast from 'react-hot-toast';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius-md)',
        background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color="white" />
      </div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { agents, setAgents, removeAgent } = useAgentStore();

  const { data, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list().then((r) => r.data),
  });

  useEffect(() => { if (data) setAgents(data); }, [data]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this agent?')) return;
    try {
      await agentsApi.delete(id);
      removeAgent(id);
      toast.success('Agent deleted');
    } catch {
      toast.error('Failed to delete agent');
    }
  };

  const activeCount = agents.filter((a) => a.is_active).length;

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>My Agents</h1>
          <p>Build, run, and monitor your AI agents</p>
        </div>
        <button id="btn-new-agent" className="btn btn-primary" onClick={() => navigate('/agents/new')}>
          <Plus size={16} /> New Agent
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total Agents" value={agents.length} icon={Bot} color="linear-gradient(135deg,#6c63ff,#a855f7)" />
        <StatCard label="Active" value={activeCount} icon={Zap} color="linear-gradient(135deg,#10b981,#06b6d4)" />
        <StatCard label="Executions" value="—" icon={Activity} color="linear-gradient(135deg,#f59e0b,#ef4444)" />
      </div>

      {/* Agents Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : agents.length === 0 ? (
        <div className="empty-state card">
          <Bot size={64} />
          <h3>No agents yet</h3>
          <p>Create your first visual AI agent to get started</p>
          <button className="btn btn-primary" onClick={() => navigate('/agents/new')}>
            <Plus size={16} /> Create Agent
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="card card-hover"
              id={`agent-card-${agent.id}`}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/agents/${agent.id}/edit`)}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 'var(--radius-md)',
                    background: 'var(--gradient-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Bot size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{agent.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                      <div className={`status-dot ${agent.is_active ? 'completed' : 'failed'}`} />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    id={`btn-edit-${agent.id}`}
                    className="btn btn-ghost btn-sm btn-icon"
                    data-tooltip="Edit"
                    onClick={() => navigate(`/agents/${agent.id}/edit`)}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    id={`btn-delete-${agent.id}`}
                    className="btn btn-ghost btn-sm btn-icon"
                    data-tooltip="Delete"
                    onClick={(e) => handleDelete(agent.id, e)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', marginBottom: '1rem', minHeight: 36, color: 'var(--text-secondary)' }}>
                {agent.description || 'No description'}
              </p>

              {/* Node count badges */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {(() => {
                  const nodes = agent.graph_config?.nodes || [];
                  const llmCount = nodes.filter((n: any) => n.type === 'llm').length;
                  const toolCount = nodes.filter((n: any) => n.type === 'tool').length;
                  return (
                    <>
                      {llmCount > 0 && <span className="badge badge-purple">{llmCount} LLM{llmCount > 1 ? 's' : ''}</span>}
                      {toolCount > 0 && <span className="badge badge-success">{toolCount} Tool{toolCount > 1 ? 's' : ''}</span>}
                      {nodes.length === 0 && <span className="badge badge-default">Empty graph</span>}
                    </>
                  );
                })()}
              </div>

              <hr className="divider" />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <Clock size={12} />
                  {new Date(agent.updated_at).toLocaleDateString()}
                </div>
                <button
                  id={`btn-run-${agent.id}`}
                  className="btn btn-primary btn-sm"
                  onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}/execute`); }}
                >
                  <Play size={12} /> Run
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

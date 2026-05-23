import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Square, ChevronLeft, Terminal, List, Loader2 } from 'lucide-react';
import { agentsApi, getWsUrl } from '../api/client';
import toast from 'react-hot-toast';

interface TraceStep {
  type: string;
  node_id?: string;
  input?: string;
  output?: string;
  tool_name?: string;
  timestamp: string;
  duration_ms?: number;
}

interface StreamEvent {
  event: string;
  data: Record<string, any>;
}

export default function Execute() {
  const { id: agentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [agentName, setAgentName] = useState('Agent');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [running, setRunning] = useState(false);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'trace'>('console');
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const wsRef = useRef<WebSocket | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    agentsApi.get(agentId!).then(({ data }) => setAgentName(data.name)).catch(() => {});
    return () => { wsRef.current?.close(); };
  }, [agentId]);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [output, steps]);

  const handleRun = () => {
    if (!input.trim()) { toast.error('Enter a message'); return; }
    setRunning(true);
    setOutput('');
    setSteps([]);
    setTraceId(null);

    const ws = new WebSocket(getWsUrl(agentId!));
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ input: input.trim() }));
    };

    ws.onmessage = (event) => {
      const msg: StreamEvent = JSON.parse(event.data);

      switch (msg.event) {
        case 'trace_started':
          setTraceId(msg.data.trace_id);
          break;
        case 'token':
          setOutput((prev) => prev + msg.data.token);
          break;
        case 'llm_start':
          setSteps((prev) => [...prev, { type: 'llm_call', timestamp: new Date().toISOString(), ...msg.data } as TraceStep]);
          break;
        case 'llm_end':
          setSteps((prev) => [...prev, { type: 'llm_response', timestamp: new Date().toISOString(), ...msg.data } as TraceStep]);
          break;
        case 'tool_start':
          setSteps((prev) => [...prev, { type: 'tool_call', timestamp: new Date().toISOString(), ...msg.data } as TraceStep]);
          break;
        case 'tool_end':
          setSteps((prev) => [...prev, { type: 'observation', timestamp: new Date().toISOString(), ...msg.data } as TraceStep]);
          break;
        case 'done':
          setOutput(msg.data.output || output);
          setRunning(false);
          toast.success('Execution complete!');
          break;
        case 'error':
          setSteps((prev) => [...prev, { type: 'error', output: msg.data.message, timestamp: new Date().toISOString() }]);
          setRunning(false);
          toast.error('Execution failed');
          break;
      }
    };

    ws.onerror = () => {
      setRunning(false);
      toast.error('WebSocket connection error');
    };

    ws.onclose = () => { setRunning(false); };
  };

  const handleStop = () => {
    wsRef.current?.close();
    setRunning(false);
  };

  const stepTypeStyle: Record<string, { bg: string; color: string; label: string }> = {
    llm_call:     { bg: 'rgba(108,99,255,0.15)', color: '#a78bfa', label: 'LLM' },
    llm_response: { bg: 'rgba(108,99,255,0.1)',  color: '#7c71f5', label: 'Response' },
    tool_call:    { bg: 'rgba(6,182,212,0.15)',   color: '#67e8f9', label: 'Tool' },
    observation:  { bg: 'rgba(16,185,129,0.15)',  color: '#34d399', label: 'Obs' },
    error:        { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5', label: 'Error' },
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1.25rem',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          <ChevronLeft size={15} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.25rem' }}>
          <Terminal size={16} color="var(--text-accent)" />
          <span style={{ fontWeight: 600 }}>{agentName}</span>
          {running && <span className="badge badge-warning"><span className="status-dot running" style={{ width: 6, height: 6 }} /> Running</span>}
          {traceId && !running && <span className="badge badge-success">Trace saved</span>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/agents/${agentId}/edit`)}>
            Edit Agent
          </button>
          {traceId && (
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/traces')}>
              <List size={14} /> View Traces
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>
        {/* Left — Chat Input + Console */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-subtle)' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', padding: '0.5rem 1rem 0', gap: '0.25rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
            {(['console', 'trace'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  border: 'none',
                  background: activeTab === tab ? 'var(--bg-base)' : 'transparent',
                  color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                {tab === 'console' ? '🖥 Console' : '🔍 Trace Steps'}
                {tab === 'trace' && steps.length > 0 && (
                  <span className="badge badge-purple" style={{ marginLeft: '0.4rem', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>{steps.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Console / Trace body */}
          <div className="console" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 0, border: 'none' }}>
            <div className="console-header">
              <div className="console-dot red" />
              <div className="console-dot yellow" />
              <div className="console-dot green" />
              <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {agentName} — {running ? 'Executing...' : 'Ready'}
              </span>
            </div>

            <div className="console-body" ref={consoleRef} style={{ flex: 1 }}>
              {activeTab === 'console' ? (
                <>
                  {!output && !running && (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {'>'} Send a message below to run the agent...
                    </div>
                  )}
                  {output && (
                    <div>
                      <span className="console-meta">{'>'} </span>
                      <span className="console-token">{output}</span>
                      {running && <span className="console-cursor">▌</span>}
                    </div>
                  )}
                  {!output && running && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Processing...
                    </div>
                  )}
                </>
              ) : (
                /* Trace steps */
                steps.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No steps yet. Run the agent to see trace.
                  </div>
                ) : (
                  steps.map((step, i) => {
                    const style = stepTypeStyle[step.type] || stepTypeStyle.observation;
                    const isExpanded = expandedSteps.has(i);
                    return (
                      <div
                        key={i}
                        onClick={() => setExpandedSteps((s) => {
                          const next = new Set(s);
                          isExpanded ? next.delete(i) : next.add(i);
                          return next;
                        })}
                        style={{
                          marginBottom: '0.5rem', padding: '0.5rem',
                          background: style.bg, borderRadius: 6,
                          cursor: 'pointer', userSelect: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ background: style.bg, color: style.color, padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>
                            {style.label}
                          </span>
                          <span style={{ color: style.color, fontSize: '0.75rem' }}>
                            {step.tool_name || step.type}
                          </span>
                          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: '0.5rem' }}>
                            {step.input && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Input:</div>
                                <div className="trace-pre">{step.input}</div>
                              </div>
                            )}
                            {step.output && (
                              <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Output:</div>
                                <div className="trace-pre">{step.output}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* Input area */}
          <div style={{
            padding: '1rem',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex', gap: '0.75rem',
          }}>
            <textarea
              id="execute-input"
              className="input-field"
              style={{ flex: 1, resize: 'none', minHeight: 52, maxHeight: 120, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !running) {
                  e.preventDefault();
                  handleRun();
                }
              }}
              disabled={running}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {running ? (
                <button id="btn-stop" className="btn btn-danger" onClick={handleStop}>
                  <Square size={14} /> Stop
                </button>
              ) : (
                <button id="btn-run" className="btn btn-primary" onClick={handleRun} disabled={!input.trim()}>
                  <Play size={14} /> Run
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right — Agent info sidebar */}
        <div style={{ width: 280, padding: '1rem', background: 'var(--bg-surface)', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            Execution Info
          </div>
          {traceId && (
            <div className="card" style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Trace ID</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: 'var(--text-accent)', wordBreak: 'break-all' }}>{traceId}</div>
            </div>
          )}
          <div className="card" style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Steps</div>
            {steps.map((step, i) => {
              const style = stepTypeStyle[step.type] || stepTypeStyle.observation;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: style.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.75rem', color: style.color }}>{step.tool_name || step.type}</span>
                </div>
              );
            })}
            {steps.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No steps yet</span>}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Tips:</strong><br />
            • Press Enter to send<br />
            • Shift+Enter for newline<br />
            • Traces are auto-saved
          </div>
        </div>
      </div>
    </div>
  );
}

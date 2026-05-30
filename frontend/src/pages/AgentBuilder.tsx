import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, BackgroundVariant,
  type Connection, type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Save, Play, Plus, ChevronLeft, Brain, Wrench, MessageSquare, LogIn, LogOut,
  Trash2, GitBranch, Code, Settings2,
} from 'lucide-react';
import { agentsApi, customToolsApi } from '../api/client';
import toast from 'react-hot-toast';

import LLMNode       from '../components/flow/LLMNode';
import ToolNode      from '../components/flow/ToolNode';
import PromptNode    from '../components/flow/PromptNode';
import InputNode     from '../components/flow/InputNode';
import OutputNode    from '../components/flow/OutputNode';
import ConditionNode from '../components/flow/ConditionNode';

const nodeTypes = {
  llm: LLMNode,
  tool: ToolNode,
  prompt: PromptNode,
  input: InputNode,
  output: OutputNode,
  condition: ConditionNode,
};

const defaultNodes: Node[] = [
  { id: 'input-1',  type: 'input',  position: { x: 250, y: 50  }, data: { label: 'User Input' } },
  { id: 'llm-1',   type: 'llm',    position: { x: 200, y: 200  }, data: { vendor: 'groq', model: 'llama-3.3-70b-versatile', temperature: 0.7, system_prompt: 'You are a helpful AI assistant.' } },
  { id: 'output-1',type: 'output', position: { x: 250, y: 390  }, data: { label: 'Agent Output' } },
];

const defaultEdges: Edge[] = [
  { id: 'e1', source: 'input-1', target: 'llm-1' },
  { id: 'e2', source: 'llm-1',   target: 'output-1' },
];

const NODE_PALETTE = [
  { type: 'llm',       label: 'LLM Node',       icon: Brain,         color: 'rgba(108,99,255,0.2)',  textColor: '#a78bfa', defaultData: { vendor: 'groq', model: 'llama-3.3-70b-versatile', temperature: 0.7, system_prompt: '' } },
  { type: 'tool',      label: 'Tool Node',      icon: Wrench,        color: 'rgba(16,185,129,0.2)',  textColor: '#34d399', defaultData: { tool_name: 'calculator', tool_config: {} } },
  { type: 'prompt',    label: 'Prompt Node',    icon: MessageSquare, color: 'rgba(6,182,212,0.2)',   textColor: '#67e8f9', defaultData: { role: 'system', template: '' } },
  { type: 'condition', label: 'Condition',      icon: GitBranch,     color: 'rgba(251,146,60,0.2)',  textColor: '#fdba74', defaultData: { condition_type: 'not_empty', condition_value: '' } },
  { type: 'input',     label: 'Input Node',     icon: LogIn,         color: 'rgba(245,158,11,0.2)',  textColor: '#fcd34d', defaultData: { label: 'User Input' } },
  { type: 'output',    label: 'Output Node',    icon: LogOut,        color: 'rgba(168,85,247,0.2)',  textColor: '#c084fc', defaultData: { label: 'Agent Output' } },
];

interface CustomToolItem {
  id: string;
  name: string;
  description?: string;
  is_agent_tool: boolean;
}

export default function AgentBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [name, setName] = useState('My Agent');
  const [description, setDescription] = useState('');
  const [maxIterations, setMaxIterations] = useState('10');
  const [timeoutSeconds, setTimeoutSeconds] = useState('120');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);
  const [showSettings, setShowSettings] = useState(false);
  const [customTools, setCustomTools] = useState<CustomToolItem[]>([]);

  // v2 fields
  const [retryConfig, setRetryConfig] = useState<any>({});
  const [fallbackConfig, setFallbackConfig] = useState<any>({});
  const [structuredOutputSchema, setStructuredOutputSchema] = useState<any>(null);

  const nodeIdCounter = useRef(100);

  // Load custom tools for the tool node dropdown
  useEffect(() => {
    customToolsApi.list().then(({ data }) => {
      setCustomTools(data.filter((t: any) => t.is_agent_tool));
    }).catch(() => {});
  }, []);

  // Load existing agent for edit
  useEffect(() => {
    if (isEdit) {
      agentsApi.get(id!).then(({ data }) => {
        setName(data.name);
        setDescription(data.description || '');
        setMaxIterations(data.max_iterations);
        setTimeoutSeconds(data.timeout_seconds);
        setRetryConfig(data.retry_config || {});
        setFallbackConfig(data.fallback_config || {});
        setStructuredOutputSchema(data.structured_output_schema || null);
        const gc = data.graph_config;
        if (gc?.nodes?.length) {
          // Re-attach onChange handlers
          setNodes(gc.nodes.map((n: any) => ({
            ...n,
            data: {
              ...n.data,
              onChange: (newData: any) => updateNodeData(n.id, newData),
            },
          })));
          setEdges(gc.edges || []);
        }
        setLoaded(true);
      }).catch(() => {
        toast.error('Failed to load agent');
        navigate('/');
      });
    }
  }, [isEdit, id]);

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...newData, onChange: (d: any) => updateNodeData(nodeId, d) } }
          : n
      )
    );
  }, [setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, id: `e-${Date.now()}` }, eds)),
    [setEdges]
  );

  const addNode = (type: string, defaultData: any) => {
    const id = `${type}-${++nodeIdCounter.current}`;
    const extraData: any = {};
    // Inject custom tools list into tool nodes
    if (type === 'tool') {
      extraData._customTools = customTools.map((ct) => ({
        name: `custom_${ct.id}`,
        label: `✦ ${ct.name}`,
      }));
    }
    const newNode: Node = {
      id,
      type,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
      data: {
        ...defaultData,
        ...extraData,
        onChange: (d: any) => updateNodeData(id, d),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addCustomToolNode = (tool: CustomToolItem) => {
    const id = `tool-${++nodeIdCounter.current}`;
    const newNode: Node = {
      id,
      type: 'tool',
      position: { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
      data: {
        tool_name: `custom_${tool.id}`,
        tool_config: {},
        _customTools: customTools.map((ct) => ({
          name: `custom_${ct.id}`,
          label: `✦ ${ct.name}`,
        })),
        onChange: (d: any) => updateNodeData(id, d),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteSelectedNodes = () => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => {
      const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
      return !selectedIds.includes(e.source) && !selectedIds.includes(e.target);
    }));
  };

  const buildGraphConfig = () => {
    return {
      nodes: nodes.map(({ id, type, position, data }) => {
        const { onChange, _customTools, ...cleanData } = data as any;
        return { id, type, position, data: cleanData };
      }),
      edges: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
        id, source, target, sourceHandle, targetHandle,
      })),
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        graph_config: buildGraphConfig(),
        max_iterations: maxIterations,
        timeout_seconds: timeoutSeconds,
        retry_config: retryConfig,
        fallback_config: fallbackConfig,
        structured_output_schema: structuredOutputSchema,
      };
      if (isEdit) {
        await agentsApi.update(id!, payload);
        toast.success('Agent saved!');
      } else {
        const { data } = await agentsApi.create(payload);
        toast.success('Agent created!');
        navigate(`/agents/${data.id}/edit`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1.25rem',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          <ChevronLeft size={15} /> Back
        </button>

        <div style={{ width: 1, height: 28, background: 'var(--border-subtle)', margin: '0 0.25rem' }} />

        <input
          id="agent-name"
          className="input-field"
          style={{ width: 220, padding: '0.35rem 0.75rem', fontSize: '0.875rem', fontWeight: 600 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agent name..."
        />

        <input
          id="agent-description"
          className="input-field"
          style={{ width: 280, padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description..."
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <label className="input-label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>Max iterations:</label>
          <input
            type="number"
            className="input-field"
            style={{ width: 64, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
            value={maxIterations}
            onChange={(e) => setMaxIterations(e.target.value)}
            min={1} max={50}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <label className="input-label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>Timeout:</label>
          <input
            type="number"
            className="input-field"
            style={{ width: 64, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
            value={timeoutSeconds}
            onChange={(e) => setTimeoutSeconds(e.target.value)}
            min={5} max={600}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>s</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn btn-ghost btn-sm ${showSettings ? 'btn-active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            data-tooltip="Advanced Settings"
            style={showSettings ? { background: 'rgba(108,99,255,0.15)', color: 'var(--text-accent)' } : {}}
          >
            <Settings2 size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={deleteSelectedNodes} data-tooltip="Delete selected">
            <Trash2 size={14} />
          </button>
          {isEdit && (
            <button
              id="btn-run-agent"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/agents/${id}/execute`)}
            >
              <Play size={14} /> Run
            </button>
          )}
          <button id="btn-save-agent" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : <><Save size={14} /> Save</>}
          </button>
        </div>
      </div>

      {/* Advanced Settings Panel (v2) */}
      {showSettings && (
        <div style={{
          padding: '0.75rem 1.25rem',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start',
          animation: 'fadeIn 0.2s ease',
        }}>
          {/* Retry */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Global Retry
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Max Retries</div>
                <input
                  type="number"
                  className="input-field"
                  style={{ width: 64, fontSize: '0.78rem', padding: '0.25rem 0.4rem' }}
                  value={retryConfig.max_retries ?? 0}
                  min={0} max={10}
                  onChange={(e) => setRetryConfig({ ...retryConfig, max_retries: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Backoff (s)</div>
                <input
                  type="number"
                  className="input-field"
                  style={{ width: 64, fontSize: '0.78rem', padding: '0.25rem 0.4rem' }}
                  value={retryConfig.backoff_multiplier ?? 1.5}
                  min={0.5} max={30} step={0.5}
                  onChange={(e) => setRetryConfig({ ...retryConfig, backoff_multiplier: parseFloat(e.target.value) || 1.5 })}
                />
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 48, background: 'var(--border-subtle)' }} />

          {/* Fallback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Global Fallback Model
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <select
                className="input-field"
                style={{ width: 110, fontSize: '0.78rem', padding: '0.25rem 0.4rem' }}
                value={fallbackConfig.vendor || ''}
                onChange={(e) => setFallbackConfig({ ...fallbackConfig, vendor: e.target.value })}
              >
                <option value="">None</option>
                <option value="groq">Groq</option>
                <option value="google">Google</option>
                <option value="mistral">Mistral</option>
                <option value="ollama">Ollama</option>
                <option value="openrouter">OpenRouter</option>
              </select>
              {fallbackConfig.vendor && (
                <input
                  className="input-field"
                  style={{ width: 160, fontSize: '0.78rem', padding: '0.25rem 0.4rem' }}
                  value={fallbackConfig.model || ''}
                  onChange={(e) => setFallbackConfig({ ...fallbackConfig, model: e.target.value })}
                  placeholder="Model name..."
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex' }}>
        {/* Left panel — node palette + custom tools */}
        <div style={{
          width: 200,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Add Nodes
          </div>
          {NODE_PALETTE.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                id={`palette-${item.type}`}
                onClick={() => addNode(item.type, item.defaultData)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.625rem',
                  background: item.color,
                  border: `1px solid ${item.textColor}30`,
                  borderRadius: 'var(--radius-md)',
                  color: item.textColor,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateX(2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                <Plus size={12} />
                <Icon size={13} />
                {item.label}
              </button>
            );
          })}

          {/* Custom Tools Section */}
          {customTools.length > 0 && (
            <>
              <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                My Custom Tools
              </div>
              {customTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => addCustomToolNode(tool)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.625rem',
                    background: 'rgba(6,182,212,0.12)',
                    border: '1px solid rgba(6,182,212,0.25)',
                    borderRadius: 'var(--radius-md)',
                    color: '#67e8f9',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateX(2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                >
                  <Plus size={12} />
                  <Code size={13} />
                  {tool.name}
                </button>
              ))}
            </>
          )}

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Tips:</strong><br />
            • Drag nodes on the canvas<br />
            • Connect node handles to build the flow<br />
            • Click a node to configure it<br />
            • Delete key removes selected nodes<br />
            • Use ⚙ for retry & fallback settings
          </div>
        </div>

        {/* React Flow Canvas */}
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes.map((n) => ({
              ...n,
              data: {
                ...n.data,
                onChange: (d: any) => updateNodeData(n.id, d),
                // Pass custom tools to tool nodes
                ...(n.type === 'tool' ? {
                  _customTools: customTools.map((ct) => ({
                    name: `custom_${ct.id}`,
                    label: `✦ ${ct.name}`,
                  })),
                } : {}),
              },
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
            style={{ background: 'var(--bg-base)' }}
          >
            <Background variant={BackgroundVariant.Dots} color="rgba(255,255,255,0.04)" gap={24} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const colors: Record<string, string> = {
                  llm: '#6c63ff', tool: '#10b981', prompt: '#06b6d4',
                  input: '#f59e0b', output: '#a855f7', condition: '#fb923c',
                };
                return colors[n.type || ''] || '#334155';
              }}
              style={{ bottom: 16, right: 16 }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

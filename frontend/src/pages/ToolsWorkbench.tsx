import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Code, Plus, Play, Save, Trash2, Loader2, CheckCircle2, AlertCircle,
  Terminal, Wrench, Clock, Bot,
} from 'lucide-react';
import { customToolsApi } from '../api/client';
import toast from 'react-hot-toast';

interface CustomTool {
  id: string;
  name: string;
  description?: string;
  code: string;
  language: string;
  last_output?: string;
  is_agent_tool: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CODE = `# Write your Python code here
# Use print() to output results

def run(user_input: str) -> str:
    """This function is called when used as an agent tool.
    Args: user_input - the input from the agent
    Returns: string result
    """
    return f"Hello from custom tool! Input: {user_input}"

# Standalone execution:
print("Running custom tool...")
result = run("test input")
print(f"Result: {result}")
`;

export default function ToolsWorkbench() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [toolName, setToolName] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  const [isAgentTool, setIsAgentTool] = useState(false);
  const [output, setOutput] = useState('');
  const [execError, setExecError] = useState<string | null>(null);
  const [execDuration, setExecDuration] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['custom-tools'],
    queryFn: () => customToolsApi.list().then((r) => r.data),
  });

  // Select a tool
  const selectTool = (tool: CustomTool) => {
    setSelectedId(tool.id);
    setCode(tool.code || DEFAULT_CODE);
    setToolName(tool.name);
    setToolDescription(tool.description || '');
    setIsAgentTool(tool.is_agent_tool);
    setOutput(tool.last_output || '');
    setExecError(null);
    setExecDuration(null);
  };

  // Create new tool
  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await customToolsApi.create({
        name: 'Untitled Tool',
        code: DEFAULT_CODE,
        language: 'python',
        is_agent_tool: false,
      });
      queryClient.invalidateQueries({ queryKey: ['custom-tools'] });
      selectTool(data);
      toast.success('Tool created');
    } catch {
      toast.error('Failed to create tool');
    } finally {
      setCreating(false);
    }
  };

  // Save tool
  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await customToolsApi.update(selectedId, {
        name: toolName,
        description: toolDescription,
        code,
        is_agent_tool: isAgentTool,
      });
      queryClient.invalidateQueries({ queryKey: ['custom-tools'] });
      toast.success('Tool saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Delete tool
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tool?')) return;
    try {
      await customToolsApi.delete(id);
      queryClient.invalidateQueries({ queryKey: ['custom-tools'] });
      if (selectedId === id) {
        setSelectedId(null);
        setCode(DEFAULT_CODE);
        setToolName('');
        setToolDescription('');
        setOutput('');
      }
      toast.success('Tool deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  // Execute
  const handleRun = async () => {
    setRunning(true);
    setOutput('');
    setExecError(null);
    setExecDuration(null);
    try {
      let result;
      if (selectedId) {
        result = await customToolsApi.execute(selectedId, { code });
      } else {
        result = await customToolsApi.executePlayground({ code, language: 'python' });
      }
      const data = result.data;
      setOutput(data.output || '');
      setExecError(data.error || null);
      setExecDuration(data.duration_ms);
      if (data.error) {
        toast.error('Execution had errors');
      } else {
        toast.success(`Executed in ${data.duration_ms}ms`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Execution failed';
      setExecError(msg);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, execError]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedId) handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, code, toolName, toolDescription, isAgentTool]);

  return (
    <div className="tools-workbench">
      {/* Sidebar — Tool List */}
      <div className="tools-sidebar">
        <div className="tools-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
            <Wrench size={15} color="var(--text-accent)" />
            My Tools
          </div>
          <button
            id="btn-create-tool"
            className="btn btn-primary btn-sm btn-icon"
            onClick={handleCreate}
            disabled={creating}
            data-tooltip="New Tool"
          >
            {creating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
          </button>
        </div>

        <div className="tools-sidebar-list">
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div className="spinner" />
            </div>
          ) : tools.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <Code size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} /><br />
              No tools yet.<br />
              Click + to create one.
            </div>
          ) : (
            tools.map((tool: CustomTool) => (
              <div
                key={tool.id}
                className={`tool-list-item ${selectedId === tool.id ? 'active' : ''}`}
                onClick={() => selectTool(tool)}
              >
                <Code size={14} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div className="truncate" style={{ fontWeight: 500, fontSize: '0.82rem' }}>{tool.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                    {tool.is_agent_tool && (
                      <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                        <Bot size={9} /> Agent
                      </span>
                    )}
                    <span>{tool.language}</span>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={(e) => { e.stopPropagation(); handleDelete(tool.id); }}
                  style={{ padding: '0.2rem', minWidth: 'unset', opacity: 0.5 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Center — Code Editor */}
      <div className="tools-editor">
        <div className="tools-editor-toolbar">
          {selectedId ? (
            <>
              <input
                className="input-field"
                style={{ width: 180, padding: '0.3rem 0.6rem', fontSize: '0.85rem', fontWeight: 600 }}
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                placeholder="Tool name..."
              />
              <input
                className="input-field"
                style={{ flex: 1, padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                value={toolDescription}
                onChange={(e) => setToolDescription(e.target.value)}
                placeholder="Description..."
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 0.5rem' }}>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={isAgentTool}
                    onChange={(e) => setIsAgentTool(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
                <span style={{ fontSize: '0.72rem', color: isAgentTool ? 'var(--accent-success)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  <Bot size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                  Agent Tool
                </span>
              </div>

              <div style={{ width: 1, height: 24, background: 'var(--border-subtle)' }} />

              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                Save
              </button>
            </>
          ) : (
            <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={15} />
              Playground Mode — code will not be saved
            </div>
          )}

          <button
            id="btn-run-tool"
            className="btn btn-primary btn-sm"
            onClick={handleRun}
            disabled={running || !code.trim()}
          >
            {running ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
            Run
          </button>

          <span className="badge badge-default" style={{ fontSize: '0.7rem' }}>
            Ctrl+Enter
          </span>
        </div>

        <textarea
          className="code-editor"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="# Write your Python code here..."
          spellCheck={false}
          onKeyDown={(e) => {
            // Tab support
            if (e.key === 'Tab') {
              e.preventDefault();
              const target = e.target as HTMLTextAreaElement;
              const start = target.selectionStart;
              const end = target.selectionEnd;
              setCode(code.substring(0, start) + '    ' + code.substring(end));
              setTimeout(() => {
                target.selectionStart = target.selectionEnd = start + 4;
              }, 0);
            }
          }}
        />
      </div>

      {/* Right — Output Panel */}
      <div className="tools-output">
        <div className="tools-output-header">
          <Terminal size={13} />
          Output
          {execDuration !== null && (
            <span className="badge badge-default" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
              <Clock size={9} /> {execDuration}ms
            </span>
          )}
        </div>

        <div className="tools-output-body" ref={outputRef}>
          {!output && !execError && !running && (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', paddingTop: '2rem' }}>
              <Terminal size={32} style={{ opacity: 0.2, marginBottom: '0.75rem' }} /><br />
              Run your code to see output here.<br />
              <span style={{ fontSize: '0.72rem' }}>Ctrl+Enter to execute</span>
            </div>
          )}
          {running && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-warning)' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Executing...
            </div>
          )}
          {output && (
            <div style={{ color: '#e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem', color: 'var(--accent-success)', fontSize: '0.72rem' }}>
                <CheckCircle2 size={12} /> Output
              </div>
              {output}
            </div>
          )}
          {execError && (
            <div style={{ marginTop: output ? '1rem' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem', color: 'var(--accent-danger)', fontSize: '0.72rem' }}>
                <AlertCircle size={12} /> Error
              </div>
              <div style={{ color: '#fca5a5' }}>{execError}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

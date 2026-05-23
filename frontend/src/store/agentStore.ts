import { create } from 'zustand';

export interface FlowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  graph_config: { nodes: FlowNode[]; edges: FlowEdge[] };
  max_iterations: string;
  timeout_seconds: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentStore {
  agents: Agent[];
  currentAgent: Agent | null;
  setAgents: (agents: Agent[]) => void;
  setCurrentAgent: (agent: Agent | null) => void;
  upsertAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  currentAgent: null,
  setAgents: (agents) => set({ agents }),
  setCurrentAgent: (agent) => set({ currentAgent: agent }),
  upsertAgent: (agent) =>
    set((state) => {
      const idx = state.agents.findIndex((a) => a.id === agent.id);
      if (idx === -1) return { agents: [agent, ...state.agents] };
      const updated = [...state.agents];
      updated[idx] = agent;
      return { agents: updated };
    }),
  removeAgent: (id) =>
    set((state) => ({ agents: state.agents.filter((a) => a.id !== id) })),
}));

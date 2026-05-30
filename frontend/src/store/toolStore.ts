import { create } from 'zustand';

export interface CustomTool {
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

interface ToolStore {
  tools: CustomTool[];
  currentTool: CustomTool | null;
  setTools: (tools: CustomTool[]) => void;
  setCurrentTool: (tool: CustomTool | null) => void;
  upsertTool: (tool: CustomTool) => void;
  removeTool: (id: string) => void;
}

export const useToolStore = create<ToolStore>((set) => ({
  tools: [],
  currentTool: null,
  setTools: (tools) => set({ tools }),
  setCurrentTool: (tool) => set({ currentTool: tool }),
  upsertTool: (tool) =>
    set((state) => {
      const idx = state.tools.findIndex((t) => t.id === tool.id);
      if (idx === -1) return { tools: [tool, ...state.tools] };
      const updated = [...state.tools];
      updated[idx] = tool;
      return { tools: updated };
    }),
  removeTool: (id) =>
    set((state) => ({ tools: state.tools.filter((t) => t.id !== id) })),
}));

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return client(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    client.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
  updateApiKeys: (keys: Record<string, string>) =>
    client.put('/auth/api-keys', { keys }),
  getApiKeys: () => client.get('/auth/api-keys'),
  deleteApiKey: (vendor: string) => client.delete(`/auth/api-keys/${vendor}`),
};

// ─── Agents API ───────────────────────────────────────────────────────────────
export const agentsApi = {
  list: () => client.get('/agents'),
  create: (data: unknown) => client.post('/agents', data),
  get: (id: string) => client.get(`/agents/${id}`),
  update: (id: string, data: unknown) => client.put(`/agents/${id}`, data),
  delete: (id: string) => client.delete(`/agents/${id}`),
  catalog: () => client.get('/agents/catalog'),
  executeRest: (id: string, input: string) =>
    client.post(`/agents/${id}/execute`, { input_text: input }),
};

// ─── Traces API ───────────────────────────────────────────────────────────────
export const tracesApi = {
  list: (params?: { agent_id?: string; status?: string; limit?: number; offset?: number }) =>
    client.get('/traces', { params }),
  get: (id: string) => client.get(`/traces/${id}`),
  delete: (id: string) => client.delete(`/traces/${id}`),
};

// ─── WebSocket URL ────────────────────────────────────────────────────────────
export const getWsUrl = (agentId: string): string => {
  const token = localStorage.getItem('access_token') || '';
  const wsBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1')
    .replace(/^http/, 'ws');
  return `${wsBase}/ws/agents/${agentId}/execute?token=${token}`;
};

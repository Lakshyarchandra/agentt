# Agent Studio 🤖

**Visual AI Agent Platform** — Create, edit, and execute LangChain AI agents using a node-based flow graph editor.

---

## ✨ Features

- 🎨 **Visual Flow Graph Editor** — Drag-and-drop React Flow canvas with 5 node types (LLM, Tool, Prompt, Input, Output)
- 🔐 **Authentication** — JWT-based auth with bcrypt passwords and refresh token rotation
- 🔑 **Encrypted API Keys** — Per-user vendor keys stored with AES-128 Fernet encryption
- ⚡ **Real-time Streaming** — WebSocket execution with live token streaming and step traces
- 📜 **Execution Traces** — Full step-by-step trace storage with collapsible viewer
- 🆓 **Free LLM Vendors** — Groq, Google Gemini, Mistral, Ollama, OpenRouter

---

## 🆓 Free LLM Vendors

| Vendor | Get Free Key |
|--------|-------------|
| **Groq** | [console.groq.com/keys](https://console.groq.com/keys) |
| **Google Gemini** | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Mistral** | [console.mistral.ai](https://console.mistral.ai/api-keys) |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Ollama** | Run locally — no key needed |

---

## 🚀 Quick Start (Local Dev)

### 1. Clone and setup environment
```bash
cp .env.example backend/.env
# Edit backend/.env with your values
```

### 2. Generate required secrets
```bash
# JWT secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Fernet encryption key (for API keys)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 3. Run with Docker Compose
```bash
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 4. Run without Docker (manual)
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## 🏗 Project Structure

```
agentt/
├── backend/               # FastAPI + LangChain
│   ├── app/
│   │   ├── main.py        # Entry point
│   │   ├── config.py      # Settings
│   │   ├── models/        # SQLAlchemy ORM (User, Agent, Trace)
│   │   ├── routers/       # API endpoints
│   │   ├── services/      # Business logic (agent, vendor, tools)
│   │   └── core/          # Security, deps
│   └── requirements.txt
├── frontend/              # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/         # Dashboard, AgentBuilder, Execute, Traces, Settings
│   │   ├── components/    # Navbar, Flow nodes
│   │   ├── store/         # Zustand state
│   │   └── api/           # Axios client
│   └── package.json
├── docker-compose.yml     # Local dev
├── render.yaml            # Render.com deployment
└── .env.example
```

---

## 🌐 Deploy to Render

1. Push to GitHub
2. Go to [dashboard.render.com](https://dashboard.render.com) → New → Blueprint
3. Point to your repo — Render will detect `render.yaml`
4. Set these env vars manually in the Render dashboard:
   - `ENCRYPTION_KEY` — from Fernet.generate_key()
   - `REDIS_URL` — from Upstash Redis (free tier)
   - `CORS_ORIGINS` — your frontend URL
   - `VITE_API_URL` — your backend URL (on the frontend service)

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login → JWT tokens |
| POST | `/api/v1/auth/refresh` | Refresh tokens |
| GET | `/api/v1/auth/me` | Current user |
| PUT | `/api/v1/auth/api-keys` | Save vendor keys |
| GET | `/api/v1/agents` | List agents |
| POST | `/api/v1/agents` | Create agent |
| GET | `/api/v1/agents/{id}` | Get agent |
| PUT | `/api/v1/agents/{id}` | Update agent |
| DELETE | `/api/v1/agents/{id}` | Delete agent |
| POST | `/api/v1/agents/{id}/execute` | Execute (REST) |
| WS | `/api/v1/ws/agents/{id}/execute` | Execute (streaming) |
| GET | `/api/v1/traces` | List traces |
| GET | `/api/v1/traces/{id}` | Get trace |
| DELETE | `/api/v1/traces/{id}` | Delete trace |

Full interactive docs: `http://localhost:8000/docs`

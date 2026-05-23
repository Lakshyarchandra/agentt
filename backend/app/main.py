from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.routers import auth, agents, execute, traces
import app.models  # noqa: F401 — ensure models are imported for Alembic


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if not using Alembic in dev
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Visual AI Agent Builder — create, edit, and execute LangChain agents",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth, prefix=settings.API_V1_STR)
app.include_router(agents, prefix=settings.API_V1_STR)
app.include_router(execute, prefix=settings.API_V1_STR)
app.include_router(traces, prefix=settings.API_V1_STR)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API", "docs": "/docs"}

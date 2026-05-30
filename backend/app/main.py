from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.routers import auth, agents, execute, traces, custom_tools
import app.models  # noqa: F401 — ensure models are imported for Alembic


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if not using Alembic in dev
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        import traceback
        import sys
        print("=" * 80, file=sys.stderr)
        print("DATABASE CREATION ERROR OCCURRED ON STARTUP:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        if hasattr(e, "orig"):
            print(f"ORIGINAL DATABASE ERROR: {e.orig}", file=sys.stderr)
            print(f"ORIGINAL DATABASE ERROR ARGS: {getattr(e.orig, 'args', None)}", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        raise e
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
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
app.include_router(custom_tools, prefix=settings.API_V1_STR)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API", "docs": "/docs"}

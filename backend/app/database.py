from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


def _make_async_url(url: str) -> str:
    """Ensure the database URL uses the asyncpg driver.
    Render provides DATABASE_URL as postgres:// or postgresql://
    but SQLAlchemy async requires postgresql+asyncpg://
    """
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


# Configure connection arguments (e.g. SSL requirement for remote databases in prod)
connect_args = {}
if not settings.DEBUG and all(x not in settings.DATABASE_URL for x in ("localhost", "127.0.0.1", "db")):
    connect_args["ssl"] = True

engine = create_async_engine(
    _make_async_url(settings.DATABASE_URL),
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

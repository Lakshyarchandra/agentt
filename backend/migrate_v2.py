import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

async def migrate():
    print(f"Connecting to database at {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        print("Adding retry_config column...")
        try:
            await conn.execute(text("ALTER TABLE agents ADD COLUMN retry_config JSONB DEFAULT '{}'::jsonb"))
            print("✓ retry_config added")
        except Exception as e:
            print(f"- retry_config might already exist: {e}")

        print("Adding fallback_config column...")
        try:
            await conn.execute(text("ALTER TABLE agents ADD COLUMN fallback_config JSONB DEFAULT '{}'::jsonb"))
            print("✓ fallback_config added")
        except Exception as e:
            print(f"- fallback_config might already exist: {e}")

        print("Adding structured_output_schema column...")
        try:
            await conn.execute(text("ALTER TABLE agents ADD COLUMN structured_output_schema JSONB"))
            print("✓ structured_output_schema added")
        except Exception as e:
            print(f"- structured_output_schema might already exist: {e}")

    await engine.dispose()
    print("\nMigration complete! You can now start the server safely.")

if __name__ == "__main__":
    asyncio.run(migrate())

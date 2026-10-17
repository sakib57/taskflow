from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings

settings = get_settings()


class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect(cls) -> None:
        cls.client = AsyncIOMotorClient(settings.mongodb_url)
        cls.db = cls.client[settings.mongodb_database]
        
        # Test connection
        await cls.client.admin.command("ping")
        print(f"✅ Connected to MongoDB: {settings.mongodb_database}")

    @classmethod
    async def disconnect(cls) -> None:
        if cls.client:
            cls.client.close()
            print("🔌 Disconnected from MongoDB")

    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        if cls.db is None:
            raise RuntimeError("MongoDB not connected. Call connect() first.")
        return cls.db


def get_database() -> AsyncIOMotorDatabase:
    """FastAPI dependency for MongoDB."""
    return MongoDB.get_db()

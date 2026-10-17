from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.db.mongodb import MongoDB
from app.services.notification_service import NotificationService
from app.consumers.task_events import consumer
from app.api.routes import notifications

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup + shutdown logic."""
    # ============ STARTUP ============
    print("🚀 Starting Notification Service...")
    await MongoDB.connect()

    # Ensure indexes
    service = NotificationService(MongoDB.get_db())
    await service.ensure_indexes()

    # Start RabbitMQ consumer
    await consumer.start()

    print(f"✅ Notification Service ready on port {settings.port}")
    yield

    # ============ SHUTDOWN ============
    print("🛑 Shutting down...")
    await consumer.stop()
    await MongoDB.disconnect()


app = FastAPI(
    title="TaskFlow Notification Service",
    description="Notification service consuming task events",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(notifications.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "service": "notification-service",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        await MongoDB.client.admin.command("ping")
        return {
            "status": "healthy",
            "mongodb": "connected",
            "rabbitmq_consumer": "running",
            "service": "notification-service",
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.services.es_client import get_es, close_es
from app.services.search_service import SearchService
from app.consumers.task_events import consumer
from app.api.routes import search

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting Search Service...")
    
    # Init Elasticsearch
    es = await get_es()
    service = SearchService(es)
    await service.ensure_index()

    # Start consumer
    await consumer.start()

    print(f"✅ Search Service ready on port {settings.port}")
    yield

    print("🛑 Shutting down...")
    await consumer.stop()
    await close_es()


app = FastAPI(
    title="TaskFlow Search Service",
    description="Full-text search powered by Elasticsearch",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/v1")


@app.get("/health")
async def health():
    es = await get_es()
    es_ok = await es.ping()
    return {
        "status": "healthy" if es_ok else "degraded",
        "elasticsearch": "connected" if es_ok else "disconnected",
    }

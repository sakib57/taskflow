from typing import Optional
from fastapi import APIRouter, Depends, Query
from elasticsearch import AsyncElasticsearch
from app.services.es_client import get_es
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["search"])


async def get_search_service(es: AsyncElasticsearch = Depends(get_es)) -> SearchService:
    return SearchService(es)


@router.get("/tasks")
async def search_tasks(
    org_id: str = Query(..., description="Organization ID"),
    q: Optional[str] = Query(None, description="Search query"),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    service: SearchService = Depends(get_search_service),
):
    """Search tasks with full-text + filters."""
    return await service.search(
        org_id=org_id,
        query=q,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        page=page,
        limit=limit,
    )

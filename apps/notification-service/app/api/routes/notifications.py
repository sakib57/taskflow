from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongodb import get_database
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> NotificationService:
    return NotificationService(db)


# TEMPORARY: In production, extract user_id from JWT
# We'll add real JWT middleware later
async def get_current_user_id(
    user_id: str = Query(..., description="User ID (temporary — will be JWT)"),
) -> str:
    return user_id


async def get_current_org_id(
    org_id: str = Query(..., description="Org ID (temporary — will be JWT)"),
) -> str:
    return org_id


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    user_id: str = Depends(get_current_user_id),
    org_id: str = Depends(get_current_org_id),
    service: NotificationService = Depends(get_service),
):
    """List notifications for current user."""
    return await service.list_for_user(
        user_id=user_id,
        org_id=org_id,
        page=page,
        limit=limit,
        unread_only=unread_only,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    user_id: str = Depends(get_current_user_id),
    org_id: str = Depends(get_current_org_id),
    service: NotificationService = Depends(get_service),
):
    """Get unread notification count."""
    count = await service.get_unread_count(user_id, org_id)
    return UnreadCountResponse(unread_count=count)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: str,
    user_id: str = Depends(get_current_user_id),
    service: NotificationService = Depends(get_service),
):
    """Mark notification as read."""
    result = await service.mark_as_read(notification_id, user_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return result


@router.put("/read-all")
async def mark_all_as_read(
    user_id: str = Depends(get_current_user_id),
    org_id: str = Depends(get_current_org_id),
    service: NotificationService = Depends(get_service),
):
    """Mark all notifications as read."""
    count = await service.mark_all_as_read(user_id, org_id)
    return {"marked_read": count}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: str,
    user_id: str = Depends(get_current_user_id),
    service: NotificationService = Depends(get_service),
):
    """Delete notification."""
    deleted = await service.delete(notification_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

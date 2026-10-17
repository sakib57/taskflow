from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field
from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    """API response for notification."""

    id: str
    user_id: str
    org_id: str
    type: NotificationType
    title: str
    body: str
    data: dict[str, Any] = {}
    read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    """Paginated notifications response."""

    items: list[NotificationResponse]
    total: int
    unread_count: int
    page: int
    limit: int


class UnreadCountResponse(BaseModel):
    """Unread count response."""

    unread_count: int


class CreateNotificationRequest(BaseModel):
    """Internal — used by event consumers."""

    user_id: str
    org_id: str
    type: NotificationType
    title: str
    body: str
    data: dict[str, Any] = Field(default_factory=dict)

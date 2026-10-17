from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    TASK_CREATED = "task_created"
    TASK_ASSIGNED = "task_assigned"
    TASK_UPDATED = "task_updated"
    TASK_COMPLETED = "task_completed"
    PROJECT_CREATED = "project_created"
    MENTION = "mention"
    COMMENT = "comment"


class Notification(BaseModel):
    """MongoDB Notification document."""

    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    org_id: str
    type: NotificationType
    title: str
    body: str
    data: dict[str, Any] = Field(default_factory=dict)
    read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {
        "populate_by_name": True,
        "json_encoders": {datetime: lambda v: v.isoformat()},
    }

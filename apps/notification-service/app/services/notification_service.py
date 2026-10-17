from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.notification import Notification, NotificationType
from app.schemas.notification import (
    CreateNotificationRequest,
    NotificationListResponse,
    NotificationResponse,
)

COLLECTION = "notifications"


class NotificationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[COLLECTION]

    async def ensure_indexes(self) -> None:
        """Create indexes for performance."""
        await self.collection.create_index([("user_id", 1), ("created_at", -1)])
        await self.collection.create_index([("user_id", 1), ("read", 1)])
        await self.collection.create_index([("org_id", 1), ("created_at", -1)])
        # TTL: auto-delete notifications after 90 days
        await self.collection.create_index(
            "created_at",
            expireAfterSeconds=90 * 24 * 3600,
        )
        print("✅ Notification indexes created")

    async def create(
        self,
        data: CreateNotificationRequest,
    ) -> NotificationResponse:
        """Create a new notification."""
        notification = Notification(
            user_id=data.user_id,
            org_id=data.org_id,
            type=data.type,
            title=data.title,
            body=data.body,
            data=data.data,
        )

        doc = notification.model_dump(by_alias=True, exclude={"id"})
        result = await self.collection.insert_one(doc)

        created = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_response(created)

    async def list_for_user(
        self,
        user_id: str,
        org_id: str,
        page: int = 1,
        limit: int = 20,
        unread_only: bool = False,
    ) -> NotificationListResponse:
        """List notifications for user (paginated)."""
        query: dict = {"user_id": user_id, "org_id": org_id}
        if unread_only:
            query["read"] = False

        skip = (page - 1) * limit
        total = await self.collection.count_documents(query)
        unread_count = await self.collection.count_documents(
            {"user_id": user_id, "org_id": org_id, "read": False}
        )

        cursor = (
            self.collection.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)

        return NotificationListResponse(
            items=[self._to_response(doc) for doc in docs],
            total=total,
            unread_count=unread_count,
            page=page,
            limit=limit,
        )

    async def get_unread_count(self, user_id: str, org_id: str) -> int:
        """Get unread notification count."""
        return await self.collection.count_documents(
            {"user_id": user_id, "org_id": org_id, "read": False}
        )

    async def mark_as_read(
        self,
        notification_id: str,
        user_id: str,
    ) -> Optional[NotificationResponse]:
        """Mark a notification as read."""
        try:
            oid = ObjectId(notification_id)
        except Exception:
            return None

        result = await self.collection.find_one_and_update(
            {"_id": oid, "user_id": user_id},
            {
                "$set": {
                    "read": True,
                    "read_at": datetime.now(timezone.utc),
                }
            },
            return_document=True,
        )
        if not result:
            return None
        return self._to_response(result)

    async def mark_all_as_read(self, user_id: str, org_id: str) -> int:
        """Mark all notifications as read for user."""
        result = await self.collection.update_many(
            {"user_id": user_id, "org_id": org_id, "read": False},
            {
                "$set": {
                    "read": True,
                    "read_at": datetime.now(timezone.utc),
                }
            },
        )
        return result.modified_count

    async def delete(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification."""
        try:
            oid = ObjectId(notification_id)
        except Exception:
            return False

        result = await self.collection.delete_one(
            {"_id": oid, "user_id": user_id}
        )
        return result.deleted_count > 0

    @staticmethod
    def _to_response(doc: dict) -> NotificationResponse:
        """Convert MongoDB doc to API response."""
        return NotificationResponse(
            id=str(doc["_id"]),
            user_id=doc["user_id"],
            org_id=doc["org_id"],
            type=doc["type"],
            title=doc["title"],
            body=doc["body"],
            data=doc.get("data", {}),
            read=doc.get("read", False),
            read_at=doc.get("read_at"),
            created_at=doc["created_at"],
        )

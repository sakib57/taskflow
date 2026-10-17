import asyncio
import json
from typing import Any
import aio_pika
from aio_pika import ExchangeType, IncomingMessage, Message
from aio_pika.abc import AbstractRobustConnection, AbstractRobustChannel, AbstractRobustQueue
from app.core.config import get_settings
from app.db.mongodb import MongoDB
from app.models.notification import NotificationType
from app.schemas.notification import CreateNotificationRequest
from app.services.notification_service import NotificationService

settings = get_settings()


class TaskEventsConsumer:
    """
    Consumes task events from RabbitMQ and creates notifications.
    """

    def __init__(self) -> None:
        self.connection: AbstractRobustConnection | None = None
        self.channel: AbstractRobustChannel | None = None
        self.queue: AbstractRobustQueue | None = None
        self.exchange: Any = None
        self._task: asyncio.Task | None = None
        self._shutdown_event = asyncio.Event()

    async def start(self) -> None:
        """Start consuming messages."""
        try:
            # Connect to RabbitMQ (robust connection auto-reconnects)
            self.connection = await aio_pika.connect_robust(settings.rabbitmq_url)
            self.channel = await self.connection.channel()
            await self.channel.set_qos(prefetch_count=10)

            # Declare exchange (idempotent — same as Task Service)
            self.exchange = await self.channel.declare_exchange(
                settings.rabbitmq_exchange,
                ExchangeType.TOPIC,
                durable=True,
            )

            # Declare queue for this service
            self.queue = await self.channel.declare_queue(
                "notifications.task-events",
                durable=True,
                arguments={
                    "x-dead-letter-exchange": "taskflow.dlx",
                    "x-dead-letter-routing-key": "notifications.failed",
                },
            )

            # Bind to routing keys
            routing_keys = [
                "task.created",
                "task.updated",
                "task.assigned",
                "task.deleted",
                "project.created",
            ]
            for key in routing_keys:
                await self.queue.bind(self.exchange, routing_key=key)

            print(f"✅ Consumer bound to queue: {self.queue.name}")
            print(f"📌 Routing keys: {', '.join(routing_keys)}")

            # Start consuming
            await self.queue.consume(self._handle_message)
            print("🎧 Started consuming task events")

        except Exception as e:
            print(f"❌ Failed to start consumer: {e}")
            raise

    async def stop(self) -> None:
        """Stop consumer gracefully."""
        print("🛑 Stopping TaskEventsConsumer...")
        self._shutdown_event.set()

        if self.channel and not self.channel.is_closed:
            await self.channel.close()
        if self.connection and not self.connection.is_closed:
            await self.connection.close()

        print("✅ Consumer stopped")

    async def _handle_message(self, message: IncomingMessage) -> None:
        """Handle incoming message."""
        async with message.process(requeue=False):
            try:
                event = json.loads(message.body.decode("utf-8"))
                event_type = event.get("type") or message.routing_key

                print(f"📨 Received event: {event_type}")

                await self._process_event(event_type, event)

                print(f"✅ Processed: {event_type}")

            except json.JSONDecodeError as e:
                print(f"❌ Invalid JSON: {e}")
                # Message will be rejected (goes to DLQ)
            except Exception as e:
                print(f"❌ Error processing message: {e}")
                # Message will be rejected (goes to DLQ)
                raise

    async def _process_event(
        self,
        event_type: str,
        event: dict[str, Any],
    ) -> None:
        """Route event to appropriate handler."""
        handlers = {
            "task.created": self._handle_task_created,
            "task.assigned": self._handle_task_assigned,
            "task.updated": self._handle_task_updated,
            "task.deleted": self._handle_task_deleted,
            "project.created": self._handle_project_created,
        }

        handler = handlers.get(event_type)
        if handler:
            await handler(event)
        else:
            print(f"⚠️  No handler for: {event_type}")

    # ============================================
    # Event Handlers
    # ============================================

    async def _handle_task_created(self, event: dict[str, Any]) -> None:
        """Handle task.created event."""
        payload = event.get("payload", {})
        org_id = event.get("orgId")
        assignee_id = payload.get("assigneeId")
        task_id = payload.get("taskId")
        title = payload.get("title", "Untitled Task")

        # Only notify if there's an assignee
        if not assignee_id:
            print(f"   ℹ️  No assignee for task {task_id}, skipping notification")
            return

        await self._create_notification(
            user_id=assignee_id,
            org_id=org_id,
            type=NotificationType.TASK_ASSIGNED,
            title="New task assigned to you",
            body=f'You have been assigned: "{title}"',
            data={
                "taskId": task_id,
                "projectId": payload.get("projectId"),
                "priority": payload.get("priority"),
            },
        )

    async def _handle_task_assigned(self, event: dict[str, Any]) -> None:
        """Handle task.assigned event."""
        payload = event.get("payload", {})
        org_id = event.get("orgId")
        new_assignee = payload.get("newAssignee")
        task_id = payload.get("taskId")
        title = payload.get("title", "Untitled Task")

        if not new_assignee:
            return

        await self._create_notification(
            user_id=new_assignee,
            org_id=org_id,
            type=NotificationType.TASK_ASSIGNED,
            title="Task assigned to you",
            body=f'You were assigned: "{title}"',
            data={
                "taskId": task_id,
                "projectId": payload.get("projectId"),
            },
        )

    async def _handle_task_updated(self, event: dict[str, Any]) -> None:
        """Handle task.updated event."""
        payload = event.get("payload", {})
        org_id = event.get("orgId")
        task_id = payload.get("taskId")
        changes = payload.get("changes", {})
        updated_by = payload.get("updatedBy")

        # Skip — could notify watchers (later)
        print(f"   ℹ️  Task {task_id} updated by {updated_by}: {list(changes.keys())}")

    async def _handle_task_deleted(self, event: dict[str, Any]) -> None:
        """Handle task.deleted event."""
        payload = event.get("payload", {})
        task_id = payload.get("taskId")
        print(f"   ℹ️  Task {task_id} deleted")

    async def _handle_project_created(self, event: dict[str, Any]) -> None:
        """Handle project.created event."""
        payload = event.get("payload", {})
        org_id = event.get("orgId")
        project_id = payload.get("projectId")
        name = payload.get("name")
        created_by = payload.get("createdBy")

        print(f"   ℹ️  Project {name} ({project_id}) created by {created_by}")

    # ============================================
    # Helper
    # ============================================

    async def _create_notification(
        self,
        user_id: str,
        org_id: str,
        type: NotificationType,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        """Create notification in MongoDB."""
        db = MongoDB.get_db()
        service = NotificationService(db)

        request = CreateNotificationRequest(
            user_id=user_id,
            org_id=org_id,
            type=type,
            title=title,
            body=body,
            data=data or {},
        )

        notification = await service.create(request)
        print(f"   📬 Notification created for user {user_id}: {notification.id}")


# Singleton instance
consumer = TaskEventsConsumer()

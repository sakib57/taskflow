import json
import aio_pika
from typing import Any
from aio_pika import ExchangeType, IncomingMessage
from aio_pika.abc import AbstractRobustConnection, AbstractRobustChannel
from app.core.config import get_settings
from app.services.es_client import get_es
from app.services.search_service import SearchService

settings = get_settings()


class TaskEventsConsumer:
    def __init__(self) -> None:
        self.connection: AbstractRobustConnection | None = None
        self.channel: AbstractRobustChannel | None = None

    async def start(self) -> None:
        try:
            self.connection = await aio_pika.connect_robust(settings.rabbitmq_url)
            self.channel = await self.connection.channel()
            await self.channel.set_qos(prefetch_count=10)

            exchange = await self.channel.declare_exchange(
                settings.rabbitmq_exchange, ExchangeType.TOPIC, durable=True
            )

            queue = await self.channel.declare_queue("search.task-events", durable=True)

            for key in ["task.created", "task.updated", "task.deleted"]:
                await queue.bind(exchange, routing_key=key)

            await queue.consume(self._handle_message)
            print(f"✅ Search consumer bound. Routing: task.created, task.updated, task.deleted")
        except Exception as e:
            print(f"❌ Consumer failed: {e}")
            raise

    async def stop(self) -> None:
        if self.channel and not self.channel.is_closed:
            await self.channel.close()
        if self.connection and not self.connection.is_closed:
            await self.connection.close()

    async def _handle_message(self, message: IncomingMessage) -> None:
        async with message.process(requeue=False):
            try:
                event = json.loads(message.body.decode("utf-8"))
                event_type = event.get("type")
                payload = event.get("payload", {})

                es = await get_es()
                service = SearchService(es)
                await service.ensure_index()

                task_id = payload.get("taskId")
                if not task_id:
                    return

                if event_type == "task.created":
                    doc = {
                        "orgId": event["orgId"],
                        "projectId": payload.get("projectId"),
                        "title": payload.get("title"),
                        "description": payload.get("description"),
                        "status": payload.get("status", "todo"),
                        "priority": payload.get("priority", "medium"),
                        "assigneeId": payload.get("assigneeId"),
                        "createdBy": payload.get("createdBy"),
                        "createdAt": event["timestamp"],
                        "updatedAt": event["timestamp"],
                    }
                    await service.index_task(task_id, doc)
                    print(f"🔍 Indexed task: {task_id}")

                elif event_type == "task.updated":
                    changes = payload.get("changes", {})
                    if changes:
                        await service.update_task(task_id, changes)
                        print(f"🔄 Updated index: {task_id}")

                elif event_type == "task.deleted":
                    await service.delete_task(task_id)
                    print(f"🗑️ Deleted from index: {task_id}")

            except Exception as e:
                print(f"❌ Error: {e}")
                raise


consumer = TaskEventsConsumer()

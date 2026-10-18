from typing import Any
from elasticsearch import AsyncElasticsearch, NotFoundError

INDEX_NAME = "tasks"


class SearchService:
    def __init__(self, es: AsyncElasticsearch):
        self.es = es

    async def ensure_index(self) -> None:
        """Create index with mapping if not exists."""
        if await self.es.indices.exists(index=INDEX_NAME):
            return

        mapping = {
            "mappings": {
                "properties": {
                    "orgId": {"type": "keyword"},
                    "projectId": {"type": "keyword"},
                    "title": {"type": "text", "analyzer": "standard"},
                    "description": {"type": "text", "analyzer": "standard"},
                    "status": {"type": "keyword"},
                    "priority": {"type": "keyword"},
                    "assigneeId": {"type": "keyword"},
                    "createdBy": {"type": "keyword"},
                    "createdAt": {"type": "date"},
                    "updatedAt": {"type": "date"},
                }
            }
        }
        await self.es.indices.create(index=INDEX_NAME, body=mapping)
        print(f"✅ Elasticsearch index '{INDEX_NAME}' created")

    async def index_task(self, task_id: str, task_data: dict[str, Any]) -> None:
        await self.es.index(index=INDEX_NAME, id=task_id, document=task_data)

    async def update_task(self, task_id: str, partial: dict[str, Any]) -> None:
        await self.es.update(index=INDEX_NAME, id=task_id, doc=partial, doc_as_upsert=True)

    async def delete_task(self, task_id: str) -> None:
        try:
            await self.es.delete(index=INDEX_NAME, id=task_id)
        except NotFoundError:
            pass

    async def search(
        self,
        org_id: str,
        query: str | None = None,
        status: str | None = None,
        priority: str | None = None,
        assignee_id: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> dict[str, Any]:
        must = [{"term": {"orgId": org_id}}]

        if query:
            must.append({
                "multi_match": {
                    "query": query,
                    "fields": ["title^2", "description"],
                    "fuzziness": "AUTO",
                }
            })

        filters = []
        if status:
            filters.append({"term": {"status": status}})
        if priority:
            filters.append({"term": {"priority": priority}})
        if assignee_id:
            filters.append({"term": {"assigneeId": assignee_id}})

        body = {
            "query": {"bool": {"must": must, "filter": filters}},
            "from": (page - 1) * limit,
            "size": limit,
            "sort": [{"createdAt": {"order": "desc"}}],
        }

        response = await self.es.search(index=INDEX_NAME, body=body)

        return {
            "items": [
                {**hit["_source"], "id": hit["_id"], "score": hit["_score"]}
                for hit in response["hits"]["hits"]
            ],
            "total": response["hits"]["total"]["value"],
            "page": page,
            "limit": limit,
        }

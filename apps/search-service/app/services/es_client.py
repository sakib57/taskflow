from elasticsearch import AsyncElasticsearch
from app.core.config import get_settings

settings = get_settings()

es_client: AsyncElasticsearch | None = None


async def get_es() -> AsyncElasticsearch:
    print("Inside GET_ES")
    global es_client
    if es_client is None:
        es_client = AsyncElasticsearch(settings.elasticsearch_url)
        print("CLIENT", es_client)
        print("RRTT", await es_client.ping())
        # Ping to verify
        if not await es_client.ping():
            raise RuntimeError("Elasticsearch is not reachable")
    return es_client


async def close_es() -> None:
    global es_client
    if es_client:
        await es_client.close()
        es_client = None

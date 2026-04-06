"""
ChromaDB integration for persisting and retrieving diagram results.
"""
import chromadb
from typing import List, Dict, Any
from datetime import datetime

from app.config import get_settings
from app.schemas.diagram import ParsedResource

settings = get_settings()
_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
        _collection = _client.get_or_create_collection(
            name=settings.chroma_collection,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def store_diagram_result(
    diagram_id: str,
    title: str,
    resources: List[ParsedResource],
    ai_summary: str,
) -> None:
    col = _get_collection()
    providers = list(set(r.provider for r in resources))
    resource_types = list(set(r.resource_type for r in resources))

    document = (
        f"Title: {title}\n"
        f"Providers: {', '.join(providers)}\n"
        f"Resource types: {', '.join(resource_types)}\n"
        f"Summary: {ai_summary}"
    )
    metadata = {
        "diagram_id": diagram_id,
        "title": title,
        "resource_count": len(resources),
        "providers": ",".join(providers),
        "created_at": datetime.utcnow().isoformat(),
    }
    col.add(documents=[document], metadatas=[metadata], ids=[diagram_id])


def get_all_diagrams() -> List[Dict[str, Any]]:
    try:
        col = _get_collection()
        result = col.get(include=["metadatas", "documents"])
        items = []
        for i, meta in enumerate(result.get("metadatas", [])):
            items.append({
                "diagram_id": meta.get("diagram_id", ""),
                "title": meta.get("title", ""),
                "resource_count": meta.get("resource_count", 0),
                "providers": meta.get("providers", "").split(","),
                "created_at": meta.get("created_at", ""),
                "summary": result["documents"][i] if result.get("documents") else "",
            })
        items.sort(key=lambda x: x["created_at"], reverse=True)
        return items
    except Exception:
        return []


def get_metrics() -> Dict[str, Any]:
    try:
        col = _get_collection()
        result = col.get(include=["metadatas"])
        metadatas = result.get("metadatas", [])
        if not metadatas:
            return {
                "total_diagrams": 0,
                "total_resources": 0,
                "avg_resources": 0.0,
                "provider_counts": {},
            }
        total_resources = sum(int(m.get("resource_count", 0)) for m in metadatas)
        provider_counts: Dict[str, int] = {}
        for m in metadatas:
            for p in m.get("providers", "").split(","):
                p = p.strip()
                if p:
                    provider_counts[p] = provider_counts.get(p, 0) + 1
        return {
            "total_diagrams": len(metadatas),
            "total_resources": total_resources,
            "avg_resources": total_resources / len(metadatas) if metadatas else 0.0,
            "provider_counts": provider_counts,
        }
    except Exception:
        return {"total_diagrams": 0, "total_resources": 0, "avg_resources": 0.0, "provider_counts": {}}

#!/usr/bin/env python3
"""
Seed ChromaDB with sample DevOps documentation.
Connects to ChromaDB at localhost:8001 and ingests 5 sample doc dicts.
"""

import os
import chromadb
from chromadb.config import Settings

CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8001"))

SAMPLE_DOCS = [
    {
        "id": "doc-cicd-001",
        "document": (
            "CI/CD Best Practices: Always cache dependencies using actions/cache with a lockfile hash. "
            "Run tests in parallel jobs. Use semantic versioning. Implement blue-green or canary deployments. "
            "Enable Dependabot for automated dependency updates. "
            "Common GitHub Actions failures: checkout errors (missing permissions), artifact size limit (500MB), "
            "Docker build timeouts (use layer caching). Debug with ACTIONS_RUNNER_DEBUG=true secret."
        ),
        "metadata": {"source": "cicd_guide.md", "topic": "cicd", "type": "best_practices"},
    },
    {
        "id": "doc-k8s-oomkilled-001",
        "document": (
            "Kubernetes OOMKilled Troubleshooting: Container exceeds memory limit (exit code 137). "
            "Diagnosis: kubectl describe pod <name> | grep OOMKilled, kubectl top pod <name> --containers. "
            "Solutions: (1) Increase memory limit: resources.limits.memory: 1Gi. "
            "(2) Add HPA for auto-scaling. (3) Profile for memory leaks. "
            "(4) Optimize connection pooling and caching. "
            "Prevent: Set appropriate requests and limits, monitor with Prometheus alerts."
        ),
        "metadata": {"source": "kubernetes_troubleshooting.md", "topic": "kubernetes", "type": "troubleshooting"},
    },
    {
        "id": "doc-k8s-crashloop-001",
        "document": (
            "CrashLoopBackOff Diagnosis: Pod repeatedly crashes on startup. "
            "Commands: kubectl logs <pod> --previous, kubectl describe pod <pod>. "
            "Common causes: missing environment variable, can't connect to database at startup, "
            "wrong entrypoint in Dockerfile, permission denied on mounted volume. "
            "Fix: Check previous logs for the actual error message before the crash. "
            "Use init containers to wait for dependencies."
        ),
        "metadata": {"source": "kubernetes_troubleshooting.md", "topic": "kubernetes", "type": "troubleshooting"},
    },
    {
        "id": "doc-errors-nginx-502-001",
        "document": (
            "Nginx 502 Bad Gateway: Upstream service is down or unreachable. "
            "Cause: App server crashed, connection refused, or proxy timeout exceeded. "
            "Diagnosis: tail -f /var/log/nginx/error.log, curl -v http://upstream:port/health. "
            "Fix: (1) Check upstream service is running. (2) Verify nginx upstream block has correct host:port. "
            "(3) Increase proxy_read_timeout if app is slow (proxy_read_timeout 120s). "
            "(4) Check app logs for panics. (5) Verify connection pool isn't exhausted."
        ),
        "metadata": {"source": "common_errors.md", "topic": "nginx", "type": "error_pattern"},
    },
    {
        "id": "doc-errors-redis-001",
        "document": (
            "Redis Connection Refused: redis-cli -h <host> ping returns 'Connection refused'. "
            "Cause: Redis process crashed, sentinel failover changed primary, wrong host/port. "
            "Diagnosis: systemctl status redis, redis-cli -h sentinel:26379 sentinel get-master-addr-by-name mymaster. "
            "Fix: Update app config with new primary address. "
            "Prevention: Configure app with Sentinel addresses not direct Redis — use ioredis sentinels array. "
            "After failover: NOAUTH errors mean the password wasn't propagated; check requirepass in redis.conf."
        ),
        "metadata": {"source": "common_errors.md", "topic": "redis", "type": "error_pattern"},
    },
]


def main():
    print(f"[INFO] Connecting to ChromaDB at {CHROMA_HOST}:{CHROMA_PORT}...")
    try:
        client = chromadb.HttpClient(
            host=CHROMA_HOST,
            port=CHROMA_PORT,
            settings=Settings(anonymized_telemetry=False),
        )
        client.heartbeat()
        print("[OK] Connected to ChromaDB")
    except Exception as e:
        print(f"[WARN] HTTP connection failed: {e}. Using ephemeral client.")
        client = chromadb.Client(Settings(anonymized_telemetry=False))

    collection = client.get_or_create_collection(
        name="devops_docs",
        metadata={"hnsw:space": "cosine"},
    )

    ids = [d["id"] for d in SAMPLE_DOCS]
    documents = [d["document"] for d in SAMPLE_DOCS]
    metadatas = [d["metadata"] for d in SAMPLE_DOCS]

    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

    count = collection.count()
    print(f"[OK] Successfully ingested {len(SAMPLE_DOCS)} documents. Collection total: {count} docs.")

    # Quick verification
    print("\n[INFO] Verifying with a test query: 'OOMKilled memory'")
    results = collection.query(query_texts=["OOMKilled memory"], n_results=1)
    if results["documents"][0]:
        print(f"[OK] Query returned: {results['documents'][0][0][:100]}...")
    else:
        print("[WARN] Query returned no results")


if __name__ == "__main__":
    main()

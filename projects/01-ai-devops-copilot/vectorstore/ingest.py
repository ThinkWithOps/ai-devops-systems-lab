#!/usr/bin/env python3
"""
ChromaDB ingestion script for AI DevOps Copilot.
Ingests all .md files from vectorstore/sample_docs/ and seeds the logs collection.
"""

import os
import sys
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
import random

import chromadb
from chromadb.config import Settings

# ---- Configuration ----
CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8001"))
DOCS_DIR = Path(__file__).parent / "sample_docs"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# ---- Realistic log entries to seed ----
SAMPLE_LOG_SERVICES = ["nginx", "postgres", "api-gateway", "k8s-pod", "k8s-node", "github-actions", "redis", "data-pipeline"]
SAMPLE_LOG_ENTRIES = [
    ("ERROR", "api-gateway", "Connection pool exhausted: max_connections=50 reached. Requests queuing."),
    ("ERROR", "nginx", "502 Bad Gateway - upstream api-gateway:8000 failed to respond within 30s timeout"),
    ("ERROR", "k8s-pod", "OOMKilled: Container api-gateway exceeded memory limit of 512Mi. Restarting. (restart count: 4)"),
    ("ERROR", "postgres", "FATAL: remaining connection slots are reserved for non-replication superuser connections"),
    ("ERROR", "redis", "NOAUTH Authentication required. Client attempted command without auth. IP: 10.0.1.45"),
    ("ERROR", "data-pipeline", "Kafka consumer lag exceeds threshold: topic=orders partition=2 lag=45231 (max: 10000)"),
    ("ERROR", "api-gateway", "Upstream service user-service unreachable: dial tcp 10.0.2.15:8080: connect: connection refused"),
    ("ERROR", "nginx", "SSL handshake failure: certificate verify failed for client 203.0.113.42"),
    ("ERROR", "github-actions", "Step 'Deploy to production' failed: kubectl rollout timed out after 300s"),
    ("ERROR", "postgres", "Deadlock detected: process 12345 waits for ShareLock on transaction 67890"),
    ("WARN", "postgres", "Slow query detected: SELECT * FROM orders WHERE user_id=? took 3842ms (threshold: 1000ms)"),
    ("WARN", "k8s-node", "Node worker-3 memory pressure: used 87% of 16Gi available. Consider scaling."),
    ("WARN", "api-gateway", "Rate limit approaching for client IP 203.0.113.42: 950/1000 requests in current window"),
    ("WARN", "github-actions", "Step 'Docker build' took 8m32s - consider caching base layers"),
    ("WARN", "nginx", "SSL certificate for api.acme-corp.com expires in 14 days. Renewal recommended."),
    ("WARN", "postgres", "Checkpoint occurring too frequently (every 42s). Consider increasing checkpoint_segments."),
    ("WARN", "k8s-pod", "Pod api-gateway-7d8f9-xk2p failed readiness probe: HTTP GET /health returned 503"),
    ("WARN", "redis", "Memory usage at 78% of maxmemory (6.2GB/8GB). Consider eviction policy review."),
    ("WARN", "data-pipeline", "Spark executor lost: Executor 5 on worker-2 exited unexpectedly (exit code 137)"),
    ("WARN", "api-gateway", "Circuit breaker OPEN for downstream service payment-service after 5 consecutive failures"),
    ("INFO", "nginx", "GET /api/v2/orders 200 45ms - upstream: api-gateway:8000"),
    ("INFO", "github-actions", "Workflow run #247 started: CI/CD Pipeline on branch main (push event)"),
    ("INFO", "nginx", "POST /api/v2/auth/login 200 120ms - user authenticated successfully"),
    ("INFO", "github-actions", "Step 'Run unit tests' completed in 45s - 234 passed, 0 failed"),
    ("INFO", "k8s-deployment", "Rolling update started for deployment api-gateway: 0/3 pods updated"),
    ("INFO", "k8s-deployment", "Deployment api-gateway successfully rolled out: 3/3 pods ready"),
    ("INFO", "nginx", "SSL certificate for internal.acme-corp.com renewed successfully. Valid until 2025-03-15."),
    ("INFO", "github-actions", "Docker image pushed: acme-corp/api-gateway:main-a1b2c3d (372MB)"),
    ("INFO", "postgres", "VACUUM ANALYZE completed on table orders: 1.2M rows, 3.4s elapsed"),
    ("INFO", "redis", "Redis cluster failover completed: new primary is redis-node-2:6379"),
    ("INFO", "api-gateway", "Health check passed: all upstream services responding within 100ms"),
    ("INFO", "k8s-pod", "Pod api-gateway-7d8f9-abc12 started successfully, ready in 4.2s"),
    ("INFO", "data-pipeline", "Kafka consumer caught up: topic=orders all partitions at lag=0"),
    ("INFO", "github-actions", "Security scan complete: 0 critical, 2 medium, 5 low vulnerabilities found"),
    ("INFO", "nginx", "Rate limiting enabled for /api/v2/export endpoint: 10 req/min per IP"),
    ("WARN", "k8s-scheduler", "Unable to schedule pod ml-inference-job: insufficient CPU on all nodes"),
    ("ERROR", "k8s-pod", "CrashLoopBackOff: Container data-processor failed to start. Exit code: 1. Logs: ImportError: No module named 'pandas'"),
    ("ERROR", "nginx", "Upstream connect error or disconnect/reset before headers. Reset reason: connection timeout"),
    ("WARN", "api-gateway", "Response time SLA breach: /api/v2/reports endpoint averaged 8.4s (SLA: 3s)"),
    ("INFO", "github-actions", "Canary deployment complete: 10% traffic shifted to v2.4.1. Monitoring error rate."),
    ("ERROR", "postgres", "Connection to replica replica-2:5432 lost: could not connect to the server (connection refused)"),
    ("WARN", "redis", "Replication lag detected: replica-1 is 45s behind primary"),
    ("INFO", "k8s-node", "Autoscaler: adding node worker-4 (t3.xlarge) to satisfy pending pod requests"),
    ("WARN", "api-gateway", "JWT token expiry edge case: issued_at and expires_at are identical. Rejecting."),
    ("ERROR", "data-pipeline", "Spark job failed: OutOfMemoryError in executor 3 - Java heap space exhausted (8GB limit)"),
    ("INFO", "nginx", "New upstream server added: api-gateway-v2:8001 (weight=5) for canary routing"),
    ("ERROR", "k8s-pod", "ImagePullBackOff: Back-off pulling image acme-corp/ml-service:v1.2.3 - unauthorized"),
    ("WARN", "github-actions", "Artifact upload warning: report.tar.gz is 850MB, approaching 1GB limit"),
    ("INFO", "api-gateway", "Feature flag 'new-checkout-flow' enabled for 50% of users"),
    ("ERROR", "nginx", "504 Gateway Timeout: upstream server did not respond in 60s for POST /api/v2/batch"),
]


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        # Try to break at a paragraph or sentence boundary
        if end < len(text):
            for delim in ['\n\n', '\n', '. ', ' ']:
                idx = text.rfind(delim, start, end)
                if idx > start:
                    end = idx + len(delim)
                    break
        chunks.append(text[start:end].strip())
        start = end - overlap
    return [c for c in chunks if len(c) > 50]


def connect_chroma() -> chromadb.ClientAPI:
    """Connect to ChromaDB with fallback to in-process client."""
    try:
        client = chromadb.HttpClient(
            host=CHROMA_HOST,
            port=CHROMA_PORT,
            settings=Settings(anonymized_telemetry=False),
        )
        client.heartbeat()
        print(f"[OK] Connected to ChromaDB at {CHROMA_HOST}:{CHROMA_PORT}")
        return client
    except Exception as e:
        print(f"[WARN] Could not connect to ChromaDB HTTP: {e}")
        print("[INFO] Falling back to ephemeral in-process ChromaDB")
        return chromadb.Client(Settings(anonymized_telemetry=False))


def ingest_docs(client: chromadb.ClientAPI) -> int:
    """Ingest all .md files from sample_docs/ into devops_docs collection."""
    collection = client.get_or_create_collection(
        name="devops_docs",
        metadata={"hnsw:space": "cosine"},
    )

    if not DOCS_DIR.exists():
        print(f"[WARN] Docs directory not found: {DOCS_DIR}")
        return 0

    total_chunks = 0
    md_files = list(DOCS_DIR.glob("*.md"))
    print(f"\n[INFO] Found {len(md_files)} markdown files to ingest")

    for md_file in md_files:
        print(f"  Processing {md_file.name}...", end=" ")
        text = md_file.read_text(encoding="utf-8")
        chunks = chunk_text(text)

        ids = [str(uuid.uuid4()) for _ in chunks]
        metadatas = [
            {
                "source": md_file.name,
                "chunk_index": i,
                "total_chunks": len(chunks),
            }
            for i in range(len(chunks))
        ]

        collection.upsert(ids=ids, documents=chunks, metadatas=metadatas)
        print(f"{len(chunks)} chunks ingested")
        total_chunks += len(chunks)

    print(f"[OK] Docs ingestion complete: {total_chunks} total chunks in devops_docs collection")
    return total_chunks


def ingest_logs(client: chromadb.ClientAPI) -> int:
    """Seed the logs collection with realistic log entries."""
    collection = client.get_or_create_collection(
        name="logs",
        metadata={"hnsw:space": "cosine"},
    )

    ids = []
    documents = []
    metadatas = []

    now = datetime.now(timezone.utc)
    for i, (severity, service, message) in enumerate(SAMPLE_LOG_ENTRIES):
        # Spread logs over the last 2 hours
        ts = now - timedelta(minutes=random.randint(0, 120))
        timestamp = ts.isoformat()

        ids.append(str(uuid.uuid4()))
        documents.append(f"[{severity}] {service}: {message}")
        metadatas.append({
            "timestamp": timestamp,
            "severity": severity,
            "service": service,
            "message": message,
        })

    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    print(f"[OK] Logs ingestion complete: {len(SAMPLE_LOG_ENTRIES)} log entries in logs collection")
    return len(SAMPLE_LOG_ENTRIES)


if __name__ == "__main__":
    print("=" * 60)
    print("AI DevOps Copilot — ChromaDB Ingestion Script")
    print("=" * 60)

    client = connect_chroma()

    docs_count = ingest_docs(client)
    log_count = ingest_logs(client)

    print("\n" + "=" * 60)
    print(f"[DONE] Ingestion complete:")
    print(f"  - devops_docs: {docs_count} doc chunks")
    print(f"  - logs: {log_count} log entries")
    print("=" * 60)

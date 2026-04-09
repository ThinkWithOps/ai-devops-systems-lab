"""
Lambda handler — triggered by S3 ObjectCreated events on the docs/ prefix.

Flow:
1. Get the uploaded file key from the S3 event
2. Download the new document from S3
3. Download existing chroma_db from S3 (if it exists)
4. Chunk + embed the new document
5. Add to ChromaDB
6. Zip and upload updated chroma_db back to S3
"""

import json
import os
import shutil
import urllib.parse
import zipfile
from pathlib import Path

import boto3
import chromadb
from sentence_transformers import SentenceTransformer

# Paths inside Lambda's writable /tmp
CHROMA_DIR = "/tmp/chroma_db"
CHROMA_ZIP = "/tmp/chroma_db.zip"
DOC_PATH = "/tmp/downloaded_doc"

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "devops_docs")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))
CHROMA_S3_PREFIX = os.getenv("CHROMA_S3_PREFIX", "chroma_db/")

s3 = boto3.client("s3")

# Load model once at container init (warm start optimization)
print("Loading embedding model...")
model = SentenceTransformer(EMBEDDING_MODEL)
print(f"Model loaded: {EMBEDDING_MODEL}")


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    if len(text) <= chunk_size:
        return [text.strip()] if text.strip() else []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = end - overlap
    return chunks


def download_chroma_from_s3(bucket: str) -> bool:
    """Download and unzip chroma_db from S3. Returns True if found."""
    s3_key = f"{CHROMA_S3_PREFIX}chroma_db.zip"
    try:
        s3.download_file(bucket, s3_key, CHROMA_ZIP)
        print(f"Downloaded chroma_db from s3://{bucket}/{s3_key}")
    except s3.exceptions.ClientError as e:
        if e.response["Error"]["Code"] in ("404", "NoSuchKey"):
            print("No existing chroma_db in S3 — starting fresh.")
            return False
        raise

    if Path(CHROMA_DIR).exists():
        shutil.rmtree(CHROMA_DIR)

    with zipfile.ZipFile(CHROMA_ZIP, "r") as zf:
        zf.extractall("/tmp")

    print(f"Extracted chroma_db to {CHROMA_DIR}")
    return True


def upload_chroma_to_s3(bucket: str):
    """Zip chroma_db directory and upload to S3."""
    if Path(CHROMA_ZIP).exists():
        os.remove(CHROMA_ZIP)

    with zipfile.ZipFile(CHROMA_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in Path(CHROMA_DIR).rglob("*"):
            if file.is_file():
                zf.write(file, file.relative_to(Path(CHROMA_DIR).parent))

    s3_key = f"{CHROMA_S3_PREFIX}chroma_db.zip"
    s3.upload_file(CHROMA_ZIP, bucket, s3_key)
    print(f"Uploaded updated chroma_db to s3://{bucket}/{s3_key}")


def handler(event, context):
    """Lambda entry point."""
    print(f"Event: {json.dumps(event)}")

    # Parse S3 event
    record = event["Records"][0]
    bucket = record["s3"]["bucket"]["name"]
    key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

    print(f"Processing file: s3://{bucket}/{key}")

    # Only process docs/ prefix
    if not key.startswith("docs/"):
        print(f"Skipping {key} — not in docs/ prefix")
        return {"statusCode": 200, "body": "Skipped"}

    filename = Path(key).name
    if not filename.endswith((".md", ".txt")):
        print(f"Skipping {filename} — not .md or .txt")
        return {"statusCode": 200, "body": "Skipped"}

    # Step 1: Download the new document
    s3.download_file(bucket, key, DOC_PATH)
    with open(DOC_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    print(f"Downloaded document: {filename} ({len(content)} chars)")

    # Step 2: Download existing chroma_db from S3
    download_chroma_from_s3(bucket)

    # Step 3: Chunk the document
    chunks = chunk_text(content, CHUNK_SIZE, CHUNK_OVERLAP)
    print(f"Created {len(chunks)} chunks from {filename}")

    if not chunks:
        print("No chunks created — empty document?")
        return {"statusCode": 200, "body": "No chunks"}

    # Step 4: Generate embeddings
    embeddings = model.encode(chunks, show_progress_bar=False).tolist()
    print(f"Generated {len(embeddings)} embeddings")

    # Step 5: Store in ChromaDB
    client = chromadb.PersistentClient(path=CHROMA_DIR)

    try:
        collection = client.get_collection(COLLECTION_NAME)
        print(f"Using existing collection '{COLLECTION_NAME}'")
    except Exception:
        collection = client.create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        print(f"Created new collection '{COLLECTION_NAME}'")

    # Remove existing chunks for this file to avoid duplicates on re-upload
    try:
        existing = collection.get(where={"source": filename})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
            print(f"Removed {len(existing['ids'])} existing chunks for {filename}")
    except Exception:
        pass

    ids = [f"{filename}__chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]

    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas,
    )
    print(f"Stored {len(chunks)} chunks in ChromaDB")

    # Step 6: Upload updated chroma_db back to S3
    upload_chroma_to_s3(bucket)

    return {
        "statusCode": 200,
        "body": json.dumps({
            "file": filename,
            "chunks": len(chunks),
            "collection": COLLECTION_NAME,
        }),
    }

# app/vector_store.py
import os
from pinecone import Pinecone
from embedding import embed_text
from typing import List
from utils import extract_text_chunks

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(name=os.getenv("PINECONE_INDEX_NAME"))

def query_pinecone(request, user_id=None) -> List[dict]:
    query_embedding = embed_text(request.query + " " + str(request.sme_context.dict()))

    filter_ = {
        "industry": request.industry,
        "plant_name": request.sme_context.plant_name,
    }

    # Optional: include user_id if using private knowledge base
    if user_id:
        filter_["user_id"] = user_id

    results = index.query(
        vector=query_embedding,
        top_k=10,
        include_metadata=True,
        filter=filter_
    )

    chunks = []
    for match in results["matches"]:
        chunks.append({
            "text": match["metadata"]["text"],
            "source": match["metadata"]["source"],
            "score": match["score"]
        })
    return chunks

async def upsert_document(file, s3_url, document_name, document_type,  user_id=None):
    # Extract text chunks
    extracted_chunks = extract_text_chunks(file, s3_url)
    print("extracted_chunks", extract_text_chunks)
    for i, chunk_text in enumerate(extracted_chunks):
        section = i + 1
        embedding = embed_text(chunk_text)
        metadata = {
            "text": chunk_text,
            "source": f"{document_name} - Section: {section}",
        }
        if user_id:
            metadata["user_id"] = user_id

        index.upsert(vectors=[
            {
                "id": f"{document_name}-{section}-{i}",
                "values": embedding,
                "metadata": metadata
            }
        ])

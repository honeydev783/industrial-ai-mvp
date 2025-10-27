# app/vector_store.py
import os
from pinecone import Pinecone, ServerlessSpec
from embedding import embed_text
from typing import List
from utils import extract_text_chunks

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
indexes = pc.list_indexes()
print("Indexes:", indexes)
index = pc.Index(name=os.getenv("PINECONE_INDEX_NAME"))
# pc.create_index(
#     name="timeseries",
#     dimension=1024,  # must match your embedding model
#     metric="cosine",
#     spec=ServerlessSpec(
#         cloud="aws",
#         region=os.getenv("PINECONE_REGIONN", "us-east-1")
#     )
# )
# a1nnotation-rules-index-1
pinecone_index = pc.Index(name="timeseries")
stats = pinecone_index.describe_index_stats()
print(stats)


async def query_pinecone(request, user_id=None) -> List[dict]:
    # query_embedding = embed_text(request.query + " " + str(request.sme_context.dict()))
    query_embedding = await embed_text(request.query)
    print("hahahahhahaquery_embedding:", query_embedding)
    filter_ = {
        # "industry": request.industry,
        # "plant_name": request.sme_context.plant_name,
    }

    # Optional: include user_id if using private knowledge base
    if user_id:
        filter_["user_id"] = user_id

    results = index.query(
        vector=query_embedding,
        top_k=10,
        include_metadata=True,
        # filter=filter_
    )

    chunks = []
    for match in results["matches"]:
        chunks.append(
            {
                "text": match["metadata"]["text"],
                "source": match["metadata"]["source"],
                "score": match["score"],
            }
        )
    print("query_pinecone results:", chunks)
    return chunks


async def upsert_document(file, s3_url, document_name, document_type, user_id=None):
    # Extract text chunks
    extracted_chunks = extract_text_chunks(file, s3_url)
    print("extracted_chunks", extract_text_chunks)
    for i, chunk_text in enumerate(extracted_chunks):
        section = i + 1
        embedding = await embed_text(chunk_text)  # <- await the coroutine
        embedding_list = (
            embedding.tolist() if hasattr(embedding, "tolist") else list(embedding)
        )

        metadata = {
            "text": chunk_text,
            "source": f"{document_name} - Section: {section}",
        }
        if user_id:
            metadata["user_id"] = user_id

        index.upsert(
            vectors=[
                {
                    "id": f"{document_name}-{section}-{i}",
                    "values": embedding_list,
                    "metadata": metadata,
                }
            ]
        )


def upsert_to_pinecone(id: str, text: str, metadata: dict):
    """
    Upsert a single document to Pinecone.
    """
    vector = embed_text(text)
    index.upsert(
        vectors=[
            {
                "id": id,
                "values": vector,
                "metadata": {
                    "text": text,
                    **metadata,  # Include any additional metadata
                },
            }
        ]
    )
    print(f"Upserted data {id} to Pinecone.")


# async def search_pinecone(question: str, top_k: int = 5):
#     print(f"Searching Pinecone for question: {question}")
#     vector = await embed_text(question)
#     results = pinecone_index.query(
#         vector=vector,
#         top_k=top_k,
#         include_metadata=True,
#         filter={"status": {"$ne": "bad"}}  # filter out bad chunks
#     )
#     print(f"Search results: {results}")
#     return results
def extract_tags_from_question(question: str) -> list[str]:
    tags = []
    question = question.lower()
    if "vib" in question or "vibration" in question:
        tags.append("Vibration")
    if "temp" in question or "temperature" in question:
        tags.append("Temperature")
    if "cond" in question or "conductivity" in question:
        tags.append("Conductivity")
    return tags


# Main multi-tag Pinecone search
# async def search_pinecone(question: str, top_k: int = 2):
#     print(f"🔍 Searching Pinecone for question: {question}")

#     # Step 1: Get tags mentioned in the question
#     tag_labels = extract_tags_from_question(question)
#     if not tag_labels:
#         print("⚠️ No known tag found in the question.")
#         return []

#     # Step 2: Embed the question
#     vector = await embed_text(question)

#     all_matches = []
#     for tag_label in tag_labels:
#         print(f"→ Querying for tag: {tag_label}")
#         res = pinecone_index.query(
#             vector=vector,
#             top_k=top_k,
#             include_metadata=True,
#             filter={
#                 "tagLabel": tag_label,
#                 "status": {"$ne": "bad"}  # optional filtering
#             },
#         )
#         all_matches.extend(res.matches)

#     print(f"✅ Retrieved {len(all_matches)} matches across tags: {tag_labels}")
#     return all_matches


async def search_pinecone(question: str, top_k: int = 5):
    print(f"🔍 Searching Pinecone for: {question}")

    # Step 1: Embed question
    vector = await embed_text(question)

    # Step 2: Extract tags
    tag_labels = extract_tags_from_question(question)

    if not tag_labels:
        # Fallback to regular query
        return pinecone_index.query(
            vector=vector,
            top_k=top_k,
            include_metadata=True,
            filter={"status": {"$ne": "bad"}},
        )

    # Step 3: Perform filtered queries by tag
    all_matches = []
    for tag_label in tag_labels:
        response = pinecone_index.query(
            vector=vector,
            top_k=top_k,
            include_metadata=True,
            filter={
                "tagLabel": tag_label,
                "status": {"$ne": "bad"},
            },
        )
        all_matches.extend(response["matches"])

    # Step 4: Return a synthetic `QueryResponse`-like object
    count = top_k * 3
    return {
        "matches": sorted(all_matches, key=lambda m: m["score"], reverse=True)[:count],
    }

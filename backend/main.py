# app/main.py

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from dotenv import load_dotenv
from models import QueryRequest, QueryResponse
from vector_store import query_pinecone, upsert_document
from llm_client import ask_claude
from memory import MemoryStore
import tempfile
import mimetypes
import boto3
import os
from utils import upload_to_s3
from urllib.parse import urlparse

# Load environment variables
load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

memory_store = MemoryStore()
s3_client = boto3.client("s3")
BUCKET_NAME = os.getenv("S3_BUCKET")

@app.post("/query", response_model=QueryResponse)
async def query_llm(request: QueryRequest):
    retrieved_chunks = query_pinecone(request, user_id=request.user_id)
    # history = memory_store.get_history(
    #     user_id=request.user_id,
    #     industry=request.industry,
    #     plant_name=request.sme_context.plant_name
    # )

    answer, internal_source, external_source, document_percent, external_use, followingup = ask_claude(
        query=request.query,
        context_chunks=retrieved_chunks,
        industry=request.industry,
        sme_context=request.sme_context,
        use_external=request.use_external,
    )
    
    # memory_store.add_entry(
    #     user_id=request.user_id,
    #     industry=request.industry,
    #     plant_name=request.sme_context.plant_name,
    #     question=request.query,
    #     answer=answer
    # )

    return QueryResponse(
        answer=answer,
        sources=[internal_source, external_source],
        transparency=[document_percent, external_use],
        follow_up_questions=followingup
    )

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_name: str = Form(...),
    document_type: str = Form(...),
    user_id: str = Form(None)  # Optional, pass if using private KB
):
    ext = os.path.splitext(file.filename)[1].lower()
    print(tempfile.gettempdir())
    print("Uploading file:", file.filename, "with extension:", ext)
    if ext not in [".pdf", ".doc", ".docx", ".txt", ".csv"]:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
        tmp.flush()
        os.fsync(tmp.fileno())
    print("Temporary file created at:", tmp_path)
    s3_url = upload_to_s3(tmp_path, file.filename, user_id)
    print("stored in s3 bucket===>:", s3_url)
    await upsert_document(
        file=tmp_path,
        s3_url = s3_url,
        document_name=document_name,
        document_type=document_type,
        user_id=user_id
    )
    return {"status": "success"}

@app.get("/files", response_model=List[str])
async def list_user_files(user_id: str):
    prefix = f"{user_id}/"
    try:
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
        contents = response.get("Contents", [])
        file_urls = [f"s3://{BUCKET_NAME}/{obj['Key']}" for obj in contents]
        return file_urls
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.delete("/delete-file")
async def delete_file_by_s3_url(
    s3_url: str):
    try:
        # Parse the S3 URL
        parsed = urlparse(s3_url)
        if parsed.scheme != "s3":
            raise ValueError("Invalid S3 URI format")

        bucket = parsed.netloc
        key = parsed.path.lstrip("/")  # Remove leading slash from path

        # Perform deletion
        s3_client.delete_object(Bucket=bucket, Key=key)

        return {"message": f"Successfully deleted from bucket: {bucket}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
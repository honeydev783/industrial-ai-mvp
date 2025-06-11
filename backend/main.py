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
import os
from utils import upload_to_s3
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

@app.post("/query", response_model=QueryResponse)
async def query_llm(request: QueryRequest):
    retrieved_chunks = query_pinecone(request, user_id=request.user_id)
    history = memory_store.get_history(
        user_id=request.user_id,
        industry=request.industry,
        plant_name=request.sme_context.plant_name
    )

    answer, internal_source, external_source, document_percent, external_use, followingup = ask_claude(
        query=request.query,
        context_chunks=retrieved_chunks,
        industry=request.industry,
        sme_context=request.sme_context,
        use_external=request.use_external,
        history=history)
    
    memory_store.add_entry(
        user_id=request.user_id,
        industry=request.industry,
        plant_name=request.sme_context.plant_name,
        question=request.query,
        answer=answer
    )

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
    industry: str = Form(...),
    plant_name: str = Form(...),
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
        industry=industry,
        plant_name=plant_name,
        user_id=user_id
    )
    return {"status": "success"}

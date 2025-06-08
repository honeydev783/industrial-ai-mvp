from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List
import boto3
import uuid
import os
import tempfile
import mimetypes
from dotenv import load_dotenv
# from utils.auth import get_current_user
from utils.s3 import upload_to_s3
from utils.embedding import embed_and_store
from utils.qa import retrieve_and_answer

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


class QuestionRequest(BaseModel):
    question: str
    user_id: str


@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".doc", ".docx", ".txt", ".csv"]:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    s3_url = upload_to_s3(tmp_path, file.filename, user['sub'])
    embed_and_store(tmp_path, file.filename, user['sub'])
    os.remove(tmp_path)
    return {"message": "Upload and indexing complete", "s3_url": s3_url}


@app.post("/ask")
def ask_question(req: QuestionRequest, user: dict = Depends(get_current_user)):
    answer, sources = retrieve_and_answer(req.question, req.user_id)
    return {"answer": answer, "sources": sources}
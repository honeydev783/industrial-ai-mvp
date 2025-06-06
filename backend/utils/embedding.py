import os
import pinecone
import boto3
from backend.utils.parser import extract_text_from_file

pinecone.init(api_key=os.getenv("PINECONE_API_KEY"), environment=os.getenv("PINECONE_ENVIRONMENT"))
index = pinecone.Index(os.getenv("PINECONE_INDEX_NAME"))

bedrock = boto3.client("bedrock-runtime", region_name=os.getenv("BEDROCK_REGION"))


def embed_and_store(file_path: str, filename: str, user_id: str):
    chunks = extract_text_from_file(file_path)
    for i, chunk in enumerate(chunks):
        resp = bedrock.invoke_model(
            body=f'{{"inputText": {repr(chunk)} }}',
            modelId=os.getenv("BEDROCK_EMBEDDING_MODEL"),
            accept="application/json", contentType="application/json"
        )
        vector = eval(resp['body'].read().decode())["embedding"]
        index.upsert(vectors=[(f"{user_id}-{filename}-{i}", vector, {"text": chunk})])
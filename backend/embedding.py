# app/embedding.py
import os
import json
import boto3

# Assume Bedrock embedding model is available
client = boto3.client("bedrock-runtime", region_name=os.getenv("BEDROCK_REGION"))

async def embed_text(text: str) -> list:
    response = client.invoke_model(
        modelId=os.getenv("BEDROCK_EMBEDDING_MODEL"),
        accept="application/json",
        contentType="application/json",
        body=json.dumps({"inputText": text})
    )
    body = json.loads(response["body"].read().decode())
    return body["embedding"]

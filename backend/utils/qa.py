import os
import json

# from pinecone.grpc import PineconeGRPC as Pinecone
import boto3
from pinecone import Pinecone

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(name=os.getenv("PINECONE_INDEX_NAME"))
# index = pinecone.Index(os.getenv("PINECONE_INDEX_NAME"))
bedrock = boto3.client("bedrock-runtime", region_name=os.getenv("BEDROCK_REGION"))


def retrieve_and_answer(query: str, user_id: str):
    payload = {"inputText": query}
    resp = bedrock.invoke_model(
        body=json.dumps(payload),
        modelId=os.getenv("BEDROCK_EMBEDDING_MODEL"),
        accept="application/json",
        contentType="application/json",
    )
    query_vec = eval(resp["body"].read().decode())["embedding"]
    results = index.query(vector=query_vec, top_k=3, include_metadata=True)

    context = "\n".join([match.metadata["text"] for match in results["matches"]])
    full_prompt = f"Human: {context}\n\nQuestion: {query}\n\nAssistant:"
    print("Full prompt:", full_prompt)
    prompt_payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "messages": [{"role": "user", "content": full_prompt}],
        "max_tokens": 256,
        "temperature": 0.7,
    }
    answer_resp = bedrock.invoke_model(
        body=json.dumps(prompt_payload),
        modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
        accept="application/json",
        contentType="application/json",
    )
    # print("Answer response:", answer_resp["body"])
    response_body = json.loads(answer_resp["body"].read().decode())
    answer = response_body["content"][0]["text"]
    print("Answer:", answer)
    # answer = eval(answer_resp["body"].read().decode())["completion"]
    sources = [match.metadata["text"] for match in results["matches"]]
    return answer, sources

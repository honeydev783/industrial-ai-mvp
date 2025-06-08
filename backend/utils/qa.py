import os
from pinecone.grpc import PineconeGRPC as Pinecone
import boto3

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_HOST"))
# index = pinecone.Index(os.getenv("PINECONE_INDEX_NAME"))
bedrock = boto3.client("bedrock-runtime", region_name=os.getenv("BEDROCK_REGION"))


def retrieve_and_answer(query: str, user_id: str):
    resp = bedrock.invoke_model(
        body=f'{{"inputText": {repr(query)} }}',
        modelId=os.getenv("BEDROCK_EMBEDDING_MODEL"),
        accept="application/json", contentType="application/json"
    )
    query_vec = eval(resp['body'].read().decode())["embedding"]
    results = index.query(vector=query_vec, top_k=3, include_metadata=True)

    context = "\n".join([match.metadata['text'] for match in results['matches']])
    full_prompt = f"Context: {context}\n\nQuestion: {query}\n\nAnswer:"

    answer_resp = bedrock.invoke_model(
        body=f'{{"prompt": {repr(full_prompt)}, "maxTokens": 256 }}',
        modelId="anthropic.claude-4-sonnet-20250522-v1:0",
        accept="application/json", contentType="application/json"
    )
    answer = eval(answer_resp['body'].read().decode())["completion"]
    sources = [match.metadata['text'] for match in results['matches']]
    return answer, sources

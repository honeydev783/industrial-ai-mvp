import os
import boto3
# import pinecone
from pinecone.grpc import PineconeGRPC as Pinecone
from utils.parser import extract_text_from_file

# Initialize Pinecone client
# pinecone.init(api_key=os.getenv("PINECONE_API_KEY"), environment=os.getenv("PINECONE_ENVIRONMENT"))
# index_name = os.getenv("PINECONE_INDEX_NAME")
# Access the Pinecone index
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_HOST"))

# if index_name not in pinecone.list_indexes():
#     pinecone.create_index(name=index_name, dimension=1536, metric="cosine", cloud="aws", region="us-east-1")
# index= pc.create_index(
#     name='ai-industry-doc-index',
#     dimension=1536,
#     metric='cosine',
#     spec = ServerlessSpec(
#         cloud='aws',
#         region='us-east-1'
#     )
# )

# Initialize AWS Bedrock client
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
# import os
# import pinecone
# import boto3
# from utils.parser import extract_text_from_file

# pinecone.init(api_key=os.getenv("PINECONE_API_KEY"), environment=os.getenv("PINECONE_ENVIRONMENT"))
# index = pinecone.Index(os.getenv("PINECONE_INDEX_NAME"))

# bedrock = boto3.client("bedrock-runtime", region_name=os.getenv("BEDROCK_REGION"))


# def embed_and_store(file_path: str, filename: str, user_id: str):
#     chunks = extract_text_from_file(file_path)
#     for i, chunk in enumerate(chunks):
#         resp = bedrock.invoke_model(
#             body=f'{{"inputText": {repr(chunk)} }}',
#             modelId=os.getenv("BEDROCK_EMBEDDING_MODEL"),
#             accept="application/json", contentType="application/json"
#         )
#         vector = eval(resp['body'].read().decode())["embedding"]
#         index.upsert(vectors=[(f"{user_id}-{filename}-{i}", vector, {"text": chunk})])
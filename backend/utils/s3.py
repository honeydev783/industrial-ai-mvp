import boto3
import os
import uuid

s3_client = boto3.client('s3')

def upload_to_s3(file_path: str, filename: str, user_id: str) -> str:
    bucket = os.getenv("S3_BUCKET")
    s3_key = f"{user_id}/{uuid.uuid4()}_{filename}"
    s3_client.upload_file(file_path, bucket, s3_key)
    return f"s3://{bucket}/{s3_key}"
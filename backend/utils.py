# app/utils.py
from PyPDF2 import PdfReader
import docx
import textract
import csv
import os
from pdf2image import convert_from_bytes
import pytesseract
import boto3
import uuid
from urllib.parse import urlparse
import time


s3_client = boto3.client("s3")
textract = boto3.client("textract", region_name=os.getenv("AWS_REGION"))


def upload_to_s3(file_path: str, filename: str, user_id: str) -> str:
    bucket = os.getenv("S3_BUCKET")
    s3_key = f"{user_id}/{uuid.uuid4()}_{filename}"
    s3_client.upload_file(file_path, bucket, s3_key)
    return f"s3://{bucket}/{s3_key}"


def extract_text_chunks(file_path, s3_url):
    ext = os.path.splitext(file_path)[1].lower()
    print("Extracting text from file:", file_path, "with extension:", ext)
    text_chunks = []
    if ext == ".pdf":
        reader = PdfReader(file_path)
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        if not text.strip():
            # Parse S3 URL
            parsed = urlparse(s3_url)
            bucket = parsed.netloc
            key = parsed.path.lstrip("/")
            print("Key:", key, "Bucket:", bucket)
            # Start async job
            response = textract.start_document_text_detection(
                DocumentLocation={"S3Object": {"Bucket": bucket, "Name": key}}
            )
            job_id = response["JobId"]
            # Wait for completion
            while True:
                result = textract.get_document_text_detection(JobId=job_id)
                status = result["JobStatus"]
                if status == "SUCCEEDED":
                    break
                elif status in ("FAILED", "PARTIAL_SUCCESS"):
                    return {"error": f"Textract job failed: {status}"}
                time.sleep(2)
            # Extract text
            blocks = result.get("Blocks", [])
            text = "\n".join(b["Text"] for b in blocks if b["BlockType"] == "LINE")
            # images = convert_from_bytes(open(file_path, 'rb').read())
            # text = "\n".join(pytesseract.image_to_string(img) for img in images)
        print("PDF file read successfully", text)
    elif ext == ".docx":
        doc = docx.Document(file_path)
        text = "\n".join(p.text for p in doc.paragraphs)
        print("Document file read successfully", text)
    elif ext == ".doc":
        text = textract.process(file_path).decode("utf-8")
        print("DOC file read successfully", text)

    elif ext == ".txt":
        with open(file_path, encoding="utf-8") as f:
            text = f.read()
        print("text file read successfully", text)
    elif ext == ".csv":
        with open(file_path, newline="", encoding="utf-8") as csvfile:
            reader = csv.reader(csvfile)
            text = "\n".join([", ".join(row) for row in reader])
        print("CSV file read successfully", text)
    else:
        raise ValueError("Unsupported file type")
    # Simple chunking (every 512 words)
    words = text.split()
    for i in range(0, len(words), 1024):
        text_chunks.append(" ".join(words[i : i + 1024]))
    return text_chunks


# def extract_text_chunks(file) -> list:
#     # Dummy example: replace with real PDF, DOCX, CSV parser
#     # Return list of (chunk_text, section)
#     return [
#         ("Chunk 1 text of the document", "Introduction"),
#         ("Chunk 2 text of the document", "Section 1"),
#         ("Chunk 3 text of the document", "Section 2"),
#     ]

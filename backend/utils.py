# app/utils.py
from PyPDF2 import PdfReader
import docx
import textract
import csv
import os

def extract_text_chunks(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    print("Extracting text from file:", file_path, "with extension:", ext)
    text_chunks = []
    if ext == ".pdf":
        reader = PdfReader(file_path)
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        print("PDF file read successfully", text)
    elif ext == ".docx":
        doc = docx.Document(file_path)
        text = "\n".join(p.text for p in doc.paragraphs)
        print("Document file read successfully", text)
    elif ext == ".doc":
        text = textract.process(file_path).decode("utf-8")
        print("DOC file read successfully", text)
        
    elif ext == ".txt":
        with open(file_path, encoding='utf-8') as f:
            text = f.read()
        print("text file read successfully", text)
    elif ext == ".csv":
        with open(file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            text = "\n".join([", ".join(row) for row in reader])
        print("CSV file read successfully", text)
    else:
        raise ValueError("Unsupported file type")
    # Simple chunking (every 512 words)
    words = text.split()
    for i in range(0, len(words), 512):
        text_chunks.append(" ".join(words[i:i+512]))
    return text_chunks

# def extract_text_chunks(file) -> list:
#     # Dummy example: replace with real PDF, DOCX, CSV parser
#     # Return list of (chunk_text, section)
#     return [
#         ("Chunk 1 text of the document", "Introduction"),
#         ("Chunk 2 text of the document", "Section 1"),
#         ("Chunk 3 text of the document", "Section 2"),
#     ]

from PyPDF2 import PdfReader
import docx
import csv

def extract_text_from_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    text_chunks = []
    if ext == ".pdf":
        reader = PdfReader(file_path)
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    elif ext in [".doc", ".docx"]:
        doc = docx.Document(file_path)
        text = "\n".join(p.text for p in doc.paragraphs)
    elif ext == ".txt":
        with open(file_path, encoding='utf-8') as f:
            text = f.read()
    elif ext == ".csv":
        with open(file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            text = "\n".join([", ".join(row) for row in reader])
    else:
        raise ValueError("Unsupported file type")
    # Simple chunking (every 512 words)
    words = text.split()
    for i in range(0, len(words), 512):
        text_chunks.append(" ".join(words[i:i+512]))
    return text_chunks

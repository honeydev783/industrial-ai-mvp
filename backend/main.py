# app/main.py

from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
# from fastapi.responses import FileResponse, HTTPResponse, Response
# from typing import Listt
from dotenv import load_dotenv
from models import QueryRequest, QueryResponse, TimeSeriesData, Annotation, Rule, SavedGraph, AnnotationCreate, RuleCreate, SavedGraphCreate, UploadResult
from vector_store import query_pinecone, upsert_document
from llm_client import ask_claude
from memory import MemoryStore
import tempfile
import mimetypes
import boto3
import os
import io
from utils import upload_to_s3
from urllib.parse import urlparse
import pandas as pd
import sqlite3
import time
import json
from typing import List, Dict, Optional
from pydantic import BaseModel
import logging
import subprocess
from datetime import datetime 
from storage import DatabaseStorage
from sqlalchemy import create_engine
from sqlalchemy_models import Base
# Load environment variables
load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost","*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



DATABASE_URL = os.getenv("DATABASE_URL")  # Default to PostgreSQL URL
engine = create_engine(DATABASE_URL)

Base.metadata.create_all(bind=engine)
storage = DatabaseStorage()



memory_store = MemoryStore()
s3_client = boto3.client("s3")
BUCKET_NAME = os.getenv("S3_BUCKET")

# @app.post("/csv_upload")
# async def upload_file(file: UploadFile = File(...)):
#     try:
#         if not file.filename.endswith('.csv'):
#             raise HTTPException(status_code=400, detail="File must be a CSV")
        
#         df = pd.read_csv(file.file)
#         print("CSV columns:", df.columns.tolist())
#         if not all(col in df.columns for col in EXPECTED_COLUMNS):
#             raise HTTPException(status_code=400, detail=f"CSV must contain columns: {', '.join(EXPECTED_COLUMNS)}")
        
#         df['Timestamp'] = pd.to_datetime(df['Timestamp'], errors='coerce')
#         df['Tag ID'] = df['Tag ID'].astype(str)
#         df['Tag Value'] = pd.to_numeric(df['Tag Value'], errors='coerce')
#         df['Min Range'] = pd.to_numeric(df['Min Range'], errors='coerce')
#         df['Max Range'] = pd.to_numeric(df['Max Range'], errors='coerce')
#         print("Data types after conversion:", df.dtypes)
#         # ✅ Rename to match database column names
#         df.rename(columns={
#             "Timestamp": "timestamp",
#             "Tag ID": "tag_id",
#             "Tag Label": "tag_label",
#             "Tag Value": "tag_value",
#             "Unit": "unit",
#             "Min Range": "min_range",
#             "Max Range": "max_range"
#         }, inplace=True)
#         if df.isnull().any().any():
#             raise HTTPException(status_code=400, detail="Invalid data in CSV")
        
#         conn = sqlite3.connect('timeseries.db')
#         cursor = conn.cursor()
#         cursor.execute('DELETE FROM data_points')  # Clear existing data
#         print("Cleared existing data in database")
#         df.to_sql('data_points', conn, if_exists='append', index=False)
#         print("Inserted new data into database")
#         conn.commit()
#         print("Committed changes to database")
#         data = df.to_dict('records')
#         print("Converted DataFrame to dictionary:", data[:5])  # Show first 5 records for debugging
#         logger.info("File uploaded successfully")
#         return {"data": data}
#     except Exception as e:
#         logger.error(f"Error uploading file: {str(e)}")
#         raise HTTPException(status_code=400, detail=str(e))
#     finally:
#         conn.close()
        
@app.post("/query", response_model=QueryResponse)
async def query_llm(request: QueryRequest):
    retrieved_chunks = query_pinecone(request, user_id=request.user_id)
    # history = memory_store.get_history(
    #     user_id=request.user_id,
    #     industry=request.industry,
    #     plant_name=request.sme_context.plant_name
    # )

    answer, internal_source, external_source, document_percent, external_use, followingup = ask_claude(
        query=request.query,
        context_chunks=retrieved_chunks,
        industry=request.industry,
        sme_context=request.sme_context,
        use_external=request.use_external,
    )
    
    # memory_store.add_entry(
    #     user_id=request.user_id,
    #     industry=request.industry,
    #     plant_name=request.sme_context.plant_name,
    #     question=request.query,
    #     answer=answer
    # )

    return QueryResponse(
        answer=answer,
        sources=[internal_source, external_source],
        transparency=[document_percent, external_use],
        follow_up_questions=followingup
    )

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_name: str = Form(...),
    document_type: str = Form(...),
    user_id: str = Form(None)  # Optional, pass if using private KB
):
    ext = os.path.splitext(file.filename)[1].lower()
    print(tempfile.gettempdir())
    print("Uploading file:", file.filename, "with extension:", ext)
    if ext not in [".pdf", ".doc", ".docx", ".txt", ".csv"]:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
        tmp.flush()
        os.fsync(tmp.fileno())
    print("Temporary file created at:", tmp_path)
    s3_url = upload_to_s3(tmp_path, file.filename, user_id)
    print("stored in s3 bucket===>:", s3_url)
    await upsert_document(
        file=tmp_path,
        s3_url = s3_url,
        document_name=document_name,
        document_type=document_type,
        user_id=user_id
    )
    return {"status": "success"}

@app.get("/files", response_model=List[str])
async def list_user_files(user_id: str):
    prefix = f"{user_id}/"
    try:
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
        contents = response.get("Contents", [])
        file_urls = [f"s3://{BUCKET_NAME}/{obj['Key']}" for obj in contents]
        return file_urls
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.delete("/delete-file")
async def delete_file_by_s3_url(
    s3_url: str):
    try:
        # Parse the S3 URL
        parsed = urlparse(s3_url)
        if parsed.scheme != "s3":
            raise ValueError("Invalid S3 URI format")

        bucket = parsed.netloc
        key = parsed.path.lstrip("/")  # Remove leading slash from path

        # Perform deletion
        s3_client.delete_object(Bucket=bucket, Key=key)

        return {"message": f"Successfully deleted from bucket: {bucket}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
# File upload endpoint
@app.post("/api/upload", response_model=UploadResult)
async def upload_file(file: UploadFile = File(...)):
    """Upload and process CSV or Excel files"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")
        
        file_content = await file.read()
        filename = file.filename.lower()
        
        rows = []
        
        if filename.endswith('.csv'):
            # Process CSV file
            df = pd.read_csv(io.BytesIO(file_content))
        elif filename.endswith(('.xlsx', '.xls')):
            # Process Excel file
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel files.")
        
        # Normalize column names to handle different CSV formats
        df.columns = df.columns.str.strip().str.lower()
        
        # Map common column name variations
        column_mapping = {
            'tag id': 'tagId',
            'tag_id': 'tagId',
            'tag': 'tagId', 
            'id': 'tagId',
            'tag label': 'tagLabel',
            'tag_label': 'tagLabel',
            'label': 'tagLabel',
            'name': 'tagLabel',
            'tag value': 'value',
            'tag_value': 'value',
            'val': 'value',
            'value': 'value',
            'min range': 'minRange',
            'min_range': 'minRange',
            'min': 'minRange',
            'max range': 'maxRange',
            'max_range': 'maxRange', 
            'max': 'maxRange',
            'time': 'timestamp',
            'datetime': 'timestamp',
            'date': 'timestamp',
            'timestamp': 'timestamp'
        }
        
        # Apply column mapping
        for old_col, new_col in column_mapping.items():
            if old_col in df.columns:
                df.rename(columns={old_col: new_col}, inplace=True)
        
        # Convert DataFrame to list of dictionaries
        processed_count = 0
        error_count = 0
        
        for _, row in df.iterrows():
            try:
                processed_count += 1
                
                # Use direct column names if mapped correctly
                timestamp_col = 'timestamp' if 'timestamp' in df.columns else None
                tagId_col = 'tagId' if 'tagId' in df.columns else None
                value_col = 'value' if 'value' in df.columns else None
                
                # Fallback to flexible column detection
                if not timestamp_col:
                    for col in df.columns:
                        if 'timestamp' in col or 'time' in col or 'date' in col:
                            timestamp_col = col
                            break
                
                if not tagId_col:
                    for col in df.columns:
                        if 'tagid' in col or 'tag_id' in col or 'tag' in col or col == 'id':
                            tagId_col = col
                            break
                
                if not value_col:
                    for col in df.columns:
                        if 'value' in col or 'val' in col:
                            value_col = col
                            break
                
                if not all([timestamp_col, tagId_col, value_col]):
                    error_count += 1
                    print(f"Row {processed_count}: Missing required columns - timestamp: {timestamp_col}, tagId: {tagId_col}, value: {value_col}")
                    continue
                
                # Parse timestamp
                timestamp = pd.to_datetime(row[timestamp_col])
                
                row_data = {
                    'timestamp': timestamp,
                    'tagId': str(row[tagId_col]),
                    'value': float(row[value_col]),
                    'tagLabel': str(row.get('tagLabel', row.get('tag_label', row.get('label', row[tagId_col])))),
                    'unit': str(row.get('unit', '')),
                    'minRange': float(row.get('minRange', row.get('min_range', row.get('min', 0))) or 0),
                    'maxRange': float(row.get('maxRange', row.get('max_range', row.get('max', 100))) or 100)
                }
                rows.append(row_data)
            except Exception as e:
                error_count += 1
                print(f"Row {processed_count}: Error processing - {str(e)}")
                continue  # Skip invalid rows
        
        print(f"Processing summary: {processed_count} rows processed, {len(rows)} valid rows, {error_count} errors")
        
        # Clear existing data before inserting new data
        await storage.clear_time_series_data()
        
        # Insert data into storage
        inserted_data = await storage.insert_time_series_data(rows)
        
        return UploadResult(
            success=True,
            rowsProcessed=processed_count,
            rowsInserted=len(inserted_data)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

# Time-series data endpoints
@app.get("/api/timeseries", response_model=List[TimeSeriesData])
async def get_timeseries(
    tagIds: Optional[str] = Query(None),
    startTime: Optional[str] = Query(None),
    endTime: Optional[str] = Query(None),
    limit: Optional[int] = Query(None)
):
    """Get time-series data with optional filtering"""
    try:
        tag_id_list = tagIds.split(',') if tagIds else []
        start = datetime.fromisoformat(startTime.replace('Z', '+00:00')) if startTime else None
        end = datetime.fromisoformat(endTime.replace('Z', '+00:00')) if endTime else None
        
        data = await storage.get_time_series_data(tag_id_list, start, end)
        
        if limit:
            data = data[-limit:]
            
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch time-series data")

@app.get("/api/tags")
async def get_available_tags():
    """Get all available tags"""
    try:
        tags = await storage.get_available_tags()
        return tags
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch tags")

@app.delete("/api/timeseries")
async def clear_timeseries():
    """Clear all time-series data"""
    try:
        await storage.clear_time_series_data()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to clear data")

# Annotation endpoints
@app.post("/api/annotations", response_model=Annotation)
async def create_annotation(annotation: AnnotationCreate):
    """Create a new annotation"""
    try:
        result = await storage.create_annotation(annotation.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to create annotation")

@app.get("/api/annotations", response_model=List[Annotation])
async def get_annotations(tagIds: Optional[str] = Query(None)):
    """Get annotations with optional tag filtering"""
    try:
        tag_id_list = tagIds.split(',') if tagIds else None
        annotations = await storage.get_annotations(tag_id_list)
        return annotations
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch annotations")

@app.delete("/api/annotations/{annotation_id}")
async def delete_annotation(annotation_id: int):
    """Delete an annotation"""
    try:
        await storage.delete_annotation(annotation_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete annotation")

# Rule endpoints
@app.post("/api/rules", response_model=Rule)
async def create_rule(rule: RuleCreate):
    """Create a new rule"""
    try:
        result = await storage.create_rule(rule.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to create rule")

@app.get("/api/rules", response_model=List[Rule])
async def get_rules():
    """Get all rules"""
    try:
        rules = await storage.get_rules()
        return rules
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch rules")

@app.put("/api/rules/{rule_id}", response_model=Rule)
async def update_rule(rule_id: int, updates: dict):
    """Update a rule"""
    try:
        rule = await storage.update_rule(rule_id, updates)
        return rule
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update rule")

@app.delete("/api/rules/{rule_id}")
async def delete_rule(rule_id: int):
    """Delete a rule"""
    try:
        await storage.delete_rule(rule_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete rule")

# Saved graph endpoints
@app.post("/api/saved-graphs", response_model=SavedGraph)
async def save_graph(graph: SavedGraphCreate):
    """Save a graph configuration"""
    try:
        result = await storage.save_graph(graph.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to save graph")

@app.get("/api/saved-graphs", response_model=List[SavedGraph])
async def get_saved_graphs():
    """Get all saved graphs"""
    try:
        graphs = await storage.get_saved_graphs()
        return graphs
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch saved graphs")

@app.get("/api/saved-graphs/{graph_id}", response_model=SavedGraph)
async def get_saved_graph(graph_id: int):
    """Get a specific saved graph"""
    try:
        graph = await storage.get_saved_graph(graph_id)
        if not graph:
            raise HTTPException(status_code=404, detail="Saved graph not found")
        return graph
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch saved graph")

@app.delete("/api/saved-graphs/{graph_id}")
async def delete_saved_graph(graph_id: int):
    """Delete a saved graph"""
    try:
        await storage.delete_saved_graph(graph_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete saved graph")
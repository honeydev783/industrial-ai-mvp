# app/models.py

from pydantic import BaseModel
from typing import List, Optional

class SMEContext(BaseModel):
    plant_name: Optional[str]
    unit_process: Optional[str]
    key_processes: Optional[List[str]]
    equipment: Optional[List[str]]
    known_issues: Optional[List[str]]
    regulations: Optional[List[str]]
    notes: Optional[str]

class QueryRequest(BaseModel):
    user_id: str
    query: str
    industry: str
    sme_context: SMEContext
    use_external: bool

class QueryResponse(BaseModel):
    answer: str
    sources: List[str]
    transparency: List[str]
    follow_up_questions: List[str]

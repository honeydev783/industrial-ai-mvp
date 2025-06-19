from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Any, Dict
from enum import Enum

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
    answer: List[str]
    sources: List[str]
    transparency: List[str]
    follow_up_questions: List[str]

class AnnotationType(str, Enum):
    point = "point"
    region = "region"

class SeverityLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class RuleCondition(str, Enum):
    greater_than = "greater_than"
    less_than = "less_than"
    equals = "equals"
    greater_equal = "greater_equal"
    less_equal = "less_equal"
    between = "between"

# Time Series Data Models
class TimeSeriesData(BaseModel):
    id: int
    timestamp: datetime
    tagId: str
    value: float
    tagLabel: str
    unit: str
    minRange: float
    maxRange: float
    normalizedValue: float
    createdAt: datetime

class TimeSeriesDataCreate(BaseModel):
    timestamp: datetime
    tagId: str
    value: float
    tagLabel: str
    unit: str = ""
    minRange: float = 0.0
    maxRange: float = 100.0

# Annotation Models
class Annotation(BaseModel):
    id: int
    timestamp: datetime
    tagId: str
    type: AnnotationType
    category: str
    severity: SeverityLevel
    value: float
    normalizedValue: float
    description: Optional[str] = None
    regionStart: Optional[datetime] = None
    regionEnd: Optional[datetime] = None
    createdAt: datetime

class AnnotationCreate(BaseModel):
    timestamp: datetime
    tagId: str
    type: AnnotationType
    category: str
    severity: SeverityLevel
    value: float
    normalizedValue: float
    description: Optional[str] = None
    regionStart: Optional[datetime] = None
    regionEnd: Optional[datetime] = None

# Rule Models
class Rule(BaseModel):
    id: int
    tagId: str
    condition: RuleCondition
    threshold: float
    thresholdMax: Optional[float] = None
    severity: SeverityLevel
    description: Optional[str] = None
    isActive: bool = True
    createdAt: datetime

class RuleCreate(BaseModel):
    tagId: str
    condition: RuleCondition
    threshold: float
    thresholdMax: Optional[float] = None
    severity: SeverityLevel
    description: Optional[str] = None
    isActive: bool = True

# Saved Graph Models
class SavedGraph(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    selectedTags: List[str]
    timeWindow: str
    annotations: List[Dict[str, Any]]
    createdAt: datetime

class SavedGraphCreate(BaseModel):
    name: str
    description: Optional[str] = None
    selectedTags: List[str]
    timeWindow: str
    annotations: List[Dict[str, Any]] = []

# Tag Info Model
class TagInfo(BaseModel):
    tagId: str
    tagLabel: str
    unit: str
    minRange: float
    maxRange: float
    color: str

# Upload Result Model
class UploadResult(BaseModel):
    success: bool
    rowsProcessed: int
    rowsInserted: int
    errors: Optional[List[str]] = None

# Chart Data Point Model
class ChartDataPoint(BaseModel):
    timestamp: datetime
    tagId: str
    value: float
    normalizedValue: float
    actualValue: float
    unit: str

# Error Response Model
class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
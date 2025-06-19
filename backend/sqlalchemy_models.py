from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum as SqlEnum, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()

# Enums
class AnnotationType(str, enum.Enum):
    point = "point"
    region = "region"

class SeverityLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class RuleCondition(str, enum.Enum):
    greater_than = "greater_than"
    less_than = "less_than"
    equals = "equals"
    greater_equal = "greater_equal"
    less_equal = "less_equal"
    between = "between"

# TimeSeriesData
class TimeSeriesData(Base):
    __tablename__ = "time_series_data"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False)
    tag_id = Column(String, nullable=False)
    tag_value = Column(Float, nullable=False)
    tag_label = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    min_range = Column(Float, nullable=False)
    max_range = Column(Float, nullable=False)
    normalized_value = Column(Float, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

# Annotation
class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False)
    tagid = Column(String, nullable=False)
    type = Column(SqlEnum(AnnotationType), nullable=False)
    category = Column(String, nullable=False)
    severity = Column(SqlEnum(SeverityLevel), nullable=False)
    value = Column(Float, nullable=False)
    normalized_value = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    region_start = Column(DateTime, nullable=True)
    region_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

# Rule
class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    tag_id = Column(String, nullable=False)
    condition = Column(SqlEnum(RuleCondition), nullable=False)
    threshold = Column(Float, nullable=False)
    threshold_max = Column(Float, nullable=True)
    severity = Column(SqlEnum(SeverityLevel), nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

# SavedGraph
class SavedGraph(Base):
    __tablename__ = "saved_graphs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    selected_tags = Column(JSON, nullable=False)
    time_window = Column(String, nullable=False)
    annotations = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

# TagInfo
class TagInfo(Base):    
    __tablename__ = "tag_info"

    tagId = Column(String, primary_key=True)
    tagLabel = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    minRange = Column(Float, nullable=False)
    maxRange = Column(Float, nullable=False)
    color = Column(String, nullable=False)

# UploadResult (Log-style)
class UploadResult(Base):
    __tablename__ = "upload_results"

    id = Column(Integer, primary_key=True, index=True)
    success = Column(Boolean, nullable=False)
    rowsProcessed = Column(Integer, nullable=False)
    rowsInserted = Column(Integer, nullable=False)
    errors = Column(JSON, nullable=True)
    createdAt = Column(DateTime, nullable=False, server_default=func.now())

# ChartDataPoint
class ChartDataPoint(Base):
    __tablename__ = "chart_data_points"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False)
    tagId = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    normalizedValue = Column(Float, nullable=False)
    actualValue = Column(Float, nullable=False)
    unit = Column(String, nullable=False)

# ErrorLog (based on ErrorResponse)
class ErrorLog(Base):
    __tablename__ = "error_logs"

    id = Column(Integer, primary_key=True, index=True)
    error = Column(String, nullable=False)
    detail = Column(String, nullable=True)
    createdAt = Column(DateTime, nullable=False, server_default=func.now())

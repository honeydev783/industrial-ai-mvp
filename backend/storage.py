import os
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
import json
from dotenv import load_dotenv
from vector_store import upsert_to_pinecone
from models import (
    TimeSeriesData, 
    Annotation, 
    Rule, 
    SavedGraph, 
    TagInfo,
    TimeSeriesDataCreate,
    AnnotationCreate,
    RuleCreate,
    SavedGraphCreate
)
from embedding import embed_text
from pinecone import Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
phase2_index = pc.Index(name="timeseries")
from collections import defaultdict

load_dotenv()

class DatabaseStorage:
    def __init__(self):
        self.database_url = os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
    
    def get_connection(self):
        """Get a database connection"""
        return psycopg2.connect(self.database_url)

    async def insert_time_series_data(self, data: List[Dict[str, Any]], description: str) -> List[TimeSeriesData]:
        """Insert time-series data"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Prepare data for insertion
                values = []
                for item in data:
                    # Calculate normalized value (0-100 scale based on min/max range)
                    min_range = item['minRange']
                    max_range = item['maxRange']
                    value = item['value']
                    normalized_value = ((value - min_range) / (max_range - min_range)) * 100 if max_range != min_range else 50
                    normalized_value = max(0, min(100, normalized_value))  # Clamp between 0 and 100
                    createdAt=datetime.now()
                    values.append((
                        item['timestamp'],
                        item['tagId'],
                        item['tagLabel'],
                        item['value'],
                        item['unit'],
                        item['minRange'],
                        item['maxRange'],
                        normalized_value,
                        createdAt
                    ))
                
                # Insert data
                query = """
                    INSERT INTO time_series_data (timestamp, tag_id, tag_label, tag_value, unit, min_range, max_range, normalized_value, created_at)
                    VALUES %s
                    RETURNING *
                """

                execute_values(cur, query, values, template=None, page_size=1000)
                conn.commit()
                
                # Fetch all inserted records
                cur.execute("SELECT * FROM time_series_data ORDER BY timestamp DESC LIMIT %s", 
                           (len(values),))  # Get all recently inserted records
                results = cur.fetchall()
                conn.commit()
                grouped_data = defaultdict(list)

                # Map database columns to API model fields
                mapped_results = []
                for row in results:
                    mapped_row = {
                        'id': row['id'],
                        'timestamp': row['timestamp'],
                        'tagId': row['tag_id'],
                        'value': row['tag_value'],
                        'tagLabel': row['tag_label'],
                        'unit': row['unit'],
                        'minRange': row['min_range'],
                        'maxRange': row['max_range'],
                        'normalizedValue': row['normalized_value'],
                        'createdAt': row['created_at']
                    }
                    ts_data = TimeSeriesData(**mapped_row)
                    mapped_results.append(ts_data)
                    grouped_data[ts_data.tagId].append(ts_data)
                
                for tagId, group in grouped_data.items():
                    tagLabel = group[0].tagLabel
                    unit = group[0].unit
                    minRange = group[0].minRange
                    maxRange = group[0].maxRange

                    # Combine all timestamps and values into one text chunk
                    chunk_lines = [
                        f"{row.timestamp}: {tagLabel} {row.value} {unit} (normalized: {row.normalizedValue}%)"
                        for row in group
                    ]
                    description = f"{tagLabel} readings in {unit}, range: {minRange}–{maxRange}"
                    combined_text = f"{description}\n" + "\n".join(chunk_lines)

                    print("CHUNK TEXT ===>", combined_text)

                    # Step 3: Embed and upsert one vector per tag group
                    embedding = await embed_text(combined_text)

                    phase2_index.upsert([
                        {
                            "id": f"time_series_{tagId}",
                            "values": embedding,
                            "metadata": {
                                "type": "time_series",
                                "tagId": tagId,
                                "tagLabel": tagLabel,
                                "unit": unit,
                                "minRange": minRange,
                                "maxRange": maxRange,
                                "numPoints": len(group)
                            }
                        }
                    ])
                    # mapped_results.append(TimeSeriesData(**mapped_row))
                # for row in mapped_results:
                #     text = f"{row.timestamp}: {row.tagLabel}  {row.value}  {row.unit}   (normalized: {row.normalizedValue}%) {description}"
                #     print("data text===>", text)
                #     embedding = await embed_text(text)

                #     phase2_index.upsert([
                #         {
                #             "id": f"time_series_{row.id}",
                #             "values": embedding,
                #             "metadata": {
                #                 "type": "time_series",
                #                 "tagId": row.tagId,
                #                 "tagLabel": row.tagLabel,
                #                 "unit": row.unit,
                #                 "timestamp": str(row.timestamp),
                #                 "value": row.value,
                #                 "normalizedValue": row.normalizedValue
                #             }
                #         }
                #     ])
                return mapped_results
        finally:
            conn.close()
    
    async def get_time_series_data(self, tag_ids: List[str], start_time: Optional[datetime] = None, end_time: Optional[datetime] = None) -> List[TimeSeriesData]:
        """Get time-series data with optional filtering"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = 'SELECT * FROM time_series_data WHERE 1=1'
                params = []
                
                if tag_ids:
                    query += ' AND tag_id = ANY(%s)'
                    params.append(tag_ids)
                
                if start_time:
                    query += ' AND timestamp >= %s'
                    params.append(start_time)
                
                if end_time:
                    query += ' AND timestamp <= %s'
                    params.append(end_time)
                
                query += ' ORDER BY timestamp ASC'
                
                cur.execute(query, params)
                results = cur.fetchall()
                
                # Map database columns to API model fields
                mapped_results = []
                for row in results:
                    mapped_row = {
                        'id': row['id'],
                        'timestamp': row['timestamp'],
                        'tagId': row['tag_id'],
                        'value': row['tag_value'],
                        'tagLabel': row['tag_label'],
                        'unit': row['unit'],
                        'minRange': row['min_range'],
                        'maxRange': row['max_range'],
                        'normalizedValue': row['normalized_value'],
                        'createdAt': row['created_at']
                    }
                    mapped_results.append(TimeSeriesData(**mapped_row))
                
                return mapped_results
        finally:
            conn.close()
    
    async def get_available_tags(self) -> List[TagInfo]:
        """Get all available tags"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = """
                    SELECT DISTINCT ON (tag_id)
                        tag_id, 
                        tag_label, 
                        unit, 
                        min_range, 
                        max_range,
                        '#' || LPAD(CAST((ABS(HASHTEXT(tag_id)) % 16777216) AS TEXT), 6, '0') as color
                    FROM time_series_data
                    ORDER BY tag_id, timestamp DESC
                """
                cur.execute(query)
                results = cur.fetchall()
                
                # Map database columns to API model fields
                mapped_results = []
                for row in results:
                    mapped_row = {
                        'tagId': row['tag_id'],
                        'tagLabel': row['tag_label'],
                        'unit': row['unit'],
                        'minRange': row['min_range'],
                        'maxRange': row['max_range'],
                        'color': row['color']
                    }
                    mapped_results.append(TagInfo(**mapped_row))
                
                return mapped_results
        finally:
            conn.close()
    
    async def clear_time_series_data(self) -> None:
        """Clear all time-series data"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM time_series_data')
                conn.commit()
        finally:
            conn.close()
    
    async def create_annotation(self, annotation_data: Dict[str, Any]) -> Annotation:
        """Create a new annotation"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                createdAt = datetime.now()
                annotation_data["createdAt"] = createdAt
                query = """
                    INSERT INTO annotations 
                    (timestamp, tagid, type, category, severity, value, normalized_value, description, region_start, region_end, created_at)
                    VALUES (%(timestamp)s, %(tagId)s, %(type)s, %(category)s, %(severity)s, %(value)s, %(normalizedValue)s, %(description)s, %(regionStart)s, %(regionEnd)s, %(createdAt)s)
                    RETURNING *
                """
                cur.execute(query, annotation_data)
                result = cur.fetchone()
                conn.commit()
                
                if result:
                    mapped_result = {
                        'id': result['id'],
                        'timestamp': result['timestamp'],
                        'tagId': result['tagid'],
                        'type': result['type'],
                        'category': result['category'],
                        'severity': result['severity'],
                        'value': result['value'],
                        'normalizedValue': result['normalized_value'],
                        'description': result['description'],
                        'regionStart': result['region_start'],
                        'regionEnd': result['region_end'],
                        'createdAt': result['created_at'],
                    }
                    print(f"Annotation created: {mapped_result}")
                    text = f"Annotation on {annotation_data['tagId']} at {annotation_data['timestamp']}: {annotation_data['description']} (Category: {annotation_data['category']}, Severity: {annotation_data['severity']})"
                    embedding = await embed_text(text)

                    phase2_index.upsert([
                        {
                            "id": f"annotation_{result['id']}",
                            "values": embedding,
                            "metadata": {
                                "type": "annotation",
                                "tagId": annotation_data['tagId'],
                                "timestamp": str(annotation_data['timestamp']),
                                "description": annotation_data['description'],
                                "category": annotation_data['category'],
                                "severity": annotation_data['severity']
                            }
                        }
                    ])
                    return Annotation(**dict(mapped_result))
                raise ValueError("Failed to create annotation")
        except Exception as e:
            print(f"Error creating annotation: {e}")
            print(f"Annotation data: {annotation_data}")
            raise ValueError(f"Failed to create annotation: {str(e)}")
        finally:
            conn.close()
    
    async def get_annotations(self, tag_ids: Optional[List[str]] = None) -> List[Annotation]:
        """Get annotations with optional tag filtering"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = 'SELECT * FROM annotations WHERE 1=1'
                params = []
                
                if tag_ids:
                    query += ' AND "tagId" = ANY(%s)'
                    params.append(tag_ids)
                
                query += ' ORDER BY timestamp DESC'
                
                cur.execute(query, params)
                results = cur.fetchall()
                mapped_results = []
                for row in results:
                    mapped_result = {
                        'id': row['id'],
                        'timestamp': row['timestamp'],
                        'tagId': row['tagid'],
                        'type': row['type'],
                        'category': row['category'],
                        'severity': row['severity'],
                        'value': row['value'],
                        'normalizedValue': row['normalized_value'],
                        'description': row['description'],
                        'regionStart': row['region_start'],
                        'regionEnd': row['region_end'],
                        'createdAt': row['created_at'],
                    }
                    mapped_results.append(Annotation(**dict(mapped_result)))
                return mapped_results
        finally:
            conn.close()
    
    async def delete_annotation(self, annotation_id: int) -> None:
        """Delete an annotation"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM annotations WHERE id = %s', (annotation_id,))
                conn.commit()
        finally:
            conn.close()
    
    async def create_rule(self, rule_data: Dict[str, Any]) -> Rule:
        """Create a new rule"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                createdAt = datetime.now()
                rule_data["createdAt"] = createdAt
                query = """
                    INSERT INTO rules 
                    (tag_id, condition, threshold, threshold_max, severity,  description, is_active, created_at)
                    VALUES (%(tagId)s, %(condition)s, %(threshold)s, %(thresholdMax)s, %(severity)s,  %(description)s,  %(isActive)s, %(createdAt)s)
                    RETURNING *
                """
                print(f"Rule data: {rule_data}")
                cur.execute(query, rule_data)
                result = cur.fetchone()
                conn.commit()
                
                if result:
                    # Map database snake_case to API camelCase
                    mapped_result = {
                        'id': result['id'],
                        'tagId': result['tag_id'],
                        'condition': result['condition'],
                        'threshold': result['threshold'],
                        'thresholdMax': result['threshold_max'],
                        'severity': result['severity'],
                        'description': result['description'],
                        'isActive': result['is_active'],
                        'createdAt': result['created_at']
                    }
                    text = f"Rule for {rule_data['tagId']}: {rule_data['description']} (Condition: {rule_data['condition']}, Threshold: {rule_data['threshold']}, Severity: {rule_data['severity']})"
                    embedding = await embed_text(text)

                    phase2_index.upsert([
                        {
                            "id": f"rule_{result['id']}",
                            "values": embedding,
                            "metadata": {
                                "type": "rule",
                                "tagId": rule_data['tagId'],
                                "description": rule_data['description'],
                                "condition": rule_data['condition'],
                                "threshold": rule_data['threshold'],
                                "severity": rule_data['severity']
                            }
                        }
                    ])
                    return Rule(**mapped_result)
                raise ValueError("Failed to create rule")
        except Exception as e:
            print(f"Error creating rule: {e}")
            
            raise ValueError(f"Failed to create rule: {str(e)}")
        finally:
            conn.close()
    
    async def get_rules(self) -> List[Rule]:
        """Get all rules"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT * FROM rules ORDER BY created_at DESC')
                results = cur.fetchall()
                
                # Convert snake_case to camelCase for API response
                formatted_results = []
                for row in results:
                    rule_data = dict(row)
                    formatted_rule = {
                        'id': rule_data['id'],
                        'tagId': rule_data['tag_id'],
                        'condition': rule_data['condition'],
                        'threshold': rule_data['threshold'],
                        'thresholdMax': rule_data['threshold_max'],
                        'severity': rule_data['severity'],
                        'isActive': rule_data['is_active'],
                        'createdAt': rule_data['created_at']
                    }
                    formatted_results.append(Rule(**formatted_rule))
                
                return formatted_results
        finally:
            conn.close()
    
    async def update_rule(self, rule_id: int, updates: Dict[str, Any]) -> Rule:
        """Update a rule"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Build dynamic update query
                set_clauses = []
                params = []
                
                for key, value in updates.items():
                    if key in ['tagId', 'condition', 'threshold', 'thresholdMax', 'severity', 'isActive']:
                        set_clauses.append(f'"{key}" = %s')
                        params.append(value)
                
                if not set_clauses:
                    raise ValueError("No valid fields to update")
                
                params.append(rule_id)
                query = f'UPDATE rules SET {", ".join(set_clauses)} WHERE id = %s RETURNING *'
                
                cur.execute(query, params)
                result = cur.fetchone()
                conn.commit()
                
                if not result:
                    raise ValueError("Rule not found")
                
                return Rule(**dict(result))
        finally:
            conn.close()
    
    async def delete_rule(self, rule_id: int) -> None:
        """Delete a rule"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM rules WHERE id = %s', (rule_id,))
                conn.commit()
        finally:
            conn.close()
    
    async def get_active_rules(self) -> List[Rule]:
        """Get all active rules"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT * FROM rules WHERE is_active = true ORDER BY created_at DESC')
                results = cur.fetchall()
                
                # Convert snake_case to camelCase for API response
                formatted_results = []
                for row in results:
                    rule_data = dict(row)
                    formatted_rule = {
                        'id': rule_data['id'],
                        'tagId': rule_data['tag_id'],
                        'condition': rule_data['condition'],
                        'threshold': rule_data['threshold'],
                        'thresholdMax': rule_data['threshold_max'],
                        'severity': rule_data['severity'],
                        'isActive': rule_data['is_active'],
                        'createdAt': rule_data['created_at']
                    }
                    formatted_results.append(Rule(**formatted_rule))
                
                return formatted_results
        finally:
            conn.close()
    
    async def save_graph(self, graph_data: Dict[str, Any]) -> SavedGraph:
        """Save a graph configuration"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Convert selectedTags and annotations to JSON strings for PostgreSQL
                import json
                createdAt = datetime.now()
                processed_data = {
                    'name': graph_data.get('name'),
                    'description': graph_data.get('description'),
                    'selectedTags': json.dumps(graph_data.get('selectedTags', [])),
                    'timeWindow': graph_data.get('timeWindow'),
                    'annotations': json.dumps(graph_data.get('annotations', [])),
                    'createdAt': createdAt
                }
                
                query = """
                    INSERT INTO saved_graphs 
                    (name, description, selected_tags, time_window, annotations, created_at)
                    VALUES (%(name)s, %(description)s, %(selectedTags)s, %(timeWindow)s, %(annotations)s, %(createdAt)s)
                    RETURNING *
                """
                cur.execute(query, processed_data)
                result = cur.fetchone()
                conn.commit()
                
                if result:
                    # Map database snake_case to API camelCase
                    mapped_result = {
                        'id': result['id'],
                        'name': result['name'],
                        'description': result['description'],
                        'selectedTags': result['selected_tags'],
                        'timeWindow': result['time_window'],
                        'annotations': result['annotations'],
                        'createdAt': result['created_at']
                    }
                    return SavedGraph(**mapped_result)
                raise ValueError("Failed to save graph")
        except Exception as e:
            print(f"Error saving graph: {e}")
            print(f"Graph data: {graph_data}")
            raise ValueError(f"Failed to save graph: {str(e)}")
        finally:
            conn.close()
    
    async def get_saved_graphs(self) -> List[SavedGraph]:
        """Get all saved graphs"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT * FROM saved_graphs ORDER BY created_at DESC')
                results = cur.fetchall()
                
                # Convert snake_case to camelCase for API response
                formatted_results = []
                for row in results:
                    graph_data = dict(row)
                    formatted_graph = {
                        'id': graph_data['id'],
                        'name': graph_data['name'],
                        'description': graph_data['description'],
                        'selectedTags': graph_data['selected_tags'],
                        'timeWindow': graph_data['time_window'],
                        'annotations': graph_data.get('annotations', []),
                        'createdAt': graph_data['created_at']
                    }
                    formatted_results.append(SavedGraph(**formatted_graph))
                
                return formatted_results
        finally:
            conn.close()
    
    async def get_saved_graph(self, graph_id: int) -> Optional[SavedGraph]:
        """Get a specific saved graph"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT * FROM saved_graphs WHERE id = %s', (graph_id,))
                result = cur.fetchone()
                
                if result:
                    graph_data = dict(result)
                    mapped_result = {
                        'id': graph_data['id'],
                        'name': graph_data['name'],
                        'description': graph_data['description'],
                        'selectedTags': graph_data['selected_tags'],
                        'timeWindow': graph_data['time_window'],
                        'annotations': graph_data.get('annotations', []),
                        'createdAt': graph_data['created_at']
                    }
                    return SavedGraph(**mapped_result)
                return None
        finally:
            conn.close()
    
    async def delete_saved_graph(self, graph_id: int) -> None:
        """Delete a saved graph"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM saved_graphs WHERE id = %s', (graph_id,))
                conn.commit()
        finally:
            conn.close()
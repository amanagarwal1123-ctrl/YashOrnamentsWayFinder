from datetime import datetime, timezone
from bson import ObjectId
import json

def serialize_doc(doc):
    """Serialize MongoDB document for JSON response."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id':
                continue
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = [serialize_doc(v) if isinstance(v, (dict, list)) else 
                              (v.isoformat() if isinstance(v, datetime) else v) for v in value]
            else:
                result[key] = value
        return result
    return doc

def now_utc():
    return datetime.now(timezone.utc)

def to_iso(dt):
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

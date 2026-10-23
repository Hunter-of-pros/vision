"""
MongoDB Database Service for Storing Acoustic Anomaly Detection Records.

Detection Schema:
- machineId: str (e.g. 'p001', 'v001', 'f001', 'm001')
- machineType: str ('pump', 'valve', 'fan', or 'motor')
- status: str ('normal' or 'anomaly')
- anomalyScore: float (numeric anomaly score produced by the model)
- timestamp: datetime (UTC date and time of detection)
"""

import os
import re
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

logger = logging.getLogger("vision.db")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "vision_db")
MONGODB_COLLECTION_NAME = os.getenv("MONGODB_COLLECTION_NAME", "detections")

_client: Optional[MongoClient] = None
_db = None
_collection = None


def get_mongo_collection():
    """
    Returns the MongoDB collection singleton with lazy initialization and index creation.
    """
    global _client, _db, _collection
    if _collection is not None:
        return _collection

    try:
        _client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
            socketTimeoutMS=3000,
        )
        _db = _client[MONGODB_DB_NAME]
        _collection = _db[MONGODB_COLLECTION_NAME]

        # Ensure indexes for performant query filters
        _collection.create_index([("machineId", ASCENDING), ("timestamp", DESCENDING)])
        _collection.create_index([("timestamp", DESCENDING)])
        _collection.create_index([("machineType", ASCENDING)])
        _collection.create_index([("status", ASCENDING)])

        logger.info(f"Connected to MongoDB at {MONGODB_URI}, database: {MONGODB_DB_NAME}, collection: {MONGODB_COLLECTION_NAME}")
        return _collection
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB ({MONGODB_URI}): {e}")
        return None


def resolve_machine_id(machine_type: str, filename: Optional[str] = None, explicit_id: Optional[str] = None) -> str:
    """
    Resolves standard machineId string (e.g. p001, v001, f001, m001).
    Uses explicit_id if provided; otherwise derives from machine type and filename (e.g. id_00 -> p001).
    """
    if explicit_id:
        return explicit_id.strip()

    m_type = (machine_type or "pump").lower().strip()
    prefix_map = {
        "pump": "p",
        "valve": "v",
        "fan": "f",
        "motor": "m",
    }
    prefix = prefix_map.get(m_type, "p")

    # If filename contains an ID number (e.g., id_00, id_02, id_04, id_06)
    if filename:
        match = re.search(r"id_(\d+)", filename.lower())
        if match:
            id_num = int(match.group(1)) + 1  # 00 -> 001, 02 -> 003 or index
            return f"{prefix}{id_num:03d}"

    return f"{prefix}001"


def normalize_machine_type(machine_type: Optional[str]) -> str:
    """
    Normalizes machineType to one of: pump, valve, fan, motor.
    """
    if not machine_type:
        return "pump"
    m = machine_type.lower().strip()
    if m in ("pump", "valve", "fan", "motor"):
        return m
    return "pump"


def record_detection_event(
    anomaly_score: float,
    machine_type: str = "pump",
    is_anomaly: bool = False,
    machine_id: Optional[str] = None,
    filename: Optional[str] = None,
    timestamp: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Stores a detection event in MongoDB conforming to the required schema:
      - machineId: e.g. p001, v001, f001, m001
      - machineType: pump, valve, fan, or motor
      - status: normal or anomaly
      - anomalyScore: numeric anomaly score produced by the model
      - timestamp: UTC datetime
    """
    resolved_machine_id = resolve_machine_id(machine_type, filename=filename, explicit_id=machine_id)
    norm_machine_type = normalize_machine_type(machine_type)
    status_str = "anomaly" if is_anomaly else "normal"
    utc_timestamp = timestamp or datetime.now(timezone.utc)

    # Construct document strictly according to schema
    detection_doc = {
        "machineId": str(resolved_machine_id),
        "machineType": str(norm_machine_type),
        "status": str(status_str),
        "anomalyScore": float(round(float(anomaly_score), 6)),
        "timestamp": utc_timestamp,
    }

    try:
        col = get_mongo_collection()
        if col is not None:
            result = col.insert_one(detection_doc)
            detection_doc["_id"] = str(result.inserted_id)
            logger.info(f"Stored detection record in MongoDB: machineId={resolved_machine_id}, status={status_str}, score={anomaly_score}")
        else:
            logger.warning("MongoDB collection unavailable; detection event processed without persistence.")
            detection_doc["_id"] = "offline_local"
    except (PyMongoError, ServerSelectionTimeoutError, Exception) as e:
        logger.error(f"Failed to persist detection record to MongoDB: {e}")
        detection_doc["_id"] = "offline_error"

    return detection_doc


def get_recent_detections(
    limit: int = 50,
    machine_type: Optional[str] = None,
    machine_id: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieves recent detection records sorted by timestamp descending.
    """
    col = get_mongo_collection()
    if col is None:
        return []

    query: Dict[str, Any] = {}
    if machine_type:
        query["machineType"] = normalize_machine_type(machine_type)
    if machine_id:
        query["machineId"] = machine_id.strip()
    if status:
        query["status"] = status.lower().strip()

    try:
        cursor = col.find(query).sort("timestamp", DESCENDING).limit(limit)
        records = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            if isinstance(doc.get("timestamp"), datetime):
                doc["timestamp"] = doc["timestamp"].isoformat()
            records.append(doc)
        return records
    except Exception as e:
        logger.error(f"Error querying detections from MongoDB: {e}")
        return []

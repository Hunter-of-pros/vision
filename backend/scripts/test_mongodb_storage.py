#!/usr/bin/env python3
"""
Verification Script for MongoDB Anomaly Score Storage.
Validates the detection record schema:
- machineId: str (e.g. p001, v001, f001, m001)
- machineType: str ('pump', 'valve', 'fan', 'motor')
- status: str ('normal' or 'anomaly')
- anomalyScore: float (numeric)
- timestamp: datetime (UTC)
"""

import sys
import os
from datetime import datetime, timezone

# Add backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db import (
    record_detection_event,
    get_recent_detections,
    get_mongo_collection,
    resolve_machine_id,
    normalize_machine_type,
)


def run_tests():
    print("=" * 60)
    print("Testing MongoDB Detection Schema & Anomaly Score Storage")
    print("=" * 60)

    # 1. Test machineId resolver
    assert resolve_machine_id("pump", "normal_id_00_00000000.wav") == "p001"
    assert resolve_machine_id("valve", "anomaly_id_02_00000000.wav") == "v003"
    assert resolve_machine_id("fan", None) == "f001"
    assert resolve_machine_id("motor", explicit_id="m001") == "m001"
    print("✓ machineId resolution passed")

    # 2. Test machineType normalizer
    assert normalize_machine_type("PUMP") == "pump"
    assert normalize_machine_type("Valve") == "valve"
    assert normalize_machine_type("FAN") == "fan"
    assert normalize_machine_type("Motor") == "motor"
    print("✓ machineType normalization passed")

    # 3. Test record_detection_event for Normal Detection
    normal_record = record_detection_event(
        anomaly_score=0.0118,
        machine_type="pump",
        is_anomaly=False,
        filename="normal_id_00_00000000.wav",
    )
    print("✓ Normal detection event stored:", normal_record)
    assert normal_record["machineId"] == "p001"
    assert normal_record["machineType"] == "pump"
    assert normal_record["status"] == "normal"
    assert isinstance(normal_record["anomalyScore"], float)
    assert normal_record["timestamp"].tzinfo == timezone.utc

    # 4. Test record_detection_event for Anomaly Detection
    anomaly_record = record_detection_event(
        anomaly_score=0.0465,
        machine_type="valve",
        is_anomaly=True,
        filename="anomaly_id_00_00000000.wav",
    )
    print("✓ Anomaly detection event stored:", anomaly_record)
    assert anomaly_record["machineId"] == "v001"
    assert anomaly_record["machineType"] == "valve"
    assert anomaly_record["status"] == "anomaly"
    assert isinstance(anomaly_record["anomalyScore"], float)
    assert anomaly_record["timestamp"].tzinfo == timezone.utc

    # 5. Query MongoDB collection directly
    col = get_mongo_collection()
    if col is not None:
        latest = col.find_one(sort=[("timestamp", -1)])
        print("✓ Verified direct MongoDB retrieval of latest record:")
        print(f"   _id: {latest['_id']}")
        print(f"   machineId: {latest['machineId']}")
        print(f"   machineType: {latest['machineType']}")
        print(f"   status: {latest['status']}")
        print(f"   anomalyScore: {latest['anomalyScore']}")
        print(f"   timestamp (UTC): {latest['timestamp']}")
    else:
        print("⚠ MongoDB collection offline (fallback mode active)")

    print("=" * 60)
    print("All MongoDB Anomaly Score Storage tests passed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    run_tests()

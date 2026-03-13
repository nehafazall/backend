"""
Export current database to seed_data.json
Run this whenever you want to update the seed file with latest preview data.

Usage: python3 export_seed.py
"""
import asyncio
import json
import os
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

class MongoEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

SEED_COLLECTIONS = [
    "users",
    "hr_employees",
    "teams",
    "departments",
    "courses",
    "leads",
    "students",
    "commission_rules",
    "system_config",
    "sheet_connectors",
    "payments",
    "hr_attendance",
    "call_logs",
    "hr_payroll_batches",
    "integrations",
    "ltv_transactions",
]

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "clt_academy_erp")

async def export_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    seed_data = {
        "_meta": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "source": "preview",
            "version": "1.0",
            "db_name": DB_NAME
        }
    }

    total_docs = 0
    for coll_name in SEED_COLLECTIONS:
        count = await db[coll_name].count_documents({})
        if count == 0:
            continue
        docs = await db[coll_name].find({}).to_list(None)
        for doc in docs:
            if "_id" in doc:
                del doc["_id"]
        seed_data[coll_name] = docs
        total_docs += len(docs)
        print(f"  {coll_name}: {len(docs)} docs")

    output_path = os.path.join(os.path.dirname(__file__), "seed_data.json")
    with open(output_path, "w") as f:
        json.dump(seed_data, f, cls=MongoEncoder)

    file_size = os.path.getsize(output_path) / 1024
    print(f"\nExported {total_docs} documents to seed_data.json ({file_size:.0f} KB)")
    client.close()

if __name__ == "__main__":
    asyncio.run(export_data())

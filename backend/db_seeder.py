"""
Database Seeder - Auto-seeds the database on first startup if empty.
Loads data from seed_data.json exported from the preview environment.
Also supports exporting current DB state via CLI: python3 db_seeder.py export
"""
import json
import os
import sys
import logging
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from bson import ObjectId

logger = logging.getLogger("db_seeder")

SEED_FILE = Path(__file__).parent / "seed_data.json"

# Collections to seed in order (respects dependencies)
SEED_ORDER = [
    "departments",
    "courses",
    "commission_rules",
    "system_config",
    "users",
    "hr_employees",
    "teams",
    "leads",
    "students",
    "sheet_connectors",
    "payments",
    "hr_attendance",
    "call_logs",
    "hr_payroll_batches",
    "integrations",
    "ltv_transactions",
    "customers",
    "finance_clt_receivables",
]


async def should_seed(db) -> bool:
    """Check if database needs seeding (is empty or has no users)"""
    user_count = await db.users.count_documents({})
    return user_count == 0


async def seed_database(db):
    """Seed the database with data from seed_data.json"""
    if not SEED_FILE.exists():
        logger.info("No seed_data.json found, skipping seeding")
        return False

    if not await should_seed(db):
        logger.info("Database already has data, skipping seeding")
        return False

    logger.info("Empty database detected - starting auto-seed from seed_data.json...")

    try:
        with open(SEED_FILE, "r") as f:
            seed_data = json.load(f)

        total_inserted = 0
        for coll_name in SEED_ORDER:
            docs = seed_data.get(coll_name, [])
            if not docs:
                continue

            try:
                # Drop existing indexes to prevent conflicts during seeding
                collection = db[coll_name]
                try:
                    await collection.drop_indexes()
                except Exception:
                    pass

                # Clear any existing data in this collection
                await collection.delete_many({})

                # Insert documents one by one to handle any edge cases
                inserted = 0
                for doc in docs:
                    try:
                        await collection.insert_one(doc)
                        inserted += 1
                    except Exception as e:
                        logger.warning(f"  Skipped duplicate in {coll_name}: {e}")

                total_inserted += inserted
                logger.info(f"  Seeded {coll_name}: {inserted}/{len(docs)} documents")

            except Exception as e:
                logger.error(f"  Error seeding {coll_name}: {e}")

        meta = seed_data.get("_meta", {})
        logger.info(
            f"Database seeding complete: {total_inserted} documents "
            f"(source: {meta.get('source', 'unknown')}, exported: {meta.get('exported_at', 'unknown')})"
        )
        return True

    except Exception as e:
        logger.error(f"Database seeding failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def _serialize(obj):
    """Convert MongoDB types to JSON-serializable types."""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items() if k != "_id"}
    if isinstance(obj, list):
        return [_serialize(i) for i in obj]
    return obj


async def export_database():
    """Export current database state to seed_data.json."""
    from motor.motor_asyncio import AsyncIOMotorClient

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "clt_academy_erp")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    seed_data = {}
    total = 0
    for coll_name in SEED_ORDER:
        docs = await db[coll_name].find({}).to_list(None)
        clean_docs = [_serialize(doc) for doc in docs]
        seed_data[coll_name] = clean_docs
        total += len(clean_docs)
        print(f"  Exported {coll_name}: {len(clean_docs)} documents")

    seed_data["_meta"] = {
        "source": "preview",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "total_documents": total,
    }

    with open(SEED_FILE, "w") as f:
        json.dump(seed_data, f, default=str)

    size_mb = SEED_FILE.stat().st_size / (1024 * 1024)
    print(f"\nExport complete: {total} documents -> {SEED_FILE} ({size_mb:.1f} MB)")
    client.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "export":
        asyncio.run(export_database())
    else:
        print("Usage: python3 db_seeder.py export")

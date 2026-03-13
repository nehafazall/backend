"""
Database Seeder - Auto-seeds the database on first startup if empty.
Loads data from seed_data.json exported from the preview environment.
"""
import json
import os
import logging
from pathlib import Path

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

    logger.info("Empty database detected — starting auto-seed from seed_data.json...")

    try:
        with open(SEED_FILE, "r") as f:
            seed_data = json.load(f)

        total_inserted = 0
        for coll_name in SEED_ORDER:
            docs = seed_data.get(coll_name, [])
            if not docs:
                continue

            # Clear any existing data in this collection
            await db[coll_name].delete_many({})

            # Insert all documents
            await db[coll_name].insert_many(docs)
            total_inserted += len(docs)
            logger.info(f"  Seeded {coll_name}: {len(docs)} documents")

        meta = seed_data.get("_meta", {})
        logger.info(
            f"Database seeding complete: {total_inserted} documents across {len(SEED_ORDER)} collections "
            f"(exported from {meta.get('source', 'unknown')} at {meta.get('exported_at', 'unknown')})"
        )
        return True

    except Exception as e:
        logger.error(f"Database seeding failed: {e}")
        import traceback
        traceback.print_exc()
        return False

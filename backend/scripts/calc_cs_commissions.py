#!/usr/bin/env python3
"""Calculate and insert CS commissions for all imported upgrades"""
import os, uuid
from datetime import datetime, timezone
from pymongo import MongoClient

MONGO_URL = DB_NAME = ''
with open('/app/backend/.env') as f:
    for line in f:
        if line.startswith('MONGO_URL='): MONGO_URL = line.split('=', 1)[1].strip().strip('"')
        elif line.startswith('DB_NAME='): DB_NAME = line.split('=', 1)[1].strip().strip('"')

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Commission rates from CS_UPGRADE_PACKAGES
COMMISSION_TIERS = [
    # (max_amount, agent_commission, head_commission, label)
    (1600, 75, 30, "Basic / Intermediate"),
    (1999, 100, 30, "Basic / Intermediate"),
    (2105, 150, 30, "Basic / Intermediate"),
    (3599, 75, 30, "Intermediate to Advanced"),
    (3899, 150, 30, "Intermediate to Advanced"),
    (4100, 200, 30, "Intermediate to Advanced"),
    (5600, 150, 60, "Basic to Advanced"),
    (6000, 250, 60, "Basic to Advanced"),
    (6500, 350, 60, "Basic to Advanced"),
]

def get_commission(amount):
    """Find the matching or closest commission tier for an amount"""
    # Exact match first
    for tier_amt, agent_comm, head_comm, label in COMMISSION_TIERS:
        if abs(amount - tier_amt) < 1:  # Float tolerance
            return agent_comm, head_comm, label
    
    # Closest match
    closest = min(COMMISSION_TIERS, key=lambda t: abs(t[0] - amount))
    return closest[1], closest[2], closest[3]

def main():
    print("=" * 60)
    print("CS COMMISSION CALCULATION FOR IMPORTED UPGRADES")
    print("=" * 60)
    
    # Get CS head
    cs_head = db.users.find_one({"role": "cs_head", "is_active": True}, {"_id": 0, "id": 1, "full_name": 1})
    cs_head_id = cs_head["id"] if cs_head else None
    cs_head_name = cs_head["full_name"] if cs_head else "N/A"
    print(f"CS Head: {cs_head_name} ({cs_head_id})")
    
    # Get all imported upgrades
    upgrades = list(db.cs_upgrades.find({"created_by": "system_import"}, {"_id": 0}))
    print(f"Total imported upgrades: {len(upgrades)}")
    
    # Check which already have commissions (avoid duplicates)
    existing_upgrade_ids = set()
    existing = db.cs_commissions.find({"type": "cs_upgrade_agent"}, {"_id": 0, "upgrade_id": 1})
    for e in existing:
        if e.get("upgrade_id"):
            existing_upgrade_ids.add(e["upgrade_id"])
    
    agent_inserted = 0
    head_inserted = 0
    total_agent_comm = 0
    total_head_comm = 0
    agent_stats = {}
    
    for u in upgrades:
        uid = u["id"]
        if uid in existing_upgrade_ids:
            continue
        
        amount = u["amount"]
        agent_comm, head_comm, label = get_commission(amount)
        
        agent_id = u["cs_agent_id"]
        agent_name = u["cs_agent_name"]
        date = u.get("date", "")
        month = u.get("month", "")
        
        # Create agent commission
        db.cs_commissions.insert_one({
            "id": str(uuid.uuid4()),
            "type": "cs_upgrade_agent",
            "student_id": u.get("student_id"),
            "student_name": u.get("student_name"),
            "upgrade_id": uid,
            "upgrade_path": label.lower().replace(" ", "_").replace("/", "_"),
            "upgrade_label": label,
            "upgrade_amount": amount,
            "commission_amount": agent_comm,
            "agent_id": agent_id,
            "agent_name": agent_name,
            "agent_role": "cs_agent",
            "status": "pending",
            "month": month,
            "created_at": f"{date}T00:00:00+00:00",
        })
        agent_inserted += 1
        total_agent_comm += agent_comm
        
        if agent_id not in agent_stats:
            agent_stats[agent_id] = {"name": agent_name, "count": 0, "commission": 0}
        agent_stats[agent_id]["count"] += 1
        agent_stats[agent_id]["commission"] += agent_comm
        
        # Create head commission
        if cs_head_id:
            db.cs_commissions.insert_one({
                "id": str(uuid.uuid4()),
                "type": "cs_upgrade_head",
                "student_id": u.get("student_id"),
                "student_name": u.get("student_name"),
                "upgrade_id": uid,
                "upgrade_path": label.lower().replace(" ", "_").replace("/", "_"),
                "upgrade_label": label,
                "upgrade_amount": amount,
                "commission_amount": head_comm,
                "agent_id": cs_head_id,
                "agent_name": cs_head_name,
                "agent_role": "cs_head",
                "is_self_upgrade": agent_id == cs_head_id,
                "status": "pending",
                "month": month,
                "created_at": f"{date}T00:00:00+00:00",
            })
            head_inserted += 1
            total_head_comm += head_comm
    
    print(f"\n--- Results ---")
    print(f"Agent commissions inserted: {agent_inserted}")
    print(f"Head commissions inserted: {head_inserted}")
    print(f"Total agent commission: AED {total_agent_comm:,.0f}")
    print(f"Total head commission: AED {total_head_comm:,.0f}")
    print(f"Total combined: AED {total_agent_comm + total_head_comm:,.0f}")
    
    print(f"\n--- Per Agent ---")
    for aid, data in sorted(agent_stats.items(), key=lambda x: x[1]['commission'], reverse=True):
        print(f"  {data['name']}: {data['count']} upgrades, AED {data['commission']:,.0f}")

if __name__ == '__main__':
    main()

"""Commission transactions generator - optimized for speed."""
import asyncio
from uuid import uuid4
from datetime import datetime, timezone


async def generate_transactions_for_month(db, month: str):
    """Generate commission transactions for a given month. All DB calls are parallelized."""
    month_start = f"{month}-01"
    month_end = f"{month}-31T23:59:59"
    now = datetime.now(timezone.utc).isoformat()
    created = 0

    # Parallel pre-fetch of ALL needed data
    existing_txns, enrolled, cs_upgrades_list, full_catalog = await asyncio.gather(
        db.commission_transactions.find(
            {"month": month}, {"_id": 0, "source_id": 1, "department": 1, "agent_id": 1, "commission_type": 1}
        ).to_list(5000),
        db.leads.find({
            "stage": "enrolled",
            "enrolled_at": {"$gte": month_start, "$lte": month_end},
        }, {"_id": 0, "id": 1, "full_name": 1, "enrollment_amount": 1, "sale_amount": 1,
            "course_name": 1, "enrolled_at": 1, "assigned_to": 1, "team_leader_id": 1}).to_list(1000),
        db.cs_upgrades.find({
            "upgrade_date": {"$gte": month_start, "$lte": month_end},
        }, {"_id": 0}).to_list(500),
        db.course_catalog.find({"is_active": True}, {"_id": 0}).to_list(100),
    )

    existing_keys = set()
    for t in existing_txns:
        existing_keys.add(f"{t['source_id']}_{t['department']}_{t['agent_id']}_{t.get('commission_type','')}")

    # Local matching function (zero DB calls)
    def match_commission(amount, course_type):
        catalog = [c for c in full_catalog if c.get("type") in ([course_type, "addon"] if course_type == "course" else [course_type])]
        if not catalog:
            return {}
        courses = [c for c in catalog if c.get("type") != "addon"]
        addons = [c for c in catalog if c.get("type") == "addon"]
        comm_fields = ["commission_sales_executive", "commission_team_leader",
            "commission_sales_manager", "commission_cs_agent", "commission_cs_head", "commission_mentor"]
        for c in catalog:
            if c.get("price") == amount:
                return c
        tolerance = 20
        best, best_diff = None, tolerance + 1
        for course in courses:
            residual = amount - (course.get("price") or 0)
            if residual <= 0:
                continue
            for addon in addons:
                diff = abs(residual - (addon.get("price") or 0))
                if diff <= tolerance and diff < best_diff:
                    combined = {"name": f"{course.get('name')} + {addon.get('name')}", "price": amount, "type": course_type}
                    for f in comm_fields:
                        combined[f] = (course.get(f) or 0) + (addon.get(f) or 0)
                    best, best_diff = combined, diff
        if best:
            return best
        closest = min(courses or catalog, key=lambda c: abs((c.get("price") or 0) - amount))
        if abs((closest.get("price") or 0) - amount) <= amount * 0.15:
            return closest
        return {}

    # Pre-fetch all agents
    agent_ids = list(set(
        [l.get("assigned_to") for l in enrolled if l.get("assigned_to")] +
        [l.get("team_leader_id") for l in enrolled if l.get("team_leader_id")]
    ))
    cs_agent_ids = list(set(u.get("cs_agent_id") for u in cs_upgrades_list if u.get("cs_agent_id")))
    all_ids = list(set(agent_ids + cs_agent_ids))

    users_list = await db.users.find(
        {"id": {"$in": all_ids}}, {"_id": 0, "id": 1, "full_name": 1, "role": 1, "team_leader_id": 1}
    ).to_list(300) if all_ids else []
    agent_map = {a["id"]: a for a in users_list}

    bulk_inserts = []

    # ---- Sales Transactions ----
    for lead in enrolled:
        lead_id = lead["id"]
        agent_id = lead.get("assigned_to")
        if not agent_id:
            continue
        amt = lead.get("enrollment_amount") or lead.get("sale_amount") or 0
        course = match_commission(amt, "course")
        se_comm = course.get("commission_sales_executive", 0)
        tl_comm = course.get("commission_team_leader", 0)
        sm_comm = course.get("commission_sales_manager", 0)
        agent_info = agent_map.get(agent_id, {})
        tl_id = agent_info.get("team_leader_id") or lead.get("team_leader_id")

        key = f"{lead_id}_sales_{agent_id}_sales_executive"
        if key not in existing_keys:
            bulk_inserts.append({
                "id": str(uuid4()), "source_id": lead_id, "source_type": "enrollment",
                "department": "sales", "commission_type": "sales_executive",
                "agent_id": agent_id, "agent_name": agent_info.get("full_name", "Unknown"),
                "student_name": lead.get("full_name", ""), "amount": amt,
                "course_matched": course.get("name", "Unknown"),
                "calculated_commission": se_comm, "final_commission": se_comm,
                "original_commission": se_comm,
                "tl_commission": tl_comm, "sm_commission": sm_comm, "tl_id": tl_id,
                "month": month, "date": str(lead.get("enrolled_at", ""))[:10],
                "status": "pending", "ceo_notes": "", "created_at": now,
            })
            existing_keys.add(key)
            created += 1

        if tl_id and tl_comm > 0:
            tl_key = f"{lead_id}_sales_{tl_id}_team_leader"
            if tl_key not in existing_keys:
                tl_info = agent_map.get(tl_id, {})
                bulk_inserts.append({
                    "id": str(uuid4()), "source_id": lead_id, "source_type": "enrollment",
                    "department": "sales", "commission_type": "team_leader",
                    "agent_id": tl_id, "agent_name": tl_info.get("full_name", "Unknown"),
                    "student_name": lead.get("full_name", ""),
                    "amount": amt, "course_matched": course.get("name", "Unknown"),
                    "calculated_commission": tl_comm, "final_commission": tl_comm,
                    "original_commission": tl_comm,
                    "from_agent": agent_info.get("full_name", ""),
                    "month": month, "date": str(lead.get("enrolled_at", ""))[:10],
                    "status": "pending", "ceo_notes": "", "created_at": now,
                })
                existing_keys.add(tl_key)
                created += 1

    # ---- CS Transactions ----
    for ug in cs_upgrades_list:
        ug_id = ug.get("id", ug.get("upgrade_id", ""))
        cs_agent_id = ug.get("cs_agent_id")
        if not cs_agent_id or not ug_id:
            continue
        key = f"{ug_id}_cs_{cs_agent_id}_cs_agent"
        if key in existing_keys:
            continue
        amt = ug.get("amount") or ug.get("course_amount") or 0
        course = match_commission(amt, "upgrade")
        bulk_inserts.append({
            "id": str(uuid4()), "source_id": ug_id, "source_type": "cs_upgrade",
            "department": "cs", "commission_type": "cs_agent",
            "agent_id": cs_agent_id, "agent_name": agent_map.get(cs_agent_id, {}).get("full_name", "Unknown"),
            "student_name": ug.get("student_name", ug.get("customer_name", "")),
            "amount": amt, "course_matched": course.get("name", "Unknown"),
            "calculated_commission": course.get("commission_cs_agent", 0),
            "final_commission": course.get("commission_cs_agent", 0),
            "original_commission": course.get("commission_cs_agent", 0),
            "cs_head_commission": course.get("commission_cs_head", 0),
            "month": month, "date": str(ug.get("upgrade_date", ""))[:10],
            "status": "pending", "ceo_notes": "", "created_at": now,
        })
        existing_keys.add(key)
        created += 1

    if bulk_inserts:
        await db.commission_transactions.insert_many(bulk_inserts)

    # Indexes
    await db.commission_transactions.create_index([("month", 1), ("department", 1), ("status", 1)])
    await db.commission_transactions.create_index([("source_id", 1), ("department", 1), ("agent_id", 1)])
    await db.commission_transactions.create_index([("agent_id", 1), ("month", 1)])

    return created

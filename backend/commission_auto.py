"""Auto-create commission transaction records when enrollments/upgrades happen."""
from uuid import uuid4
from datetime import datetime, timezone


async def auto_create_commission_txn(db, source_type, source_id, lead_or_upgrade, agent_id, agent_name, full_catalog=None):
    """
    Auto-create pending commission transaction(s) when a deal closes.
    source_type: 'enrollment' | 'cs_upgrade' | 'bd_redeposit'
    """
    if not agent_id:
        return

    now = datetime.now(timezone.utc).isoformat()

    # Load catalog if not provided
    if full_catalog is None:
        full_catalog = await db.course_catalog.find({"is_active": True}, {"_id": 0}).to_list(100)

    if source_type == "enrollment":
        amt = lead_or_upgrade.get("enrollment_amount") or lead_or_upgrade.get("sale_amount") or 0
        student_name = lead_or_upgrade.get("full_name", "")
        date_str = str(lead_or_upgrade.get("enrolled_at", now))[:10]
        department = "sales"
        course_type_str = "course"
    elif source_type == "cs_upgrade":
        amt = lead_or_upgrade.get("amount") or lead_or_upgrade.get("course_amount") or 0
        student_name = lead_or_upgrade.get("student_name") or lead_or_upgrade.get("full_name", "")
        date_str = str(lead_or_upgrade.get("upgrade_date") or lead_or_upgrade.get("date") or now)[:10]
        department = "cs"
        course_type_str = "upgrade"
    elif source_type == "bd_redeposit":
        amt = lead_or_upgrade.get("amount_aed") or lead_or_upgrade.get("amount") or 0
        student_name = lead_or_upgrade.get("student_name", "")
        date_str = str(lead_or_upgrade.get("date", now))[:10]
        department = "bd"
        course_type_str = "course"
    else:
        return

    if amt <= 0:
        return

    month = date_str[:7]
    course = _match_local(amt, course_type_str, full_catalog)

    # Check if already exists
    existing = await db.commission_transactions.find_one({
        "source_id": source_id, "department": department, "agent_id": agent_id
    })
    if existing:
        return

    inserts = []

    if department == "sales":
        se_comm = course.get("commission_sales_executive", 0)
        tl_comm = course.get("commission_team_leader", 0)
        sm_comm = course.get("commission_sales_manager", 0)

        # Get TL info
        agent_user = await db.users.find_one({"id": agent_id}, {"_id": 0, "team_leader_id": 1})
        tl_id = (agent_user or {}).get("team_leader_id") or lead_or_upgrade.get("team_leader_id")

        # SE transaction
        inserts.append({
            "id": str(uuid4()), "source_id": source_id, "source_type": source_type,
            "department": department, "commission_type": "sales_executive",
            "agent_id": agent_id, "agent_name": agent_name,
            "student_name": student_name, "amount": amt,
            "course_matched": course.get("name", "Unknown"),
            "calculated_commission": se_comm, "final_commission": se_comm,
            "original_commission": se_comm,
            "tl_commission": tl_comm, "sm_commission": sm_comm, "tl_id": tl_id,
            "month": month, "date": date_str,
            "status": "pending", "ceo_notes": "", "created_at": now,
        })

        # TL transaction
        if tl_id and tl_comm > 0:
            tl_user = await db.users.find_one({"id": tl_id}, {"_id": 0, "full_name": 1})
            tl_name = (tl_user or {}).get("full_name", "Unknown")
            existing_tl = await db.commission_transactions.find_one({
                "source_id": source_id, "department": "sales",
                "commission_type": "team_leader", "agent_id": tl_id
            })
            if not existing_tl:
                inserts.append({
                    "id": str(uuid4()), "source_id": source_id, "source_type": source_type,
                    "department": department, "commission_type": "team_leader",
                    "agent_id": tl_id, "agent_name": tl_name,
                    "student_name": student_name, "amount": amt,
                    "course_matched": course.get("name", "Unknown"),
                    "calculated_commission": tl_comm, "final_commission": tl_comm,
                    "original_commission": tl_comm,
                    "from_agent": agent_name,
                    "month": month, "date": date_str,
                    "status": "pending", "ceo_notes": "", "created_at": now,
                })

    elif department == "cs":
        cs_comm = course.get("commission_cs_agent", 0)
        cs_head_comm = course.get("commission_cs_head", 0)
        inserts.append({
            "id": str(uuid4()), "source_id": source_id, "source_type": source_type,
            "department": department, "commission_type": "cs_agent",
            "agent_id": agent_id, "agent_name": agent_name,
            "student_name": student_name, "amount": amt,
            "course_matched": course.get("name", "Unknown"),
            "calculated_commission": cs_comm, "final_commission": cs_comm,
            "original_commission": cs_comm,
            "cs_head_commission": cs_head_comm,
            "month": month, "date": date_str,
            "status": "pending", "ceo_notes": "", "created_at": now,
        })

    elif department == "bd":
        # BD uses mentor commission rates
        mentor_comm = course.get("commission_mentor", 0)
        inserts.append({
            "id": str(uuid4()), "source_id": source_id, "source_type": source_type,
            "department": department, "commission_type": "bd_agent",
            "agent_id": agent_id, "agent_name": agent_name,
            "student_name": student_name, "amount": amt,
            "course_matched": course.get("name", "Unknown"),
            "calculated_commission": mentor_comm, "final_commission": mentor_comm,
            "original_commission": mentor_comm,
            "month": month, "date": date_str,
            "status": "pending", "ceo_notes": "", "created_at": now,
        })

    if inserts:
        await db.commission_transactions.insert_many(inserts)


def _match_local(amount, course_type, full_catalog):
    """Match amount to course catalog entry (no DB calls)."""
    catalog = [c for c in full_catalog if c.get("type") in (
        [course_type, "addon"] if course_type == "course" else [course_type]
    )]
    if not catalog:
        return {}
    courses = [c for c in catalog if c.get("type") != "addon"]
    addons = [c for c in catalog if c.get("type") == "addon"]
    comm_fields = ["commission_sales_executive", "commission_team_leader",
        "commission_sales_manager", "commission_cs_agent", "commission_cs_head", "commission_mentor"]

    for c in catalog:
        if c.get("price") == amount:
            return c

    best, best_diff = None, 21
    for course in courses:
        residual = amount - (course.get("price") or 0)
        if residual <= 0:
            continue
        for addon in addons:
            diff = abs(residual - (addon.get("price") or 0))
            if diff <= 20 and diff < best_diff:
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

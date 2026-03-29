"""
Marketing Calendar Module
--------------------------
Manages social media pages, content calendar, pipeline tracking,
AI content suggestions, and deadline notifications.
"""

import os
import re
import uuid
import json
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger("marketing_calendar")

db: AsyncIOMotorDatabase = None
create_notification = None

# Color palette for pages (auto-assigned)
PAGE_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
    "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
    "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#0ea5e9",
]

CONTENT_STATUSES = ["planned", "video_shot", "edited", "approved", "posted"]

# ═══════════════════════════════════════════
# PAGE MANAGEMENT
# ═══════════════════════════════════════════

async def list_pages():
    pages = await db.marketing_pages.find({}, {"_id": 0}).sort("created_at", 1).to_list(50)
    return {"pages": pages}


async def add_page(data: dict):
    name = data.get("name", "").strip()
    if not name:
        return {"error": "Page name required"}

    # Auto-assign color
    existing_count = await db.marketing_pages.count_documents({})
    color = PAGE_COLORS[existing_count % len(PAGE_COLORS)]

    page = {
        "id": str(uuid.uuid4()),
        "name": name,
        "platform": data.get("platform", "instagram"),
        "url": data.get("url", "").strip(),
        "handle": data.get("handle", "").strip(),
        "posting_frequency": data.get("posting_frequency", "alternate_day"),
        "color": data.get("color", color),
        "assigned_to": data.get("assigned_to", ""),
        "assigned_to_name": data.get("assigned_to_name", ""),
        "description": data.get("description", "").strip(),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": data.get("user_id", ""),
    }
    await db.marketing_pages.insert_one(page)
    page.pop("_id", None)
    return {"message": f"Page '{name}' added", "page": page}


async def update_page(page_id: str, data: dict):
    page = await db.marketing_pages.find_one({"id": page_id})
    if not page:
        return {"error": "Page not found"}

    update = {}
    for field in ("name", "platform", "url", "handle", "posting_frequency",
                  "color", "assigned_to", "assigned_to_name", "description", "status"):
        if field in data:
            update[field] = data[field]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.marketing_pages.update_one({"id": page_id}, {"$set": update})
    return {"message": "Page updated"}


async def delete_page(page_id: str):
    result = await db.marketing_pages.delete_one({"id": page_id})
    if result.deleted_count == 0:
        return {"error": "Page not found"}
    await db.marketing_calendar.delete_many({"page_id": page_id})
    return {"message": "Page and its calendar entries deleted"}


# ═══════════════════════════════════════════
# CALENDAR GENERATION
# ═══════════════════════════════════════════

FREQ_MAP = {
    "daily": 1,
    "alternate_day": 2,
    "twice_a_week": 3,
    "weekly": 7,
    "biweekly": 14,
}

async def generate_calendar(data: dict):
    """Auto-generate calendar entries for all active pages based on their posting frequency."""
    days_ahead = data.get("days_ahead", 30)
    start_date_str = data.get("start_date", "")

    if start_date_str:
        start_date = datetime.fromisoformat(start_date_str).date()
    else:
        start_date = datetime.now(timezone.utc).date()

    pages = await db.marketing_pages.find({"status": "active"}, {"_id": 0}).to_list(50)
    if not pages:
        return {"message": "No active pages found. Add pages first.", "entries_created": 0}

    entries_created = 0
    for page in pages:
        freq = page.get("posting_frequency", "alternate_day")
        interval = FREQ_MAP.get(freq, 2)

        current = start_date
        end = start_date + timedelta(days=days_ahead)

        while current <= end:
            date_str = current.isoformat()

            # Check if entry already exists for this page on this date
            exists = await db.marketing_calendar.find_one({
                "page_id": page["id"],
                "date": date_str,
            })
            if not exists:
                entry = {
                    "id": str(uuid.uuid4()),
                    "page_id": page["id"],
                    "page_name": page["name"],
                    "page_color": page.get("color", "#3b82f6"),
                    "platform": page.get("platform", "instagram"),
                    "date": date_str,
                    "title": "",
                    "content_type": "post",
                    "description": "",
                    "status": "planned",
                    "assigned_to": page.get("assigned_to", ""),
                    "assigned_to_name": page.get("assigned_to_name", ""),
                    "ai_suggestion": "",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.marketing_calendar.insert_one(entry)
                entries_created += 1

            current += timedelta(days=interval)

    return {"message": f"Generated {entries_created} calendar entries for {len(pages)} pages over {days_ahead} days", "entries_created": entries_created}


async def get_calendar(month: str = "", page_id: str = ""):
    """Get calendar entries, optionally filtered by month (YYYY-MM) or page."""
    query = {}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    if page_id:
        query["page_id"] = page_id

    entries = await db.marketing_calendar.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return {"entries": entries}


async def update_calendar_entry(entry_id: str, data: dict):
    """Update a calendar entry (title, status, description, content_type, assigned_to)."""
    entry = await db.marketing_calendar.find_one({"id": entry_id})
    if not entry:
        return {"error": "Entry not found"}

    update = {}
    for field in ("title", "status", "description", "content_type",
                  "assigned_to", "assigned_to_name", "ai_suggestion"):
        if field in data:
            update[field] = data[field]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.marketing_calendar.update_one({"id": entry_id}, {"$set": update})
    return {"message": "Entry updated"}


async def delete_calendar_entry(entry_id: str):
    result = await db.marketing_calendar.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        return {"error": "Entry not found"}
    return {"message": "Entry deleted"}


# ═══════════════════════════════════════════
# AI CONTENT SUGGESTIONS
# ═══════════════════════════════════════════

async def suggest_content(entry_id: str):
    """Generate AI content suggestion for a calendar entry based on page theme + competitor data."""
    entry = await db.marketing_calendar.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        return {"error": "Entry not found"}

    page = await db.marketing_pages.find_one({"id": entry["page_id"]}, {"_id": 0})
    if not page:
        return {"error": "Page not found"}

    # Gather competitor context
    comp_context = ""
    try:
        comps = await db.competitors.find({"status": "active"}, {"_id": 0, "name": 1}).to_list(10)
        comp_ads = await db.competitor_ads.find({}, {"_id": 0, "competitor_name": 1, "ads": 1}).to_list(10)
        comp_social = await db.competitor_social.find({}, {"_id": 0, "competitor_name": 1, "platforms": 1}).to_list(10)

        parts = []
        for c in comps:
            parts.append(f"Competitor: {c['name']}")
        for ad in comp_ads:
            if ad.get("ads"):
                for a in ad["ads"][:2]:
                    parts.append(f"{ad['competitor_name']} ad: {a.get('text', '')[:150]}")
        for soc in comp_social:
            platforms = soc.get("platforms", {})
            for plat, data in platforms.items():
                for theme in (data.get("content_themes") or [])[:3]:
                    parts.append(f"{soc['competitor_name']} {plat} theme: {theme[:100]}")
        comp_context = "\n".join(parts[:20])
    except Exception as e:
        logger.warning(f"Competitor context error: {e}")

    # Gather recent posts from same page for continuity
    recent = await db.marketing_calendar.find(
        {"page_id": page["id"], "status": "posted", "title": {"$ne": ""}},
        {"_id": 0, "title": 1, "description": 1, "date": 1}
    ).sort("date", -1).to_list(5)

    recent_context = ""
    if recent:
        recent_context = "RECENT POSTS ON THIS PAGE:\n"
        for r in recent:
            recent_context += f"- [{r['date']}] {r.get('title', '')} — {r.get('description', '')[:100]}\n"

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY", "")

        prompt = f"""You are a social media content strategist for CLT Academy (forex/trading education, UAE).

Generate a content suggestion for:
- Platform: {page.get('platform', 'instagram')}
- Page: {page['name']} ({page.get('handle', '')})
- Page description: {page.get('description', 'Trading education page')}
- Posting date: {entry['date']}
- Content type: {entry.get('content_type', 'post')}

{recent_context}

COMPETITOR ACTIVITY:
{comp_context[:2000]}

Return JSON only:
{{
  "title": "Short catchy title for the post",
  "caption": "Full Instagram/social caption with hashtags",
  "content_idea": "Detailed description of what the video/image should contain",
  "hook": "First line that grabs attention in the feed",
  "cta": "Call to action",
  "hashtags": ["relevant", "hashtags"],
  "content_type_suggestion": "reel/carousel/story/static_post",
  "why_this_works": "Brief explanation of why this content will perform well"
}}"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"mktcal-{entry_id}",
            system_message="Social media strategist for forex trading education. Return only valid JSON.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        resp = await chat.send_message(UserMessage(text=prompt))
        json_match = re.search(r'\{[\s\S]*\}', resp)
        if json_match:
            suggestion = json.loads(json_match.group())
        else:
            suggestion = {"title": resp[:200], "content_idea": resp[:500]}

    except Exception as e:
        logger.error(f"Content suggestion error: {e}")
        suggestion = {"error": str(e)}

    # Save suggestion to entry
    await db.marketing_calendar.update_one(
        {"id": entry_id},
        {"$set": {"ai_suggestion": suggestion, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"entry_id": entry_id, "suggestion": suggestion}


# ═══════════════════════════════════════════
# DEADLINE CHECK & NOTIFICATIONS
# ═══════════════════════════════════════════

async def check_deadlines():
    """Check for upcoming calendar entries that are not ready (status != 'approved' or 'posted')."""
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).date().isoformat()
    day_after = (now + timedelta(days=2)).date().isoformat()

    # Find entries due in next 2 days that aren't approved/posted
    at_risk = await db.marketing_calendar.find(
        {
            "date": {"$lte": day_after, "$gte": now.date().isoformat()},
            "status": {"$nin": ["approved", "posted"]},
        },
        {"_id": 0}
    ).to_list(50)

    if not at_risk or not create_notification:
        return {"at_risk": 0}

    # Group by page and notify
    by_page = {}
    for entry in at_risk:
        pname = entry.get("page_name", "Unknown")
        by_page.setdefault(pname, []).append(entry)

    # Find marketing head / managers
    mkt_users = await db.users.find(
        {"role": {"$in": ["super_admin", "admin", "marketing"]}, "is_active": True},
        {"_id": 0, "id": 1}
    ).to_list(20)

    notified = 0
    for page_name, entries in by_page.items():
        statuses = [e["status"] for e in entries]
        dates = [e["date"] for e in entries]
        msg = f"{page_name}: {len(entries)} post(s) due by {max(dates)} still at [{', '.join(set(statuses))}]. Content may not be ready!"

        for u in mkt_users:
            # Max 1 notification per page per day
            existing = await db.notifications.find_one({
                "user_id": u["id"],
                "type": "marketing_deadline",
                "title": {"$regex": page_name},
                "created_at": {"$gte": now.replace(hour=0, minute=0, second=0).isoformat()},
            })
            if existing:
                continue

            await create_notification(
                user_id=u["id"],
                title=f"Content Deadline Alert: {page_name}",
                message=msg,
                notif_type="marketing_deadline",
                link="/marketing/calendar",
            )
            notified += 1

    return {"at_risk": len(at_risk), "notified": notified}


# ═══════════════════════════════════════════
# BACKGROUND LOOP
# ═══════════════════════════════════════════

_loop_running = False

async def _deadline_check_loop():
    """Background loop: check deadlines every 2 hours."""
    global _loop_running
    if _loop_running:
        return
    _loop_running = True
    logger.info("Marketing calendar deadline check loop started")
    while True:
        try:
            await check_deadlines()
        except Exception as e:
            logger.error(f"Deadline check error: {e}")
        await asyncio.sleep(7200)  # 2 hours


def start_deadline_loop(notification_fn):
    """Call from server.py startup."""
    global create_notification
    create_notification = notification_fn
    asyncio.get_event_loop().create_task(_deadline_check_loop())


# ═══════════════════════════════════════════
# CALENDAR STATS
# ═══════════════════════════════════════════

async def get_calendar_stats():
    """Get overview stats for the calendar dashboard."""
    now = datetime.now(timezone.utc)
    month = now.strftime("%Y-%m")

    total = await db.marketing_calendar.count_documents({"date": {"$regex": f"^{month}"}})
    by_status = {}
    for status in CONTENT_STATUSES:
        count = await db.marketing_calendar.count_documents({"date": {"$regex": f"^{month}"}, "status": status})
        by_status[status] = count

    pages = await db.marketing_pages.find({"status": "active"}, {"_id": 0, "id": 1, "name": 1, "color": 1}).to_list(50)
    page_stats = []
    for p in pages:
        posted = await db.marketing_calendar.count_documents({"page_id": p["id"], "date": {"$regex": f"^{month}"}, "status": "posted"})
        pending = await db.marketing_calendar.count_documents({"page_id": p["id"], "date": {"$regex": f"^{month}"}, "status": {"$nin": ["posted"]}})
        page_stats.append({"name": p["name"], "color": p.get("color", "#3b82f6"), "posted": posted, "pending": pending})

    return {
        "month": month,
        "total_entries": total,
        "by_status": by_status,
        "page_stats": page_stats,
    }

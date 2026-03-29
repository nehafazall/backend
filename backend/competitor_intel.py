"""
Competitor Intelligence Module
-------------------------------
Handles: Competitor CRUD, Web Scraping, Social Media Monitoring,
         Daily Briefings, and Competitive Analysis for Claret AI
"""

import os
import re
import uuid
import json
import logging
import asyncio
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from bs4 import BeautifulSoup

logger = logging.getLogger("competitor_intel")


# Will be set from server.py
db: AsyncIOMotorDatabase = None
get_current_user = None
create_notification = None

SCRAPE_TIMEOUT = 15
MAX_CONTENT_LENGTH = 5000

# ═══════════════════════════════════════════
# COMPETITOR CRUD
# ═══════════════════════════════════════════

async def list_competitors():
    """List all tracked competitors."""
    competitors = await db.competitors.find({}, {"_id": 0}).sort("name", 1).to_list(50)
    return {"competitors": competitors}


async def add_competitor(data: dict = Body(...)):
    """Add a new competitor to track."""
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Competitor name required")

    existing = await db.competitors.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if existing:
        raise HTTPException(409, f"Competitor '{name}' already exists")

    competitor = {
        "id": str(uuid.uuid4()),
        "name": name,
        "website": data.get("website", "").strip(),
        "social_links": {
            "instagram": data.get("instagram", "").strip(),
            "facebook": data.get("facebook", "").strip(),
            "linkedin": data.get("linkedin", "").strip(),
            "youtube": data.get("youtube", "").strip(),
            "twitter": data.get("twitter", "").strip(),
            "google_reviews": data.get("google_reviews", "").strip(),
        },
        "notes": data.get("notes", "").strip(),
        "status": "active",
        "last_scraped": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": data.get("user_id", ""),
    }
    await db.competitors.insert_one(competitor)
    return {"message": f"Competitor '{name}' added", "competitor": {k: v for k, v in competitor.items() if k != "_id"}}


async def update_competitor(competitor_id: str, data: dict = Body(...)):
    """Update competitor details."""
    comp = await db.competitors.find_one({"id": competitor_id})
    if not comp:
        raise HTTPException(404, "Competitor not found")

    update = {}
    for field in ("name", "website", "notes", "status"):
        if field in data:
            update[field] = data[field]
    if "social_links" in data:
        update["social_links"] = data["social_links"]
    for social in ("instagram", "facebook", "linkedin", "youtube", "twitter", "google_reviews"):
        if social in data:
            update[f"social_links.{social}"] = data[social]

    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.competitors.update_one({"id": competitor_id}, {"$set": update})
    return {"message": "Competitor updated"}


async def delete_competitor(competitor_id: str):
    """Delete a competitor."""
    result = await db.competitors.delete_one({"id": competitor_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Competitor not found")
    await db.competitor_intel.delete_many({"competitor_id": competitor_id})
    return {"message": "Competitor deleted"}


# ═══════════════════════════════════════════
# WEB SCRAPING ENGINE
# ═══════════════════════════════════════════

async def _scrape_url(url: str) -> dict:
    """Scrape a URL and extract key content."""
    if not url or not url.startswith("http"):
        return {"error": "Invalid URL", "content": ""}

    try:
        async with httpx.AsyncClient(timeout=SCRAPE_TIMEOUT, follow_redirects=True, verify=False) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # Remove scripts, styles, nav, footer
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
            tag.decompose()

        # Extract title
        title = soup.title.string.strip() if soup.title and soup.title.string else ""

        # Extract meta description
        meta_desc = ""
        meta = soup.find("meta", attrs={"name": "description"})
        if meta and meta.get("content"):
            meta_desc = meta["content"]

        # Extract main text content
        text = soup.get_text(separator="\n", strip=True)
        # Clean up excessive whitespace
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        clean_text = "\n".join(lines)[:MAX_CONTENT_LENGTH]

        # Extract pricing if visible
        pricing_keywords = ["price", "cost", "$", "AED", "USD", "per month", "enroll", "package", "plan"]
        pricing_sections = []
        for el in soup.find_all(["div", "section", "p", "span", "li", "h2", "h3"]):
            el_text = el.get_text(strip=True)
            if any(kw.lower() in el_text.lower() for kw in pricing_keywords) and len(el_text) < 300:
                pricing_sections.append(el_text)
        pricing = "\n".join(set(pricing_sections[:10]))

        # Extract course/service offerings
        course_keywords = ["course", "program", "training", "workshop", "masterclass", "mentorship", "coaching"]
        courses = []
        for el in soup.find_all(["h2", "h3", "h4", "li", "div"]):
            el_text = el.get_text(strip=True)
            if any(kw.lower() in el_text.lower() for kw in course_keywords) and 10 < len(el_text) < 200:
                courses.append(el_text)
        courses_text = "\n".join(set(courses[:15]))

        return {
            "title": title,
            "meta_description": meta_desc,
            "content": clean_text,
            "pricing": pricing,
            "courses": courses_text,
            "url": url,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.warning(f"Scrape failed for {url}: {e}")
        return {"error": str(e), "content": "", "url": url}


async def scrape_competitor(competitor_id: str):
    """Trigger scraping of a competitor's website and social links."""
    comp = await db.competitors.find_one({"id": competitor_id}, {"_id": 0})
    if not comp:
        raise HTTPException(404, "Competitor not found")

    urls_to_scrape = []
    if comp.get("website"):
        urls_to_scrape.append(("website", comp["website"]))
    socials = comp.get("social_links", {})
    for platform, url in socials.items():
        if url:
            urls_to_scrape.append((platform, url))

    if not urls_to_scrape:
        raise HTTPException(400, "No URLs configured for this competitor")

    results = {}
    for source_type, url in urls_to_scrape:
        result = await _scrape_url(url)
        results[source_type] = result

        # Store in competitor_intel collection
        intel_doc = {
            "id": str(uuid.uuid4()),
            "competitor_id": competitor_id,
            "competitor_name": comp["name"],
            "source_type": source_type,
            "url": url,
            "title": result.get("title", ""),
            "content": result.get("content", ""),
            "pricing": result.get("pricing", ""),
            "courses": result.get("courses", ""),
            "meta_description": result.get("meta_description", ""),
            "error": result.get("error"),
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }
        # Upsert: replace previous scrape for same competitor + source
        await db.competitor_intel.update_one(
            {"competitor_id": competitor_id, "source_type": source_type},
            {"$set": intel_doc},
            upsert=True,
        )

    # Update last_scraped timestamp
    await db.competitors.update_one(
        {"id": competitor_id},
        {"$set": {"last_scraped": datetime.now(timezone.utc).isoformat()}}
    )

    success_count = sum(1 for r in results.values() if not r.get("error"))
    return {
        "message": f"Scraped {success_count}/{len(urls_to_scrape)} sources for {comp['name']}",
        "results": {k: {"title": v.get("title", ""), "error": v.get("error"), "content_length": len(v.get("content", ""))} for k, v in results.items()},
    }


async def get_competitor_intel(competitor_id: str):
    """Get all scraped intelligence for a competitor."""
    intel = await db.competitor_intel.find(
        {"competitor_id": competitor_id},
        {"_id": 0}
    ).sort("scraped_at", -1).to_list(20)
    comp = await db.competitors.find_one({"id": competitor_id}, {"_id": 0})
    return {"competitor": comp, "intel": intel}


# ═══════════════════════════════════════════
# COMPETITIVE ANALYSIS (for Claret AI context)
# ═══════════════════════════════════════════

async def get_competitive_context(query: str = "") -> str:
    """Build competitive intelligence context for Claret AI.
    Returns a summary of competitor data that can be injected into the prompt."""
    # Get all active competitors and their latest intel
    competitors = await db.competitors.find({"status": "active"}, {"_id": 0}).to_list(20)
    if not competitors:
        return ""

    comp_ids = [c["id"] for c in competitors]
    all_intel = await db.competitor_intel.find(
        {"competitor_id": {"$in": comp_ids}},
        {"_id": 0, "competitor_name": 1, "source_type": 1, "title": 1, "content": 1, "pricing": 1, "courses": 1, "scraped_at": 1}
    ).to_list(100)

    # Group by competitor
    by_comp = {}
    for intel in all_intel:
        name = intel["competitor_name"]
        if name not in by_comp:
            by_comp[name] = {"sources": []}
        by_comp[name]["sources"].append(intel)

    parts = ["=== COMPETITOR INTELLIGENCE (scraped from real websites) ==="]
    for comp in competitors:
        name = comp["name"]
        parts.append(f"\n--- {name.upper()} ---")
        parts.append(f"Website: {comp.get('website', 'N/A')}")
        socials = comp.get("social_links", {})
        active_socials = [k for k, v in socials.items() if v]
        if active_socials:
            parts.append(f"Social presence: {', '.join(active_socials)}")

        intel_data = by_comp.get(name, {}).get("sources", [])
        for intel in intel_data[:3]:
            if intel.get("content"):
                parts.append(f"[{intel['source_type'].upper()}] {intel.get('title', '')}")
                # Summarize content to keep context manageable
                content = intel["content"][:1500]
                parts.append(content)
            if intel.get("pricing"):
                parts.append(f"PRICING INFO: {intel['pricing'][:500]}")
            if intel.get("courses"):
                parts.append(f"COURSES/OFFERINGS: {intel['courses'][:500]}")

    return "\n".join(parts)[:8000]


# ═══════════════════════════════════════════
# DAILY BRIEFING ENGINE
# ═══════════════════════════════════════════

async def _generate_agent_briefing(user_id: str, user_name: str, role: str) -> dict:
    """Generate a personalized daily briefing for an agent."""
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    briefing = {
        "user_id": user_id,
        "user_name": user_name,
        "date": today,
        "sections": [],
    }

    # 1. Pipeline summary (for sales roles)
    if role in ("sales_executive", "team_leader", "sales_head", "super_admin", "admin"):
        leads = await db.leads.find(
            {"assigned_to": user_id, "created_at": {"$gte": month_start}},
            {"_id": 0, "pipeline_stage": 1, "amount": 1, "full_name": 1}
        ).to_list(500)
        closed = [l for l in leads if l.get("pipeline_stage") in ("enrolled", "closed_won")]
        total_revenue = sum(l.get("amount", 0) for l in closed)

        briefing["sections"].append({
            "title": "Sales Pipeline",
            "icon": "target",
            "items": [
                f"Total leads this month: {len(leads)}",
                f"Closings: {len(closed)} (AED {total_revenue:,.0f})",
                f"Leads in pipeline: {len(leads) - len(closed)}",
            ],
        })

    # 2. Follow-ups due today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = now.replace(hour=23, minute=59, second=59).isoformat()
    try:
        followups = await db.follow_ups.find(
            {"user_id": user_id, "due_date": {"$gte": today_start, "$lte": today_end}, "status": {"$ne": "completed"}},
            {"_id": 0, "lead_name": 1, "note": 1, "due_date": 1}
        ).to_list(50)
    except Exception:
        followups = []

    try:
        reminders = await db.reminders.find(
            {"user_id": user_id, "reminder_time": {"$gte": today_start, "$lte": today_end}, "completed": {"$ne": True}},
            {"_id": 0, "title": 1, "reminder_time": 1}
        ).to_list(50)
    except Exception:
        reminders = []

    if followups or reminders:
        items = []
        for f in followups[:5]:
            items.append(f"Follow up: {f.get('lead_name', 'Unknown')} - {f.get('note', '')[:60]}")
        for r in reminders[:5]:
            items.append(f"Reminder: {r.get('title', '')[:60]}")
        briefing["sections"].append({
            "title": "Today's Action Items",
            "icon": "clock",
            "items": items,
        })

    # 3. Student/CS summary (for CS roles)
    if role in ("cs_agent", "cs_head", "super_admin", "admin"):
        student_query = {"cs_agent_id": user_id} if role == "cs_agent" else {}
        students = await db.students.find(student_query, {"_id": 0, "stage": 1}).to_list(1000)
        stage_counts = {}
        for s in students:
            stage = s.get("stage", "unknown")
            stage_counts[stage] = stage_counts.get(stage, 0) + 1

        items = [f"Total students: {len(students)}"]
        for stage, count in sorted(stage_counts.items(), key=lambda x: -x[1])[:5]:
            items.append(f"  {stage}: {count}")
        briefing["sections"].append({
            "title": "Student Overview",
            "icon": "users",
            "items": items,
        })

    # 4. Mood/motivation nudge (from Claret profile)
    profile = await db.claret_profiles.find_one({"user_id": user_id}, {"_id": 0})
    latest_mood = await db.claret_mood_scores.find_one(
        {"user_id": user_id}, {"_id": 0}
    ) if profile else None

    if latest_mood:
        mood_score = latest_mood.get("overall_score", 5)
        if mood_score >= 7:
            nudge = "You've been in great spirits! Keep that energy going today. You're unstoppable!"
        elif mood_score >= 5:
            nudge = "Solid vibes lately. Today's a great day to push a little harder and surprise yourself!"
        else:
            nudge = "Remember, tough days build stronger closers. One good call can change everything. You've got this!"
    else:
        nudge = "New day, new opportunities! Make it count!"

    briefing["sections"].append({
        "title": "Today's Motivation",
        "icon": "zap",
        "items": [nudge],
    })

    # 5. Competitive edge tip (if intel available)
    comp_count = await db.competitors.count_documents({"status": "active"})
    if comp_count > 0:
        latest_intel = await db.competitor_intel.find_one(
            {"content": {"$ne": ""}},
            {"_id": 0, "competitor_name": 1, "title": 1},
            sort=[("scraped_at", -1)]
        )
        if latest_intel:
            briefing["sections"].append({
                "title": "Competitive Edge",
                "icon": "shield",
                "items": [
                    f"Tracking {comp_count} competitors. Latest intel on: {latest_intel.get('competitor_name', 'N/A')}",
                    "Ask Claret: 'How are we better than [competitor]?' for instant talking points!",
                ],
            })

    return briefing


async def get_daily_briefing(user_id: str = ""):
    """Get personalized daily briefing for the logged-in user."""
    if not user_id:
        raise HTTPException(400, "user_id required")

    emp = await db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1, "role": 1})
    if not emp:
        raise HTTPException(404, "User not found")

    briefing = await _generate_agent_briefing(user_id, emp.get("full_name", ""), emp.get("role", ""))
    return briefing


async def send_daily_briefings():
    """CEO action: Generate and send daily briefings to all active users as notifications."""
    users = await db.users.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "full_name": 1, "role": 1}
    ).to_list(200)

    sent = 0
    for u in users:
        try:
            briefing = await _generate_agent_briefing(u["id"], u.get("full_name", ""), u.get("role", ""))
            # Build notification message from briefing sections
            msg_parts = []
            for section in briefing.get("sections", []):
                msg_parts.append(f"**{section['title']}**")
                for item in section.get("items", [])[:3]:
                    msg_parts.append(f"  {item}")
            message = "\n".join(msg_parts)[:500]

            if create_notification:
                await create_notification(
                    user_id=u["id"],
                    title="Good Morning! Your Daily Briefing",
                    message=message,
                    notif_type="info",
                    link="/claret",
                )
            sent += 1
        except Exception as e:
            logger.error(f"Briefing failed for {u['id']}: {e}")

    return {"message": f"Sent {sent}/{len(users)} briefings"}


# ═══════════════════════════════════════════
# SCRAPE ALL COMPETITORS (Batch)
# ═══════════════════════════════════════════

async def scrape_all_competitors():
    """Scrape all active competitors. Runs sequentially to avoid overwhelming targets."""
    competitors = await db.competitors.find({"status": "active"}, {"_id": 0, "id": 1, "name": 1}).to_list(20)
    results = {}
    for comp in competitors:
        try:
            result = await scrape_competitor(comp["id"])
            results[comp["name"]] = result.get("message", "Done")
        except Exception as e:
            results[comp["name"]] = f"Error: {str(e)}"

    return {"message": f"Scraped {len(competitors)} competitors", "results": results}

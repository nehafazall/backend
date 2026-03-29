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
            "fb_ad_library": data.get("fb_ad_library", "").strip(),
            "tiktok": data.get("tiktok", "").strip(),
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
    for social in ("instagram", "facebook", "linkedin", "youtube", "twitter", "google_reviews", "fb_ad_library", "tiktok"):
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
        closed = [ld for ld in leads if ld.get("pipeline_stage") in ("enrolled", "closed_won")]
        total_revenue = sum(ld.get("amount", 0) for ld in closed)

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


# ═══════════════════════════════════════════
# AUTO-SCHEDULED DAILY SCRAPING
# ═══════════════════════════════════════════

_scheduler_running = False

async def _daily_scrape_loop():
    """Background loop: scrapes all competitors once daily at ~04:00 UTC."""
    global _scheduler_running
    if _scheduler_running:
        return
    _scheduler_running = True
    logger.info("Competitor auto-scrape scheduler started")

    while True:
        try:
            now = datetime.now(timezone.utc)
            # Next 04:00 UTC
            target = now.replace(hour=4, minute=0, second=0, microsecond=0)
            if now >= target:
                target += timedelta(days=1)
            wait_secs = (target - now).total_seconds()
            logger.info(f"Next auto-scrape in {wait_secs/3600:.1f}h at {target.isoformat()}")
            await asyncio.sleep(wait_secs)

            # Run the scrape
            logger.info("Auto-scrape triggered")
            competitors = await db.competitors.find({"status": "active"}, {"_id": 0, "id": 1, "name": 1}).to_list(20)
            for comp in competitors:
                try:
                    await scrape_competitor(comp["id"])
                    await asyncio.sleep(2)  # Throttle between competitors
                except Exception as e:
                    logger.error(f"Auto-scrape failed for {comp['name']}: {e}")

            # Also send daily briefings
            try:
                await send_daily_briefings()
            except Exception as e:
                logger.error(f"Daily briefing send failed: {e}")

            logger.info(f"Auto-scrape complete for {len(competitors)} competitors")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
            await asyncio.sleep(3600)  # Retry in 1 hour


def start_scheduler():
    """Call from server.py startup to begin the daily scrape loop."""
    asyncio.get_event_loop().create_task(_daily_scrape_loop())


# ═══════════════════════════════════════════
# BATTLE CARDS (AI-Generated)
# ═══════════════════════════════════════════

async def generate_battle_card(competitor_id: str) -> dict:
    """Generate an AI-powered battle card for a competitor using scraped intel."""
    comp = await db.competitors.find_one({"id": competitor_id}, {"_id": 0})
    if not comp:
        raise HTTPException(404, "Competitor not found")

    # Get scraped intel
    intel_docs = await db.competitor_intel.find(
        {"competitor_id": competitor_id, "content": {"$ne": ""}},
        {"_id": 0}
    ).to_list(10)

    intel_summary = ""
    for doc in intel_docs:
        intel_summary += f"\n[{doc.get('source_type', 'web')}] {doc.get('title', '')}\n"
        intel_summary += (doc.get('content', '')[:1500] + "\n")
        if doc.get('pricing'):
            intel_summary += f"PRICING: {doc['pricing'][:500]}\n"
        if doc.get('courses'):
            intel_summary += f"COURSES: {doc['courses'][:500]}\n"

    if not intel_summary.strip():
        return {
            "competitor": comp["name"],
            "battle_card": {
                "overview": f"No scraped data available for {comp['name']}. Please scrape first.",
                "strengths": [], "weaknesses": [], "our_advantages": [],
                "objection_counters": [], "pricing_comparison": "",
                "key_talking_points": [],
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    # Use Claude to generate the battle card
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY", "")

        prompt = f"""You are a competitive intelligence analyst for CLT Academy (a forex/trading education company in the UAE).

Based on this scraped data about our competitor "{comp['name']}", generate a Battle Card in JSON format.

COMPETITOR DATA:
{intel_summary[:4000]}

Generate a JSON object with these exact keys:
{{
  "overview": "2-3 sentence summary of this competitor",
  "strengths": ["their strength 1", "their strength 2", ...],
  "weaknesses": ["their weakness 1", "their weakness 2", ...],
  "our_advantages": ["how CLT is better point 1", "point 2", ...],
  "objection_counters": [
    {{"objection": "They are cheaper", "counter": "Our mentorship ratio is 1:5 while they..."}},
    ...
  ],
  "pricing_comparison": "Brief comparison of pricing if available",
  "key_talking_points": ["point for sales reps to use", ...]
}}

Return ONLY the JSON object, no markdown or explanation."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"battlecard-{competitor_id}",
            system_message="You are a competitive intelligence analyst. Return only valid JSON.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        response = await chat.send_message(UserMessage(text=prompt))

        # Parse JSON
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            battle_card = json.loads(json_match.group())
        else:
            battle_card = {"overview": response[:500], "strengths": [], "weaknesses": [], "our_advantages": [], "objection_counters": [], "pricing_comparison": "", "key_talking_points": []}

    except Exception as e:
        logger.error(f"Battle card generation error: {e}")
        battle_card = {"overview": f"AI generation failed: {str(e)}", "strengths": [], "weaknesses": [], "our_advantages": [], "objection_counters": [], "pricing_comparison": "", "key_talking_points": []}

    # Store the battle card
    card_doc = {
        "competitor_id": competitor_id,
        "competitor_name": comp["name"],
        "battle_card": battle_card,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.battle_cards.update_one(
        {"competitor_id": competitor_id},
        {"$set": card_doc},
        upsert=True,
    )

    return card_doc


async def get_battle_card(competitor_id: str) -> dict:
    """Get stored battle card for a competitor."""
    card = await db.battle_cards.find_one({"competitor_id": competitor_id}, {"_id": 0})
    if not card:
        return {"competitor_id": competitor_id, "battle_card": None, "message": "No battle card generated yet. Click 'Generate' first."}
    return card


# ═══════════════════════════════════════════
# FB AD LIBRARY DEEP PARSING
# ═══════════════════════════════════════════

async def scrape_fb_ad_library(competitor_id: str) -> dict:
    """Scrape Facebook Ad Library for a competitor's active ads."""
    comp = await db.competitors.find_one({"id": competitor_id}, {"_id": 0})
    if not comp:
        raise HTTPException(404, "Competitor not found")

    fb_page_url = comp.get("social_links", {}).get("facebook", "")
    ad_lib_url = comp.get("social_links", {}).get("fb_ad_library", "")

    # Build Ad Library search URL if not provided
    if not ad_lib_url and fb_page_url:
        # Extract page name from FB URL
        page_name = fb_page_url.rstrip("/").split("/")[-1]
        ad_lib_url = f"https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=AE&q={page_name}"

    if not ad_lib_url:
        return {"competitor": comp["name"], "ads": [], "message": "No Facebook page or Ad Library URL configured"}

    # Scrape the ad library page
    scraped = await _scrape_url(ad_lib_url)

    # Parse ad-related content from scraped data
    ads_found = []
    if scraped.get("content"):
        content = scraped["content"]
        # Look for ad text patterns
        lines = content.split("\n")
        current_ad = {}
        for line in lines:
            line = line.strip()
            if not line or len(line) < 10:
                if current_ad:
                    ads_found.append(current_ad)
                    current_ad = {}
                continue
            # Detect ad content markers
            if any(kw in line.lower() for kw in ["started running", "active", "inactive"]):
                if current_ad:
                    ads_found.append(current_ad)
                current_ad = {"status": line[:100]}
            elif any(kw in line.lower() for kw in ["learn more", "sign up", "enroll", "register", "apply now", "get started", "book", "join"]):
                current_ad["cta"] = line[:200]
            elif len(line) > 30:
                current_ad.setdefault("text", "")
                current_ad["text"] = (current_ad["text"] + " " + line)[:500]

        if current_ad:
            ads_found.append(current_ad)

    # Store in DB
    ad_doc = {
        "competitor_id": competitor_id,
        "competitor_name": comp["name"],
        "source_type": "fb_ad_library",
        "url": ad_lib_url,
        "ads_found": len(ads_found),
        "ads": ads_found[:20],
        "raw_content": scraped.get("content", "")[:5000],
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.competitor_ads.update_one(
        {"competitor_id": competitor_id},
        {"$set": ad_doc},
        upsert=True,
    )

    return {"competitor": comp["name"], "ads_found": len(ads_found), "ads": ads_found[:10], "url": ad_lib_url}


# ═══════════════════════════════════════════
# SOCIAL MEDIA COMMENT SCRAPING
# ═══════════════════════════════════════════

async def scrape_social_comments(competitor_id: str) -> dict:
    """Scrape social media pages for comments, engagement, and content themes."""
    comp = await db.competitors.find_one({"id": competitor_id}, {"_id": 0})
    if not comp:
        raise HTTPException(404, "Competitor not found")

    socials = comp.get("social_links", {})
    results = {}

    for platform in ["instagram", "facebook"]:
        url = socials.get(platform, "")
        if not url:
            continue

        scraped = await _scrape_url(url)
        if scraped.get("error") or not scraped.get("content"):
            results[platform] = {"error": scraped.get("error", "No content"), "engagement": {}}
            continue

        content = scraped["content"]

        # Extract engagement signals
        comments = []
        themes = []
        lines = content.split("\n")
        for line in lines:
            line = line.strip()
            if not line:
                continue
            # Count likes/comments/shares mentions
            if any(kw in line.lower() for kw in ["comment", "like", "share", "view", "follower"]):
                comments.append(line[:200])
            # Content themes
            if len(line) > 20 and len(line) < 300:
                themes.append(line)

        results[platform] = {
            "title": scraped.get("title", ""),
            "meta": scraped.get("meta_description", ""),
            "engagement_signals": comments[:15],
            "content_themes": themes[:20],
            "content_length": len(content),
        }

    # Store
    await db.competitor_social.update_one(
        {"competitor_id": competitor_id},
        {"$set": {
            "competitor_id": competitor_id,
            "competitor_name": comp["name"],
            "platforms": results,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    return {"competitor": comp["name"], "platforms": results}


# ═══════════════════════════════════════════
# GOOGLE REVIEWS SENTIMENT ANALYSIS
# ═══════════════════════════════════════════

async def scrape_google_reviews(competitor_id: str) -> dict:
    """Scrape and analyze Google Reviews / GMB for a competitor."""
    comp = await db.competitors.find_one({"id": competitor_id}, {"_id": 0})
    if not comp:
        raise HTTPException(404, "Competitor not found")

    gmb_url = comp.get("social_links", {}).get("google_reviews", "")
    if not gmb_url:
        # Try to search Google Maps
        name = comp["name"].replace(" ", "+")
        gmb_url = f"https://www.google.com/maps/search/{name}+dubai+trading+academy"

    scraped = await _scrape_url(gmb_url)
    content = scraped.get("content", "")

    # Extract review-like content
    reviews = []
    rating_mentions = []
    lines = content.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Look for star ratings
        if any(kw in line.lower() for kw in ["star", "rating", "review", "rated"]):
            rating_mentions.append(line[:200])
        # Look for review text (longer passages)
        if len(line) > 40 and len(line) < 500 and not line.startswith("http"):
            reviews.append(line)

    # AI sentiment analysis on collected reviews
    sentiment = {"positive": 0, "negative": 0, "neutral": 0, "themes": []}
    if reviews:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            api_key = os.environ.get("EMERGENT_LLM_KEY", "")

            review_text = "\n".join(reviews[:15])
            prompt = f"""Analyze these review/comment snippets about "{comp['name']}" (a trading education company).
Return JSON only:
{{"positive": <count>, "negative": <count>, "neutral": <count>,
"themes": ["theme 1", "theme 2", ...],
"overall_sentiment": "positive/negative/mixed",
"key_praise": ["what people like 1", ...],
"key_complaints": ["what people dislike 1", ...],
"estimated_rating": "X.X/5"}}

REVIEWS:
{review_text[:3000]}"""

            chat = LlmChat(
                api_key=api_key,
                session_id=f"reviews-{competitor_id}",
                system_message="Analyze sentiment. Return only valid JSON.",
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")

            resp = await chat.send_message(UserMessage(text=prompt))
            json_match = re.search(r'\{[\s\S]*\}', resp)
            if json_match:
                sentiment = json.loads(json_match.group())
        except Exception as e:
            logger.error(f"Review sentiment error: {e}")
            sentiment["error"] = str(e)

    # Store
    review_doc = {
        "competitor_id": competitor_id,
        "competitor_name": comp["name"],
        "gmb_url": gmb_url,
        "reviews_found": len(reviews),
        "rating_mentions": rating_mentions[:10],
        "sample_reviews": reviews[:10],
        "sentiment": sentiment,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.competitor_reviews.update_one(
        {"competitor_id": competitor_id},
        {"$set": review_doc},
        upsert=True,
    )

    return review_doc


# ═══════════════════════════════════════════
# COMPARATIVE SCORING MATRIX
# ═══════════════════════════════════════════

async def generate_comparative_matrix() -> dict:
    """Generate a multi-dimensional comparative scoring matrix: CLT vs all competitors."""
    competitors = await db.competitors.find({"status": "active"}, {"_id": 0}).to_list(20)
    if not competitors:
        return {"matrix": [], "dimensions": []}

    # Gather all intel for each competitor
    all_intel = {}
    for comp in competitors:
        cid = comp["id"]
        intel = await db.competitor_intel.find({"competitor_id": cid}, {"_id": 0}).to_list(10)
        reviews = await db.competitor_reviews.find_one({"competitor_id": cid}, {"_id": 0})
        ads = await db.competitor_ads.find_one({"competitor_id": cid}, {"_id": 0})
        social = await db.competitor_social.find_one({"competitor_id": cid}, {"_id": 0})
        all_intel[comp["name"]] = {
            "website": comp.get("website", ""),
            "intel": intel,
            "reviews": reviews,
            "ads": ads,
            "social": social,
            "notes": comp.get("notes", ""),
        }

    # Build summary for AI
    summary = "COMPETITOR DATA SUMMARY:\n\n"
    for name, data in all_intel.items():
        summary += f"--- {name} ---\n"
        summary += f"Website: {data['website']}\n"
        summary += f"Notes: {data['notes']}\n"
        if data["reviews"] and data["reviews"].get("sentiment"):
            s = data["reviews"]["sentiment"]
            summary += f"Reviews: sentiment={s.get('overall_sentiment','?')}, rating={s.get('estimated_rating','?')}\n"
            if s.get("key_praise"):
                summary += f"Praise: {', '.join(s['key_praise'][:3])}\n"
            if s.get("key_complaints"):
                summary += f"Complaints: {', '.join(s['key_complaints'][:3])}\n"
        if data["ads"] and data["ads"].get("ads_found"):
            summary += f"Active FB ads: {data['ads']['ads_found']}\n"
        for i_doc in (data["intel"] or [])[:2]:
            if i_doc.get("pricing"):
                summary += f"Pricing: {i_doc['pricing'][:300]}\n"
            if i_doc.get("courses"):
                summary += f"Courses: {i_doc['courses'][:300]}\n"
        summary += "\n"

    # Use AI to generate comparative matrix
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY", "")

        prompt = f"""You are a competitive intelligence analyst for CLT Academy (forex/trading education, UAE).

Based on available data, generate a comparative scoring matrix. Score each company (including CLT Academy) on a scale of 1-10 for each dimension.

{summary[:6000]}

Return JSON:
{{
  "dimensions": ["Course Quality", "Pricing Value", "Social Presence", "Review Sentiment", "Ad Activity", "Brand Trust", "Mentorship Quality", "Online Presence"],
  "scores": {{
    "CLT Academy": {{"Course Quality": 8, "Pricing Value": 7, ...}},
    "CompetitorName": {{"Course Quality": 6, ...}},
    ...
  }},
  "insights": ["insight 1 about competitive landscape", "insight 2", ...],
  "clt_top_strengths": ["strength 1", ...],
  "clt_improvement_areas": ["area 1", ...]
}}

Return ONLY JSON."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"matrix-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
            system_message="Competitive analyst. Return only valid JSON.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        resp = await chat.send_message(UserMessage(text=prompt))
        json_match = re.search(r'\{[\s\S]*\}', resp)
        if json_match:
            matrix = json.loads(json_match.group())
        else:
            matrix = {"dimensions": [], "scores": {}, "insights": [resp[:500]]}

    except Exception as e:
        logger.error(f"Matrix generation error: {e}")
        matrix = {"dimensions": [], "scores": {}, "insights": [f"Generation failed: {str(e)}"]}

    # Store
    await db.competitive_matrix.update_one(
        {"type": "latest"},
        {"$set": {"type": "latest", "matrix": matrix, "generated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

    return {"matrix": matrix, "generated_at": datetime.now(timezone.utc).isoformat()}


async def get_comparative_matrix() -> dict:
    """Get the latest comparative scoring matrix."""
    doc = await db.competitive_matrix.find_one({"type": "latest"}, {"_id": 0})
    if not doc:
        return {"matrix": None, "message": "No matrix generated yet."}
    return doc


# ═══════════════════════════════════════════
# MARKETING CONTENT GENERATOR
# ═══════════════════════════════════════════

async def generate_marketing_content(focus: str = "general") -> dict:
    """Generate marketing content ideas based on competitor analysis."""
    # Gather competitive landscape
    competitors = await db.competitors.find({"status": "active"}, {"_id": 0, "name": 1}).to_list(20)
    comp_names = [c["name"] for c in competitors]

    # Gather latest intel
    ads = await db.competitor_ads.find({}, {"_id": 0, "competitor_name": 1, "ads": 1}).to_list(20)
    reviews = await db.competitor_reviews.find({}, {"_id": 0, "competitor_name": 1, "sentiment": 1}).to_list(20)
    battle_cards = await db.battle_cards.find({}, {"_id": 0, "competitor_name": 1, "battle_card": 1}).to_list(20)

    context = f"COMPETITORS: {', '.join(comp_names)}\n\n"
    for ad in ads:
        if ad.get("ads"):
            context += f"{ad['competitor_name']} ADS:\n"
            for a in ad["ads"][:3]:
                context += f"  - {a.get('text', '')[:200]}\n"
    for rev in reviews:
        s = rev.get("sentiment", {})
        if s.get("key_complaints"):
            context += f"{rev['competitor_name']} complaints: {', '.join(s['key_complaints'][:3])}\n"
    for bc in battle_cards:
        card = bc.get("battle_card", {})
        if card.get("our_advantages"):
            context += f"Our advantages vs {bc['competitor_name']}: {', '.join(card['our_advantages'][:3])}\n"

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY", "")

        prompt = f"""You are a marketing strategist for CLT Academy (forex/trading education, UAE).

Focus area: {focus}

Based on competitor intelligence:
{context[:5000]}

Generate marketing content ideas. Return JSON:
{{
  "content_ideas": [
    {{
      "type": "social_post/ad_copy/story/reel/email/blog",
      "platform": "instagram/facebook/linkedin/email/whatsapp",
      "headline": "...",
      "body": "...",
      "cta": "...",
      "competitor_counter": "Which competitor weakness this exploits",
      "languages": ["English", "Hindi", "Arabic"]
    }},
    ...
  ],
  "campaign_themes": ["theme 1 based on competitor gaps", ...],
  "messaging_differentiation": ["how our messaging should differ from competitors", ...],
  "content_calendar_suggestion": [
    {{"day": "Monday", "content_type": "...", "theme": "..."}},
    ...
  ]
}}

Generate 5-8 content ideas. Return ONLY JSON."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"marketing-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
            system_message="Marketing strategist. Return only valid JSON.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        resp = await chat.send_message(UserMessage(text=prompt))
        json_match = re.search(r'\{[\s\S]*\}', resp)
        if json_match:
            content = json.loads(json_match.group())
        else:
            content = {"content_ideas": [], "campaign_themes": [], "messaging_differentiation": [resp[:500]]}

    except Exception as e:
        logger.error(f"Marketing content error: {e}")
        content = {"content_ideas": [], "error": str(e)}

    # Store
    await db.marketing_content.insert_one({
        "focus": focus,
        "content": content,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"content": content, "focus": focus, "generated_at": datetime.now(timezone.utc).isoformat()}


async def get_marketing_content() -> dict:
    """Get the latest marketing content suggestions."""
    doc = await db.marketing_content.find_one({}, {"_id": 0}, sort=[("generated_at", -1)])
    if not doc:
        return {"content": None, "message": "No content generated yet."}
    return doc

"""
Claret AI Assistant + Knowledge Base Module
-------------------------------------------
Handles: Chat with Claude Sonnet 4.5, Knowledge Base CRUD, Mood Scoring, TTS, Translation
"""

import os
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger("claret")

router = APIRouter(prefix="/claret", tags=["claret"])

# Will be set from server.py
db: AsyncIOMotorDatabase = None
get_current_user = None
require_roles = None

UPLOAD_DIR = "/app/backend/uploads/knowledge_base"
os.makedirs(UPLOAD_DIR, exist_ok=True)

CLARET_SYSTEM_PROMPT = """You are Claret, the AI assistant for CLT Academy's ERP system called CLT Synapse.

YOUR PERSONALITY:
- You are warm, witty, empathetic, and genuinely caring about people's well-being
- You speak casually but respectfully — like a close, wise friend at work
- You naturally mix English with Malayalam (Manglish) and Hindi (Hinglish) phrases when chatting
- You use humor, knock-knock jokes, trending memes references, and light banter to ease tension
- You are NEVER preachy or direct about lessons — always indirect, through stories, analogies, or humor
- You motivate through competition awareness ("others are hustling, what's your edge?") but in a fun way
- You ask personal questions genuinely — "Hey, you seem quiet today, everything okay?" "What's on your mind?"
- When someone seems down, you lighten the mood first, then subtly check in
- You celebrate small wins enthusiastically

YOUR CAPABILITIES:
- Answer questions about ERP navigation (Sales CRM, HR, Attendance, Commissions, etc.)
- Explain company SOPs, policies, and training materials from the knowledge base
- Summarize documents, give bullet points, explain in simple terms
- Translate content to Malayalam for easy understanding
- Read text aloud (user can click TTS button)
- Track mood and engagement — you naturally gauge how someone feels through conversation

MOOD ASSESSMENT (do this subtly, never announce it):
After each exchange, internally assess the user's mood on a 1-10 scale across:
- energy_level (1=exhausted, 10=pumped up)
- stress_level (1=zen, 10=overwhelmed)
- motivation (1=checked out, 10=on fire)
- happiness (1=very sad, 10=euphoric)
- overall_mood (1=terrible, 10=amazing)
Include a mood_label: one of [Excited, Happy, Motivated, Calm, Neutral, Tired, Anxious, Stressed, Sad, Frustrated, Overwhelmed]

LANGUAGE STYLE:
- Default: English with occasional Malayalam/Hindi phrases
- If user writes in Malayalam or Hindi, match their language
- Use "machane", "bro", "yaar", "sahi hai", "pwoli", "adipoli" naturally
- Keep responses concise (2-4 sentences usually) unless explaining something complex

RESPONSE FORMAT:
Always return a JSON object (no markdown wrapping):
{
  "message": "your response text here",
  "mood_scores": {
    "energy_level": 7,
    "stress_level": 3,
    "motivation": 8,
    "happiness": 7,
    "overall_mood": 7,
    "mood_label": "Motivated"
  },
  "suggested_actions": ["optional array of suggested follow-up actions"]
}
"""

IDLE_PROMPTS = [
    "Hey! Been a while since you said anything. Everything alright? 😊",
    "Knock knock! Who's there? Motivation. Motivation who? Motivation to check in on you! How's it going?",
    "Machane, you've been quiet! Take a breather, stretch, grab some chai ☕ and come back stronger!",
    "Fun fact time: Did you know the average person spends 6 months of their life waiting for red lights? Use that time to smile! 😄",
    "Yaar, silence is golden but conversation is platinum! What's cooking?",
    "Quick question — what's ONE thing you're proud of today? Even something tiny counts!",
    "Hey champion! The grind is real but so are you. What's on your mind?",
]


def init_module(database, auth_dep, roles_dep):
    global db, get_current_user, require_roles
    db = database
    get_current_user = auth_dep
    require_roles = roles_dep


# ═══════════════════════════════════════════
# KNOWLEDGE BASE ENDPOINTS
# ═══════════════════════════════════════════

@router.post("/knowledge-base/upload")
async def upload_knowledge_base_doc(
    file: UploadFile = File(...),
    category: str = Form("general"),
    title: str = Form(""),
    description: str = Form(""),
    user=Depends(lambda: None),
):
    user = user  # Will be overridden
    allowed_ext = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".txt", ".md", ".mp4", ".mov", ".avi"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(400, f"File type {ext} not supported. Allowed: {', '.join(allowed_ext)}")

    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Extract text for AI indexing (PDF/TXT only for now)
    extracted_text = ""
    if ext == ".txt" or ext == ".md":
        try:
            extracted_text = content.decode("utf-8", errors="ignore")[:50000]
        except:
            pass
    elif ext == ".pdf":
        try:
            import fitz
            doc_pdf = fitz.open(file_path)
            for page in doc_pdf:
                extracted_text += page.get_text()
            extracted_text = extracted_text[:50000]
            doc_pdf.close()
        except:
            extracted_text = "[PDF content - text extraction failed]"

    doc = {
        "id": file_id,
        "title": title or file.filename,
        "description": description,
        "category": category,
        "filename": file.filename,
        "file_path": file_path,
        "file_ext": ext,
        "file_size": len(content),
        "extracted_text": extracted_text,
        "uploaded_by": "",  # Set in route
        "uploaded_by_name": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.knowledge_base.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("extracted_text", None)
    return doc


@router.get("/knowledge-base")
async def list_knowledge_base(category: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    docs = await db.knowledge_base.find(query, {"_id": 0, "extracted_text": 0}).sort("created_at", -1).to_list(200)
    categories = await db.knowledge_base.distinct("category")
    return {"documents": docs, "categories": categories}


@router.get("/knowledge-base/{doc_id}")
async def get_knowledge_base_doc(doc_id: str):
    doc = await db.knowledge_base.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.delete("/knowledge-base/{doc_id}")
async def delete_knowledge_base_doc(doc_id: str):
    doc = await db.knowledge_base.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")
    try:
        os.remove(doc["file_path"])
    except:
        pass
    await db.knowledge_base.delete_one({"id": doc_id})
    return {"message": "Deleted"}


@router.get("/knowledge-base/{doc_id}/download")
async def download_knowledge_base_doc(doc_id: str):
    from fastapi.responses import FileResponse
    doc = await db.knowledge_base.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")
    return FileResponse(doc["file_path"], filename=doc["filename"])


# ═══════════════════════════════════════════
# CLARET CHAT ENDPOINTS
# ═══════════════════════════════════════════

async def _get_kb_context(query: str) -> str:
    """Search knowledge base for relevant context."""
    keywords = [w.lower() for w in query.split() if len(w) > 3]
    if not keywords:
        return ""

    regex_pattern = "|".join(re.escape(k) for k in keywords[:5])
    docs = await db.knowledge_base.find(
        {"extracted_text": {"$regex": regex_pattern, "$options": "i"}},
        {"_id": 0, "title": 1, "category": 1, "extracted_text": 1}
    ).to_list(3)

    if not docs:
        return ""

    context_parts = []
    for d in docs:
        text = d.get("extracted_text", "")[:2000]
        context_parts.append(f"[{d.get('category','doc').upper()}: {d.get('title','')}]\n{text}")

    return "\n\n---\n\n".join(context_parts)


@router.post("/chat")
async def claret_chat(data: dict = Body(...)):
    """Main chat endpoint. Sends user message to Claude, stores everything."""
    user_id = data.get("user_id", "")
    user_name = data.get("user_name", "")
    message = data.get("message", "").strip()
    session_id = data.get("session_id", "")

    if not message:
        raise HTTPException(400, "Message is required")
    if not session_id:
        session_id = f"claret-{user_id}-{datetime.now(timezone.utc).strftime('%Y%m%d')}"

    # Get recent chat history for context
    recent = await db.claret_chats.find(
        {"user_id": user_id, "session_id": session_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    recent.reverse()

    # Get KB context
    kb_context = await _get_kb_context(message)

    # Get user's employee info for personalization
    emp = await db.hr_employees.find_one({"user_id": user_id}, {"_id": 0, "full_name": 1, "designation": 1, "department": 1})

    # Build system message with context
    system = CLARET_SYSTEM_PROMPT
    if emp:
        system += f"\n\nCurrent user: {emp.get('full_name', user_name)}, {emp.get('designation','')}, {emp.get('department','')} department."
    if kb_context:
        system += f"\n\nRELEVANT KNOWLEDGE BASE CONTENT:\n{kb_context}"

    # Call Claude via emergentintegrations
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        api_key = os.environ.get("EMERGENT_LLM_KEY", "")
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        # Add history
        for h in recent[-6:]:
            if h.get("role") == "user":
                chat.messages.append({"role": "user", "content": h["message"]})
            elif h.get("role") == "assistant":
                chat.messages.append({"role": "assistant", "content": h.get("raw_response", h["message"])})

        user_msg = UserMessage(text=message)
        response_text = await chat.send_message(user_msg)

        # Parse JSON response
        import json
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                parsed = json.loads(json_match.group())
            else:
                parsed = {"message": response_text, "mood_scores": {}, "suggested_actions": []}
        except json.JSONDecodeError:
            parsed = {"message": response_text, "mood_scores": {}, "suggested_actions": []}

        ai_message = parsed.get("message", response_text)
        mood_scores = parsed.get("mood_scores", {})
        suggested_actions = parsed.get("suggested_actions", [])

    except Exception as e:
        logger.error(f"Claret AI error: {e}")
        ai_message = "Oops, I had a brain freeze! 🧊 Give me a sec and try again, machane."
        mood_scores = {}
        suggested_actions = []
        response_text = ai_message

    # Store user message
    user_chat = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user_name,
        "session_id": session_id,
        "role": "user",
        "message": message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.claret_chats.insert_one(user_chat)

    # Store assistant response
    assistant_chat = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user_name,
        "session_id": session_id,
        "role": "assistant",
        "message": ai_message,
        "raw_response": response_text,
        "mood_scores": mood_scores,
        "suggested_actions": suggested_actions,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.claret_chats.insert_one(assistant_chat)

    # Update daily mood score
    if mood_scores:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        await db.claret_mood_scores.update_one(
            {"user_id": user_id, "date": today},
            {"$set": {
                "user_id": user_id,
                "user_name": user_name,
                "date": today,
                "mood_scores": mood_scores,
                "mood_label": mood_scores.get("mood_label", "Neutral"),
                "overall_score": mood_scores.get("overall_mood", 5),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

    return {
        "message": ai_message,
        "mood_scores": mood_scores,
        "suggested_actions": suggested_actions,
        "session_id": session_id,
    }


@router.get("/chat/history")
async def get_chat_history(
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    limit: int = 50,
):
    """Get chat history. CEO/HR can view any user's chats."""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if session_id:
        query["session_id"] = session_id

    chats = await db.claret_chats.find(query, {"_id": 0, "raw_response": 0}).sort("created_at", -1).to_list(limit)
    chats.reverse()
    return {"chats": chats}


@router.get("/chat/sessions")
async def get_chat_sessions(user_id: Optional[str] = None):
    """Get unique chat sessions for a user or all users (CEO/HR)."""
    pipeline = [
        {"$group": {
            "_id": {"user_id": "$user_id", "session_id": "$session_id"},
            "user_name": {"$first": "$user_name"},
            "first_message": {"$min": "$created_at"},
            "last_message": {"$max": "$created_at"},
            "message_count": {"$sum": 1},
        }},
        {"$sort": {"last_message": -1}},
        {"$limit": 100},
    ]
    if user_id:
        pipeline.insert(0, {"$match": {"user_id": user_id}})

    sessions = await db.claret_chats.aggregate(pipeline).to_list(100)
    return {"sessions": [{
        "user_id": s["_id"]["user_id"],
        "session_id": s["_id"]["session_id"],
        "user_name": s.get("user_name", ""),
        "first_message": s["first_message"],
        "last_message": s["last_message"],
        "message_count": s["message_count"],
    } for s in sessions]}


# ═══════════════════════════════════════════
# MOOD / SENTIMENT DASHBOARD
# ═══════════════════════════════════════════

@router.get("/mood/my-scores")
async def get_my_mood_scores(user_id: str, days: int = 30):
    """Get mood scores for a specific user over time."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    scores = await db.claret_mood_scores.find(
        {"user_id": user_id, "date": {"$gte": cutoff}},
        {"_id": 0}
    ).sort("date", 1).to_list(60)
    return {"scores": scores}


@router.get("/mood/team-overview")
async def get_team_mood_overview():
    """CEO/HR: Get latest mood scores for all users."""
    pipeline = [
        {"$sort": {"date": -1}},
        {"$group": {
            "_id": "$user_id",
            "user_name": {"$first": "$user_name"},
            "latest_date": {"$first": "$date"},
            "mood_label": {"$first": "$mood_label"},
            "overall_score": {"$first": "$overall_score"},
            "mood_scores": {"$first": "$mood_scores"},
        }},
        {"$sort": {"user_name": 1}},
    ]
    overview = await db.claret_mood_scores.aggregate(pipeline).to_list(200)
    return {"team_moods": [{
        "user_id": o["_id"],
        "user_name": o.get("user_name", ""),
        "date": o["latest_date"],
        "mood_label": o.get("mood_label", "Neutral"),
        "overall_score": o.get("overall_score", 5),
        "mood_scores": o.get("mood_scores", {}),
    } for o in overview]}


@router.get("/mood/analytics")
async def get_mood_analytics(days: int = 30):
    """CEO/HR: Aggregate mood analytics across the team."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    scores = await db.claret_mood_scores.find(
        {"date": {"$gte": cutoff}},
        {"_id": 0}
    ).to_list(5000)

    if not scores:
        return {"avg_mood": 5, "mood_distribution": {}, "daily_trend": []}

    # Distribution
    mood_dist = {}
    for s in scores:
        label = s.get("mood_label", "Neutral")
        mood_dist[label] = mood_dist.get(label, 0) + 1

    # Daily average trend
    daily = {}
    for s in scores:
        d = s["date"]
        if d not in daily:
            daily[d] = {"total": 0, "count": 0}
        daily[d]["total"] += s.get("overall_score", 5)
        daily[d]["count"] += 1

    trend = [{"date": d, "avg_score": round(v["total"] / v["count"], 1)} for d, v in sorted(daily.items())]

    avg = sum(s.get("overall_score", 5) for s in scores) / len(scores) if scores else 5

    return {
        "avg_mood": round(avg, 1),
        "mood_distribution": mood_dist,
        "daily_trend": trend,
        "total_interactions": len(scores),
    }


@router.get("/settings")
async def get_claret_settings(user_id: str):
    """Get user's Claret dashboard settings (colors, preferences)."""
    settings = await db.claret_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings:
        settings = {
            "user_id": user_id,
            "theme_color": "#6366f1",
            "accent_color": "#f59e0b",
            "bg_gradient": "from-indigo-500/10 to-purple-500/10",
            "dashboard_layout": "default",
        }
    return settings


@router.put("/settings")
async def update_claret_settings(data: dict = Body(...)):
    """Update user's dashboard settings."""
    user_id = data.pop("user_id", "")
    if not user_id:
        raise HTTPException(400, "user_id required")
    await db.claret_settings.update_one(
        {"user_id": user_id},
        {"$set": {**data, "user_id": user_id, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"message": "Settings updated"}

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

def _build_system_prompt(profile: dict = None, role: str = "", erp_context: str = "") -> str:
    """Build a personalized system prompt based on user's Claret profile."""
    lang = (profile or {}).get("language", "english")
    nickname = (profile or {}).get("nickname", "")
    personality_summary = (profile or {}).get("personality_summary", "")

    lang_instructions = {
        "english": "Respond fully in English. Keep it professional yet friendly.",
        "hinglish": "Respond in Hinglish — mix Hindi and English naturally. Use 'yaar', 'bhai', 'sahi hai', 'kya baat hai', 'accha', 'theek hai' etc. Think how urban Indian professionals talk.",
        "manglish": "Respond in Manglish — mix Malayalam and English naturally. Use 'machane', 'pwoli', 'adipoli', 'seri', 'athe', 'kollaam', 'enthu paranj' etc. Think how Malayali professionals talk in casual settings.",
    }

    user_profile_line = f'USER PROFILE: Call this person "{nickname}". ' if nickname else ''
    personality_line = f'PERSONALITY INSIGHTS: {personality_summary}' if personality_summary else ''
    role_line = f'USER ROLE: {role}. Only discuss modules this role has access to.' if role else ''

    erp_section = ""
    if erp_context:
        erp_section = f"ERP_CONTEXT (real data from the system — use this to answer data questions):\n{erp_context}"

    prompt = f"""You are Claret, the AI assistant for CLT Academy's ERP system called CLT Synapse.

YOUR PERSONALITY:
- You are warm, witty, empathetic, and genuinely caring about people's well-being
- You speak casually but respectfully — like a close, wise friend at work
- You use humor, stories, analogies, and light banter to keep the vibe alive
- You are NEVER preachy — always indirect, through stories, analogies, or humor
- You motivate through friendly competition awareness but in a fun way
- You ask personal questions genuinely — "Hey, you seem quiet today, everything okay?"
- When someone seems down, you lighten the mood first, then subtly check in
- You celebrate small wins enthusiastically

CRITICAL RULES:
- You NEVER say "I don't know", "I'm not sure", "brain freeze", or any variant of being stuck
- You ALWAYS keep the conversation going. If you don't have an immediate answer, you ASK CLARIFYING QUESTIONS
- If a user asks about ERP data (closings, leads, students, commissions, attendance), and you have ERP_CONTEXT below, USE IT to give real numbers
- If the user says "I have X closings but ERP shows Y", compare the data, list the records, and ask which one is missing
- You are CONVERSATIONAL. You guide, you ask, you dig deeper. You never dead-end a conversation
- If you need more info to answer, ASK FOR IT. Example: "Let me check — which month are you looking at?" or "Can you tell me the student's name?"

LANGUAGE:
{lang_instructions.get(lang, lang_instructions["english"])}

{user_profile_line}
{personality_line}
{role_line}

YOUR CAPABILITIES:
- Answer questions about ERP navigation (Sales CRM, HR, Attendance, Commissions, etc.)
- Query and analyze real ERP data when provided in ERP_CONTEXT
- Explain company SOPs, policies, and training materials from the knowledge base
- Summarize documents, give bullet points, explain in simple terms
- Track mood and engagement through natural conversation
- Provide sales coaching, techniques, and objection handling strategies
- Discuss market trends, competition, and industry insights
- Share motivational frameworks and growth mindset strategies

SALES INTELLIGENCE & COACHING:
You are deeply knowledgeable about sales in the forex/trading education industry. When asked about sales skills, competition, or market:

Sales Skills & Techniques:
- SPIN Selling (Situation, Problem, Implication, Need-Payoff)
- Consultative Selling: Understand the prospect's financial goals before pitching
- Objection Handling: Price objection ("too expensive"), trust objection ("is this legit?"), timing ("not the right time"), spouse/family objection
- Closing Techniques: Assumptive close, urgency close, trial close, value stack close
- Follow-up Cadence: Best practices for converting leads to enrollments
- Upselling/Cross-selling: How to pitch upgrades, advanced courses, and mentorship programs

Competition & Market Awareness:
- CLT Academy operates in the online forex/trading education space
- Key competitors include IM Academy, Forex Academy, Babypips, TradingView Academy, and numerous local institutes
- CLT's differentiators: personalized mentorship, live trading sessions, structured curriculum from basics to advanced, community support, and career transition programs
- Market trends: Growing demand for financial literacy, retail trading boom post-COVID, increasing regulatory scrutiny on trading education providers, shift toward hybrid (online+offline) learning, AI-powered trading tools
- Global economic factors: Interest rate environments, geopolitical tensions, cryptocurrency market dynamics, commodity price shifts — all drive interest in financial education

Industry Insights:
- Middle East market is growing rapidly in fintech and trading education
- UAE specifically has favorable regulations for trading education businesses
- Key demographics: 25-45 year olds, aspiring traders, career changers, passive income seekers
- Common student journey: Curiosity → Free webinar → Paid course → Advanced mentorship → Independent trading

When discussing these topics, be specific, data-driven, and actionable. Don't give generic advice — give CLT-specific strategies that the team can use TODAY.

MOOD ASSESSMENT (do this subtly, never announce it):
After each exchange, internally assess the user's mood on a 1-10 scale across:
- energy_level (1=exhausted, 10=pumped up)
- stress_level (1=zen, 10=overwhelmed)
- motivation (1=checked out, 10=on fire)
- happiness (1=very sad, 10=euphoric)
- overall_mood (1=terrible, 10=amazing)
Include a mood_label: one of [Excited, Happy, Motivated, Calm, Neutral, Tired, Anxious, Stressed, Sad, Frustrated, Overwhelmed]

{erp_section}

RESPONSE FORMAT:
Always return a JSON object (no markdown wrapping):
{{
  "message": "your response text here",
  "mood_scores": {{
    "energy_level": 7,
    "stress_level": 3,
    "motivation": 8,
    "happiness": 7,
    "overall_mood": 7,
    "mood_label": "Motivated"
  }},
  "suggested_actions": ["optional array of suggested follow-up actions"],
  "needs_erp_lookup": false
}}

If the user is asking about ERP data and you DON'T have ERP_CONTEXT yet, set "needs_erp_lookup" to true and include "erp_query_type" (one of: "leads", "students", "commissions", "attendance", "upgrades", "enrollments") and "erp_query_hint" (what to search for). Example:
{{
  "message": "Let me pull up your numbers real quick...",
  "needs_erp_lookup": true,
  "erp_query_type": "leads",
  "erp_query_hint": "user closings this month",
  "mood_scores": {{ ... }}
}}
"""
    return prompt


# Role -> accessible ERP modules mapping
ROLE_ERP_ACCESS = {
    "super_admin": ["leads", "students", "commissions", "attendance", "upgrades", "enrollments", "hr", "finance"],
    "admin": ["leads", "students", "commissions", "attendance", "upgrades", "enrollments", "hr"],
    "ceo": ["leads", "students", "commissions", "attendance", "upgrades", "enrollments", "hr", "finance"],
    "hr": ["attendance", "hr", "students"],
    "cs_head": ["students", "upgrades", "commissions"],
    "cs_agent": ["students", "upgrades"],
    "sales_head": ["leads", "commissions", "enrollments"],
    "team_leader": ["leads", "commissions", "enrollments"],
    "sales_executive": ["leads", "commissions"],
    "mentor": ["students", "leads"],
    "master_of_academics": ["students", "leads", "commissions"],
    "operations": ["students", "enrollments"],
}


ONBOARDING_QUESTIONS = {
    "english": {
        "mcq": [
            {"q": "What drives you most at work?", "options": ["Achievement & Goals", "Learning New Things", "Team & Collaboration", "Recognition & Praise", "Financial Growth"]},
            {"q": "How do you handle pressure?", "options": ["Take a short break", "Push through it", "Talk to someone", "Plan & prioritize", "Music or distraction"]},
            {"q": "What's your ideal work style?", "options": ["Independent & focused", "Team brainstorming", "A healthy mix", "Flexible hours", "Structured routine"]},
            {"q": "When you feel low, what helps most?", "options": ["Talking to a friend", "Music or entertainment", "Exercise or a walk", "Good food", "Just need time alone"]},
            {"q": "What kind of motivation works best for you?", "options": ["Friendly competition", "Words of encouragement", "Seeing real data/progress", "Freedom & autonomy", "Public recognition"]},
            {"q": "How do you prefer feedback?", "options": ["Direct and honest", "Gentle and supportive", "Through examples", "Written so I can reflect", "One-on-one privately"]},
            {"q": "What describes your energy pattern?", "options": ["Morning person - peak early", "Afternoon warrior", "Night owl - peak late", "Consistent all day", "Depends on my mood"]},
        ],
        "open": [
            {"q": "What's one thing that always makes your day better?"},
            {"q": "What's your personal motto or mantra that keeps you going?"},
            {"q": "If you could describe yourself in 3 words, what would they be?"},
        ],
    },
    "hinglish": {
        "mcq": [
            {"q": "Kaam mein aapko sabse zyada kya drive karta hai?", "options": ["Achievement & Goals", "Naya seekhna", "Team & Collaboration", "Recognition & Tareef", "Paisa & Growth"]},
            {"q": "Pressure mein aap kya karte ho?", "options": ["Thoda break le leta hoon", "Push through karta hoon", "Kisi se baat karta hoon", "Plan banata hoon", "Music ya distraction"]},
            {"q": "Aapka ideal kaam karne ka style kya hai?", "options": ["Akele focused", "Team brainstorming", "Mix of both", "Flexible timing", "Fixed routine"]},
            {"q": "Jab mood down ho toh kya karte ho?", "options": ["Dost se baat", "Music sun leta hoon", "Walk ya exercise", "Accha khana", "Akele time chahiye"]},
            {"q": "Kaunsa motivation aapke liye best kaam karta hai?", "options": ["Friendly competition", "Encouragement ke words", "Data aur progress dekhna", "Apni marzi se kaam", "Public recognition"]},
            {"q": "Feedback kaise prefer karte ho?", "options": ["Seedha aur honest", "Gentle aur supportive", "Examples ke saath", "Likhit mein", "Private mein one-on-one"]},
            {"q": "Aapka energy pattern kaisa hai?", "options": ["Subah active", "Dopahar mein peak", "Raat ko best kaam", "Din bhar consistent", "Mood pe depend karta hai"]},
        ],
        "open": [
            {"q": "Ek cheez bataiye jo aapka din hamesha accha bana deti hai?"},
            {"q": "Aapka personal motto ya mantra kya hai jo aapko chalte rakhta hai?"},
            {"q": "Agar aap apne aap ko 3 shabdon mein describe karein toh woh kya honge?"},
        ],
    },
    "manglish": {
        "mcq": [
            {"q": "Work-il ninnaye eath aanu ettavum drive cheyyunnathu?", "options": ["Achievement & Goals", "Puthuya kaaryangal padikkal", "Team & Collaboration", "Recognition & Praise", "Financial Growth"]},
            {"q": "Pressure varubol eath aanu cheyyuka?", "options": ["Oru cheriya break edukum", "Push through cheyyum", "Aarenkilum kaarayude talk cheyyum", "Plan undaakkum", "Music or distraction"]},
            {"q": "Ningalude ideal work style eath aanu?", "options": ["Independent & focused", "Team brainstorming", "Randum koodi oru mix", "Flexible time", "Fixed routine"]},
            {"q": "Mood down aakumbol eath help cheyyum?", "options": ["Koottukaaran koode samsaarikkal", "Music/entertainment", "Walk or exercise", "Nalla food", "Thaniye irikkanam"]},
            {"q": "Eath type motivation aanu ningalkku best work cheyyunnathu?", "options": ["Friendly competition", "Encouraging words", "Real data & progress kaanunnathu", "Freedom & autonomy", "Public recognition"]},
            {"q": "Feedback engane aanu prefer cheyyunnathu?", "options": ["Direct and honest", "Gentle aayittu", "Examples koode", "Ezhuthi tharunnathu", "Private-aayittu one-on-one"]},
            {"q": "Ningalude energy pattern engane aanu?", "options": ["Morning person - raavile active", "Uchakku sheriyaakum", "Raathri aanu peak", "Full day consistent", "Mood-ine depend cheyyum"]},
        ],
        "open": [
            {"q": "Oru kaaryam paranju thaa, ath eppozhum ningalude divasam nannayaakkum?"},
            {"q": "Ningalude personal motto or mantra eath aanu?"},
            {"q": "3 vaakkil ningale describe cheythaal eath aayirikkum?"},
        ],
    },
}

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
    """Main chat endpoint. Sends user message to Claude with personalized context."""
    user_id = data.get("user_id", "")
    user_name = data.get("user_name", "")
    user_role = data.get("user_role", "")
    message = data.get("message", "").strip()
    session_id = data.get("session_id", "")

    if not message:
        raise HTTPException(400, "Message is required")
    if not session_id:
        session_id = f"claret-{user_id}-{datetime.now(timezone.utc).strftime('%Y%m%d')}"

    # Get user's Claret profile for personalization
    profile = await db.claret_profiles.find_one({"user_id": user_id}, {"_id": 0})

    # Get recent chat history for context
    recent = await db.claret_chats.find(
        {"user_id": user_id, "session_id": session_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    recent.reverse()

    # Get KB context
    kb_context = await _get_kb_context(message)

    # Get competitive intelligence context if question relates to competition/market
    comp_context = ""
    comp_keywords = ["competitor", "competition", "better than", "compare", "versus", "vs", "market", "trend", "delta trading", "fundfloat", "mithun", "stellar", "james trading", "moneytize", "pricing", "their course", "other academy", "sell better", "how to sell", "objection", "differentiat"]
    if any(kw in message.lower() for kw in comp_keywords):
        try:
            import competitor_intel
            comp_context = await competitor_intel.get_competitive_context(message)
        except Exception as e:
            logger.warning(f"Competitor context error: {e}")

    # Get user's employee info for personalization
    emp = await db.hr_employees.find_one({"user_id": user_id}, {"_id": 0, "full_name": 1, "designation": 1, "department": 1})

    # Check if message seems like an ERP data question — do a pre-emptive lookup
    erp_context = ""
    data_keywords = ["closing", "lead", "student", "commission", "attendance", "upgrade", "enrollment", "number", "count", "how many", "list", "show me", "my data", "report", "total", "sales", "target"]
    if any(kw in message.lower() for kw in data_keywords):
        # Determine query type from message
        query_type = "leads"  # default
        if any(w in message.lower() for w in ["student", "cs", "kanban", "stage"]):
            query_type = "students"
        elif any(w in message.lower() for w in ["commission", "earning"]):
            query_type = "commissions"
        elif any(w in message.lower() for w in ["attendance", "punch", "late"]):
            query_type = "attendance"
        elif any(w in message.lower() for w in ["upgrade"]):
            query_type = "upgrades"
        elif any(w in message.lower() for w in ["enrollment", "enrol"]):
            query_type = "enrollments"
        erp_context = await _query_erp_data(user_id, user_role or "sales_executive", query_type, message)

    # Build personalized system prompt
    system = _build_system_prompt(profile=profile, role=user_role, erp_context=erp_context)
    if emp:
        system += f"\n\nCurrent user: {emp.get('full_name', user_name)}, {emp.get('designation','')}, {emp.get('department','')} department."
    if kb_context:
        system += f"\n\nRELEVANT KNOWLEDGE BASE CONTENT:\n{kb_context}"
    if comp_context:
        system += f"\n\n{comp_context}\n\nUse this real competitor data to give specific, actionable advice. Compare CLT's strengths against these competitors when relevant."

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

        # If AI flagged it needs ERP data and we didn't provide it, do a second pass
        if parsed.get("needs_erp_lookup") and not erp_context:
            qt = parsed.get("erp_query_type", "leads")
            qh = parsed.get("erp_query_hint", message)
            erp_data = await _query_erp_data(user_id, user_role or "sales_executive", qt, qh)
            if erp_data and "[Error" not in erp_data:
                # Second call with ERP data
                system2 = _build_system_prompt(profile=profile, role=user_role, erp_context=erp_data)
                chat2 = LlmChat(
                    api_key=api_key,
                    session_id=session_id + "-erp",
                    system_message=system2,
                ).with_model("anthropic", "claude-sonnet-4-5-20250929")
                chat2.messages.append({"role": "user", "content": message})
                response_text2 = await chat2.send_message(UserMessage(text=f"Here is the ERP data you requested:\n{erp_data}\n\nNow answer the user's question: {message}"))
                try:
                    json_match2 = re.search(r'\{[\s\S]*\}', response_text2)
                    if json_match2:
                        parsed2 = json.loads(json_match2.group())
                        ai_message = parsed2.get("message", response_text2)
                        mood_scores = parsed2.get("mood_scores", mood_scores)
                        suggested_actions = parsed2.get("suggested_actions", suggested_actions)
                        response_text = response_text2
                except:
                    pass

    except Exception as e:
        logger.error(f"Claret AI error: {e}")
        lang = (profile or {}).get("language", "english")
        if lang == "hinglish":
            ai_message = "Arre yaar, thoda technical issue aa gaya! Ek baar aur try karo, main ready hoon! 💪"
        elif lang == "manglish":
            ai_message = "Machane, oru cheriya technical issue vannu! Onnu koodi try cheytho, njan ready aanu! 💪"
        else:
            ai_message = "Hey, hit a small technical snag! Give me one more try — I'm ready to help! 💪"
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


# ═══════════════════════════════════════════
# CLARET PROFILE (ONBOARDING)
# ═══════════════════════════════════════════

@router.get("/profile")
async def get_claret_profile(user_id: str):
    """Get user's Claret profile. Returns null if not set up."""
    profile = await db.claret_profiles.find_one({"user_id": user_id}, {"_id": 0})
    return {"profile": profile}


@router.post("/profile")
async def save_claret_profile(data: dict = Body(...)):
    """Save or update user's Claret onboarding profile."""
    user_id = data.get("user_id", "")
    if not user_id:
        raise HTTPException(400, "user_id required")

    answers = data.get("answers", {})
    language = data.get("language", "english")

    # Build personality summary from answers
    mcq_answers = answers.get("mcq", [])
    open_answers = answers.get("open", [])
    summary_parts = []
    for i, ans in enumerate(mcq_answers):
        summary_parts.append(f"Q{i+1}: {ans}")
    for i, ans in enumerate(open_answers):
        if ans.strip():
            summary_parts.append(f"Open{i+1}: {ans}")
    personality_summary = "; ".join(summary_parts)

    profile = {
        "user_id": user_id,
        "name": data.get("name", ""),
        "nickname": data.get("nickname", ""),
        "language": language,
        "answers": answers,
        "personality_summary": personality_summary,
        "motivation_frequency": data.get("motivation_frequency", "sometimes"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.claret_profiles.update_one(
        {"user_id": user_id},
        {"$set": profile},
        upsert=True,
    )

    return {"message": "Profile saved", "profile": profile}


@router.get("/onboarding-questions")
async def get_onboarding_questions(language: str = "english"):
    """Get personality questions in the specified language."""
    lang = language.lower()
    questions = ONBOARDING_QUESTIONS.get(lang, ONBOARDING_QUESTIONS["english"])
    return {"questions": questions, "language": lang}


# ═══════════════════════════════════════════
# ERP DATA QUERY (for Claret intelligence)
# ═══════════════════════════════════════════

async def _query_erp_data(user_id: str, role: str, query_type: str, query_hint: str = "") -> str:
    """Query ERP data based on user's role and question context. Returns a text summary."""
    allowed = ROLE_ERP_ACCESS.get(role, [])
    if query_type not in allowed:
        return f"[You don't have access to {query_type} data]"

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    results = []

    try:
        if query_type == "leads":
            # Get user's leads/closings for current month
            query = {"assigned_to": user_id, "created_at": {"$gte": month_start}}
            if role in ("super_admin", "admin", "ceo", "sales_head"):
                query = {"created_at": {"$gte": month_start}}
            leads = await db.leads.find(query, {"_id": 0, "full_name": 1, "status": 1, "pipeline_stage": 1, "amount": 1, "created_at": 1}).to_list(200)
            closed = [l for l in leads if l.get("pipeline_stage") in ("enrolled", "closed_won")]
            results.append(f"Total leads this month: {len(leads)}")
            results.append(f"Closings (enrolled): {len(closed)}")
            if closed:
                results.append("Closed leads list:")
                for i, ld in enumerate(closed[:50], 1):
                    results.append(f"  {i}. {ld.get('full_name', 'Unknown')} - AED {ld.get('amount', 0)}")

        elif query_type == "students":
            query = {}
            if role in ("cs_agent",):
                query["cs_agent_id"] = user_id
            students = await db.students.find(query, {"_id": 0, "full_name": 1, "stage": 1, "enrollment_amount": 1, "phone": 1}).to_list(500)
            stage_counts = {}
            for s in students:
                stage = s.get("stage", "unknown")
                stage_counts[stage] = stage_counts.get(stage, 0) + 1
            results.append(f"Total students: {len(students)}")
            for stage, count in sorted(stage_counts.items(), key=lambda x: -x[1]):
                results.append(f"  {stage}: {count}")

        elif query_type == "commissions":
            results.append("Commission data — please check the Commission Dashboard for detailed breakdowns.")

        elif query_type == "attendance":
            from datetime import date
            today = date.today().isoformat()
            att = await db.attendance.find({"user_id": user_id, "date": today}, {"_id": 0}).to_list(5)
            if att:
                a = att[0]
                results.append(f"Today's attendance: Punch in {a.get('punch_in', 'N/A')}, Punch out {a.get('punch_out', 'N/A')}")
            else:
                results.append("No attendance record found for today.")

        elif query_type == "upgrades":
            query = {}
            if role in ("cs_agent",):
                query["cs_agent_id"] = user_id
            ups = await db.cs_upgrades.find(query, {"_id": 0, "student_name": 1, "upgrade_amount": 1, "upgrade_date": 1}).sort("upgrade_date", -1).to_list(50)
            results.append(f"Total upgrades: {len(ups)}")
            for u in ups[:20]:
                results.append(f"  - {u.get('student_name', '?')}: AED {u.get('upgrade_amount', 0)} on {u.get('upgrade_date', '?')}")

        elif query_type == "enrollments":
            enrolled = await db.leads.find(
                {"pipeline_stage": "enrolled", "assigned_to": user_id} if role not in ("super_admin", "admin", "ceo") else {"pipeline_stage": "enrolled"},
                {"_id": 0, "full_name": 1, "amount": 1, "enrollment_date": 1}
            ).sort("enrollment_date", -1).to_list(50)
            results.append(f"Total enrollments: {len(enrolled)}")
            for e in enrolled[:20]:
                results.append(f"  - {e.get('full_name', '?')}: AED {e.get('amount', 0)}")

    except Exception as e:
        logger.error(f"ERP query error: {e}")
        results.append(f"[Error querying {query_type} data]")

    return "\n".join(results) if results else f"No {query_type} data found."

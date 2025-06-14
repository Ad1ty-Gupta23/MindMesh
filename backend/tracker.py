from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from groq import Groq
import json
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Initialize Firebase (uncomment when you have Firebase credentials)
# cred = credentials.Certificate("path/to/serviceAccountKey.json")
# firebase_admin.initialize_app(cred)
# db = firestore.client()

class FocusSession(BaseModel):
    user_id: str
    focus_level: float
    blink_rate: int
    typing_speed: float
    mouse_activity: float
    session_duration: int
    keystrokes: int
    mouse_clicks: int

class AIAnalysisRequest(BaseModel):
    session_data: FocusSession
    recent_sessions: Optional[List[dict]] = []

class AIResponse(BaseModel):
    suggestions: List[dict]
    insights: str
    next_action: str
    xp_bonus: int

def analyze_focus_with_ai(session_data: FocusSession, recent_sessions: List[dict] = []):
    """Analyze focus session data using Groq AI"""
    
    # Prepare context for AI
    context = f"""
    User Focus Session Analysis:
    - Current focus level: {session_data.focus_level}%
    - Blink rate: {session_data.blink_rate} blinks/min (normal: 12-20)
    - Typing speed activity: {session_data.typing_speed}%
    - Mouse activity: {session_data.mouse_activity}%
    - Session duration: {session_data.session_duration} seconds
    - Total keystrokes: {session_data.keystrokes}
    - Mouse clicks: {session_data.mouse_clicks}
    
    Recent session count: {len(recent_sessions)}
    """
    
    prompt = f"""
    As an AI focus and productivity coach, analyze this user's work session data:
    
    {context}
    
    Based on this data, provide:
    1. Current focus assessment (good/moderate/poor)
    2. Specific actionable suggestions (max 2)
    3. Whether they should take a break or continue working
    4. A brief insight about their productivity pattern
    
    Respond in JSON format with:
    {{
        "focus_assessment": "good/moderate/poor",
        "suggestions": [
            {{
                "type": "break/focus_sprint/technique",
                "message": "specific suggestion",
                "duration_minutes": 5-25
            }}
        ],
        "next_action": "take_break/continue_working/try_technique",
        "insight": "brief productivity insight",
        "xp_bonus": 0-10
    }}
    """
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert focus and productivity coach who analyzes work session data to provide personalized recommendations."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama3-8b-8192",
            temperature=0.3,
            max_tokens=500
        )
        
        response_text = chat_completion.choices[0].message.content
        
        # Parse JSON response
        try:
            ai_analysis = json.loads(response_text)
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            ai_analysis = {
                "focus_assessment": "moderate",
                "suggestions": [{
                    "type": "break",
                    "message": "Consider taking a short break to refresh your focus.",
                    "duration_minutes": 5
                }],
                "next_action": "take_break",
                "insight": "Keep up the good work! Regular breaks help maintain productivity.",
                "xp_bonus": 2
            }
        
        return ai_analysis
        
    except Exception as e:
        print(f"Error with Groq API: {e}")
        # Fallback response
        return {
            "focus_assessment": "moderate",
            "suggestions": [{
                "type": "break",
                "message": "AI analysis temporarily unavailable. Consider a 5-minute break.",
                "duration_minutes": 5
            }],
            "next_action": "take_break",
            "insight": "Regular monitoring helps improve focus over time.",
            "xp_bonus": 1
        }

@app.post("/analyze-session")
async def analyze_session(request: AIAnalysisRequest):
    """Analyze a focus session and provide AI-powered insights"""
    
    try:
        # Get AI analysis
        ai_analysis = analyze_focus_with_ai(request.session_data, request.recent_sessions)
        
        # Save session to Firebase (uncomment when Firebase is configured)
        # session_doc = {
        #     "user_id": request.session_data.user_id,
        #     "focus_level": request.session_data.focus_level,
        #     "blink_rate": request.session_data.blink_rate,
        #     "typing_speed": request.session_data.typing_speed,
        #     "mouse_activity": request.session_data.mouse_activity,
        #     "session_duration": request.session_data.session_duration,
        #     "keystrokes": request.session_data.keystrokes,
        #     "mouse_clicks": request.session_data.mouse_clicks,
        #     "ai_assessment": ai_analysis["focus_assessment"],
        #     "timestamp": datetime.now().isoformat(),
        #     "xp_earned": ai_analysis["xp_bonus"]
        # }
        # 
        # db.collection("focus_sessions").add(session_doc)
        
        return {
            "status": "success",
            "analysis": ai_analysis,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/save-session")
async def save_session(session: FocusSession):
    """Save a completed focus session"""
    
    try:
        # Calculate XP based on session quality
        base_xp = max(1, session.session_duration // 60)  # 1 XP per minute
        focus_bonus = session.focus_level // 20  # Bonus for high focus
        total_xp = base_xp + focus_bonus
        
        # Save to Firebase (uncomment when configured)
        # session_doc = {
        #     "user_id": session.user_id,
        #     "focus_level": session.focus_level,
        #     "session_duration": session.session_duration,
        #     "keystrokes": session.keystrokes,
        #     "mouse_clicks": session.mouse_clicks,
        #     "xp_earned": total_xp,
        #     "timestamp": datetime.now().isoformat()
        # }
        # 
        # db.collection("focus_sessions").add(session_doc)
        # 
        # # Update user XP
        # user_ref = db.collection("users").document(session.user_id)
        # user_ref.update({
        #     "xpPoints": firestore.Increment(total_xp),
        #     "totalFocusTime": firestore.Increment(session.session_duration)
        # })
        
        return {
            "status": "success",
            "xp_earned": total_xp,
            "message": f"Session saved! You earned {total_xp} XP.",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save session: {str(e)}")

@app.get("/focus-tips")
async def get_focus_tips():
    """Get AI-generated focus and productivity tips"""
    
    prompt = """
    Generate 3 practical focus and productivity tips for someone working on a computer.
    Each tip should be actionable and brief.
    
    Respond in JSON format:
    {
        "tips": [
            {
                "title": "tip title",
                "description": "tip description",
                "duration_minutes": 1-5
            }
        ]
    }
    """
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a productivity expert providing quick, actionable tips."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama3-8b-8192",
            temperature=0.7,
            max_tokens=300
        )
        
        response_text = chat_completion.choices[0].message.content
        tips_data = json.loads(response_text)
        
        return {
            "status": "success",
            "tips": tips_data["tips"],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        # Fallback tips
        return {
            "status": "success",
            "tips": [
                {
                    "title": "20-20-20 Rule",
                    "description": "Every 20 minutes, look at something 20 feet away for 20 seconds.",
                    "duration_minutes": 1
                },
                {
                    "title": "Pomodoro Technique",
                    "description": "Work for 25 minutes, then take a 5-minute break.",
                    "duration_minutes": 25
                },
                {
                    "title": "Deep Breathing",
                    "description": "Take 3 deep breaths to reset your focus when distracted.",
                    "duration_minutes": 1
                }
            ],
            "timestamp": datetime.now().isoformat()
        }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
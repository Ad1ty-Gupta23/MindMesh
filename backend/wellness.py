from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from datetime import datetime, timedelta
import asyncio
from groq import Groq
import uvicorn
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="AI Mental Wellness Chat API", version="1.0.0")

# Enhanced CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize Groq client with error handling
try:
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", "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"))
    logger.info("Groq client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Groq client: {e}")
    groq_client = None

# Pydantic models
class EmotionData(BaseModel):
    emotion: str
    intensity: int  # 1-10
    timestamp: str
    notes: Optional[str] = None

class UserState(BaseModel):
    user_id: str
    current_mood: str
    xp_points: int
    streak_days: int
    last_activity: str

class ChatMessage(BaseModel):
    message: str
    user_state: UserState
    emotion_history: List[EmotionData] = []

class WellnessTip(BaseModel):
    type: str  # meditation, journaling, break, exercise
    title: str
    description: str
    duration_minutes: int

# AI Personality and System Prompts
WELLNESS_AI_PERSONALITY = """
You are Luna, an empathetic AI mental wellness companion. Your role is to:

1. Provide emotional support and understanding
2. Suggest personalized wellness activities based on user's mood and emotions
3. Offer gentle motivation without being pushy
4. Help users reflect on their emotions and progress
5. Give practical, actionable advice for mental wellness

Your tone should be:
- Warm and caring
- Understanding and non-judgmental  
- Encouraging but realistic
- Professional yet friendly
- Adaptive to the user's emotional state

Keep responses concise but meaningful (2-4 sentences). Focus on being helpful and supportive based on the user's current emotional state.
"""

def analyze_emotion_trends(emotion_history: List[EmotionData]) -> Dict[str, Any]:
    """Analyze user's emotion patterns with better error handling"""
    if not emotion_history:
        return {
            "trend": "neutral", 
            "dominant_emotion": "unknown", 
            "avg_intensity": 5.0,
            "total_entries": 0
        }
    
    try:
        recent_emotions = emotion_history[-7:]  # Last 7 entries
        emotions = [e.emotion for e in recent_emotions if e.emotion]
        intensities = [e.intensity for e in recent_emotions if e.intensity is not None]
        
        # Find dominant emotion
        if emotions:
            emotion_counts = {}
            for emotion in emotions:
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            dominant_emotion = max(emotion_counts, key=emotion_counts.get)
        else:
            dominant_emotion = "unknown"
        
        avg_intensity = sum(intensities) / len(intensities) if intensities else 5.0
        
        # Determine trend
        if avg_intensity >= 7:
            trend = "positive"
        elif avg_intensity <= 4:
            trend = "concerning"
        else:
            trend = "neutral"
        
        return {
            "trend": trend,
            "dominant_emotion": dominant_emotion,
            "avg_intensity": round(avg_intensity, 1),
            "total_entries": len(emotion_history)
        }
    except Exception as e:
        logger.error(f"Error analyzing emotions: {e}")
        return {
            "trend": "neutral", 
            "dominant_emotion": "unknown", 
            "avg_intensity": 5.0,
            "total_entries": len(emotion_history) if emotion_history else 0
        }

def generate_wellness_tips(user_state: UserState, emotion_analysis: Dict) -> List[WellnessTip]:
    """Generate personalized wellness tips based on user state"""
    tips = []
    
    try:
        mood = user_state.current_mood.lower() if user_state.current_mood else "neutral"
        trend = emotion_analysis.get("trend", "neutral")
        avg_intensity = emotion_analysis.get("avg_intensity", 5.0)
        
        if trend == "concerning" or avg_intensity < 4:
            tips.extend([
                WellnessTip(
                    type="meditation",
                    title="Gentle Breathing Exercise",
                    description="Take 5 minutes for deep breathing. Inhale for 4, hold for 4, exhale for 6.",
                    duration_minutes=5
                ),
                WellnessTip(
                    type="journaling",
                    title="Emotion Check-in",
                    description="Write about what you're feeling right now. No judgment, just awareness.",
                    duration_minutes=10
                )
            ])
        
        if any(word in mood for word in ["stress", "anxious", "worried", "overwhelmed"]):
            tips.append(WellnessTip(
                type="break",
                title="Progressive Muscle Relaxation",
                description="Tense and release each muscle group for 5 seconds, starting from your toes.",
                duration_minutes=15
            ))
        
        if any(word in mood for word in ["happy", "excited", "energetic", "positive"]):
            tips.append(WellnessTip(
                type="exercise",
                title="Energy Channel Activity",
                description="Use this positive energy! Try a short walk, dance, or creative activity.",
                duration_minutes=20
            ))
        
        if not tips:  # Default tips
            tips.extend([
                WellnessTip(
                    type="meditation",
                    title="Mindful Moment",
                    description="Take 3 deep breaths and notice 3 things you can see, hear, and feel.",
                    duration_minutes=3
                ),
                WellnessTip(
                    type="journaling",
                    title="Gratitude Practice",
                    description="Write down 3 things you're grateful for today, no matter how small.",
                    duration_minutes=5
                )
            ])
        
        return tips[:3]  # Limit to 3 tips
        
    except Exception as e:
        logger.error(f"Error generating wellness tips: {e}")
        return [
            WellnessTip(
                type="meditation",
                title="Simple Breathing",
                description="Take a moment to breathe deeply and center yourself.",
                duration_minutes=3
            )
        ]

async def get_ai_response(message: str, user_state: UserState, emotion_history: List[EmotionData]) -> str:
    """Get AI response using Groq API with better error handling"""
    try:
        if not groq_client:
            return "I'm here to support you! While my AI features are temporarily unavailable, I want you to know that your feelings are valid. How can I help you process what you're experiencing? 💜"
        
        emotion_analysis = analyze_emotion_trends(emotion_history)
        
        # Build context more safely
        context_parts = [
            f"User Message: {message}",
            f"Current Mood: {user_state.current_mood if user_state.current_mood else 'Not specified'}",
        ]
        
        if emotion_analysis.get("total_entries", 0) > 0:
            context_parts.extend([
                f"Emotion Trend: {emotion_analysis.get('trend', 'neutral')}",
                f"Recent Dominant Emotion: {emotion_analysis.get('dominant_emotion', 'unknown')}",
                f"Average Intensity: {emotion_analysis.get('avg_intensity', 5.0)}/10"
            ])
        
        context = "\n".join(context_parts)
        
        messages = [
            {"role": "system", "content": WELLNESS_AI_PERSONALITY},
            {"role": "user", "content": context}
        ]
        
        completion = groq_client.chat.completions.create(
            model="llama3-8b-8192",
            messages=messages,
            temperature=0.7,
            max_tokens=300
        )
        
        return completion.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"Error getting AI response: {e}")
        return "I'm here to support you! While I'm having a small technical hiccup, I want you to know that your feelings matter. Take a deep breath - you're doing great by reaching out. 💜"

# API Endpoints

@app.get("/")
async def root():
    return {
        "message": "AI Mental Wellness Chat API", 
        "status": "active",
        "version": "1.0.0",
        "groq_available": groq_client is not None
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "groq_api": groq_client is not None
        }
    }

@app.post("/chat")
async def chat_with_ai(chat_data: ChatMessage):
    """Main chat endpoint - simplified and focused"""
    try:
        logger.info(f"Chat request from user: {chat_data.user_state.user_id}")
        
        # Get AI response
        ai_response = await get_ai_response(
            chat_data.message, 
            chat_data.user_state, 
            chat_data.emotion_history
        )
        
        # Generate wellness tips
        emotion_analysis = analyze_emotion_trends(chat_data.emotion_history)
        wellness_tips = generate_wellness_tips(chat_data.user_state, emotion_analysis)
        
        response = {
            "ai_response": ai_response,
            "wellness_tips": wellness_tips,
            "emotion_analysis": emotion_analysis,
            "timestamp": datetime.now().isoformat(),
            "success": True
        }
        
        logger.info(f"Chat response sent successfully to user: {chat_data.user_state.user_id}")
        return response
        
    except Exception as e:
        logger.error(f"Error processing chat: {str(e)}")
        return {
            "ai_response": "I'm here to support you, even though I'm experiencing some technical difficulties. Your mental wellness journey matters, and I encourage you to keep taking care of yourself. 💜",
            "wellness_tips": [
                WellnessTip(
                    type="meditation",
                    title="Simple Breathing",
                    description="Take 3 deep breaths to center yourself right now.",
                    duration_minutes=2
                )
            ],
            "emotion_analysis": {
                "trend": "neutral",
                "dominant_emotion": "unknown",
                "avg_intensity": 5.0,
                "total_entries": 0
            },
            "timestamp": datetime.now().isoformat(),
            "success": False,
            "error": "Technical issue occurred"
        }

# Simple endpoints for testing (no data persistence)
@app.post("/emotions")
async def log_emotion_simple(emotion: EmotionData):
    """Simple emotion logging endpoint (no persistence)"""
    try:
        logger.info(f"Emotion logged: {emotion.emotion} with intensity {emotion.intensity}")
        return {
            "message": "Emotion received successfully",
            "timestamp": datetime.now().isoformat(),
            "success": True
        }
    except Exception as e:
        logger.error(f"Error processing emotion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing emotion: {str(e)}")

# Handle CORS preflight requests
@app.options("/{full_path:path}")
async def options_handler():
    """Handle CORS preflight requests"""
    return {"message": "OK"}

if __name__ == "__main__":
    print("🌟 Starting AI Mental Wellness Chat API on port 8001...")
    print("💜 Groq API Key Status:", "✅ Available" if groq_client else "❌ Missing/Invalid")
    print("🔗 API Documentation: http://localhost:8001/docs")
    print("📊 Health Check: http://localhost:8001/health")
    print("💡 Focus: Personalized AI Chat Responses Only")
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
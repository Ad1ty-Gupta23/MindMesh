from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any  # Added Any import
import numpy as np
import httpx
import os
import json

app = FastAPI(title="Mood Timeline AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq API configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Data models
class MoodData(BaseModel):
    date: str
    emotion: str
    intensity: Optional[int] = 5

class SleepData(BaseModel):
    date: str
    hours: float
    quality: str

class FocusData(BaseModel):
    date: str
    score: float

class InsightRequest(BaseModel):
    moodData: List[MoodData]
    sleepData: Optional[List[SleepData]] = []
    focusData: Optional[List[FocusData]] = []

class PredictionResponse(BaseModel):
    moodTrend: str
    prediction: Dict[str, Any]  # Fixed: changed 'any' to 'Any'
    recommendations: List[str]
    correlations: Dict[str, float]

# Utility functions
def mood_to_score(emotion: str) -> int:
    mood_scores = {
        'angry': 2, 'sad': 3, 'anxious': 4, 'stressed': 3, 'tired': 4,
        'neutral': 5, 'calm': 7, 'happy': 8, 'excited': 9, 'joyful': 9
    }
    return mood_scores.get(emotion.lower(), 5)

def calculate_correlation(x: List[float], y: List[float]) -> float:
    if len(x) < 2 or len(y) < 2:
        return 0.0
    min_len = min(len(x), len(y))
    x, y = x[:min_len], y[:min_len]
    if len(set(x)) == 1 or len(set(y)) == 1:
        return 0.0
    correlation = np.corrcoef(x, y)[0, 1]
    return correlation if not np.isnan(correlation) else 0.0

def predict_mood(mood_scores: List[int]) -> tuple:
    if len(mood_scores) < 2:
        return "neutral", 0.5
    
    # Simple trend analysis
    recent = np.mean(mood_scores[-2:])
    overall = np.mean(mood_scores)
    
    if recent > overall + 0.5:
        return "happy", 0.7
    elif recent < overall - 0.5:
        return "sad", 0.7
    else:
        return "calm", 0.6

async def get_groq_insights(mood_data: List[MoodData], sleep_data: List[SleepData], focus_data: List[FocusData]) -> Dict:
    # Prepare summary
    mood_scores = [mood_to_score(m.emotion) for m in mood_data]
    avg_mood = np.mean(mood_scores)
    
    summary = f"""
    Mood Data: {len(mood_data)} entries, Average: {avg_mood:.1f}/10
    Recent moods: {[m.emotion for m in mood_data[-3:]]}
    Sleep entries: {len(sleep_data)}
    Focus entries: {len(focus_data)}
    """
    
    prompt = f"""Analyze this wellness data: {summary}

Provide insights as JSON with:
- trend: "improving"/"stable"/"declining"  
- recommendations: array of 3 actionable tips
- prediction_mood: predicted mood for tomorrow
- confidence: 0.0-1.0"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GROQ_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "mixtral-8x7b-32768",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 500
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                content = response.json()['choices'][0]['message']['content']
                # Extract JSON
                start = content.find('{')
                end = content.rfind('}') + 1
                if start != -1 and end != 0:
                    return json.loads(content[start:end])
    except:
        pass
    
    # Fallback
    return {
        "trend": "stable",
        "recommendations": ["Track mood daily", "Maintain sleep schedule", "Practice mindfulness"],
        "prediction_mood": "calm",
        "confidence": 0.7
    }

@app.get("/")
async def root():
    return {"message": "Mood Timeline AI API is running"}

@app.post("/api/insights", response_model=PredictionResponse)
async def generate_insights(request: InsightRequest):
    try:
        if len(request.moodData) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 mood entries")
        
        # Calculate basic stats
        mood_scores = [mood_to_score(m.emotion) for m in request.moodData]
        
        # Calculate correlations
        sleep_corr = 0.0
        focus_corr = 0.0
        
        if request.sleepData:
            sleep_hours = [s.hours for s in request.sleepData]
            sleep_corr = calculate_correlation(sleep_hours, mood_scores)
        
        if request.focusData:
            focus_scores = [f.score for f in request.focusData]
            focus_corr = calculate_correlation(focus_scores, mood_scores)
        
        # Get AI insights from Groq
        ai_insights = await get_groq_insights(request.moodData, request.sleepData or [], request.focusData or [])
        
        # Simple prediction fallback
        predicted_mood, confidence = predict_mood(mood_scores)
        
        return PredictionResponse(
            moodTrend=ai_insights.get("trend", "stable"),
            prediction={
                "nextDayMood": ai_insights.get("prediction_mood", predicted_mood),
                "confidence": ai_insights.get("confidence", confidence)
            },
            recommendations=ai_insights.get("recommendations", ["Continue tracking", "Stay consistent", "Notice patterns"]),
            correlations={
                "sleep_mood": sleep_corr,
                "focus_mood": focus_corr
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003, reload=True)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import numpy as np
import httpx
import os
import json
from datetime import datetime, timedelta

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
    prediction: Dict[str, Any]
    recommendations: List[str]
    correlations: Dict[str, float]

# Enhanced utility functions
def mood_to_score(emotion: str) -> int:
    """Convert emotion to numerical score (1-10)"""
    mood_scores = {
        # Very negative emotions (1-3)
        'depressed': 1, 'devastated': 1, 'hopeless': 1,
        'angry': 2, 'furious': 2, 'enraged': 2,
        'sad': 2, 'miserable': 2, 'heartbroken': 2,
        'anxious': 3, 'panicked': 3, 'overwhelmed': 3,
        
        # Moderately negative emotions (4-5)
        'stressed': 4, 'worried': 4, 'frustrated': 4,
        'tired': 4, 'exhausted': 4, 'drained': 4,
        'lonely': 4, 'isolated': 4, 'bored': 4,
        'neutral': 5, 'okay': 5, 'fine': 5,
        
        # Moderately positive emotions (6-7)
        'calm': 6, 'peaceful': 6, 'relaxed': 6,
        'content': 6, 'satisfied': 6, 'serene': 6,
        'hopeful': 7, 'optimistic': 7, 'confident': 7,
        
        # Very positive emotions (8-10)
        'happy': 8, 'cheerful': 8, 'pleased': 8,
        'excited': 9, 'thrilled': 9, 'energetic': 9,
        'joyful': 10, 'ecstatic': 10, 'blissful': 10,
        'grateful': 8, 'loved': 9, 'accomplished': 8
    }
    return mood_scores.get(emotion.lower(), 5)

def score_to_mood(score: float) -> str:
    """Convert numerical score back to emotion"""
    if score <= 2:
        return np.random.choice(['sad', 'depressed', 'angry'])
    elif score <= 3:
        return np.random.choice(['anxious', 'stressed', 'worried'])
    elif score <= 4:
        return np.random.choice(['tired', 'frustrated', 'lonely'])
    elif score <= 5:
        return np.random.choice(['neutral', 'okay', 'fine'])
    elif score <= 6:
        return np.random.choice(['calm', 'content', 'peaceful'])
    elif score <= 7:
        return np.random.choice(['hopeful', 'confident', 'optimistic'])
    elif score <= 8:
        return np.random.choice(['happy', 'pleased', 'grateful'])
    elif score <= 9:
        return np.random.choice(['excited', 'energetic', 'thrilled'])
    else:
        return np.random.choice(['joyful', 'ecstatic', 'blissful'])

def calculate_correlation(x: List[float], y: List[float]) -> float:
    if len(x) < 2 or len(y) < 2:
        return 0.0
    min_len = min(len(x), len(y))
    x, y = x[:min_len], y[:min_len]
    if len(set(x)) == 1 or len(set(y)) == 1:
        return 0.0
    correlation = np.corrcoef(x, y)[0, 1]
    return correlation if not np.isnan(correlation) else 0.0

def predict_mood(mood_scores: List[int], intensities: List[int] = None) -> tuple:
    """Enhanced mood prediction with multiple factors"""
    if len(mood_scores) < 2:
        return score_to_mood(5.0), 0.5
    
    # Convert to numpy array for easier calculation
    scores = np.array(mood_scores, dtype=float)
    
    # Factor 1: Recent trend (last 3 days weighted more heavily)
    if len(scores) >= 3:
        recent_trend = np.mean(scores[-3:]) - np.mean(scores[-6:-3] if len(scores) >= 6 else scores[:-3])
    else:
        recent_trend = scores[-1] - scores[-2]
    
    # Factor 2: Overall trend (linear regression slope)
    if len(scores) >= 4:
        x = np.arange(len(scores))
        slope = np.polyfit(x, scores, 1)[0]
    else:
        slope = 0
    
    # Factor 3: Volatility (standard deviation of recent scores)
    recent_volatility = np.std(scores[-5:] if len(scores) >= 5 else scores)
    
    # Factor 4: Intensity consideration
    if intensities:
        intensity_factor = np.mean(intensities[-3:]) / 5.0  # Normalize to 0-2
    else:
        intensity_factor = 1.0
    
    # Base prediction on recent average
    recent_avg = np.mean(scores[-3:] if len(scores) >= 3 else scores[-2:])
    
    # Apply trend adjustments
    trend_adjustment = (recent_trend * 0.4 + slope * 0.6) * intensity_factor
    
    # Predict next mood score
    predicted_score = recent_avg + trend_adjustment
    
    # Add some randomness based on volatility
    volatility_factor = min(recent_volatility * 0.3, 1.0)
    predicted_score += np.random.normal(0, volatility_factor)
    
    # Clamp to valid range
    predicted_score = max(1, min(10, predicted_score))
    
    # Calculate confidence based on trend consistency and data points
    trend_consistency = 1.0 - min(recent_volatility / 3.0, 0.5)
    data_confidence = min(len(scores) / 10.0, 1.0)
    confidence = (trend_consistency * 0.6 + data_confidence * 0.4)
    confidence = max(0.3, min(0.95, confidence))
    
    return score_to_mood(predicted_score), confidence

def analyze_mood_pattern(mood_scores: List[int]) -> str:
    """Analyze overall mood pattern trend"""
    if len(mood_scores) < 3:
        return "stable"
    
    scores = np.array(mood_scores, dtype=float)
    
    # Calculate trend over different periods
    recent_avg = np.mean(scores[-3:])
    older_avg = np.mean(scores[:-3] if len(scores) > 3 else scores[:1])
    
    # Linear regression for overall trend
    x = np.arange(len(scores))
    slope, _ = np.polyfit(x, scores, 1)
    
    # Determine trend
    if slope > 0.3 and recent_avg > older_avg + 0.5:
        return "improving"
    elif slope < -0.3 and recent_avg < older_avg - 0.5:
        return "declining"
    else:
        return "stable"

async def get_groq_insights(mood_data: List[MoodData], sleep_data: List[SleepData], focus_data: List[FocusData]) -> Dict:
    # Prepare more detailed summary
    mood_scores = [mood_to_score(m.emotion) for m in mood_data]
    avg_mood = np.mean(mood_scores)
    mood_trend = analyze_mood_pattern(mood_scores)
    
    # Get recent mood pattern
    recent_moods = [m.emotion for m in mood_data[-5:]]
    emotion_variety = len(set([m.emotion for m in mood_data]))
    
    summary = f"""
    Mood Analysis:
    - {len(mood_data)} entries, Average score: {avg_mood:.1f}/10
    - Trend: {mood_trend}
    - Recent moods: {recent_moods}
    - Emotion variety: {emotion_variety} different emotions
    - Sleep entries: {len(sleep_data)}
    - Focus entries: {len(focus_data)}
    """
    
    if sleep_data:
        avg_sleep = np.mean([s.hours for s in sleep_data])
        summary += f"\n    - Average sleep: {avg_sleep:.1f} hours"
    
    if focus_data:
        avg_focus = np.mean([f.score for f in focus_data])
        summary += f"\n    - Average focus: {avg_focus:.1f}/10"
    
    prompt = f"""Analyze this detailed wellness data: {summary}

Based on the mood trend ({mood_trend}) and recent patterns, provide insights as JSON:
{{
  "trend": "{mood_trend}",
  "recommendations": ["tip1", "tip2", "tip3"],
  "prediction_mood": "predicted_emotion",
  "confidence": 0.0-1.0,
  "insights": "brief analysis of patterns"
}}

Make recommendations specific to the trend and recent mood patterns."""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GROQ_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "mixtral-8x7b-32768",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.4,
                    "max_tokens": 600
                },
                timeout=15.0
            )
            
            if response.status_code == 200:
                content = response.json()['choices'][0]['message']['content']
                # Extract JSON
                start = content.find('{')
                end = content.rfind('}') + 1
                if start != -1 and end != 0:
                    return json.loads(content[start:end])
    except Exception as e:
        print(f"Groq API error: {e}")
    
    # Enhanced fallback based on actual trend
    fallback_recommendations = {
        "improving": [
            "Keep up the positive momentum with current activities",
            "Document what's working well to maintain progress",
            "Consider setting new wellness goals to build on success"
        ],
        "declining": [
            "Focus on basic self-care: sleep, nutrition, and movement",
            "Consider reaching out to friends or support network",
            "Try stress-reduction techniques like deep breathing or meditation"
        ],
        "stable": [
            "Maintain current routine while exploring new wellness activities",
            "Track additional factors like exercise or social interactions",
            "Set small, achievable goals to create positive momentum"
        ]
    }
    
    return {
        "trend": mood_trend,
        "recommendations": fallback_recommendations.get(mood_trend, fallback_recommendations["stable"]),
        "prediction_mood": predict_mood(mood_scores)[0],
        "confidence": 0.7,
        "insights": f"Your mood shows a {mood_trend} pattern over recent entries"
    }

@app.get("/")
async def root():
    return {"message": "Enhanced Mood Timeline AI API is running"}

@app.post("/api/insights", response_model=PredictionResponse)
async def generate_insights(request: InsightRequest):
    try:
        if len(request.moodData) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 mood entries")
        
        # Calculate enhanced stats
        mood_scores = [mood_to_score(m.emotion) for m in request.moodData]
        intensities = [m.intensity or 5 for m in request.moodData]
        
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
        
        # Enhanced prediction
        predicted_mood, confidence = predict_mood(mood_scores, intensities)
        
        # Override AI prediction if our algorithm is more confident
        final_predicted_mood = ai_insights.get("prediction_mood", predicted_mood)
        final_confidence = max(ai_insights.get("confidence", 0.7), confidence)
        
        return PredictionResponse(
            moodTrend=ai_insights.get("trend", analyze_mood_pattern(mood_scores)),
            prediction={
                "nextDayMood": final_predicted_mood,
                "confidence": final_confidence,
                "factors": {
                    "recent_average": float(np.mean(mood_scores[-3:])),
                    "trend_direction": ai_insights.get("trend", "stable"),
                    "data_points": len(mood_scores)
                }
            },
            recommendations=ai_insights.get("recommendations", [
                "Continue tracking your mood daily",
                "Notice patterns between activities and emotions", 
                "Practice mindfulness to increase emotional awareness"
            ]),
            correlations={
                "sleep_mood": round(sleep_corr, 3),
                "focus_mood": round(focus_corr, 3)
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Additional endpoint to get available emotions
@app.get("/api/emotions")
async def get_available_emotions():
    """Return all available emotions categorized by intensity"""
    emotions = {
        "very_negative": ["depressed", "devastated", "hopeless", "furious", "enraged", "miserable", "heartbroken"],
        "negative": ["angry", "sad", "anxious", "panicked", "overwhelmed", "stressed", "worried", "frustrated"],
        "mild_negative": ["tired", "exhausted", "drained", "lonely", "isolated", "bored"],
        "neutral": ["neutral", "okay", "fine"],
        "mild_positive": ["calm", "peaceful", "relaxed", "content", "satisfied", "serene"],
        "positive": ["hopeful", "optimistic", "confident", "happy", "cheerful", "pleased", "grateful"],
        "very_positive": ["excited", "thrilled", "energetic", "joyful", "ecstatic", "blissful", "loved", "accomplished"]
    }
    return emotions

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003, reload=True)
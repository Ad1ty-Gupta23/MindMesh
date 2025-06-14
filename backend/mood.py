from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import os
import numpy as np
from datetime import datetime, timedelta
import json
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
import pandas as pd

# Initialize FastAPI app
app = FastAPI(title="Mood Timeline AI API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # React dev servers
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
    timestamp: Optional[str] = None

class SleepData(BaseModel):
    date: str
    hours: float
    quality: str

class FocusData(BaseModel):
    date: str
    score: float
    duration: int

class XPData(BaseModel):
    date: str
    xp: int

class InsightRequest(BaseModel):
    moodData: List[MoodData]
    sleepData: List[SleepData]
    focusData: List[FocusData]
    xpData: List[XPData]

class PredictionResponse(BaseModel):
    moodTrend: str
    sleepCorrelation: float
    focusCorrelation: float
    prediction: Dict[str, Any]
    recommendations: List[str]
    correlations: Dict[str, float]

# Utility functions
def mood_to_score(emotion: str) -> int:
    """Convert mood emotion to numerical score (1-10)"""
    mood_scores = {
        'angry': 2, 'sad': 3, 'anxious': 4, 'neutral': 5,
        'calm': 7, 'happy': 8, 'excited': 9, 'joyful': 9
    }
    return mood_scores.get(emotion.lower(), 5)

def sleep_quality_to_score(quality: str) -> int:
    """Convert sleep quality to numerical score (1-4)"""
    quality_scores = {'poor': 1, 'fair': 2, 'good': 3, 'excellent': 4}
    return quality_scores.get(quality.lower(), 2)

def calculate_correlation(x_values: List[float], y_values: List[float]) -> float:
    """Calculate Pearson correlation coefficient"""
    if len(x_values) < 2 or len(y_values) < 2:
        return 0.0
    
    # Ensure same length
    min_len = min(len(x_values), len(y_values))
    x_values = x_values[:min_len]
    y_values = y_values[:min_len]
    
    if len(set(x_values)) == 1 or len(set(y_values)) == 1:
        return 0.0
    
    correlation = np.corrcoef(x_values, y_values)[0, 1]
    return correlation if not np.isnan(correlation) else 0.0

def prepare_data_for_ml(mood_data: List[MoodData], sleep_data: List[SleepData], 
                       focus_data: List[FocusData]) -> pd.DataFrame:
    """Prepare data for machine learning model"""
    
    # Create date-based dictionary
    data_dict = {}
    
    # Process mood data
    for mood in mood_data:
        date = mood.date
        if date not in data_dict:
            data_dict[date] = {}
        data_dict[date]['mood_score'] = mood_to_score(mood.emotion)
        data_dict[date]['mood'] = mood.emotion
    
    # Process sleep data
    for sleep in sleep_data:
        date = sleep.date
        if date not in data_dict:
            data_dict[date] = {}
        data_dict[date]['sleep_hours'] = sleep.hours
        data_dict[date]['sleep_quality'] = sleep_quality_to_score(sleep.quality)
    
    # Process focus data
    for focus in focus_data:
        date = focus.date
        if date not in data_dict:
            data_dict[date] = {}
        data_dict[date]['focus_score'] = focus.score
        data_dict[date]['focus_duration'] = focus.duration
    
    # Convert to DataFrame
    df = pd.DataFrame.from_dict(data_dict, orient='index')
    df.index = pd.to_datetime(df.index)
    df = df.sort_index()
    
    # Fill missing values
    df = df.fillna(method='ffill').fillna(method='bfill')
    
    return df

async def get_groq_insights(data_summary: str) -> Dict[str, Any]:
    """Get insights from Groq AI"""
    
    prompt = f"""
    Analyze the following wellness data and provide insights:
    
    {data_summary}
    
    Please provide:
    1. Overall mood trend (improving/stable/declining)
    2. Key patterns you notice
    3. 3 specific, actionable recommendations
    4. Prediction for tomorrow's mood with confidence level
    
    Format your response as JSON with keys: trend, patterns, recommendations, prediction_mood, prediction_confidence
    """
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GROQ_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "mixtral-8x7b-32768",
                    "messages": [
                        {"role": "system", "content": "You are a wellness data analyst. Provide insights in JSON format."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1000
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                
                # Try to extract JSON from the response
                try:
                    # Look for JSON in the response
                    start = content.find('{')
                    end = content.rfind('}') + 1
                    if start != -1 and end != 0:
                        json_str = content[start:end]
                        return json.loads(json_str)
                except:
                    pass
                
                # Fallback to manual parsing
                return {
                    "trend": "stable",
                    "patterns": ["Regular patterns observed in data"],
                    "recommendations": [
                        "Maintain consistent sleep schedule",
                        "Continue mood logging for better insights",
                        "Focus sessions when feeling low"
                    ],
                    "prediction_mood": "calm",
                    "prediction_confidence": 0.75
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to get AI insights")
                
    except Exception as e:
        print(f"Groq API error: {e}")
        # Return fallback insights
        return {
            "trend": "stable",
            "patterns": ["Data analysis in progress"],
            "recommendations": [
                "Maintain regular sleep patterns",
                "Continue tracking your wellness journey",
                "Practice mindfulness during stressful periods"
            ],
            "prediction_mood": "neutral",
            "prediction_confidence": 0.7
        }

def simple_mood_prediction(df: pd.DataFrame) -> tuple:
    """Simple LSTM-inspired prediction using linear regression"""
    
    if len(df) < 3:
        return "neutral", 0.5
    
    # Prepare features for prediction
    features = []
    targets = []
    
    # Create sliding window features (last 3 days predict next day)
    for i in range(3, len(df)):
        # Features: mood, sleep, focus for last 3 days
        feature_row = []
        for j in range(i-3, i):
            feature_row.extend([
                df.iloc[j].get('mood_score', 5),
                df.iloc[j].get('sleep_hours', 7),
                df.iloc[j].get('sleep_quality', 2),
                df.iloc[j].get('focus_score', 5)
            ])
        features.append(feature_row)
        targets.append(df.iloc[i].get('mood_score', 5))
    
    if len(features) < 2:
        return "neutral", 0.5
    
    # Train simple model
    try:
        X = np.array(features)
        y = np.array(targets)
        
        # Standardize features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train linear regression
        model = LinearRegression()
        model.fit(X_scaled, y)
        
        # Predict next day
        last_features = []
        for j in range(len(df)-3, len(df)):
            last_features.extend([
                df.iloc[j].get('mood_score', 5),
                df.iloc[j].get('sleep_hours', 7),
                df.iloc[j].get('sleep_quality', 2),
                df.iloc[j].get('focus_score', 5)
            ])
        
        last_features = np.array(last_features).reshape(1, -1)
        last_features_scaled = scaler.transform(last_features)
        
        predicted_score = model.predict(last_features_scaled)[0]
        confidence = min(0.9, max(0.5, model.score(X_scaled, y)))
        
        # Convert score back to mood
        if predicted_score >= 8:
            mood = "happy"
        elif predicted_score >= 7:
            mood = "calm"
        elif predicted_score >= 5:
            mood = "neutral"
        elif predicted_score >= 4:
            mood = "anxious"
        else:
            mood = "sad"
            
        return mood, confidence
        
    except Exception as e:
        print(f"Prediction error: {e}")
        return "neutral", 0.6

@app.get("/")
async def root():
    return {"message": "Mood Timeline AI API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/insights", response_model=PredictionResponse)
async def generate_insights(request: InsightRequest):
    """Generate AI-powered insights from mood and wellness data"""
    
    try:
        # Prepare data for analysis
        df = prepare_data_for_ml(request.moodData, request.sleepData, request.focusData)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Insufficient data for analysis")
        
        # Calculate correlations
        mood_scores = [mood_to_score(mood.emotion) for mood in request.moodData]
        sleep_hours = [sleep.hours for sleep in request.sleepData]
        sleep_qualities = [sleep_quality_to_score(sleep.quality) for sleep in request.sleepData]
        focus_scores = [focus.score for focus in request.focusData]
        xp_values = [xp.xp for xp in request.xpData]
        
        sleep_mood_corr = calculate_correlation(sleep_hours, mood_scores)
        focus_mood_corr = calculate_correlation(focus_scores, mood_scores)
        sleep_quality_mood_corr = calculate_correlation(sleep_qualities, mood_scores)
        xp_mood_corr = calculate_correlation(xp_values, mood_scores)
        
        # Determine mood trend
        if len(mood_scores) >= 3:
            recent_avg = np.mean(mood_scores[-3:])
            overall_avg = np.mean(mood_scores)
            if recent_avg > overall_avg + 0.5:
                trend = "improving"
            elif recent_avg < overall_avg - 0.5:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"
        
        # Generate prediction using simple ML model
        predicted_mood, confidence = simple_mood_prediction(df)
        
        # Create data summary for Groq
        data_summary = f"""
        Recent Mood Data: {len(request.moodData)} entries
        Average Mood Score: {np.mean(mood_scores):.1f}/10
        Mood Trend: {trend}
        
        Sleep Data: {len(request.sleepData)} entries
        Average Sleep: {np.mean(sleep_hours):.1f} hours
        Sleep-Mood Correlation: {sleep_mood_corr:.2f}
        
        Focus Data: {len(request.focusData)} entries
        Average Focus Score: {np.mean(focus_scores):.1f}/10
        Focus-Mood Correlation: {focus_mood_corr:.2f}
        
        XP Data: {len(request.xpData)} entries
        Total XP: {sum(xp_values)}
        """
        
        # Get AI insights from Groq
        ai_insights = await get_groq_insights(data_summary)
        
        # Combine predictions
        final_mood = ai_insights.get("prediction_mood", predicted_mood)
        final_confidence = max(confidence, ai_insights.get("prediction_confidence", 0.7))
        
        # Generate recommendations based on correlations
        recommendations = ai_insights.get("recommendations", [])
        
        # Add correlation-based recommendations
        if sleep_mood_corr > 0.3:
            recommendations.append(f"Your mood improves with better sleep (correlation: {sleep_mood_corr:.1%})")
        
        if focus_mood_corr > 0.2:
            recommendations.append(f"Focus sessions boost your mood by {focus_mood_corr:.1%}")
        
        if len(recommendations) < 3:
            recommendations.extend([
                "Consider maintaining a consistent daily routine",
                "Track additional factors that might influence your mood",
                "Celebrate small wins to boost positive emotions"
            ])
        
        return PredictionResponse(
            moodTrend=trend,
            sleepCorrelation=abs(sleep_mood_corr),
            focusCorrelation=abs(focus_mood_corr),
            prediction={
                "nextDayMood": final_mood,
                "confidence": final_confidence
            },
            recommendations=recommendations[:5],  # Limit to 5 recommendations
            correlations={
                "sleep_mood": sleep_mood_corr,
                "focus_mood": focus_mood_corr,
                "sleep_quality_mood": sleep_quality_mood_corr,
                "xp_mood": xp_mood_corr
            }
        )
        
    except Exception as e:
        print(f"Error generating insights: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

@app.post("/api/mood-prediction")
async def predict_mood(request: InsightRequest):
    """Simple endpoint for mood prediction only"""
    
    try:
        df = prepare_data_for_ml(request.moodData, request.sleepData, request.focusData)
        predicted_mood, confidence = simple_mood_prediction(df)
        
        return {
            "predicted_mood": predicted_mood,
            "confidence": confidence,
            "model": "linear_regression_sliding_window"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
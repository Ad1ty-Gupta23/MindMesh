from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import base64
import io
from PIL import Image
import requests
import json
from groq import Groq
import mediapipe as mp
from typing import Dict, List
import asyncio
import logging

# Initialize FastAPI app
app = FastAPI(title="AI Mirror API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client (you'll need to add your API key)
groq_client = Groq(api_key="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")

# Initialize MediaPipe
mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Emotion mapping based on facial landmarks
EMOTION_MAPPING = {
    "happy": [0.7, 0.1, 0.1, 0.05, 0.02, 0.03],
    "sad": [0.1, 0.7, 0.1, 0.05, 0.02, 0.03],
    "angry": [0.1, 0.1, 0.7, 0.05, 0.02, 0.03],
    "surprised": [0.1, 0.1, 0.1, 0.65, 0.02, 0.03],
    "fearful": [0.1, 0.1, 0.1, 0.05, 0.62, 0.03],
    "neutral": [0.2, 0.2, 0.2, 0.2, 0.1, 0.1]
}

class EmotionAnalyzer:
    def __init__(self):
        self.emotion_history = []
    
    def analyze_facial_landmarks(self, landmarks) -> Dict:
        """Analyze facial landmarks to detect emotions"""
        if not landmarks:
            return {"emotion": "neutral", "confidence": 0.5}
        
        # Simple emotion detection based on landmark positions
        # This is a simplified version - you can enhance with ML models
        
        # Get key facial points
        left_eye = landmarks[33]
        right_eye = landmarks[362]
        mouth_left = landmarks[61]
        mouth_right = landmarks[291]
        mouth_top = landmarks[13]
        mouth_bottom = landmarks[14]
        
        # Calculate ratios for emotion detection
        eye_distance = abs(left_eye.x - right_eye.x)
        mouth_width = abs(mouth_left.x - mouth_right.x)
        mouth_height = abs(mouth_top.y - mouth_bottom.y)
        
        # Simple emotion classification
        if mouth_height > 0.02 and mouth_width > 0.05:
            emotion = "happy"
            confidence = 0.8
        elif mouth_height < 0.01:
            emotion = "sad"
            confidence = 0.7
        elif mouth_width < 0.03:
            emotion = "angry"
            confidence = 0.6
        else:
            emotion = "neutral"
            confidence = 0.5
        
        return {"emotion": emotion, "confidence": confidence}
    
    def get_emotion_trends(self) -> Dict:
        """Get emotional trends over time"""
        if len(self.emotion_history) < 2:
            return {"trend": "stable", "dominant_emotion": "neutral"}
        
        recent_emotions = self.emotion_history[-10:]
        emotion_counts = {}
        
        for emotion_data in recent_emotions:
            emotion = emotion_data["emotion"]
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        dominant_emotion = max(emotion_counts, key=emotion_counts.get)
        
        return {
            "trend": "improving" if dominant_emotion == "happy" else "declining" if dominant_emotion == "sad" else "stable",
            "dominant_emotion": dominant_emotion,
            "emotion_distribution": emotion_counts
        }

# Initialize emotion analyzer
emotion_analyzer = EmotionAnalyzer()

@app.get("/")
async def root():
    return {"message": "AI Mirror API is running!"}

@app.post("/analyze-frame")
async def analyze_frame(file: UploadFile = File(...)):
    """Analyze a single frame for emotions"""
    try:
        # Read the uploaded image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = face_mesh.process(rgb_frame)
        
        analysis_result = {
            "face_detected": False,
            "emotion": "neutral",
            "confidence": 0.0,
            "landmarks_count": 0,
            "timestamp": asyncio.get_event_loop().time()
        }
        
        if results.multi_face_landmarks:
            analysis_result["face_detected"] = True
            landmarks = results.multi_face_landmarks[0].landmark
            analysis_result["landmarks_count"] = len(landmarks)
            
            # Analyze emotions
            emotion_result = emotion_analyzer.analyze_facial_landmarks(landmarks)
            analysis_result.update(emotion_result)
            
            # Add to history
            emotion_analyzer.emotion_history.append({
                "emotion": emotion_result["emotion"],
                "confidence": emotion_result["confidence"],
                "timestamp": analysis_result["timestamp"]
            })
            
            # Keep only last 100 entries
            if len(emotion_analyzer.emotion_history) > 100:
                emotion_analyzer.emotion_history = emotion_analyzer.emotion_history[-100:]
        
        return JSONResponse(content=analysis_result)
        
    except Exception as e:
        logging.error(f"Error analyzing frame: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/analyze-speech")
async def analyze_speech(data: dict):
    """Analyze speech text for sentiment using Groq"""
    try:
        text = data.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")
        
        # Use Groq for sentiment analysis
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert emotion and sentiment analyzer. Analyze the given text and return a JSON response with:
                    - emotion: one of [happy, sad, angry, surprised, fearful, neutral]
                    - confidence: float between 0-1
                    - sentiment: one of [positive, negative, neutral]
                    - intensity: float between 0-1
                    - keywords: array of emotional keywords found
                    
                    Only return valid JSON, no additional text."""
                },
                {
                    "role": "user",
                    "content": f"Analyze this text: '{text}'"
                }
            ],
            model="llama3-8b-8192",
            temperature=0.1,
            max_tokens=200
        )
        
        response_text = chat_completion.choices[0].message.content
        
        # Parse the JSON response
        try:
            sentiment_result = json.loads(response_text)
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            sentiment_result = {
                "emotion": "neutral",
                "confidence": 0.5,
                "sentiment": "neutral",
                "intensity": 0.5,
                "keywords": []
            }
        
        return JSONResponse(content=sentiment_result)
        
    except Exception as e:
        logging.error(f"Error analyzing speech: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing speech: {str(e)}")

@app.get("/emotion-trends")
async def get_emotion_trends():
    """Get emotion trends and analytics"""
    try:
        trends = emotion_analyzer.get_emotion_trends()
        
        # Get recent history
        recent_history = emotion_analyzer.emotion_history[-20:] if emotion_analyzer.emotion_history else []
        
        return JSONResponse(content={
            "trends": trends,
            "recent_history": recent_history,
            "total_sessions": len(emotion_analyzer.emotion_history)
        })
        
    except Exception as e:
        logging.error(f"Error getting trends: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting trends: {str(e)}")

@app.post("/get-ai-feedback")
async def get_ai_feedback(data: dict):
    """Get AI-generated feedback and suggestions"""
    try:
        emotion = data.get("emotion", "neutral")
        confidence = data.get("confidence", 0.5)
        context = data.get("context", "")
        
        # Use Groq to generate personalized feedback
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": """You are a supportive AI wellness coach. Based on the user's current emotional state, provide:
                    1. A brief, empathetic acknowledgment
                    2. One practical suggestion or tip
                    3. A positive affirmation
                    
                    Keep responses concise (max 3 sentences) and supportive. Never provide medical advice."""
                },
                {
                    "role": "user",
                    "content": f"Current emotion: {emotion} (confidence: {confidence}). Context: {context}"
                }
            ],
            model="llama3-8b-8192",
            temperature=0.7,
            max_tokens=150
        )
        
        feedback = chat_completion.choices[0].message.content
        
        return JSONResponse(content={
            "feedback": feedback,
            "emotion": emotion,
            "confidence": confidence
        })
        
    except Exception as e:
        logging.error(f"Error generating feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating feedback: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
    #uvicorn aimirror:app --reload --port 8003
import os
import uuid
import tempfile
import requests
import json
from pathlib import Path
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import speech_recognition as sr
from gtts import gTTS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key from environment
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "your_api_key_here")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

app = FastAPI(title="TriFocus AI Mental Health Assistant")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audio files directory
UPLOAD_DIR = Path("audio_files")
UPLOAD_DIR.mkdir(exist_ok=True)

# Pydantic Models
class QueryModel(BaseModel):
    message: str
    user_id: Optional[str] = None

class MentalHealthAnalysisModel(BaseModel):
    concerns: List[str]
    age: Optional[int] = None
    duration: Optional[str] = None
    severity: Optional[str] = None

def text_to_speech(text, lang='en'):
    """Convert text to speech and save as an audio file."""
    try:
        audio_filename = f"mental_health_{uuid.uuid4()}.mp3"
        filepath = UPLOAD_DIR / audio_filename
        
        tts_text = text[:800] if len(text) > 800 else text
        tts = gTTS(text=tts_text, lang=lang, slow=False)
        tts.save(str(filepath))
        
        return audio_filename
    except Exception as e:
        print(f"Text-to-speech error: {e}")
        return None

def generate_mental_health_response(message):
    """Generate a mental health response using Groq API."""
    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        system_prompt = """You are MindMesh, a compassionate mental health support assistant.

GUIDELINES:
- Provide empathetic, non-judgmental support
- Always recommend professional help for serious concerns
- Offer practical coping strategies
- Never provide clinical diagnoses
- If someone expresses suicidal thoughts, clearly state "SEEK IMMEDIATE PROFESSIONAL HELP"
- Be warm, understanding, and supportive"""

        payload = {
            "model": "llama3-70b-8192",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            "temperature": 0.4,
            "max_tokens": 1000
        }
        
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Groq API error: {e}")
        return "I'm here to support you, but I'm experiencing technical difficulties. Please consider reaching out to a mental health professional."

@app.post("/chat")
async def mental_health_chat(query: QueryModel):
    """Process mental health chat messages."""
    try:
        response_text = generate_mental_health_response(query.message)
        audio_filename = text_to_speech(response_text, 'en')
        
        return {
            "text_response": response_text,
            "audio_file_path": audio_filename,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "error": str(e),
            "text_response": "I'm here to support you. Please consider reaching out to a mental health professional.",
            "audio_file_path": None
        }

@app.post("/mental-health-analysis")
async def mental_health_analysis(concerns: MentalHealthAnalysisModel):
    """Mental health concerns analysis endpoint."""
    try:
        concerns_text = ", ".join(concerns.concerns)
        query = f"I'm experiencing {concerns_text}. Age: {concerns.age}. Duration: {concerns.duration}. Severity: {concerns.severity}."
        
        analysis_result = generate_mental_health_response(query)
        
        return {
            "analysis": analysis_result,
            "timestamp": datetime.now().isoformat(),
            "concerns_analyzed": concerns.concerns
        }
    except Exception as e:
        return {
            "error": str(e),
            "analysis": "Please consider reaching out to a mental health professional."
        }

@app.post("/voice-input")
async def process_voice(file: UploadFile = File(...)):
    """Process voice input and generate response."""
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    try:
        content = await file.read()
        temp_file.write(content)
        temp_file.close()

        recognizer = sr.Recognizer()
        with sr.AudioFile(temp_file.name) as source:
            audio = recognizer.record(source)
        
        transcribed_text = recognizer.recognize_google(audio, language='en-US')
        response_text = generate_mental_health_response(transcribed_text)
        audio_filename = text_to_speech(response_text, 'en')

        return {
            "transcribed_text": transcribed_text,
            "text_response": response_text,
            "audio_file_path": audio_filename,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "error": str(e),
            "text_response": "I couldn't process your voice input. Please try again."
        }
    finally:
        if os.path.exists(temp_file.name):
            os.unlink(temp_file.name)

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    """Retrieve audio files."""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(str(file_path))

@app.get("/health-check")
async def health_check():
    return {
        "status": "healthy",
        "service": "MindMesh Mental Health Assistant",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    return {
        "message": "Welcome to MindMesh Mental Health Assistant",
        "endpoints": {
            "chat": "/chat",
            "analysis": "/mental-health-analysis", 
            "voice": "/voice-input",
            "health": "/health-check"
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting TriFocus AI Mental Health Assistant...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
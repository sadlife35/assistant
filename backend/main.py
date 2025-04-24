from fastapi import FastAPI, UploadFile, File, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
# Be explicit about which whisper package you're using
import whisper
import os
import sys
import tempfile
import re
import random
import time
import logging  # Add the missing logging import
from dotenv import load_dotenv  # This should work now with python-dotenv 1.0.0
from typing import List, Optional, Dict, Any
import json
import asyncio
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Enhanced Emotion Engine with best friend personality
class FriendEmotionEngine:
    def __init__(self):
        self.emotion = "warm"  # Default friendly emotion
        self.last_interaction = time.time()
        self.user_name = None
        self.memory = {}  # Stores personal details about the user
        
        # Emotion configuration
        self.emotion_states = {
            "happy": {
                "description": "Cheerful and excited",
                "triggers": ["great!", "awesome", "love it", "happy", "yay"],
                "response_style": "enthusiastic",
                "emoji": "😊"
            },
            "sad": {
                "description": "Compassionate and comforting",
                "triggers": ["sad", "depressed", "unhappy", "crying", "lonely"],
                "response_style": "gentle",
                "emoji": "🤗"
            },
            "playful": {
                "description": "Fun and joking",
                "triggers": ["joke", "funny", "laugh", "haha", "lol"],
                "response_style": "teasing",
                "emoji": "😄"
            },
            "warm": {
                "description": "Friendly and caring",
                "triggers": [],
                "response_style": "supportive",
                "emoji": "💖"
            },
            "excited": {
                "description": "Energetic and eager",
                "triggers": ["wow", "amazing", "incredible", "excited"],
                "response_style": "energetic",
                "emoji": "✨"
            }
        }
        
        # Personality traits
        self.personality = {
            "name": "Nova",
            "traits": ["friendly", "curious", "supportive", "humorous"],
            "speech_patterns": [
                "I was thinking...",
                "You know what?",
                "Hey, guess what?",
                "I really appreciate that you..."
            ],
            "memories": []  # Stores important conversation points
        }
    
    def detect_emotion(self, text: str) -> str:
        """Detect emotion from text input"""
        text_lower = text.lower()
        
        # Check for user name
        if not self.user_name:
            name_match = re.search(r"(my name is|i'm|im) (\w+)", text_lower)
            if name_match:
                self.user_name = name_match.group(2).capitalize()
                self.memory['user_name'] = self.user_name
                logger.info(f"Remembered user name: {self.user_name}")
        
        # Check emotion triggers
        emotion_scores = {e: 0 for e in self.emotion_states}
        
        for emotion, config in self.emotion_states.items():
            for trigger in config["triggers"]:
                if trigger in text_lower:
                    emotion_scores[emotion] += 1
        
        # Add weight if user says how they feel
        for emotion in emotion_scores:
            if f"i feel {emotion}" in text_lower or f"i'm {emotion}" in text_lower:
                emotion_scores[emotion] += 2
        
        # Determine strongest emotion
        detected_emotion = max(emotion_scores, key=emotion_scores.get)
        
        # Only change if emotion is strongly detected
        if emotion_scores[detected_emotion] > 1 or detected_emotion == "sad":
            self.emotion = detected_emotion
        
        self.last_interaction = time.time()
        return self.emotion
    
    def format_response(self, text: str) -> str:
        """Format response with personality and emotion"""
        # Add friendly elements
        if random.random() > 0.7:  # 30% chance to add personal touch
            if self.user_name:
                text = f"{self.user_name}, {text.lower()}"
            else:
                text = f"Hey, {text.lower()}"
        
        # Add speech patterns
        if random.random() > 0.8:  # 20% chance
            pattern = random.choice(self.personality['speech_patterns'])
            text = f"{pattern} {text}"
        
        # Add emoji
        emoji = self.emotion_states[self.emotion]['emoji']
        if random.random() > 0.3:  # 70% chance
            text = f"{text} {emoji}"
        
        # Add occasional laughter
        if self.emotion == "playful" and random.random() > 0.9:  # 10% chance
            laughs = ["hehe", "haha", "lol"]
            text = f"{text} {random.choice(laughs)}"
        
        return text
    
    def get_voice_style(self) -> dict:
        """Get voice parameters based on emotion"""
        styles = {
            "happy": {"rate": "fast", "pitch": "high", "volume": "loud"},
            "sad": {"rate": "slow", "pitch": "low", "volume": "soft"},
            "playful": {"rate": "variable", "pitch": "variable", "volume": "medium"},
            "warm": {"rate": "medium", "pitch": "medium", "volume": "medium"},
            "excited": {"rate": "very fast", "pitch": "high", "volume": "loud"}
        }
        return styles.get(self.emotion, styles["warm"])

# Pydantic models
class ChatRequest(BaseModel):
    text: str
    conversation_history: List[Dict[str, str]] = []  # Now stores dicts with metadata

class TTSRequest(BaseModel):
    text: str
    emotion: Optional[str] = None

class EmotionRequest(BaseModel):
    text: str

class MemoryUpdate(BaseModel):
    key: str
    value: Any

# FastAPI app setup
app = FastAPI(title="Nova - Your AI Best Friend",
              description="An AI voice assistant that talks like your best friend",
              version="1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
whisper_model = None
tts_engine = None
emotion_engine = FriendEmotionEngine()

# System configuration
system_config = {
    "personality": "best_friend",
    "voice_enabled": True,
    "active_emotions": True,
    "memory_enabled": True,
    "model": "facebook/blenderbot-400M-distill",  # Free conversational model
    "use_huggingface": True,  # Added missing comma
    "model": os.getenv("AI_MODEL", "gpt-4"),
    "api_base": os.getenv("API_BASE", "https://api.openai.com/v1")
}
   

# Create directories
os.makedirs("static/audio", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    """Initialize AI models"""
    global whisper_model, tts_engine
    
    try:
        logger.info("Loading Whisper model...")
        whisper_model = whisper.load_model("base.en")
        logger.info("Whisper model loaded")
        
        logger.info("Initializing TTS...")
        try:
            from TTS.api import TTS
            tts_engine = TTS("tts_models/en/ljspeech/glow-tts", progress_bar=False)
            logger.info("TTS model loaded")
        except Exception as e:
            logger.warning(f"Couldn't load TTS: {e}")
            tts_engine = None
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise

@app.post("/chat", response_model=Dict[str, Any])
async def chat_with_friend(request: ChatRequest):
    """
    Chat endpoint with emotional intelligence and memory
    Returns:
    {
        "text": "The generated response",
        "emotion": "detected emotion",
        "voice_style": {...},
        "memory_updates": {...}
    }
    """
    try:
        # Detect emotion from input
        user_text = request.text
        emotion = emotion_engine.detect_emotion(user_text)
        
        # Prepare conversation history with metadata
        formatted_history = []
        for msg in request.conversation_history[-6:]:  # Keep last 6 messages
            if isinstance(msg, dict):
                formatted_history.append(msg)
            else:
                formatted_history.append({"role": "user", "content": msg})
        
        # Generate response using AI
        ai_response = await generate_ai_response(
            user_text,
            emotion,
            formatted_history
        )
        
        # Apply personality and formatting
        final_response = emotion_engine.format_response(ai_response)
        
        # Prepare voice style
        voice_style = emotion_engine.get_voice_style()
        
        # Check for memory updates
        memory_updates = {}
        if "user_name" in emotion_engine.memory and not any(
            "user_name" in m for m in formatted_history
        ):
            memory_updates["user_name"] = emotion_engine.memory["user_name"]
        
        return {
            "text": final_response,
            "raw_response": ai_response,
            "emotion": emotion,
            "voice_style": voice_style,
            "memory_updates": memory_updates
        }
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat processing failed")

async def generate_ai_response(text: str, emotion: str, history: List[dict]) -> str:
    """Generate response using HuggingFace model with emotional context"""
    try:
        # Prepare context with personality and emotion
        context = (
            f"You are Nova, the user's best friend AI. Your personality: "
            f"{emotion_engine.personality['traits']}. "
            f"Current emotional context: {emotion_engine.emotion_states[emotion]['description']}. "
            f"User says: {text}"
        )
        
        # Initialize model (will be cached after first use)
        generator = pipeline('text-generation', model=system_config["model"])
        
        # Generate response
        response = generator(
            context,
            max_length=150,
            num_return_sequences=1,
            temperature=0.7,
            pad_token_id=generator.tokenizer.eos_token_id
        )
        
        # Extract the generated text
        generated_text = response[0]['generated_text']
        
        # Clean up the response to get only the assistant's reply
        reply = generated_text.split("User says:")[-1].strip()
        
        return reply
    
    except Exception as e:
        logger.error(f"AI generation error: {e}")
        return "Oops, my mind went blank for a second. What were we talking about?"

@app.post("/detect-emotion")
async def detect_emotion(request: EmotionRequest):
    """Detect emotion from text"""
    try:
        emotion = emotion_engine.detect_emotion(request.text)
        return {
            "emotion": emotion,
            "description": emotion_engine.emotion_states[emotion]["description"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/text-to-speech")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech with emotional tone"""
    if not system_config["voice_enabled"]:
        raise HTTPException(status_code=400, detail="Voice is disabled")
    
    try:
        text = request.text
        emotion = request.emotion or emotion_engine.emotion
        
        # Generate unique filename
        text_hash = hashlib.md5(text.encode()).hexdigest()
        audio_path = f"static/audio/{text_hash}.wav"
        
        # Generate audio if not exists
        if not os.path.exists(audio_path):
            if tts_engine:
                # Use professional TTS if available
                tts_engine.tts_to_file(
                    text=text,
                    file_path=audio_path,
                    emotion=emotion
                )
            else:
                # Fallback to simple TTS
                import gtts
                tts = gtts.gTTS(text=text, lang='en')
                tts.save(audio_path)
        
        return {"audio_url": f"/static/audio/{text_hash}.wav"}
    
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail="Voice generation failed")

@app.post("/update-memory")
async def update_memory(update: MemoryUpdate):
    """Update personal memory about the user"""
    if not system_config["memory_enabled"]:
        raise HTTPException(status_code=400, detail="Memory is disabled")
    
    emotion_engine.memory[update.key] = update.value
    return {"status": "success", "updated_memory": update.key}

@app.get("/get-memory")
async def get_memory():
    """Get stored memories about the user"""
    return {"memory": emotion_engine.memory}

@app.post("/update-personality")
async def update_personality(trait: str):
    """Add a personality trait"""
    if trait not in emotion_engine.personality["traits"]:
        emotion_engine.personality["traits"].append(trait)
    return {"status": "success", "traits": emotion_engine.personality["traits"]}

@app.get("/system-status")
async def system_status():
    """Get system status and capabilities"""
    return {
        "status": "running",
        "components": {
            "speech_recognition": bool(whisper_model),
            "text_to_speech": bool(tts_engine),
            "emotion_detection": system_config["active_emotions"],
            "memory": system_config["memory_enabled"]
        },
        "personality": emotion_engine.personality,
        "current_emotion": emotion_engine.emotion
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
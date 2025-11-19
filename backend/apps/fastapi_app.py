from motor.motor_asyncio import AsyncIOMotorClient
from apps.mongo_models import session_doc, message_doc
# MongoDB setup
MONGO_URI = "mongodb://localhost:27017"
mongo_client = AsyncIOMotorClient(MONGO_URI)
mongo_db = mongo_client["ai_chat_db"]

from uuid import uuid4
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn
import sys
import os
from datetime import datetime
import re
from pydub import AudioSegment
import assemblyai as aai
import shutil


# Local imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from apps.mongo_models import session_doc, message_doc
from src.core.chatbot.chatbot_backend import ChatBot

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


from src.core.chatbot.chatbot_backend import ChatBot
from src.core.chatbot.load_config import LoadProjectConfig
from src.core.agent_graph.load_tools_config import LoadToolsConfig

# Initialize FastAPI app
app = FastAPI(title="AI Agent API", version="1.0.0")

# Add CORS middleware to allow React frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load configurations
PROJECT_CFG = LoadProjectConfig()
TOOLS_CFG = LoadToolsConfig()

# In-memory storage for chat sessions (in production, use a database)
# Structure: {user_id: {session_id: List[tuple]}}
user_chat_sessions: Dict[str, Dict[str, List[tuple]]] = {}
# Structure: {user_id: {session_id: Dict}}
user_session_metadata: Dict[str, Dict[str, Dict]] = {}

def extract_topic_from_messages(messages: List[tuple]) -> str:
    """Extract a meaningful topic from the first user message"""
    if not messages:
        return "New Chat"
    
    first_message = messages[0][0]  # First user message
    
    # Remove common words and extract key terms
    words = re.findall(r'\b\w+\b', first_message.lower())
    stop_words = {'i', 'am', 'is', 'are', 'was', 'were', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'can', 'you', 'help', 'me', 'my', 'what', 'how', 'when', 'where', 'why', 'do', 'does', 'did', 'will', 'would', 'could', 'should'}
    
    meaningful_words = [word for word in words if len(word) > 3 and word not in stop_words]
    
    if meaningful_words:
        # Take first 2-3 meaningful words and capitalize
        topic_words = meaningful_words[:3]
        topic = ' '.join(word.capitalize() for word in topic_words)
        return topic if len(topic) <= 50 else topic[:47] + "..."
    
    # Fallback: Use first few words of the message
    words = first_message.split()[:4]
    topic = ' '.join(words)
    return topic if len(topic) <= 50 else topic[:47] + "..."

def update_session_metadata(user_id: str, session_id: str, messages: List[tuple]):
    """Update metadata for a specific user's session"""
    if user_id not in user_session_metadata:
        user_session_metadata[user_id] = {}
    
    if session_id not in user_session_metadata[user_id]:
        user_session_metadata[user_id][session_id] = {
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'message_count': 0,
            'topic': 'New Chat'
        }
    
    user_session_metadata[user_id][session_id].update({
        'updated_at': datetime.now().isoformat(),
        'message_count': len(messages),
        'topic': extract_topic_from_messages(messages)
    })

# Pydantic models for request/response
class ChatMessage(BaseModel):
    message: str
    session_id: str = "default"
    user_id: str = "anonymous"

class ChatResponse(BaseModel):
    response: str
    conversation_history: List[Dict[str, str]]
    session_id: str

class FeedbackRequest(BaseModel):
    session_id: str
    message_index: int
    feedback_type: str  # "like" or "dislike"
    user_id: str = "anonymous"

class ChatSession(BaseModel):
    session_id: str
    topic: str
    message_count: int
    created_at: str
    updated_at: str

class ChatSessionsResponse(BaseModel):
    sessions: List[ChatSession]
    total_count: int

class CreateSessionRequest(BaseModel):
    user_id: str = "anonymous"

aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

async def process_chat_message(session_id: str, user_id: str, user_message: str):
    """
    Shared chat processing logic reused by /chat and /chat/voice endpoints.
    """
    # Fetch chat history
    cursor = mongo_db.messages.find({"session_id": session_id, "user_id": user_id}).sort("timestamp", 1)
    current_history = []

    async for doc in cursor:
        if doc["role"] == "user":
            current_history.append([doc["content"], ""])
        elif doc["role"] == "assistant" and current_history:
            current_history[-1][1] = doc["content"]

    # Get chatbot response
    _, updated_chatbot = ChatBot.respond(current_history, user_message)

    # Store user message
    await mongo_db.messages.insert_one(
        message_doc(session_id, user_id, "user", user_message)
    )

    # Store assistant reply
    bot_response = updated_chatbot[-1][1] if updated_chatbot else "Sorry, I couldn't process your message."
    await mongo_db.messages.insert_one(
        message_doc(session_id, user_id, "assistant", bot_response)
    )

    # Update metadata
    await mongo_db.sessions.update_one(
        {"_id": session_id},
        {"$set": {"updated_at": datetime.utcnow(), "topic": user_message}},
    )

    # Build history for UI
    conversation_history = []
    for u, b in updated_chatbot:
        conversation_history.extend([
            {"role": "user", "content": u},
            {"role": "assistant", "content": b}
        ])

    return bot_response, conversation_history


# ---------------------------------------------------------------------------
# 🟧 VOICE CHAT ENDPOINT
# ---------------------------------------------------------------------------


@app.post("/chat/voice", response_model=ChatResponse)
async def chat_voice_endpoint(
    # session_id: str = "default",
    # user_id: str = "anonymous",
    session_id: str = Form("default"),
    user_id: str = Form("anonymous"),

    file: UploadFile = File(...)
):
    temp_file_path = None
    converted_file_path = None

    try:
        if not aai.settings.api_key:
            raise HTTPException(status_code=500, detail="ASSEMBLYAI_API_KEY not set")

        # Save audio file
        ext = os.path.splitext(file.filename)[1].lower()
        temp_file_path = f"temp_{uuid4()}{ext}"

        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # Convert if needed
        if ext not in [".wav", ".mp3"]:
            converted_file_path = f"converted_{uuid4()}.wav"
            audio = AudioSegment.from_file(temp_file_path)
            audio.export(converted_file_path, format="wav")
            audio_path = converted_file_path
        else:
            audio_path = temp_file_path

        print(f"[VOICE] Transcribing: {audio_path}")

        # Transcribe
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(audio_path)

        if transcript.status != "completed":
            raise HTTPException(status_code=500, detail="AssemblyAI transcription failed")

        user_message = transcript.text
        print(f"[VOICE TEXT] {user_message}")

        # 🟢 USE SAME LOGIC AS TEXT CHAT
        bot_response, conversation_history = await process_chat_message(
            session_id, user_id, user_message
        )

        return ChatResponse(
            response=bot_response,
            conversation_history=conversation_history,
            session_id=session_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {e}")

    finally:
        for path in [temp_file_path, converted_file_path]:
            if path and os.path.exists(path):
                os.remove(path)
                print(f"[DEBUG] Deleted {path}")



@app.post("/chat/session")
async def create_chat_session(request: CreateSessionRequest):
    """
    Create a new chat session for a user and return session_id and topic
    """
    try:
        user_id = request.user_id or "anonymous"
        session_id = str(uuid4())
        topic = "New Chat"
        session = session_doc(session_id, user_id, topic)
        await mongo_db.sessions.insert_one(session)
        return {"session_id": session_id, "topic": topic}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating chat session: {str(e)}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "AI Agent API is running", "status": "healthy"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(chat_message: ChatMessage):
    """
    Main chat endpoint that processes user messages and returns AI responses
    """
    try:
        session_id = chat_message.session_id
        user_id = chat_message.user_id
        user_message = chat_message.message
        print(f"[CHAT] user_id={user_id}, session_id={session_id}, message={user_message}")

        # Fetch chat history from MongoDB
        cursor = mongo_db.messages.find({"session_id": session_id, "user_id": user_id}).sort("timestamp", 1)
        current_history = []
        async for doc in cursor:
            if doc["role"] == "user":
                user_msg = doc["content"]
            else:
                bot_msg = doc["content"]
            if doc["role"] == "user":
                current_history.append([doc["content"], ""])
            elif doc["role"] == "assistant" and current_history:
                current_history[-1][1] = doc["content"]

        # Use the existing ChatBot.respond method
        _, updated_chatbot = ChatBot.respond(current_history, user_message)

        # Save new user message and bot response to MongoDB
        await mongo_db.messages.insert_one(message_doc(session_id, user_id, "user", user_message))
        bot_response = updated_chatbot[-1][1] if updated_chatbot else "Sorry, I couldn't process your message."
        await mongo_db.messages.insert_one(message_doc(session_id, user_id, "assistant", bot_response))

        # Update session metadata and topic to latest user message
        update_result = await mongo_db.sessions.update_one(
            {"_id": session_id},
            {"$set": {"updated_at": datetime.utcnow(), "topic": user_message}}
        )
        print(f"[DEBUG] Session update matched: {update_result.matched_count}, modified: {update_result.modified_count}")

        # Format response for React frontend
        conversation_history = []
        for user_msg, bot_msg in updated_chatbot:
            conversation_history.extend([
                {"role": "user", "content": user_msg},
                {"role": "assistant", "content": bot_msg}
            ])

        return ChatResponse(
            response=bot_response,
            conversation_history=conversation_history,
            session_id=session_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

@app.post("/feedback")
async def feedback_endpoint(feedback: FeedbackRequest):
    """
    Endpoint to handle user feedback (like/dislike)
    """
    try:
        # In a real application, you'd store this feedback in a database
        # For now, we'll just log it with user information
        print(f"Feedback received from user {feedback.user_id} for session {feedback.session_id}: "
              f"Message {feedback.message_index} was {feedback.feedback_type}d")
        
        return {"message": "Feedback received", "status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing feedback: {str(e)}")

@app.delete("/chat/{session_id}")
async def clear_chat(session_id: str, user_id: str = "anonymous"):
    """
    Delete chat session + all messages for this user/session.
    """
    try:
        # Delete all messages in MongoDB
        await mongo_db.messages.delete_many({"session_id": session_id, "user_id": user_id})

        # Delete session metadata document in MongoDB
        await mongo_db.sessions.delete_one({"_id": session_id, "user_id": user_id})

        # Also clear in-memory if used anywhere
        if user_id in user_chat_sessions and session_id in user_chat_sessions[user_id]:
            del user_chat_sessions[user_id][session_id]

        if user_id in user_session_metadata and session_id in user_session_metadata[user_id]:
            del user_session_metadata[user_id][session_id]

        return {
            "message": f"Chat session {session_id} deleted",
            "status": "success"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing chat: {str(e)}")


@app.get("/chat/{session_id}/history")
async def get_chat_history(session_id: str, user_id: str = "anonymous"):
    """
    Get chat history for a specific user's session
    """
    try:
        print(f"[HISTORY] user_id={user_id}, session_id={session_id}")
        cursor = mongo_db.messages.find({"session_id": session_id, "user_id": user_id}).sort("timestamp", 1)
        conversation_history = []
        async for doc in cursor:
            conversation_history.append({"role": doc["role"], "content": doc["content"]})
        return {"conversation_history": conversation_history, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting chat history: {str(e)}")

@app.get("/chat/sessions", response_model=ChatSessionsResponse)
async def get_chat_sessions(user_id: str = "anonymous"):
    """
    Get all chat sessions for a specific user with metadata (topic, timestamps, message count)
    """
    try:
        print(f"[SESSIONS] user_id={user_id}")
        cursor = mongo_db.sessions.find({"user_id": user_id}).sort("updated_at", -1)
        sessions = []
        async for doc in cursor:
            # Use _id as session_id for message counting
            session_id = doc["_id"]
            message_count = await mongo_db.messages.count_documents({"session_id": session_id, "user_id": user_id})
            sessions.append(ChatSession(
                session_id=session_id,
                topic=doc.get("topic", "New Chat"),
                message_count=message_count,
                created_at=doc["created_at"].isoformat() if isinstance(doc["created_at"], (str,)) == False else doc["created_at"],
                updated_at=doc["updated_at"].isoformat() if isinstance(doc["updated_at"], (str,)) == False else doc["updated_at"]
            ))
        return ChatSessionsResponse(
            sessions=sessions,
            total_count=len(sessions)
        )
    except Exception as e:
        import traceback
        print("[ERROR] get_chat_sessions exception:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error getting chat sessions: {str(e)}")

@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring
    """
    # Count total active sessions across all users
    total_sessions = sum(len(sessions) for sessions in user_chat_sessions.values())
    
    return {
        "status": "healthy",
        "message": "AI Agent API is running",
        "active_sessions": total_sessions,
        "total_users": len(user_chat_sessions)
    }

if __name__ == "__main__":
    # Run the API server
    uvicorn.run(
        "apps.fastapi_app:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )

 #######################################################   

# import os
# import sys
# import shutil
# from uuid import uuid4
# from datetime import datetime
# from typing import List, Dict

# from fastapi import FastAPI, File, UploadFile, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from pydub import AudioSegment

# import assemblyai as aai
# from motor.motor_asyncio import AsyncIOMotorClient

# # Local imports
# sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# from apps.mongo_models import session_doc, message_doc
# from src.core.chatbot.chatbot_backend import ChatBot


# # ---------------------------------------------------------------------------
# # 🔥 Setup
# # ---------------------------------------------------------------------------

# # AssemblyAI
# aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

# # MongoDB
# mongo_client = AsyncIOMotorClient("mongodb://localhost:27017")
# mongo_db = mongo_client["ai_chat_db"]

# # FastAPI App
# app = FastAPI(title="AI Agent API", version="1.0.0")

# # CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000", "http://localhost:3001"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# # ---------------------------------------------------------------------------
# # 🟦 Pydantic Models
# # ---------------------------------------------------------------------------

# class ChatMessage(BaseModel):
#     message: str
#     session_id: str = "default"
#     user_id: str = "anonymous"

# class ChatResponse(BaseModel):
#     response: str
#     conversation_history: List[Dict[str, str]]
#     session_id: str

# class CreateSessionRequest(BaseModel):
#     user_id: str = "anonymous"

# class FeedbackRequest(BaseModel):
#     session_id: str
#     message_index: int
#     feedback_type: str
#     user_id: str = "anonymous"

# class ChatSession(BaseModel):
#     session_id: str
#     topic: str
#     message_count: int
#     created_at: str
#     updated_at: str

# class ChatSessionsResponse(BaseModel):
#     sessions: List[ChatSession]
#     total_count: int



# # ---------------------------------------------------------------------------
# # 🟩 Shared Logic (TEXT + VOICE USE THIS)
# # ---------------------------------------------------------------------------

# async def process_chat_message(session_id: str, user_id: str, user_message: str):
#     """
#     Unified chat processing function for both text and voice.
#     Handles:
#     ✔ Loading history
#     ✔ Agent response
#     ✔ Saving to MongoDB
#     ✔ Formatting conversation
#     """

#     print(f"[AGENT] user_id={user_id}, session_id={session_id}, message={user_message}")

#     # Fetch chat history
#     cursor = mongo_db.messages.find(
#         {"session_id": session_id, "user_id": user_id}
#     ).sort("timestamp", 1)

#     current_history = []
#     async for doc in cursor:
#         if doc["role"] == "user":
#             current_history.append([doc["content"], ""])
#         elif doc["role"] == "assistant" and current_history:
#             current_history[-1][1] = doc["content"]

#     # Agent response from ChatBot
#     bot_response, updated_chatbot = ChatBot.respond(current_history, user_message)

#     # Save new messages
#     await mongo_db.messages.insert_one(message_doc(session_id, user_id, "user", user_message))
#     await mongo_db.messages.insert_one(message_doc(session_id, user_id, "assistant", bot_response))

#     # Format conversation history
#     conversation_history = []
#     for user_msg, bot_msg in updated_chatbot:
#         conversation_history.extend([
#             {"role": "user", "content": user_msg},
#             {"role": "assistant", "content": bot_msg}
#         ])

#     return bot_response, conversation_history



# # ---------------------------------------------------------------------------
# # 🟧 VOICE CHAT ENDPOINT
# # ---------------------------------------------------------------------------

# @app.post("/chat/voice", response_model=ChatResponse)
# async def chat_voice_endpoint(
#     session_id: str = "default",
#     user_id: str = "anonymous",
#     file: UploadFile = File(...)
# ):
#     temp_file_path = None
#     converted_file_path = None

#     try:
#         # Ensure API key exists
#         if not aai.settings.api_key:
#             raise HTTPException(status_code=500, detail="ASSEMBLYAI_API_KEY not set")

#         # Save file
#         ext = os.path.splitext(file.filename)[1].lower()
#         temp_file_path = f"temp_{uuid4()}{ext}"
#         with open(temp_file_path, "wb") as f:
#             shutil.copyfileobj(file.file, f)

#         # Convert if needed
#         if ext not in [".wav", ".mp3"]:
#             converted_file_path = f"converted_{uuid4()}.wav"
#             audio = AudioSegment.from_file(temp_file_path)
#             audio.export(converted_file_path, format="wav")
#             audio_path = converted_file_path
#         else:
#             audio_path = temp_file_path

#         print(f"[VOICE] Transcribing {audio_path}")

#         # Transcribe
#         transcriber = aai.Transcriber()
#         transcript = transcriber.transcribe(audio_path)

#         if transcript.status != "completed":
#             raise HTTPException(status_code=500, detail="AssemblyAI transcription failed")

#         user_message = transcript.text
#         print(f"[VOICE TEXT] {user_message}")

#         # Use shared logic
#         bot_response, conversation_history = await process_chat_message(
#             session_id, user_id, user_message
#         )

#         return ChatResponse(
#             response=bot_response,
#             conversation_history=conversation_history,
#             session_id=session_id
#         )

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Voice processing failed: {e}")

#     finally:
#         for path in [temp_file_path, converted_file_path]:
#             if path and os.path.exists(path):
#                 os.remove(path)
#                 print(f"[DEBUG] Deleted {path}")



# # ---------------------------------------------------------------------------
# # 🟩 TEXT CHAT ENDPOINT
# # ---------------------------------------------------------------------------

# @app.post("/chat", response_model=ChatResponse)
# async def chat_endpoint(chat_message: ChatMessage):
#     try:
#         bot_response, conversation_history = await process_chat_message(
#             chat_message.session_id,
#             chat_message.user_id,
#             chat_message.message
#         )

#         return ChatResponse(
#             response=bot_response,
#             conversation_history=conversation_history,
#             session_id=chat_message.session_id
#         )

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Chat error: {e}")



# # ---------------------------------------------------------------------------
# # 🔵 CREATE SESSION
# # ---------------------------------------------------------------------------

# @app.post("/chat/session")
# async def create_chat_session(request: CreateSessionRequest):
#     session_id = str(uuid4())
#     topic = "New Chat"

#     session = session_doc(session_id, request.user_id, topic)
#     await mongo_db.sessions.insert_one(session)

#     return {"session_id": session_id, "topic": topic}



# # ---------------------------------------------------------------------------
# # 🔵 GET SESSION LIST
# # ---------------------------------------------------------------------------

# @app.get("/chat/sessions", response_model=ChatSessionsResponse)
# async def get_chat_sessions(user_id: str = "anonymous"):
#     cursor = mongo_db.sessions.find({"user_id": user_id}).sort("updated_at", -1)

#     sessions = []
#     async for doc in cursor:
#         session_id = doc["_id"]
#         count = await mongo_db.messages.count_documents({"session_id": session_id, "user_id": user_id})

#         sessions.append(ChatSession(
#             session_id=session_id,
#             topic=doc.get("topic", "New Chat"),
#             message_count=count,
#             created_at=str(doc["created_at"]),
#             updated_at=str(doc["updated_at"])
#         ))

#     return ChatSessionsResponse(
#         sessions=sessions,
#         total_count=len(sessions)
#     )



# # ---------------------------------------------------------------------------
# # 🔵 GET SESSION HISTORY
# # ---------------------------------------------------------------------------

# @app.get("/chat/{session_id}/history")
# async def get_chat_history(session_id: str, user_id: str = "anonymous"):
#     cursor = mongo_db.messages.find({"session_id": session_id, "user_id": user_id}).sort("timestamp", 1)

#     history = []
#     async for doc in cursor:
#         history.append({"role": doc["role"], "content": doc["content"]})

#     return {"session_id": session_id, "conversation_history": history}



# # ---------------------------------------------------------------------------
# # 🔵 FEEDBACK
# # ---------------------------------------------------------------------------

# @app.post("/feedback")
# async def feedback_endpoint(feedback: FeedbackRequest):
#     print(f"[FEEDBACK] {feedback.user_id} → {feedback.feedback_type}")
#     return {"status": "success"}



# # ---------------------------------------------------------------------------
# # HEALTH CHECK
# # ---------------------------------------------------------------------------

# @app.get("/health")
# async def health_check():
#     return {"status": "healthy", "message": "API running"}



# # ---------------------------------------------------------------------------
# # MAIN RUN
# # ---------------------------------------------------------------------------

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("apps.fastapi_app:app", host="127.0.0.1", port=8000, reload=True)

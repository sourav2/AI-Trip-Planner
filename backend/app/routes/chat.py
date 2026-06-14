# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List
from app.services.openai_service import OpenAIService
from app.utils.logger import get_logger

logger = get_logger("app.routes.chat")
router = APIRouter()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

# Dependency injection for OpenAI Service
def get_openai_service():
    return OpenAIService()

@router.post("/chat")
async def chat_endpoint(request: ChatRequest, service: OpenAIService = Depends(get_openai_service)):
    logger.info("POST /api/chat endpoint called.")
    try:
        # Convert Pydantic models to dicts
        api_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        reply = await service.get_chat_response(api_messages)
        return {"role": "assistant", "content": reply}
    except Exception as e:
        logger.error(f"Error handling chat endpoint request: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat request failed: {str(e)}")

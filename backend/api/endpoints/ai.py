import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import AsyncGenerator

from api import deps
from core.config import settings
from models.user import User
from schemas.ai import ChatRequest, ChatChunk, TrainRequest, TrainResponse
from services import ai_chat

router = APIRouter()

@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
) -> StreamingResponse:
    if not settings.AI_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI Chat is not enabled"
        )

    async def event_generator() -> AsyncGenerator[str, None]:
        async for chunk in ai_chat.generate_and_run(request.message, db):
            yield f"data: {chunk.model_dump_json()}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/train", response_model=TrainResponse)
async def train(
    request: TrainRequest,
    current_user: User = Depends(deps.require_role(["Admin"])),
    db: AsyncSession = Depends(deps.get_db)
) -> TrainResponse:
    if not settings.AI_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI Chat is not enabled"
        )
    
    return await ai_chat.train_schema(db)

@router.get("/health")
async def health(
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    return {
        "enabled": settings.AI_ENABLED,
        "ready": ai_chat.vanna_is_ready()
    }

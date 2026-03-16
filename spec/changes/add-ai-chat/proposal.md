# Proposal: AI Chat Feature

**Change ID**: `add-ai-chat`
**Status**: `Draft`
**Date**: 2026-03-15

## Why

The user needs a way to query the Jira timesheet data using natural language. 
The existing Streamlit application had an AI Chat feature using Vanna.ai, which needs to be ported to the new FastAPI + React/TanStack architecture.
This feature will increase productivity by allowing complex queries without manual filtering or report generation.

## What Changes

### Backend
-   **Config**: Add `OPENAI_API_KEY`, `AI_MODEL`, `AI_ENABLED`, etc. to `core/config.py`.
-   **Schemas**: Create `schemas/ai.py` with Pydantic models for chat requests and responses (SSE support).
-   **Service**: Create `services/ai_chat.py` with Vanna.ai integration, SQL sanitization, and training logic.
-   **Endpoints**: Create `api/endpoints/ai.py` with `/ai/chat` (streaming), `/ai/train`, and `/ai/health`.
-   **Router**: Include AI router in `api/router.py`.

### Frontend
-   **Permissions**: Add `ai-chat:read` and `ai-chat:train` permissions.
-   **Sidebar**: Add AI Chat nav item with permission guard.
-   **Feature Module**: Create `web/src/features/ai-chat/` with components, hooks, and schemas.
-   **Page**: Implement `AiChatPage` with streaming support, SQL code blocks, and data tables.
-   **Route**: Replace stub route with real implementation.

### Security
-   Use read-only DB role for AI queries.
-   Implement SQL allow-list (SELECT only).
-   Set `statement_timeout` for AI queries.
-   Server-side API keys only.

## Impact

-   **Specs**: New AI Chat capability.
-   **Code**: New backend services and frontend features.
-   **APIs**: New `/ai` endpoints.
-   **Users**: Admins and Managers get access to natural language querying.

# Implementation Tasks: AI Chat Feature

1.  **Backend: Config & Schemas**
    -   Add `OPENAI_API_KEY`, `AI_MODEL`, `AI_ENABLED`, `AI_QUERY_TIMEOUT_SECONDS`, `AI_MAX_RESULT_ROWS`, `VANNA_STORAGE_PATH` to `backend/core/config.py`.
    -   Create `backend/schemas/ai.py` with `ChatRequest`, `ChatChunk`, `TrainRequest`, `TrainResponse`.
2.  **Backend: Service Implementation**
    -   Create `backend/services/ai_chat.py` with Vanna singleton.
    -   Implement DDL extraction from `information_schema.columns`.
    -   Add SQL allow-list (SELECT only) and `statement_timeout`.
    -   Implement training logic and chat pipeline.
3.  **Backend: API Endpoints**
    -   Create `backend/api/endpoints/ai.py` with `/ai/chat` (streaming SSE), `/ai/train`, `/ai/health`.
    -   Include `ai.router` in `backend/api/router.py`.
4.  **Frontend: Permissions & Nav**
    -   Add `ai-chat:read`, `ai-chat:train` to `web/src/lib/permissions.ts`.
    -   Update `web/src/layouts/components/sidebar.tsx` with AI Chat navigation item.
5.  **Frontend: Feature Module (Schemas & Hooks)**
    -   Create `web/src/features/ai-chat/schemas/index.ts` with Zod schemas.
    -   Create `web/src/features/ai-chat/hooks/index.ts` with `useAiChat`, `useAiHealth`, `useAiTraining`.
6.  **Frontend: Components & UI**
    -   Implement `AiChatMessage`, `AiChatInput`, `AiChatHeader`, `AiChatDisabled` in `web/src/features/ai-chat/components/`.
    -   Implement `AiChatPage` in `web/src/features/ai-chat/pages/`.
7.  **Frontend: Routing Integration**
    -   Update `web/src/routes/_app.ai-chat.tsx` to use the real `AiChatPage`.
8.  **Testing & Validation**
    -   Create E2E test `tests/e2e/ai-chat.spec.ts`.
    -   Run `bun run typecheck` and verify build.

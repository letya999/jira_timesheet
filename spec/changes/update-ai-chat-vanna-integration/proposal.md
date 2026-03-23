# Proposal: Update AI Chat with Vanna Integration

**Change ID**: `update-ai-chat-vanna-integration`
**Status**: `Draft`
**Date**: 2026-03-18

## Why

The current AI Chat implementation is partially complete but remains disabled and hidden from the user interface. 
To provide the natural language querying capability using Vanna AI, we need to:
- Finalize the backend configuration and ensure Vanna is correctly initialized.
- Expose the AI Chat feature in the frontend for authorized users.
- Add an administrative interface to "Train" Vanna on the database schema.
- Refine the chat experience to handle SQL and data table rendering.

## What Changes

### Backend
-   **Config**: Ensure `AI_ENABLED` can be toggled via environment variables and verify `VANNA_STORAGE_PATH` is accessible.
-   **Service**: Refine `ai_chat.py` to handle potential Vanna initialization errors and ensure the read-only session is used.
-   **Permissions**: Ensure `ai-chat:train` is correctly handled in the backend for Admin users.

### Frontend
-   **Permissions**: Add missing `ai-chat:train` to the `Permission` type in `web/src/lib/permissions.ts`.
-   **Environment**: Enable `VITE_AI_ENABLED` in `.env.development`.
-   **Components**: 
    -   Create `AiChatTraining` component for schema training.
    -   Update `AiChatMessage` to render SQL blocks and data tables properly.
-   **Pages**:
    -   Add a "Train" button to `AiChatPage` (visible only for Admins).
    -   Improve the streaming UI to show the current stage of the pipeline (generating SQL, running query, etc).

## Impact

-   **Users**: Admins and Managers will gain the ability to query timesheet data via natural language.
-   **Operations**: Admins will be responsible for re-training the model whenever the database schema changes significantly.
-   **Infrastructure**: Vanna AI storage (ChromaDB) will require persistent storage.

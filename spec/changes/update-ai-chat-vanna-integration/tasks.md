# Implementation Tasks: Update AI Chat with Vanna Integration

1.  **Backend: Config & Persistence**
    - [ ] Update `.env.local` or `.env.dev` to include `AI_ENABLED=true` and `OPENAI_API_KEY`.
    - [ ] Ensure `VANNA_STORAGE_PATH` exists and is writable in both development and docker environments.
2.  **Backend: Refinement**
    - [ ] Fix `MyVanna` initialization to handle missing configuration or storage errors.
    - [ ] Verify `run_sql_safe` works correctly with the latest `settings.AI_QUERY_TIMEOUT_SECONDS`.
3.  **Frontend: Permissions Fix**
    - [ ] Update `Permission` type in `web/src/lib/permissions.ts` to include `ai-chat:train`.
    - [ ] Verify `ROLE_PERMISSIONS` has correct mappings for `admin` and `manager`.
4.  **Frontend: AI Chat Training UI**
    - [ ] Create `web/src/features/ai-chat/components/ai-chat-training.tsx` with a button to trigger `useAiTraining`.
    - [ ] Update `AiChatHeader` or `AiChatPage` to include the training button (only for users with `ai-chat:train` permission).
5.  **Frontend: Message Rendering Refinement**
    - [ ] Update `AiChatMessage` to render SQL blocks using `SyntaxHighlighter` (if available) or a stylized `<pre>` block.
    - [ ] Update `AiChatMessage` to render the `data` array as a scrollable `DataTable`.
6.  **Frontend: Streaming Pipeline Visualization**
    - [ ] Update `useAiChat` to keep track of the current stage (`generating_sql`, `running_query`, etc).
    - [ ] Update `AiChatPage` to show a progress indicator or message when the assistant is in intermediate stages.
7.  **Testing & Validation**
    - [ ] Verify training works for Admin users.
    - [ ] Test a sample query like "How many hours did we log on project X last week?"
    - [ ] Verify `ai-chat:read` permission correctly restricts access for normal employees.

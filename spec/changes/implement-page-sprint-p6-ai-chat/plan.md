# Plan: Fix Build Errors + Implement AI Chat (Task 13 — Sprint P6)
**Branch**: `feature/13-sprint-p6-advanced`
**Date**: 2026-03-15

---

## PART 1: Fix Build Errors (BLOCKING — do first)

### Error 1: `sonner` package not installed
Files importing `from "sonner"` but package is missing:
- `web/src/routes/_app.approvals.tsx`
- `web/src/routes/_app.leave.tsx`
- `web/src/routes/_app.hr.tsx`
- `web/src/routes/_app.settings.tsx`

**Fix**:
```bash
cd web && bun add sonner
```
Then check `web/src/routes/_app.tsx` — if it uses a layout, add `<Toaster />` from `sonner` to the app root layout.

### Error 2: `@/components/shared/date-range-picker` not found
File: `web/src/routes/_app.control-sheet.tsx` line 8:
```ts
import { DateRangePicker } from "@/components/shared/date-range-picker"
```
The component exists at `web/src/components/ui/date-range-picker.tsx` (not `shared`).

**Fix**: Update the import in `_app.control-sheet.tsx` to:
```ts
import { DateRangePicker } from "@/components/ui/date-range-picker"
```

After both fixes, run: `cd web && bun run typecheck` — verify 0 errors.

---

## PART 2: Implement AI Chat Page (Task 13 — Sprint P6 Advanced)

**Reference**: Streamlit page at `frontend/views/14_AI_Chat.py`

Use OpenSpec SDD skills:
1. Run `openspec-proposal` skill to create proposal
2. Run `openspec-implementation` skill to execute

Use Context7 MCP to query docs before coding:
- `vanna-ai` — check if `vanna.legacy.openai` is deprecated, find current API
- `fastapi StreamingResponse` — SSE text/event-stream pattern
- `tanstack-react-router` — beforeLoad pattern

### Security requirements (from hardcore review):
- CRITICAL: Never execute LLM-generated SQL directly — use read-only DB role + SELECT allow-list + statement_timeout 10s
- CRITICAL: API key server-side only in settings — never accept from frontend
- HIGH: Add `'ai-chat:read'` + `'ai-chat:train'` RBAC permissions

### Streamlit business logic to migrate:
1. NL → SQL → Execute → Summarize (3-stage pipeline using Vanna.ai)
2. Chat history with user/assistant message bubbles
3. Collapsible SQL code block per assistant message
4. DataTable for query results
5. Admin-only "Train / Sync Schema" panel
6. Error states with sanitized messages (no raw DB errors to client)

---

### Backend Files

#### `backend/core/config.py` — add to Settings class:
```python
OPENAI_API_KEY: str | None = None
AI_MODEL: str = "gpt-4o"
AI_ENABLED: bool = False
AI_QUERY_TIMEOUT_SECONDS: int = 10
AI_MAX_RESULT_ROWS: int = 500
VANNA_STORAGE_PATH: str = "/vanna_storage"
```

#### `backend/schemas/ai.py` — create (Pydantic v2):
```python
from pydantic import BaseModel, Field
from typing import Literal

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class ChatChunk(BaseModel):
    stage: Literal["generating_sql", "sql", "running_query", "data", "complete", "error"]
    sql: str | None = None
    data: list[dict] | None = None
    answer: str | None = None
    error: str | None = None  # generic code only, never raw exception text

class TrainRequest(BaseModel):
    force_refresh: bool = False

class TrainResponse(BaseModel):
    success: bool
    tables_trained: int
    message: str
```

#### `backend/services/ai_chat.py` — create:
- Vanna singleton with asyncio.Lock (lazy init, not per-request)
- Auto-generate training DDL from information_schema.columns (NOT hardcoded DDL strings)
- SQL allow-list: reject any statement that is not SELECT before execution
- Set `statement_timeout` on connection (10 seconds)
- Catch all exceptions, log full error, return generic error code to caller

Class structure:
```python
class MyVanna(ChromaDB_VectorStore, OpenAI_Chat):
    pass

_vanna_instance = None
_vanna_lock = asyncio.Lock()

async def get_vanna() -> MyVanna:
    # lazy singleton

async def generate_and_run(message: str) -> AsyncGenerator[ChatChunk, None]:
    # yields ChatChunk objects as SSE stages
    # stage 1: generating_sql
    # stage 2: sql (with sql text)
    # stage 3: running_query
    # stage 4: data (with result rows, max AI_MAX_RESULT_ROWS)
    # stage 5: complete (with summary answer)
    # on error: error stage with generic code

async def train_schema(db: AsyncSession) -> TrainResponse:
    # introspect information_schema.columns
    # generate DDL strings dynamically
    # call vn.train(ddl=...) for each table
```

#### `backend/api/endpoints/ai.py` — create:
```python
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

router = APIRouter()

@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
) -> StreamingResponse:
    # check settings.AI_ENABLED
    # stream ChatChunk JSON objects as text/event-stream
    # format: "data: {json}\n\n" per chunk

@router.post("/train")
async def train(
    request: TrainRequest,
    current_user: User = Depends(require_roles(["Admin"]))
) -> TrainResponse:
    # Admin-only schema training

@router.get("/health")
async def health() -> dict:
    return {"enabled": settings.AI_ENABLED, "ready": vanna_is_ready()}
```

#### `backend/api/router.py` — add line:
```python
from api.endpoints import ai
api_router.include_router(ai.router, prefix="/ai", tags=["AI Chat"])
```

---

### Frontend Files

#### `web/src/lib/permissions.ts` — add to Permission union type:
```typescript
| 'ai-chat:read'
| 'ai-chat:train'
```
And add to role definitions:
- `admin`: gains `'ai-chat:read'` and `'ai-chat:train'`
- `manager`: gains `'ai-chat:read'`

#### `web/src/layouts/components/sidebar.tsx`
Find the AI Chat nav item and add `permission: 'ai-chat:read'`.

#### `web/src/features/ai-chat/schemas/index.ts` — create:
```typescript
import { z } from 'zod'

export const chatChunkSchema = z.object({
  stage: z.enum(['generating_sql', 'sql', 'running_query', 'data', 'complete', 'error']),
  sql: z.string().nullable().optional(),
  data: z.array(z.record(z.unknown())).nullable().optional(),
  answer: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
})

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  sql: z.string().nullable().optional(),
  data: z.array(z.record(z.unknown())).nullable().optional(),
  createdAt: z.date(),
})

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
})

export type ChatChunk = z.infer<typeof chatChunkSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
```

#### `web/src/features/ai-chat/hooks/index.ts` — create:
```typescript
// useAiHealth() - GET /api/v1/ai/health via useQuery
// useAiTraining() - POST /api/v1/ai/train mutation
// useAiChat() - manages local message history + SSE streaming
//   sendMessage: async (text: string) => void
//   uses fetch() with ReadableStream (NOT EventSource - need POST body)
//   parse "data: {...}\n\n" lines from stream
//   update message state progressively as chunks arrive
//   isStreaming: boolean
//   messages: ChatMessage[]
//   clearHistory: () => void
```

#### `web/src/features/ai-chat/hooks/index.test.tsx` — create unit tests for hooks

#### `web/src/features/ai-chat/components/ai-chat-message.tsx` — create organism:
- Wraps `ChatMessage` from `@/components/chat/chat-message`
- Below text content: collapsible SQL block using shadcn Collapsible (trigger: "Show SQL")
- Below SQL: DataTable component from `@/components/ui/data-table` for result rows
- While streaming (no content yet): show Skeleton placeholder

#### `web/src/features/ai-chat/components/ai-chat-input.tsx` — create:
- Textarea with auto-resize (rows 1-4)
- Send button (disabled when isStreaming)
- Enter = submit, Shift+Enter = newline
- React Hook Form + chatRequestSchema Zod validation

#### `web/src/features/ai-chat/components/ai-chat-header.tsx` — create:
- Title "AI Chat"
- Clear History button (calls clearHistory from hook)
- Admin Training button (visible only with 'ai-chat:train' permission)
  - Opens Dialog with TrainRequest form (force_refresh checkbox)
  - Uses useAiTraining mutation

#### `web/src/features/ai-chat/components/ai-chat-disabled.tsx` — create:
- Shown when health.enabled === false
- Display: "AI Chat is not enabled. Set AI_ENABLED=true in backend config."

#### `web/src/features/ai-chat/pages/ai-chat-page.tsx` — create:
```tsx
export function AiChatPage() {
  const { data: health } = useAiHealth()
  const { messages, sendMessage, isStreaming, clearHistory } = useAiChat()

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <AiChatHeader onClearHistory={clearHistory} />
      {!health?.enabled ? (
        <AiChatDisabled />
      ) : (
        <>
          <ScrollArea className="flex-1 px-4 py-2">
            {messages.map(msg => (
              <AiChatMessage key={msg.id} message={msg} />
            ))}
            {isStreaming && <Skeleton className="h-16 w-full rounded-2xl" />}
          </ScrollArea>
          <div className="border-t p-4">
            <AiChatInput onSend={sendMessage} disabled={isStreaming} />
          </div>
        </>
      )}
    </div>
  )
}
```

#### `web/src/routes/_app.ai-chat.tsx` — replace stub:
```tsx
import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { AiChatPage } from '@/features/ai-chat/pages/ai-chat-page'

export const aiChatRoute = createRoute({
  path: 'ai-chat',
  getParentRoute: () => appLayoutRoute,
  component: AiChatPage,
})
```
Remove the `VITE_AI_ENABLED` check — handled by `useAiHealth()`.

---

### E2E Test: `tests/e2e/ai-chat.spec.ts`
Playwright tests:
1. Admin navigates to /app/ai-chat → page renders
2. Submit "How many hours did each user log?" → streaming indicators → final answer shown
3. SQL expander click → SQL code visible
4. Clear Chat button → messages cleared
5. Admin sees training button, Employee does not
6. Employee with no ai-chat:read permission → redirected to /app/dashboard

---

### Completion Criteria
After implementation, update `plans/tasks/13_page_sprint_p6_advanced.md`:
- [x] AI Chat page assembled and functional
- [x] SSE/WebSocket integration working
- [x] E2E tests pass

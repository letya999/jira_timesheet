# Proposal: fix-tooltip-provider-and-web-docker

## Why

Two independent issues block normal use of the React frontend:

1. **Runtime crash on every authenticated page** — `sidebar.tsx` (shadcn/ui) uses `<Tooltip>` inside `SidebarMenuButton`, but `<TooltipProvider>` (Radix UI requirement) is never mounted anywhere in the app tree. This causes an uncaught React error on all `/app/*` routes including the newly built Dashboard, My Timesheet, and Journal pages.

2. **No Docker container for the React frontend** — the project runs backend, worker, db, redis, and Streamlit in Docker via `docker-compose.dev.yml`, but the React/Vite frontend is only runnable on the host with `bun run dev`. Dev teams need logs, hot-reload, and service co-location inside Docker. The Vite proxy target is also hardcoded to `http://localhost:8000`, which breaks inside a Docker network where the backend is reachable as `http://backend:8000`.

## What Changes

### Fix 1 — TooltipProvider in provider tree
- `web/src/main.tsx`: import `TooltipProvider` from `@/components/ui/tooltip`, wrap `<RouterProvider>` (and devtools) with it, inside the existing `<QueryClientProvider>`

### Fix 2 — Web Docker service
- `web/Dockerfile.dev`: new dev Dockerfile — `oven/bun:1` base image, installs deps with `bun install`, exposes 5173, runs `bun run dev --host 0.0.0.0`
- `web/vite.config.ts`: make Vite proxy target configurable — read `process.env.VITE_PROXY_TARGET` with fallback `http://localhost:8000`; this allows Docker to override the target to `http://backend:8000` without changing source code
- `docker-compose.dev.yml`: add `web` service — build from `web/Dockerfile.dev`, mount `./web:/app` + anonymous `/app/node_modules`, expose `5173:5173`, set `VITE_PROXY_TARGET=http://backend:8000`, depends on `backend`

### Why VITE_API_URL stays empty in Docker
The browser (running on host) cannot reach `http://backend:8000`. The Vite dev server (running in Docker) acts as the proxy. By keeping `VITE_API_URL` unset in the container, `client.ts` falls back to `''` (relative URLs), which the browser sends to `http://localhost:5173/api/v1/...`, and the Vite server proxies them to `http://backend:8000/api/v1/...`. This is the correct two-hop pattern for browser ↔ Vite proxy ↔ backend.

However, since `client.ts` uses `VITE_API_URL || 'http://localhost:8000'`, an unset var still falls back to localhost. The correct behaviour is: when running inside Docker, `VITE_API_URL` should be set to empty string `''`. Update `client.ts` fallback to use `''` (relative) not `'http://localhost:8000'`, and set `VITE_API_URL=` in the `web` Docker service environment. Local `.env.development` keeps `VITE_API_URL=http://localhost:8000` for direct backend access when running outside Docker.

Wait — actually the cleanest approach that avoids changing client.ts: set `VITE_API_URL=http://localhost:8000` on host (already done), and in Docker Compose set no `VITE_API_URL` override but instead point proxy to backend container. Since `VITE_PROXY_TARGET` controls where Vite proxies `/api/*`, and `VITE_API_URL` controls what baseUrl the generated client uses:
- On host: `VITE_API_URL=http://localhost:8000`, proxy → `http://localhost:8000` (direct, no proxy needed)
- In Docker: `VITE_API_URL=` (empty, browser uses relative `/api/v1/...`), proxy → `http://backend:8000`

So the `web` Docker service environment must explicitly set `VITE_API_URL=` (blank) to override `.env.development`.

## Impact

**Files modified**:
- `web/src/main.tsx` — add `TooltipProvider` wrapper
- `web/vite.config.ts` — configurable proxy target via `VITE_PROXY_TARGET`
- `docker-compose.dev.yml` — add `web` service

**Files created**:
- `web/Dockerfile.dev` — dev container for React/Vite frontend

**APIs**: none affected

**Users impacted**: all developers — fixes crash on all authenticated pages; enables Docker-first dev workflow

**Dependencies confirmed**:
- `TooltipProvider` — `web/src/components/ui/tooltip.tsx` ✓
- `oven/bun:1` image — public Docker Hub ✓
- Vite `process.env` available in `vite.config.ts` (Node process, not browser) ✓
- `docker-compose.dev.yml` `web` service name not yet used ✓

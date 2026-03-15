# Implementation Tasks: fix-tooltip-provider-and-web-docker

## Fix 1 — TooltipProvider

1. Edit `web/src/main.tsx` — add `import { TooltipProvider } from '@/components/ui/tooltip'` and wrap `<RouterProvider>` (and the React Query devtools Suspense block) with `<TooltipProvider>` as a direct child of `<QueryClientProvider>`:
   ```tsx
   <QueryClientProvider client={queryClient}>
     <TooltipProvider>
       <RouterProvider router={router} />
       {/* devtools */}
     </TooltipProvider>
   </QueryClientProvider>
   ```

2. Verify fix — open `http://localhost:5173/app/dashboard` in browser; the "Something went wrong / Tooltip must be used within TooltipProvider" error SHALL no longer appear and the Dashboard page SHALL render.

## Fix 2 — Vite proxy configurable target

3. Edit `web/vite.config.ts` — in the `server.proxy` block, replace the hardcoded `'http://localhost:8000'` target with `process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000'`

4. Verify vite config still works locally — `bun run dev` on host should continue to proxy `/api/*` to `http://localhost:8000` with no `VITE_PROXY_TARGET` env set.

## Fix 3 — Web Dockerfile.dev

5. Create `web/Dockerfile.dev`:
   ```dockerfile
   FROM oven/bun:1
   WORKDIR /app
   COPY package.json bun.lockb* ./
   RUN bun install --frozen-lockfile
   EXPOSE 5173
   CMD ["bun", "run", "dev", "--host", "0.0.0.0"]
   ```
   Notes:
   - Use `oven/bun:1` (official Bun image)
   - `bun.lockb*` glob handles absent lockfile gracefully
   - `--frozen-lockfile` ensures reproducible installs
   - `--host 0.0.0.0` makes Vite listen on all interfaces so Docker port mapping works

## Fix 4 — Docker Compose web service

6. Edit `docker-compose.dev.yml` — add `web` service after `frontend` (Streamlit), before `volumes`:
   ```yaml
   web:
     build:
       context: ./web
       dockerfile: Dockerfile.dev
     volumes:
       - ./web:/app
       - /app/node_modules
     ports:
       - "5173:5173"
     environment:
       - VITE_PROXY_TARGET=http://backend:8000
       - VITE_API_URL=
     depends_on:
       - backend
   ```
   The anonymous volume `/app/node_modules` prevents the host `web/node_modules` directory from shadowing the container's installed modules.

7. Verify Docker Compose config parses cleanly — run `docker compose -f docker-compose.dev.yml config --quiet` and confirm no YAML errors.

8. Build and start the web service — run:
   ```bash
   docker compose -f docker-compose.dev.yml build web
   docker compose -f docker-compose.dev.yml up web -d
   ```
   Confirm container starts and Vite dev server is accessible at `http://localhost:5173`.

9. Verify logs stream correctly — run `docker compose -f docker-compose.dev.yml logs -f web` and confirm Vite startup output (e.g. "VITE v6.x ready") appears.

10. Verify proxy works inside Docker — open `http://localhost:5173/login` in browser, attempt login; confirm backend log shows `POST /api/v1/auth/login 200` (proxied through container Vite → backend container).

11. Run `bun run test` in `web/` — confirm all 191 unit tests still pass after `vite.config.ts` change.

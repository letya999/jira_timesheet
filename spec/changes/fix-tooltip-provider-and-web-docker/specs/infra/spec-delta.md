# Spec Delta — TooltipProvider Fix + Web Docker Service

**Change**: `fix-tooltip-provider-and-web-docker`
**Target spec**: `spec/specs/infra/spec.md` (new capability)

---

## ADDED Requirements

### Requirement: TooltipProvider in React tree
WHEN the React application initialises,
the system SHALL mount `<TooltipProvider>` as a global provider wrapping all routed content, so that any component using Radix UI `<Tooltip>` can function without error.

#### Scenario: Sidebar tooltips render without crash
GIVEN an authenticated user navigates to any `/app/*` route
WHEN the `AppLayout` mounts and renders the sidebar
THEN no "Tooltip must be used within TooltipProvider" React error SHALL be thrown
AND the sidebar SHALL render correctly with tooltip support enabled

#### Scenario: TooltipProvider wraps full router
GIVEN the app initialises in `main.tsx`
WHEN `ReactDOM.createRoot` renders the tree
THEN the component order SHALL be `QueryClientProvider > TooltipProvider > RouterProvider`
AND all child routes SHALL inherit the tooltip context

---

### Requirement: Configurable Vite Proxy Target
WHEN the Vite dev server starts,
the system SHALL read the `VITE_PROXY_TARGET` environment variable to determine the backend proxy target, falling back to `http://localhost:8000` when the variable is not set.

#### Scenario: Host dev uses localhost target
GIVEN no `VITE_PROXY_TARGET` env var is set
WHEN a request matching `/api/*` is made in the browser
THEN Vite SHALL proxy it to `http://localhost:8000`

#### Scenario: Docker dev uses container service name
GIVEN `VITE_PROXY_TARGET=http://backend:8000` is set in the container
WHEN a request matching `/api/*` is made in the browser
THEN Vite SHALL proxy it to `http://backend:8000` (resolving via Docker DNS)

---

### Requirement: Web Docker Dev Service
WHEN a developer runs `docker compose -f docker-compose.dev.yml up web`,
the system SHALL build and start a containerised Vite dev server that serves the React frontend on port 5173, proxies API requests to the backend container, and streams live logs via `docker compose logs -f web`.

#### Scenario: Container builds successfully
GIVEN `web/Dockerfile.dev` exists and `bun.lockb` is present
WHEN `docker compose -f docker-compose.dev.yml build web` runs
THEN the image SHALL build without error
AND `bun install --frozen-lockfile` SHALL complete successfully

#### Scenario: Vite dev server accessible from host
GIVEN the `web` service is running in Docker
WHEN a browser on the host navigates to `http://localhost:5173`
THEN the React app SHALL load and display the login page

#### Scenario: Hot-reload works via volume mount
GIVEN the `web` service is running with `./web:/app` volume
WHEN a developer edits a source file on the host
THEN Vite SHALL detect the change and trigger hot module replacement in the browser without restarting the container

#### Scenario: API calls proxied to backend container
GIVEN the `web` service is running and `VITE_PROXY_TARGET=http://backend:8000`
WHEN the browser sends `POST /api/v1/auth/login`
THEN Vite SHALL forward it to `http://backend:8000/api/v1/auth/login`
AND the backend container SHALL log a successful 200 response

#### Scenario: node_modules not overwritten by host volume
GIVEN the host `web/node_modules` may differ from the container's installed modules
WHEN the `web` service starts with `./web:/app` volume mount
THEN the anonymous `/app/node_modules` volume SHALL take precedence over the host directory
AND the container SHALL use the modules installed by `bun install` during build

#### Scenario: Logs stream with docker compose logs
GIVEN the `web` container is running
WHEN `docker compose -f docker-compose.dev.yml logs -f web` is executed
THEN Vite startup output (including "VITE ready" and local URL) SHALL be visible
AND subsequent HMR events SHALL appear as log lines

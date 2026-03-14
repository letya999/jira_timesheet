# Project: Jira Timesheet (agent.md)

## 📋 Project Overview
Jira Timesheet is a production-grade enterprise system for Time Tracking, Resource Management, and Financial Analytics (CapEx/OpEx). It bridges the gap in Jira Cloud's reporting capabilities by providing deep organizational hierarchy tracking, automated Jira worklog synchronization, and manual entry management for non-project activities (vacations, sick leaves, etc.).

## 🛠 Tech Stack

### Backend (Core API)
- **Runtime:** Python 3.12+ managed by `uv`
- **Framework:** FastAPI (Asynchronous)
- **Database:** PostgreSQL (Primary), Redis (Caching & Task Queue)
- **ORM:** SQLAlchemy 2.0 (Async) with Alembic for migrations
- **Validation:** Pydantic v2
- **Task Processing:** SAQ / Background Tasks
- **Formatting/Linting:** Ruff

### Frontend (Modern Stack - Active Migration)
The project is migrating from Streamlit to a modern React SPA architecture.

| Category | Tool / Library | Version | Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Core & Build** | Bun | 1.3.x | Runtime | Ultra-fast package manager and runtime. |
| | Vite | 6.x | dev | Modern build tool (React 19 & Tailwind 4 support). |
| | TypeScript | 6.x | dev | Strict typing (v6.0+ RC verified). |
| | React / React DOM | 19.x | dep | Core UI library (React 19 stable). |
| **Routing & API** | @tanstack/react-router | 1.x | dep | 100% type-safe SPA routing. |
| | @hey-api/openapi-ts | 0.94.x (pinned) | dev | Generating TS types/hooks from backend OpenAPI. |
| | @hey-api/client-fetch | latest | dep | Lightweight type-safe client for FastAPI requests. |
| **State & Data** | @tanstack/react-query | 5.x | dep | Server state management (v5 stable). |
| | Zustand | 5.x | dep | Client UI state management. |
| **Styling & UI** | Tailwind CSS | 4.x | dev | Utility-first styling (v4 engine). |
| | shadcn/ui (CLI) | latest | dev | Component generation and management. |
| | Radix UI | 1.x+ | dep | Headless primitives for accessible UI. |
| | lucide-react | 0.x | dep | Modern SVG icon library. |
| **Interactive** | @tanstack/react-table | 8.x | dep | Headless engine for complex tables. |
| | dhtmlx-gantt | 9.x+ | dep | Industrial-grade interactive Gantt charts. |
| | @dnd-kit/core | 6.x+ | dep | Modern Drag-and-Drop functionality. |
| **Forms & Validation**| React Hook Form | 7.x | dep | High-performance form management. |
| | Zod | 3.x | dep | Strict schema-based data validation. |
| | date-fns & date-fns-tz | 4.x+ | dep | Precise date and timezone manipulation. |
| **QA & Quality** | ESLint | 9.x | dev | Modern linting (Flat Config). |
| | Vitest | 3.x | dev | Native-Vite unit testing. |
| | Storybook | 8.x | dev | UI component development environment + Vitest integration. |

### Legacy Frontend (To be Deprecated)
- **Framework:** Streamlit (Python-based UI)
- **Role:** Currently acting as the primary UI while React migration is in progress. Must strictly consume the FastAPI backend.

## 📂 Key Directory Structure
- `/backend`: Core FastAPI application
  - `/api`: RESTful endpoints and dependency injection
  - `/core`: Config, security, logging, and middleware
  - `/crud`: Database abstraction layer
  - `/models`: SQLAlchemy database models
  - `/schemas`: Pydantic models for request/response validation
  - `/services`: Business logic (Jira sync, Analytics, Opex/Capex logic)
  - `/alembic`: Database migration scripts
- `/frontend`: Streamlit-based UI (Legacy)
- `/scripts`: DevOps, maintenance, and utility scripts
- `/tests`: Comprehensive test suite (backend/frontend)

## 🏗 Coding Standards

### Backend Guidelines
1. **Clean Architecture:** Maintain strict separation between Models (DB), Schemas (API), and CRUD (Logic).
2. **Type Safety:** Mandatory type hints for all function signatures. Use `typing.Annotated` for FastAPI dependencies.
3. **Async First:** Always prefer `async/await` for I/O bound operations (DB, Redis, Jira API).
4. **Standardized Responses:** Use Pydantic schemas for all API responses to ensure OpenAPI documentation is accurate.
5. **Error Handling:** Use custom exceptions defined in `core/exceptions.py` and handle them via global middleware.

### Frontend Guidelines (React)
1. **Type-Safe Routing:** Define routes in the `routes` directory using TanStack Router's file-based or code-based routing.
2. **Component Modularity:** Small, reusable components in `src/components`. Use `shadcn/ui` as the foundation.
3. **Zod Validation:** All forms and API data must be validated using Zod schemas.
4. **Custom Hooks:** Encapsulate complex logic and server-state fetching into custom React hooks.

## 📐 Architecture & Methodology

### 1. Specification & Schema-Driven (SDD)
- **Workflow:** Follow "Proposal → Review → Implement" using `openspec-*` skills.
- **Source of Truth:** All TS types and API clients MUST be auto-generated from Backend OpenAPI.

### 2. Component-Driven Development (CDD)
- **Isolation:** Components are built and verified in **Storybook** before integration.
- **Mocking:** Use **MSW** to decouple UI from backend. Components must be "alive" in Storybook.
- **Styling:** Atomic design with **Tailwind 4** and **CVA** for state/variant management.

### 3. Vertical Feature Design
- **Structure:** Group code by business domains (`src/features/`) rather than technical types. 
- **Encapsulation:** Features contain their own components, hooks, and logic to ensure high cohesion.

## 🚦 Critical Rules & Workflow
1. **Source of Truth:** This `agent.md` file is the foundational mandate for all AI-assisted development.
2. **Database Migrations:** Never modify `alembic/versions` manually. Always use `uv run alembic revision --autogenerate`.
3. **Jira Integration:** Strictly Read-Only. Never implement logic that writes or modifies data back in Jira Cloud.
4. **Security:** Zero-tolerance for hardcoded secrets. Use `.env` files and `pydantic-settings`.
5. **Testing Strategy:** 
   - Backend: `pytest` with 70%+ coverage required.
   - Frontend: `vitest` for logic, `playwright` for E2E.
6. **API-First Development:** Ensure backend endpoints are fully functional and documented via Swagger (`/docs`) before frontend implementation.
7. **Opex/Capex Classification:** All worklogs must be categorizable into Opex (Operating) or Capex (Capital) based on project/task attributes.

---
*Last Updated: 2026-03-14*

# `context.md` - Internal Resource & Time Management Service

## 1. Project Goal
Develop a lightweight, production-ready internal web service for Time Tracking, Resource Management, and Financial Analytics (CapEx/OpEx). 
The system must solve the inflexibility of standard **Jira Cloud** reports, enable the generation of pivot reports based on a complex organizational structure, control the weekly/monthly working hours quota, and account for "non-project" time (vacations, sick leaves, bench, administrative tasks).

## 2. Project Scope
**In-Scope:**
* One-way integration with Jira Cloud (read-only access to worklogs, issues, sprints, and releases).
* Maintenance of an independent, standalone database to store the organizational structure, custom categories, and manual time entries.
* Multi-user interface with authentication and Role-Based Access Control (RBAC).
* Generation of dashboards for different roles (Employee, PM, CEO) and Excel report exports.
* Full production-grade backend API with security, caching, and automated testing.

**Out-of-Scope:**
* Two-way synchronization (we DO NOT write data back to Jira).
* Issue management (creating or editing Jira tickets via the service).
* Mobile application.

## 3. Key Features

### 3.1. Jira Cloud Integration (Manual/Scheduled Sync)
* Connection to the Jira Cloud REST API via FastAPI background tasks or Celery/Arq.
* Data extraction via the `Worklogs` endpoint to get precise time logs: `Date`, `Author` (Account ID), `Time Spent`, `Issue Key`, `Summary`, `Sprint`, `Fix Version` (Release).

### 3.2. Role-Based Access Control (RBAC) & Authentication
* **JWT-based Authentication:** Secure stateless authentication using JSON Web Tokens.
* **Admin:** Full access to settings, Org Structure CRUD, manual sync triggers.
* **CEO / C-Level:** Access to global dashboards, financial reports, and company-wide aggregations.
* **PM / Team Lead:** Access to dashboards and timesheets only for their specific team/project.
* **Employee:** Access only to their personal timesheet.

### 3.3. "Org Structure" Module (Deep Nesting)
* Internal CRUD directory for employees accessible via RESTful API endpoints.
* Tree-like hierarchy: `Department -> Division -> Team -> Employee`.
* Employee profile includes: `Full Name`, `Jira Account ID`, `Role`, `Unit/Team`, `Weekly Quota` (default = 40h/week).

### 3.4. "Timesheet" Interface (Matrix View & Logging)
* **Matrix Layout:** Rows represent tasks/categories visually grouped by **Release**, **Sprint**, and **Task**. Columns represent days of the week.
* **Read-Only Jira Data:** Data synced from Jira is displayed automatically.
* **Manual Entries (CRUD):** Users can add, edit, and delete manual time entries for non-Jira activities (*Vacation, Training, Bench*). 
* **Totals & Aggregation:** The interface automatically combines Jira logs + Manual logs to calculate the **total hours per person per week and per month**.

### 3.5. Dashboards and Reports (Aggregations)
* **PM Dashboard:** View team's logged time. Aggregation of total hours per employee and per team over a selected week/month.
* **CEO Dashboard & Export:** Advanced pivot tables for CapEx/OpEx and utilization tracking.
    * **Dynamic Grouping:** `Release -> Sprint -> Task -> Assignee` OR `Department -> Division -> Team -> Employee -> Release`.
    * **Export:** Endpoint to generate and download an `.xlsx` file (via openpyxl/pandas) preserving the Pivot Table structure.

## 4. Tech Stack
* **Backend:** FastAPI (Python 3.11+).
* **Frontend:** Streamlit (acting purely as a UI consuming the FastAPI endpoints).
* **Database:** PostgreSQL (Primary DB) + Redis (for Caching & Rate Limiting).
* **ORM & Migrations:** SQLAlchemy 2.0 (Async) + Alembic.
* **Analytics & Calculations:** Pandas (for heavy grouping and Excel generation).
* **Authentication:** JWT (JSON Web Tokens) via `PyJWT` or `fastapi-users`.
* **Testing:** `pytest`, `pytest-asyncio`, `httpx` (for API testing).

## 5. Architecture & Deployment
* **Hosting:** DigitalOcean (Droplet).
* **Containerization:** Docker + Docker Compose (Services: `fastapi-backend`, `streamlit-frontend`, `postgres-db`, `redis`).
* **Web Server / Reverse Proxy:** **Caddy** (Handles automatic HTTPS/Let's Encrypt, HTTP/2, and reverse proxying to Streamlit and FastAPI).

## 6. Production Readiness & Security Constraints
* **Global Error Handling Middleware:** A custom FastAPI middleware to catch all unhandled exceptions, log them properly, and return standardized JSON error responses (e.g., `{"detail": "Internal Server Error", "code": 500}`) without leaking stack traces.
* **Rate Limiter:** Protect endpoints (especially Auth and Jira Sync) from abuse using Redis-based rate limiting (e.g., `slowapi` or custom middleware).
* **Caching:** Implement caching layer (e.g., `fastapi-cache2` with Redis backend) for heavy analytical queries and org-structure fetching to reduce PostgreSQL load.
* **Jira API Limitations:** Must handle pagination and respect Jira Cloud API rate limits. 
* **Security:** Use `.env` variables. Passwords must be hashed using `passlib` (bcrypt).

## 7. Developer Guidelines
1. **API-First Design:** The Streamlit frontend MUST NOT connect to the database directly. It must strictly consume the FastAPI REST API.
2. **Automated Testing (Autotests):** * Write unit tests for business logic (e.g., Pandas aggregations, quota calculations).
    * Write integration tests for API endpoints using `TestClient` / `httpx`.
    * Minimum test coverage expectation: 70%.
3. **Modularity:** Maintain a clean architecture: `api` (routers), `core` (config, security, middlewares), `crud` (database operations), `models` (SQLAlchemy), `schemas` (Pydantic), and `services` (Jira sync logic, Pandas logic).
4. **Data consistency:** Ensure that weekly/monthly aggregations correctly map time entries to the actual days the work was performed.
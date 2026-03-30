# Jira Timesheet

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Jira Timesheet is a production-grade enterprise system for Time Tracking, Resource Management, and Financial Analytics (CapEx/OpEx). It bridges the gap in Jira Cloud's reporting capabilities by providing deep organizational hierarchy tracking, automated Jira worklog synchronization, and manual entry management for non-project activities (vacations, sick leaves, etc.).

## 🌟 Core Features

*   **Jira Synchronization**: Automated import of worklogs, issues, and releases.
*   **Time Tracking (Journal)**: User-friendly interface for daily timesheet completion.
*   **Gantt Chart (Leave Requests)**: Visual planning of employee absences with conflict checking.
*   **Analytics & Dashboards**: Clear visualizations of team workload and project execution.
*   **Report Builder**: Data export organized by departments, divisions, and individual employees.
*   **Notifications**: Flexible alert system for timesheet completion and leave approvals.
*   **HR Module**: Management of organizational structure, roles, and access permissions.

## 🛠 Tech Stack

*   **Backend**: Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL
*   **Frontend**: React, TypeScript, Tailwind CSS (Migrating from Streamlit)
*   **Infrastructure**: Docker, Docker Compose, Caddy

## 🚀 Quick Start

### Prerequisites
*   Docker & Docker Compose

### Development Mode (Docker)
```bash
docker-compose -f docker-compose.dev.yml up --build
```
The application will be accessible at:
- Frontend: `http://localhost:8501`
- API (Swagger): `http://localhost:8000/docs`

### Production Mode
1. Configure the `.env.prod` file.
2. Run the application:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🛠️ Local Development (Without Docker)

It is recommended to use [**uv**](https://docs.astral.sh/uv/), an extremely fast Python package and project manager.

1.  **Install dependencies:**
    ```bash
    uv sync
    ```
2.  **Linting (Ruff):**
    ```bash
    uv run ruff check .
    ```
3.  **Run tests:**
    ```bash
    uv run pytest backend/tests
    ```

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

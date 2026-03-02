FROM python:3.11-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy pyproject.toml and uv.lock from workspace root to have access to workspace config
# However, usually for a single Docker image, you just want the specific project.
# Since it's a workspace, we'll copy the root pyproject.toml and the backend folder.
COPY pyproject.toml uv.lock ./
COPY backend/pyproject.toml ./backend/

# Install dependencies (without installing the package itself yet)
RUN uv sync --no-dev --no-install-project

# Copy the rest of the backend
COPY backend/ ./backend/

# Move into backend to run the app
WORKDIR /app/backend

# CMD with uv run for better environment management
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

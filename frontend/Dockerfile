FROM python:3.11-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy pyproject.toml and uv.lock from workspace root
COPY pyproject.toml uv.lock ./
COPY frontend/pyproject.toml ./frontend/

# Install dependencies
RUN uv sync --no-dev --no-install-project
RUN uv pip install "vanna[openai,chromadb]"

# Copy the rest of the frontend
COPY frontend/ ./frontend/

# Move into frontend to run the app
WORKDIR /app/frontend

CMD ["uv", "run", "streamlit", "run", "app.py", "--server.port", "8501", "--server.address", "0.0.0.0"]

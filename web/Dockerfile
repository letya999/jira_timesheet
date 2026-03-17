FROM oven/bun:1

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Add build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_APP_NAME
ARG VITE_JIRA_URL

# Build the application
RUN bun run build

# Vite preview runs on 8501 to match old streamlit port
EXPOSE 8501

CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "8501"]

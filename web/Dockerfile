FROM oven/bun:1

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock* ./

# Install dependencies (allowing update to avoid platform-specific lock issues)
RUN bun install

# Copy the rest of the application
COPY . .

# CRITICAL: Re-add build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_APP_NAME
ARG VITE_JIRA_URL

# Set them as ENV for the build process to pick up
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_JIRA_URL=$VITE_JIRA_URL

# Enable Vite debug mode
ENV VITE_DEBUG=true

# Build the application
RUN bun run build

# Vite preview runs on 8501 to match old streamlit port
EXPOSE 8501

CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "8501"]

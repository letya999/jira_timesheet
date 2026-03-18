# Stage 1: Build
# node:20-slim provides Node.js (V8) so NODE_OPTIONS and vite work reliably.
# Bun is installed only for package management (correct lock file resolution).
FROM node:20-slim AS build

WORKDIR /app

# Install bun for package management (avoids npm peer-dep conflicts)
RUN npm install -g bun@1.3.9

# Copy dependency files
COPY package.json bun.lock* ./

# Install dependencies via bun (respects bun.lock, resolves all platform binaries)
RUN bun install --frozen-lockfile

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

# Allocate 4GB to Node.js - works because vite now runs under V8, not JavaScriptCore
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build via node directly (not bun run) - ensures V8 runtime for vite/rollup
RUN node node_modules/.bin/vite build

# Stage 2: Production
FROM oven/bun:1

WORKDIR /app

# Copy only the built assets and necessary files for preview
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Vite preview runs on 8501 to match old streamlit port
EXPOSE 8501

CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "8501"]

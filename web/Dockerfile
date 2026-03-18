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

# Stage 2: Production - nginx serves static assets (~5MB image vs ~800MB bun)
FROM nginx:alpine

# SPA routing: all paths fall back to index.html for client-side router
RUN printf 'server {\n\
    listen 8501;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8501

CMD ["nginx", "-g", "daemon off;"]

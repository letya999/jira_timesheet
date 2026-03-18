# Stage 1: Build
FROM oven/bun:1 AS build

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock* ./

# Install dependencies
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

# Allocate 4GB to Node.js to handle the large number of modules (2000+)
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the application
RUN bun run build

# Stage 2: Production
FROM oven/bun:1

WORKDIR /app

# Copy only the built assets and necessary files for preview
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Vite preview runs on 8501 to match old streamlit port
EXPOSE 8501

CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "8501"]

# Stage 1: Build
FROM node:20-slim AS build

# Install pnpm or use npm (node-slim doesn't have bun)
RUN npm install -g pnpm

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml* bun.lock* ./

# Install dependencies
# We use bun.lock if it exists, otherwise pnpm/npm
RUN npm install

# Copy the rest of the application
COPY . .

# Set memory limit for Node.js build process (3GB)
ENV NODE_OPTIONS="--max-old-space-size=3072"

# Build the application with debug info
RUN npm run build -- --debug

# Stage 2: Production
FROM oven/bun:1

WORKDIR /app

# Copy only the built assets and necessary files for preview
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Vite preview runs on 8501 to match old streamlit port
EXPOSE 8501

CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "8501"]

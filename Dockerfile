# Production Dockerfile for QuizArena
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy full source and build Vite frontend
COPY . .
RUN npm run build

# Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy production dependencies and built assets
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

# Expose default port
EXPOSE 3001

# Start the unified Express + Socket.IO server
CMD ["node", "server/index.js"]

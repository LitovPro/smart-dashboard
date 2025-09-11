# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install PM2 globally
RUN npm install -g pm2

# Create app directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/package*.json ./

# Install only production dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Copy PM2 configuration
COPY ecosystem.config.js ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["pm2-runtime", "start", "ecosystem.config.js"]

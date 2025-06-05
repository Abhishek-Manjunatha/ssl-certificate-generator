
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git

# Create app directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./server/
COPY package*.json ./

# Install server dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Install frontend dependencies and build
WORKDIR /app
RUN npm ci
RUN npm run build

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the server
WORKDIR /app/server
CMD ["npm", "start"]

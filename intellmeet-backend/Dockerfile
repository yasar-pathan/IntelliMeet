# ==========================================
# STAGE 1: Build & Install Dependencies
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies if needed (e.g. node-gyp for bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package descriptors
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm ci

# Copy application source files
COPY . .

# ==========================================
# STAGE 2: Production Release
# ==========================================
FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /usr/src/app

# Copy package descriptors
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Install PM2 globally for production process management
RUN npm install -g pm2

# Copy application code from builder
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/server.js ./server.js

# Create non-root user and change ownership
RUN addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nodeuser -G nodejs && \
    mkdir -p logs && \
    chown -R nodeuser:nodejs /usr/src/app

# Switch to non-privileged user for security hardening
USER nodeuser

EXPOSE 5000

# Node-native healthcheck (bypasses curl dependency in alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e " \
  const http = require('http'); \
  const options = { host: 'localhost', port: 5000, path: '/api/v1/health', timeout: 2000 }; \
  const req = http.request(options, (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1); \
  }); \
  req.on('error', () => process.exit(1)); \
  req.end(); \
  "

# Run PM2 in no-daemon mode
CMD ["pm2-runtime", "start", "server.js", "--name", "intellimeet-api"]

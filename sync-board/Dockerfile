FROM node:20-slim AS app
WORKDIR /app

# Install OpenSSL (required for Prisma)
RUN apt-get update -y && apt-get install -y openssl

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npm --prefix backend run db:generate

# Build frontend
RUN npm --prefix frontend run build

ENV NODE_ENV=production
EXPOSE 8080

# Run migrations and start
# Trigger rebuild: 2026-05-18 v2
CMD ["sh", "-c", "npm run start:railway"]

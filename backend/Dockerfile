FROM node:20-alpine AS base
WORKDIR /app

# Install backend dependencies only
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy source
COPY backend ./backend

WORKDIR /app/backend

ENV PORT=3126

# Generate Prisma client
RUN npx prisma generate

CMD ["sh", "-c", "npx prisma db push && npx tsx src/server.ts"]

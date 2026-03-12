FROM node:20-alpine AS base
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY prisma ./prisma
COPY src ./src
COPY ssl ./ssl
COPY tsconfig.json ./tsconfig.json

# Generate Prisma client
RUN npx prisma generate

ENV PORT=3126

CMD ["sh", "-c", "npx prisma db push && npx tsx src/server.ts"]


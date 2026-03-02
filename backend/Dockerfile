FROM node:20-alpine AS base
WORKDIR /app

# Install deps
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm install

# Copy source
COPY . .

WORKDIR /app/backend
ENV PORT=4000

CMD ["npm", "run", "api:dev"]

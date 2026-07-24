# ---- Build Frontend ----
FROM node:18-alpine AS builder

WORKDIR /build
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ---- Runtime ----
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ .

# Serve built frontend from backend's static directory
COPY --from=builder /build/dist ./public

RUN mkdir -p config

EXPOSE 7978

VOLUME ["/app/config", "/videos"]

CMD ["node", "app.js"]
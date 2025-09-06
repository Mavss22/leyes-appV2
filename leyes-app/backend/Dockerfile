# backend/Dockerfile
FROM node:20-alpine

# 1) Workdir
WORKDIR /app

# 2) Dependencias
COPY backend/package*.json ./
RUN npm ci --omit=dev

# 3) Código
COPY backend ./

# 4) Prod
ENV NODE_ENV=production
EXPOSE 4000

# 5) Arranque
CMD ["node", "app.js"]

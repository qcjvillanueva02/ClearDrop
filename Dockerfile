# ClearDrop Node.js Backend Container for Render
FROM node:20-alpine

WORKDIR /app

# Copy package files (supports both root and backend/ build contexts)
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source code
COPY backend/ ./

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

CMD ["node", "server.js"]

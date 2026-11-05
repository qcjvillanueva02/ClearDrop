# ClearDrop Node.js Backend Container
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy backend application source
COPY backend/ ./

# Copy local sqlite database as offline fallback
COPY cleardrop.sqlite ../cleardrop.sqlite

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

CMD ["npm", "start"]

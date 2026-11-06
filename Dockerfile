FROM node:22-alpine

WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy server and public assets
COPY server ./server
COPY public ./public

# Ensure data and uploads directories exist
RUN mkdir -p /app/data /app/public/images/uploads

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "server/index.js"]


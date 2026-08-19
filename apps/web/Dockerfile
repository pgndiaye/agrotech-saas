FROM node:22-alpine3.22 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine3.22 AS production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
# Next.js écrit le cache d'optimisation d'images ici au runtime
RUN mkdir -p .next/cache && chown -R appuser:appgroup .next/cache
USER appuser
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]

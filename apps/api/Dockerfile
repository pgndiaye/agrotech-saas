FROM node:22-alpine AS builder
# Upgrade npm → picomatch@4.0.4 (corrige CVE HIGH picomatch@4.0.3)
RUN npm install -g npm@latest
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY package*.json ./
# Installe les dépendances prod puis supprime npm du même layer :
# npm n'est pas nécessaire au runtime et portait picomatch@4.0.3 (CVE HIGH)
RUN npm ci --omit=dev && \
    rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm \
           /usr/local/bin/npx \
           /usr/local/bin/corepack
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3001
CMD ["node", "dist/main"]

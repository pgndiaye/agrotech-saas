FROM alpine:3.22 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM alpine:3.22 AS production
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
COPY prisma.config.js ./prisma.config.js
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh && chown -R appuser:appgroup /app
USER appuser
EXPOSE 3001
ENTRYPOINT ["./entrypoint.sh"]

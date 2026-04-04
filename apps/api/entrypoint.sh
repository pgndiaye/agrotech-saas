#!/bin/sh
set -e
echo "Running Prisma migrations..."
node node_modules/.bin/prisma migrate deploy
echo "Starting application..."
exec node dist/src/main

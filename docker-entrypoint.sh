#!/bin/sh
set -e

# Initialize database if not exists
if [ ! -f /app/data/custom.db ]; then
  echo "Initializing database..."
  npx prisma db push --skip-generate
fi

# Start the application
echo "Starting МУКН..."
exec node server.js

#!/usr/bin/env sh
set -euo pipefail

# Ensure DB directory exists and is writable
mkdir -p /app/db
chown -R nobody:nogroup /app/db || true

# If a schema file is present and DB is empty, create the schema
if [ -f /app/db/schema_v2.sql ]; then
  echo "Schema file found in /app/db/schema_v2.sql"
fi

# If a schema is provided in the image path, copy it into place
if [ -f /app/db/schema_v2.sql ]; then
  : # already present
else
  if [ -f /app/db/schema_v2.sql ]; then
    cp /app/db/schema_v2.sql /app/db/schema_v2.sql || true
  fi
fi

# Finally run gunicorn binding to the PORT environment variable
PORT=${PORT:-3001}
exec gunicorn agents.logic.sqlite_service.index:app -b 0.0.0.0:${PORT} --workers 2 --threads 2

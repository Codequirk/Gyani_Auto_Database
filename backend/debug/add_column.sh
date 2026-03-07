#!/bin/bash

# Simple script to add dismissed_by_company column to company_tickets if it doesn't exist
# This is a safe operation that uses ALTER TABLE ADD COLUMN IF NOT EXISTS

cd /home/user/projects/Gyani_Auto_Database/backend

# Load environment
export $(grep -v '^#' .env | xargs)

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set. Using individual DB parameters..."
  # Try to use individual parameters
  DB_HOST=${DB_HOST:-localhost}
  DB_PORT=${DB_PORT:-5432}
  DB_USER=${DB_USER:-root}
  DB_NAME=${DB_NAME:-admin_panel_db}
  DB_PASSWORD=${DB_PASSWORD:-}
  
  # Build connection string
  export PGPASSWORD="$DB_PASSWORD"
  CONN_STRING="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
else
  CONN_STRING="$DATABASE_URL"
fi

echo "Adding dismissed_by_company column to company_tickets table..."
echo "Using connection: $CONN_STRING"

# Create SQL script
cat > /tmp/add_column.sql << 'EOF'
-- Add dismissed_by_company column if it doesn't exist
ALTER TABLE company_tickets
ADD COLUMN IF NOT EXISTS dismissed_by_company BOOLEAN DEFAULT FALSE;

-- Create index if it doesn't exist  
CREATE INDEX IF NOT EXISTS idx_company_tickets_company_status_dismissed
ON company_tickets(company_id, ticket_status, dismissed_by_company);

-- Verify changes
\dt company_tickets
\d company_tickets
EOF

# Execute SQL
if command -v psql &> /dev/null; then
  psql "$CONN_STRING" -f /tmp/add_column.sql
  if [ $? -eq 0 ]; then
    echo "✓ Column addition successful"
  else
    echo "✗ Failed to add column - check connection string"
  fi
else
  echo "psql not found. Using node to check..."
  node -e "
    require('dotenv').config();
    const pgp = require('pg-promise')();
    const db = pgp(process.env.DATABASE_URL);
    
    db.none('ALTER TABLE company_tickets ADD COLUMN IF NOT EXISTS dismissed_by_company BOOLEAN DEFAULT FALSE;')
      .then(() => {
        console.log('✓ Column added successfully');
        db.$pool.end();
        process.exit(0);
      })
      .catch(err => {
        console.error('✗ Error:', err.message);
        db.$pool.end();
        process.exit(1);
      });
  "
fi

# Clean up
rm -f /tmp/add_column.sql

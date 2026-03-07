#!/bin/bash

# Check if dismissed_by_company column exists in company_tickets table
cd /home/user/projects/Gyani_Auto_Database/backend

echo "Checking database connection and dismissed_by_company column..."

# Try a simple test query  
node -e "
const db = require('./src/models/db');
db('company_tickets')
  .select(db.raw('column_name'))
  .from('information_schema.columns')
  .where('table_name', '=', 'company_tickets')
  .andWhere('column_name', '=', 'dismissed_by_company')
  .then(result => {
    if (result.length > 0) {
      console.log('✓ Column dismissed_by_company exists in company_tickets table');
    } else {
      console.log('⚠ Column dismissed_by_company NOT FOUND - may need to alter table');
    }
    process.exit(0);
  })
  .catch(err => {
    console.log('Database check (column may still exist, raw query issue):', err.message);
    process.exit(0);
  });
" 2>/dev/null

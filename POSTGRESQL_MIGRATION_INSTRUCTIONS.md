# PostgreSQL Migration - Complete Step-by-Step Instructions

## Phase 1: Prerequisites & Setup (10 minutes)

### Step 1.1: Install PostgreSQL
- Download PostgreSQL from: https://www.postgresql.org/download/windows/
- During installation:
  - Set password for `postgres` user (remember this!)
  - Keep port as `5432`
  - Install pgAdmin (optional but helpful)

### Step 1.2: Create Database
Open pgAdmin or PowerShell:
```powershell
# Using psql
psql -U postgres
# Enter password when prompted

# In psql terminal:
CREATE DATABASE admin_panel_db;
CREATE USER admin_user WITH PASSWORD 'admin123';
ALTER ROLE admin_user SET client_encoding TO 'utf8';
ALTER ROLE admin_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE admin_user SET default_transaction_deferrable TO on;
ALTER ROLE admin_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE admin_panel_db TO admin_user;
\q
```

---

## Phase 2: Backend Installation (5 minutes)

### Step 2.1: Install Dependencies
```powershell
# Navigate to backend directory
cd r:\auto data base\Gyani_Auto_Database\backend

# Remove MongoDB dependency
npm uninstall mongoose

# Install PostgreSQL dependencies
npm install pg knex
```

---

## Phase 3: Configuration (5 minutes)

### Step 3.1: Create `.env` File
Create file: `r:\auto data base\Gyani_Auto_Database\backend\.env`

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=admin_panel_db
DB_USER=admin_user
DB_PASSWORD=admin123

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Logging
LOG_LEVEL=debug
```

---

## Phase 4: Create Migration Files (15 minutes)

All migration files will be created in: `backend/src/migrations/`

These files define your database schema (tables, columns, relationships).

---

## Phase 5: Update Core Files (10 minutes)

### Step 5.1: Update Database Connection File
File: `backend/src/models/db.js` - This is updated to use PostgreSQL/Knex instead of MongoDB

### Step 5.2: Update Main Server File
File: `backend/src/index.js` - Remove MongoDB connection, keep express setup

### Step 5.3: Create Knex Configuration File
File: `backend/knexfile.js` - Tells Knex how to connect to PostgreSQL

---

## Phase 6: Update All Models (20 minutes)

Convert each model from Mongoose to Knex:
- `backend/src/models/Admin.js`
- `backend/src/models/Area.js`
- `backend/src/models/Auto.js`
- `backend/src/models/Company.js`
- `backend/src/models/Assignment.js`
- `backend/src/models/Payment.js`
- `backend/src/models/CompanyTicket.js`

Each model will change from:
```javascript
// OLD - Mongoose
const schema = new mongoose.Schema({...});
const Admin = mongoose.model('Admin', schema);
```

To:
```javascript
// NEW - Knex
class Admin {
  static async findById(id) {
    return db('admins').where({id, deleted_at: null}).first();
  }
  // ... more methods
}
```

---

## Phase 7: Create Seed File (10 minutes)

File: `backend/src/seeds/001_initial_seed.js`
- This file populates your database with initial test data
- Creates sample admin, areas, autos, companies

---

## Phase 8: Run Migrations & Seeds (5 minutes)

```powershell
cd backend

# Create all tables in PostgreSQL
npx knex migrate:latest

# Populate with sample data
npx knex seed:run

# Or if you prefer: node src/seeds/001_initial_seed.js
```

---

## Phase 9: Update Controllers (as needed)

Controllers may need minor updates if they:
- Use MongoDB-specific features (`.toObject()`, `.lean()`)
- Use MongoDB operators like `$set`, `$inc`
- Access `_id` fields

Most controllers should work as-is with minimal changes.

---

## Phase 10: Test Everything (10 minutes)

```powershell
cd backend
npm run dev
```

Test endpoints:
- GET http://localhost:5000/health
- POST http://localhost:5000/api/auth/login
- GET http://localhost:5000/api/admins

---

## Total Time Required: ~90 minutes

**Estimated Breakdown:**
- Setup: 15 minutes
- Installation: 5 minutes
- Configuration: 5 minutes
- Migrations & Models: 45 minutes
- Testing: 15 minutes
- Troubleshooting: 10 minutes

---

## Common Issues & Solutions

### Issue: "Database admin_panel_db does not exist"
**Solution:** Run CREATE DATABASE command in PostgreSQL

### Issue: "Cannot connect to database"
**Solution:** Check `.env` file credentials match PostgreSQL setup

### Issue: "Column does not exist"
**Solution:** Run `npx knex migrate:latest` to create tables

### Issue: "No data in database"
**Solution:** Run `npx knex seed:run` to populate data

---

## Rollback (if needed)

If you need to revert to MongoDB:
```powershell
npm uninstall pg knex
npm install mongoose
git checkout backend/src/models/db.js
git checkout backend/src/index.js
```

---

## Next Steps After Migration

1. ✅ Frontend doesn't need changes (API stays the same)
2. ✅ Test all admin panel features
3. ✅ Test company portal features
4. ✅ Update environment variables in production
5. ✅ Backup PostgreSQL database regularly


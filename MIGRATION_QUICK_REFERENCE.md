# POSTGRESQL MIGRATION - QUICK REFERENCE CHECKLIST

## 🚀 QUICK START (90 minutes total)

### ⏱️ Phase 1: PostgreSQL Setup (15 min)
- [ ] Download PostgreSQL from https://www.postgresql.org/download/windows/
- [ ] Run installer with password: `admin123`, port: `5432`
- [ ] Verify: `psql --version` ✓

### ⏱️ Phase 2: Create Database (10 min)
```powershell
psql -U postgres
```
Then run:
```sql
CREATE DATABASE admin_panel_db;
CREATE USER admin_user WITH PASSWORD 'admin123';
ALTER ROLE admin_user SET client_encoding TO 'utf8';
GRANT ALL PRIVILEGES ON DATABASE admin_panel_db TO admin_user;
\q
```

### ⏱️ Phase 3: Backend Setup (10 min)
```powershell
cd r:\auto data base\Gyani_Auto_Database\backend

# Create .env file with:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=admin_panel_db
# DB_USER=admin_user
# DB_PASSWORD=admin123
# PORT=5000
# NODE_ENV=development
# JWT_SECRET=your_secret_key
# JWT_EXPIRE=7d

npm uninstall mongoose
npm install pg knex
```

### ⏱️ Phase 4: Run Migrations (10 min)
```powershell
npx knex migrate:latest
npx knex seed:run
```

### ⏱️ Phase 5: Start & Test (35 min)

**Terminal 1 - Backend:**
```powershell
npm run dev
```

**Terminal 2 - Company Portal:**
```powershell
cd r:\auto data base\Gyani_Auto_Database\company-portal
npm run dev
```

**Terminal 3 - Frontend:**
```powershell
cd r:\auto data base\Gyani_Auto_Database\frontend
npm run dev
```

**Terminal 4 - Test APIs:**
```powershell
curl http://localhost:5000/health
curl http://localhost:5000/api/areas
curl http://localhost:5000/api/admins
```

---

## ✅ VERIFICATION CHECKLIST

### Database Level
- [ ] PostgreSQL running
- [ ] Database `admin_panel_db` exists
- [ ] User `admin_user` exists
- [ ] All 7 tables created (run: `\dt` in psql)
- [ ] Sample data in tables

### Backend Level
- [ ] `.env` file exists with correct values
- [ ] `node_modules/pg` and `node_modules/knex` exist
- [ ] No errors on `npm run dev`
- [ ] Server says: "✓ Server running on port 5000"
- [ ] Health endpoint: `curl http://localhost:5000/health` returns `{"status":"ok"}`

### Admin Login
- [ ] Can reach http://localhost:3001 (or your port)
- [ ] Can login with email: `pragna@company.com`
- [ ] Can view dashboard
- [ ] Can view areas, autos, companies, assignments

### Company Portal
- [ ] Can reach http://localhost:3000 (or your port)
- [ ] Can login as company
- [ ] Can see assignments
- [ ] Can see calendar
- [ ] Can view payments

### API Endpoints (in PowerShell)
```powershell
# These should all return JSON data:
curl http://localhost:5000/api/areas
curl http://localhost:5000/api/admins
curl http://localhost:5000/api/autos
curl http://localhost:5000/api/companies
curl http://localhost:5000/api/assignments
```

- [ ] GET /api/areas ✓
- [ ] GET /api/admins ✓
- [ ] GET /api/autos ✓
- [ ] GET /api/companies ✓
- [ ] GET /api/assignments ✓
- [ ] GET /api/payments ✓
- [ ] GET /api/company-tickets ✓

---

## 🔧 COMMANDS REFERENCE

### PostgreSQL Commands
```powershell
# Connect to database
psql -U postgres
psql -U admin_user -d admin_panel_db

# Inside psql:
\l              # List databases
\dt             # List tables
\d admins       # Describe table
SELECT * FROM admins;
\q              # Exit
```

### Backend Commands
```powershell
cd backend

# Install/Update
npm install
npm uninstall mongoose
npm install pg knex

# Migrations
npx knex migrate:latest    # Run all pending migrations
npx knex migrate:rollback  # Undo last batch
npx knex migrate:status    # Show migration status

# Seeds
npx knex seed:run          # Run seeds
npx knex seed:make seed_name  # Create new seed

# Running
npm start                  # Production
npm run dev               # Development (with hot reload)
npm test                  # Run tests
```

### Test Commands
```powershell
# Health check
curl http://localhost:5000/health

# Get data
curl http://localhost:5000/api/areas
curl http://localhost:5000/api/admins
curl http://localhost:5000/api/autos

# Login
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"pragna@company.com","password":"Test1234"}'
```

---

## 🆘 QUICK FIXES

| Problem | Solution |
|---------|----------|
| "database admin_panel_db does not exist" | Run: `psql -U postgres` → `CREATE DATABASE admin_panel_db;` |
| "Cannot connect to database" | Check `.env` file credentials match PostgreSQL setup |
| "Column does not exist" | Run: `npx knex migrate:latest` |
| "No data in database" | Run: `npx knex seed:run` |
| "Port 5000 already in use" | Change PORT in `.env` or kill process: `taskkill /PID <PID> /F` |
| "mongoose module not found" | Run: `npm uninstall mongoose` |
| "pg/knex not found" | Run: `npm install pg knex` |

---

## 📁 FILES MODIFIED

✓ backend/knexfile.js - Added PostgreSQL config  
✓ backend/src/models/db.js - Changed to Knex  
✓ backend/src/index.js - Removed MongoDB connect  
✓ backend/src/models/Admin.js - Converted queries  
✓ backend/src/models/Area.js - Converted queries  
✓ backend/src/models/Auto.js - Converted queries  
✓ backend/src/models/Company.js - Converted queries  
✓ backend/src/models/Assignment.js - Converted queries  
✓ backend/src/models/Payment.js - Converted queries  
✓ backend/src/models/CompanyTicket.js - Converted queries  

---

## 💾 BACKUP COMMANDS

```powershell
# Backup database
pg_dump -U admin_user -d admin_panel_db -f backup.sql

# Restore database
psql -U admin_user -d admin_panel_db -f backup.sql

# Backup to compressed file
pg_dump -U admin_user -d admin_panel_db | gzip > backup.sql.gz
```

---

## 🎯 SUCCESS INDICATORS

✓ PostgreSQL installed and running  
✓ Database created  
✓ Backend starts without errors  
✓ Company portal starts without errors  
✓ Frontend starts without errors  
✓ Admin can login  
✓ Company can login  
✓ API endpoints return data  
✓ Dashboard shows statistics  

**When all boxes are ✓, you're done! 🎉**

---

## 📖 FULL INSTRUCTIONS

For detailed step-by-step instructions with explanations, see:
`STEP_BY_STEP_POSTGRESQL_MIGRATION.md`

For PostgreSQL setup guide, see:
`POSTGRESQL_MIGRATION_INSTRUCTIONS.md`


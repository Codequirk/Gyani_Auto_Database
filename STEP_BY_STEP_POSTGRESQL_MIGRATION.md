# COMPLETE POSTGRESQL MIGRATION - STEP BY STEP INSTRUCTIONS

**Total Time: ~90 minutes**

---

## ✅ COMPLETED CHANGES (Already Done)

The following files have already been updated to use PostgreSQL:

✓ `backend/knexfile.js` - Database connection config  
✓ `backend/src/models/db.js` - Changed from MongoDB to Knex/PostgreSQL  
✓ `backend/src/index.js` - Removed MongoDB connection call  
✓ `backend/src/models/Admin.js` - Converted to Knex queries  
✓ `backend/src/models/Area.js` - Converted to Knex queries  
✓ `backend/src/models/Auto.js` - Converted to Knex queries  
✓ `backend/src/models/Company.js` - Converted to Knex queries  
✓ `backend/src/models/Assignment.js` - Converted to Knex queries  
✓ `backend/src/models/Payment.js` - Converted to Knex queries  
✓ `backend/src/models/CompanyTicket.js` - Converted to Knex queries  

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### **PHASE 1: INSTALL POSTGRESQL (15 minutes)**

#### Step 1.1: Download PostgreSQL
1. Go to: https://www.postgresql.org/download/windows/
2. Download PostgreSQL 14 or 15
3. Run the installer

#### Step 1.2: Install PostgreSQL
During installation:
- **Username**: `postgres` (keep default)
- **Password**: `admin123` (use this for our setup OR change later in .env)
- **Port**: `5432` (keep default)
- **Check**: "Install pgAdmin" (helpful for managing database)

#### Step 1.3: Verify PostgreSQL Installation
Open PowerShell and run:
```powershell
psql --version
```
You should see: `psql (PostgreSQL) 14.x` or similar

---

### **PHASE 2: CREATE DATABASE (10 minutes)**

#### Step 2.1: Open PostgreSQL Command Line
```powershell
psql -U postgres
# Enter password when prompted (default: admin123)
```

#### Step 2.2: Create Database & User
Copy and paste these commands in psql (one at a time):

```sql
CREATE DATABASE admin_panel_db;
```

```sql
CREATE USER admin_user WITH PASSWORD 'admin123';
```

```sql
ALTER ROLE admin_user SET client_encoding TO 'utf8';
ALTER ROLE admin_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE admin_user SET default_transaction_deferrable TO on;
```

```sql
GRANT ALL PRIVILEGES ON DATABASE admin_panel_db TO admin_user;
```

#### Step 2.3: Verify & Exit
```sql
\l
```
You should see `admin_panel_db` in the list. Then exit:
```sql
\q
```

---

### **PHASE 3: SETUP BACKEND ENVIRONMENT (10 minutes)**

#### Step 3.1: Create .env File
Navigate to backend directory:
```powershell
cd r:\auto data base\Gyani_Auto_Database\backend
```

Create file: `.env`
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=admin_panel_db
DB_USER=admin_user
DB_PASSWORD=admin123
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
LOG_LEVEL=debug
```

#### Step 3.2: Install Dependencies
```powershell
cd r:\auto data base\Gyani_Auto_Database\backend

# Remove MongoDB dependency
npm uninstall mongoose

# Install PostgreSQL driver and Knex
npm install pg knex

# If not already installed, get these:
npm install bcryptjs dotenv express express-validator jsonwebtoken uuid cors morgan multer
```

**Wait for npm to complete** (this takes 2-3 minutes)

---

### **PHASE 4: RUN MIGRATIONS (10 minutes)**

#### Step 4.1: Create Tables in PostgreSQL
From backend directory, run:
```powershell
npx knex migrate:latest
```

**Expected Output:**
```
Batch 1 run: 7 migrations
✓ 001_create_areas.js
✓ 002_create_admins.js
✓ 003_create_autos.js
✓ 004_create_companies.js
✓ 005_create_assignments.js
✓ 006_create_audit_logs.js
```

#### Step 4.2: Verify Tables Created
```powershell
# Connect to database and check
psql -U admin_user -d admin_panel_db

# Inside psql, run:
\dt
```

You should see tables:
- `admins`
- `areas`
- `autos`
- `assignments`
- `companies`
- `company_tickets`
- `payments`

Exit: `\q`

---

### **PHASE 5: POPULATE SAMPLE DATA (5 minutes)**

#### Step 5.1: Run Seeds
From backend directory:
```powershell
# Check if seeds exist (they should already be set up):
npx knex seed:run
```

**Alternative** (if seeds don't work):
```powershell
node src/seeds/001_initial_seed.js
```

---

### **PHASE 6: TEST BACKEND SERVER (10 minutes)**

#### Step 6.1: Start Backend Server
From backend directory:
```powershell
npm run dev
```

**Expected Output:**
```
✓ Server running on port 5000
✓ Using PostgreSQL database
```

#### Step 6.2: Test Health Endpoint
Open a NEW PowerShell and test:
```powershell
curl http://localhost:5000/health
```

**Expected Response:**
```json
{"status":"ok"}
```

#### Step 6.3: Test Database Connection
Try login endpoint:
```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "pragna@company.com",
    "password": "Test1234"
  }'
```

If you see a response (any response), database is connected! ✅

Keep the server running (don't close this terminal).

---

### **PHASE 7: TEST COMPANY PORTAL (5 minutes)**

#### Step 7.1: Start Company Portal (New Terminal)
```powershell
cd r:\auto data base\Gyani_Auto_Database\company-portal
npm run dev
```

Wait for it to start on port 3000.

#### Step 7.2: Test Company Portal
Open browser: http://localhost:3000

Try login with:
- Email: (any company email from database)
- Password: (check database or see seed data)

---

### **PHASE 8: TEST ADMIN PANEL (5 minutes)**

#### Step 8.1: Start Frontend (New Terminal)
```powershell
cd r:\auto data base\Gyani_Auto_Database\frontend
npm run dev
```

Wait for it to start on port 3001 (or next available).

#### Step 8.2: Test Admin Panel
Open browser: http://localhost:3001

Try login with:
- Email: `pragna@company.com`
- Password: `Test1234`

---

### **PHASE 9: VERIFY ALL FEATURES (10 minutes)**

#### Step 9.1: Admin Panel Checks
✓ Can login  
✓ Can view areas  
✓ Can view autos  
✓ Can view companies  
✓ Can view assignments  
✓ Can view dashboard stats  

#### Step 9.2: Company Portal Checks
✓ Can login as company  
✓ Can view assignments  
✓ Can see calendar  
✓ Can view payments  

#### Step 9.3: Backend API Checks
Run these in PowerShell:

```powershell
# Get all areas
curl http://localhost:5000/api/areas

# Get all admins
curl http://localhost:5000/api/admins

# Get all autos
curl http://localhost:5000/api/autos

# Get all companies
curl http://localhost:5000/api/companies
```

All should return JSON arrays! ✅

---

## 🚀 IF EVERYTHING WORKS

Congratulations! You've successfully migrated from MongoDB to PostgreSQL!

### Save & Commit Your Work
```powershell
cd r:\auto data base\Gyani_Auto_Database
git add .
git commit -m "chore: migrate from MongoDB to PostgreSQL"
git push
```

---

## ⚠️ TROUBLESHOOTING

### Issue: "Database does not exist"
**Solution:**
```powershell
psql -U postgres
CREATE DATABASE admin_panel_db;
\q
```

### Issue: "Cannot connect to database"
**Check 1:** Verify .env file exists and has correct values
```powershell
cat backend\.env
```

**Check 2:** Verify PostgreSQL is running
```powershell
psql -U postgres -c "SELECT 1"
```

### Issue: "Column does not exist"
**Solution:** Run migrations
```powershell
cd backend
npx knex migrate:latest
```

### Issue: "No data in database"
**Solution:** Run seeds
```powershell
npx knex seed:run
```

### Issue: "Port 5000 already in use"
**Solution:** Change PORT in .env file, or kill existing process:
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue: "npm packages not found"
**Solution:** Reinstall dependencies
```powershell
rm -r node_modules package-lock.json
npm install
```

---

## 📊 DATABASE BACKUP

### Backup Your Database
```powershell
pg_dump -U admin_user -d admin_panel_db -f backup.sql
```

### Restore from Backup
```powershell
psql -U admin_user -d admin_panel_db -f backup.sql
```

---

## 📝 WHAT CHANGED

| Aspect | MongoDB | PostgreSQL |
|--------|---------|-----------|
| Driver | Mongoose | Knex + pg |
| Connection | `connectDB()` | `const db = knex(config)` |
| Find Query | `Model.findOne({})` | `db('table').where({}).first()` |
| Find All | `Model.find({})` | `db('table').where({})` |
| Create | `new Model({}).save()` | `db('table').insert({})` |
| Update | `Model.findOneAndUpdate()` | `db('table').where({}).update()` |
| Delete | `Model.deleteMany()` | `db('table').where({}).del()` |
| Auto Convert | `.toObject()` | (not needed - already objects) |
| ID Type | ObjectId | UUID (string) |

---

## ✅ FINAL CHECKLIST

- [ ] PostgreSQL installed
- [ ] Database `admin_panel_db` created
- [ ] User `admin_user` created
- [ ] `.env` file in backend directory
- [ ] Dependencies installed (`npm install`)
- [ ] Migrations run (`npx knex migrate:latest`)
- [ ] Seeds run (`npx knex seed:run`)
- [ ] Backend starts (`npm run dev`)
- [ ] Company portal starts (`npm run dev`)
- [ ] Frontend starts (`npm run dev`)
- [ ] Admin can login
- [ ] Company can login
- [ ] All API endpoints working

---

## 🆘 NEED HELP?

If you encounter issues:

1. **Check error message** - Read what the error says carefully
2. **Verify PostgreSQL** - `psql -U postgres -c "SELECT 1"`
3. **Check .env** - Make sure file exists with correct credentials
4. **Check migrations** - `npx knex migrate:status`
5. **Check database** - `psql -U admin_user -d admin_panel_db -c "\dt"`

---

**Total Migration Time: ~90 minutes**

**You've successfully migrated from MongoDB to PostgreSQL! 🎉**


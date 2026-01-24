# ⚠️ POSTGRESQL INSTALLATION REQUIRED

PostgreSQL is not currently installed on your system. Before proceeding with the migration, you **MUST** install PostgreSQL first.

## 🔴 CRITICAL: PostgreSQL Installation Required

Your system shows:
- ✅ Node.js: Installed
- ✅ Project files: Ready
- ❌ PostgreSQL: **NOT INSTALLED** ← You need this first

## 📥 Installation Steps (10-15 minutes)

### Step 1: Download PostgreSQL
1. Open your browser and go to: **https://www.postgresql.org/download/windows/**
2. Click the download link for PostgreSQL 14 or 15
3. Wait for the ~200MB installer to download

### Step 2: Run the Installer
1. Open the downloaded `.exe` file
2. Click "Next" through the installer
3. Accept the license agreement
4. Choose installation directory (default is fine)

### Step 3: Configuration During Installation
⚠️ **Important - These settings are required:**

- **Password for postgres user:** `admin123` (IMPORTANT!)
- **Port:** `5432` (keep default)
- **Locale:** Default is fine
- **Stack Builder:** Uncheck this at the end

### Step 4: Complete Installation
1. Click "Install" and wait for installation to complete
2. Check the "Launch Stack Builder?" checkbox (optional but helpful)
3. Click "Finish"

### Step 5: Verify Installation
Open PowerShell and run:
```powershell
psql --version
```

You should see output like: `psql (PostgreSQL) 14.x` or `psql (PostgreSQL) 15.x`

## ✅ After PostgreSQL Installation

Once PostgreSQL is installed, run this script to complete the database setup:

```powershell
cd "r:\auto data base\Gyani_Auto_Database"
.\setup-postgresql.ps1
```

This script will:
1. ✓ Verify PostgreSQL is installed
2. ✓ Create the database (`admin_panel_db`)
3. ✓ Create the user (`admin_user`)
4. ✓ Setup backend environment
5. ✓ Install npm dependencies
6. ✓ Run database migrations
7. ✓ Seed initial data

## 📋 Manual Setup (If Script Fails)

If you prefer to set up manually or if the script has issues:

### 1. Open PostgreSQL Command Line
```powershell
psql -U postgres
# Enter password: admin123
```

### 2. Create Database
```sql
CREATE DATABASE admin_panel_db;
CREATE USER admin_user WITH PASSWORD 'admin123';
ALTER ROLE admin_user SET client_encoding TO 'utf8';
ALTER ROLE admin_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE admin_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE admin_panel_db TO admin_user;
\q
```

### 3. Setup Backend
```powershell
cd "r:\auto data base\Gyani_Auto_Database\backend"
npm install
npx knex migrate:latest
npx knex seed:run
```

### 4. Start Backend
```powershell
npm run dev
```

## 🆘 Troubleshooting

### "psql" is not recognized
- PostgreSQL is not installed
- PostgreSQL installation directory is not in Windows PATH
- **Solution:** Install PostgreSQL using the installer above

### Connection refused on port 5432
- PostgreSQL is installed but not running
- **Solution:** Start PostgreSQL service:
  ```powershell
  Get-Service postgresql-x64-* | Start-Service
  ```

### Password issues
- Make sure you set password to `admin123` during installation
- Or change the password in your `.env` file

### Database already exists error
- The database has been partially created
- **Solution:** Delete the database first:
  ```powershell
  psql -U postgres -c "DROP DATABASE admin_panel_db;"
  ```
- Then run the setup script again

## ✨ After Successful Setup

Your migration is complete when you see:
- ✓ PostgreSQL installed and running
- ✓ Database `admin_panel_db` created
- ✓ User `admin_user` created
- ✓ 7 tables created in database
- ✓ Backend npm dependencies installed
- ✓ Migrations executed

You can then start the application:

```powershell
cd backend
npm run dev
```

## 📞 Need Help?

1. Check the `STEP_BY_STEP_POSTGRESQL_MIGRATION.md` for detailed instructions
2. Check the `COMPLETE_MIGRATION_CHECKLIST.md` for verification steps
3. Review PostgreSQL logs for detailed errors

---

**Status: ❌ PostgreSQL Installation Required Before Continuing**

Please install PostgreSQL first, then run `.\setup-postgresql.ps1`

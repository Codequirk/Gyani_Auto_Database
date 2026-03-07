# PostgreSQL Setup Guide for Windows

## Step 1: Download PostgreSQL

Visit: https://www.postgresql.org/download/windows/

Or use the installer script in this folder:
- **install-postgresql.bat** (easiest - just double-click as Administrator)
- **install-postgresql.ps1** (PowerShell version)

## Step 2: Run the Installer

When prompted, use these settings:
- **Port:** 5432
- **Superuser:** postgres
- **Password:** admin123
- **Service name:** PostgreSQL15

## Step 3: Create Database and User

Open PowerShell and run these commands:

```powershell
# Login to PostgreSQL
psql -U postgres

# Inside psql (paste each line):
CREATE DATABASE admin_panel_db;
CREATE USER admin_user WITH PASSWORD 'admin123';
GRANT ALL PRIVILEGES ON DATABASE admin_panel_db TO admin_user;
\q
```

Or run them all at once:

```powershell
psql -U postgres -c "CREATE DATABASE admin_panel_db;"
psql -U postgres -c "CREATE USER admin_user WITH PASSWORD 'admin123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE admin_panel_db TO admin_user;"
```

## Step 4: Setup Backend

```powershell
cd backend
npm install
npx knex migrate:latest
npx knex seed:run
```

## Step 5: Start Backend

```powershell
npm run dev
```

You should see:
```
[DB] Connecting to development environment
Server running on port 5000
```

## Step 6: Start Frontend

Open another PowerShell terminal:

```powershell
cd frontend
npm install
npm run dev
```

## Step 7: Start Company Portal

Open another PowerShell terminal:

```powershell
cd company-portal
npm install
npm run dev
```

## Verify Everything Works

- Backend: http://localhost:5000/health (should return `{"status":"ok"}`)
- Frontend: http://localhost:5173
- Company Portal: http://localhost:5174

## Troubleshooting

### "psql: command not found"
PostgreSQL is not in your PATH. Add it manually:
```powershell
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"
```

Or check if PostgreSQL is installed in a different location.

### "FATAL: Ident authentication failed"
Use the admin_user instead of postgres:
```powershell
psql -U admin_user -d admin_panel_db
```

### "Database connection refused"
- Check PostgreSQL service is running: `Get-Service PostgreSQL15`
- Start it: `Start-Service PostgreSQL15`
- Check .env file has correct credentials

### "Tables don't exist"
Run migrations:
```powershell
cd backend
npx knex migrate:latest
npx knex seed:run
```

## Default Login Credentials

**Admin Portal:**
- Email: pragna@company.com
- Password: Test1234

**Company Portal:**
- Email: company@example.com
- Password: Test1234

---

**Questions?** Check the error logs in the backend console.

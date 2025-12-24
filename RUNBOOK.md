# RUNBOOK: Admin Panel Web App

## Quick Start (5 minutes)

### Windows Users
```powershell
# Run from the root Connect folder
.\setup.bat

# Then in separate terminals:
# Terminal 1:
cd backend
npm run dev

# Terminal 2:
cd frontend
npm run dev
```

### Mac/Linux Users
```bash
# Run from the root Connect folder
bash setup.sh

# Then in separate terminals:
# Terminal 1:
cd backend
npm run dev

# Terminal 2:
cd frontend
npm run dev
```

### Access Application
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Login Email**: pragna@company.com
- **Login Password**: Test1234

---

## Complete Manual Setup

### Prerequisites
- Node.js 16+ (download from nodejs.org)
- PostgreSQL 12+ (download from postgresql.org)
- A code editor (VSCode recommended)

### Step 1: Create Database

**Windows (PowerShell as Administrator):**
```powershell
# Navigate to PostgreSQL bin directory
cd "C:\Program Files\PostgreSQL\15\bin"
.\createdb.exe -U postgres admin_panel_db
```

**Mac/Linux:**
```bash
createdb admin_panel_db
```

Or use pgAdmin GUI: Create new database named `admin_panel_db`

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Or on Windows: copy .env.example .env

# Edit .env with your PostgreSQL credentials
# Open .env in your editor and update:
# DB_HOST=localhost
# DB_USER=postgres
# DB_PASSWORD=your_postgres_password
# DB_NAME=admin_panel_db
# JWT_SECRET=your_secret_key_here

# Run migrations (creates tables)
npm run migrate

# Seed database (adds test data)
npm run seed

# Start development server
npm run dev
```

**Expected Output:**
```
Server running on port 5000
```

### Step 3: Frontend Setup (New Terminal)

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

**Expected Output:**
```
  VITE v5.0.8  ready in 234 ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

### Step 4: Test the Application

Open http://localhost:3000 in your browser

1. Click "Login" or "Register"
2. Use default credentials:
   - Email: `pragna@company.com`
   - Password: `Test1234`
3. Click Login → Navigate to Dashboard

---

## Features Walkthrough

### Dashboard (First Page)
- **Summary Cards**: Shows counts of autos in different states
- **Priority List**: Red-highlighted autos with 2 days or less remaining
- **Empty Slots**: Autos not currently assigned
- **Expand Button**: Shows full list of all autos

### Autos Page (Search)
- **Search Bar**: Find autos by auto_no or owner_name
- **Filter by Area**: Dropdown to filter by location
- **Filter by Status**: Dropdown for IN_BUSINESS, OUT_OF_BUSINESS, IDLE, ASSIGNED
- **Bulk Select**: Check boxes to select multiple autos
- **Bulk Assign**: Assign selected autos to a company for N days

### Admin Features
- Login/Register new admins
- View all admins
- Delete admins (soft delete - data preserved)

---

## API Examples

### 1. Login and Get Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pragna@company.com",
    "password": "Test1234"
  }'
```

**Response:**
```json
{
  "admin": {
    "id": "uuid...",
    "name": "Pragna",
    "email": "pragna@company.com",
    "role": "SUPER_ADMIN"
  },
  "token": "eyJhbGc..."
}
```

Save the `token` for use in other requests.

### 2. Get Dashboard Summary

```bash
curl -X GET http://localhost:5000/api/dashboard/summary \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "summary": {
    "in_business": 1,
    "out_of_business_2days": 0,
    "idle_slots": 1,
    "priority_2days": 1
  },
  "idle_autos": [...],
  "priority_autos": [...]
}
```

### 3. Create Auto

```bash
# First get area IDs:
curl -X GET http://localhost:5000/api/areas

# Then create auto:
curl -X POST http://localhost:5000/api/autos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "auto_no": "KA01AA6666",
    "owner_name": "Jane Doe",
    "area_id": "AREA_UUID",
    "notes": "Good condition"
  }'
```

### 4. Bulk Assign Autos

```bash
# First get company and auto IDs:
curl -X GET http://localhost:5000/api/autos \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

curl -X GET http://localhost:5000/api/companies \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Then bulk assign:
curl -X POST http://localhost:5000/api/assignments/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "auto_ids": ["AUTO_ID_1", "AUTO_ID_2"],
    "company_id": "COMPANY_ID",
    "days": 7,
    "start_date": "2024-01-15"
  }'
```

---

## Testing

### Run Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- dateUtils.test.js
```

### Run Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

---

## Database Schema

### admins
```
id (UUID) → Primary Key
name → Admin's full name
email → Unique email
password_hash → bcrypt hashed password
role → SUPER_ADMIN or ADMIN
created_at → Record creation timestamp
updated_at → Last update timestamp
deleted_at → Soft delete timestamp (NULL = active)
updated_by_admin_id → FK to admin who updated
```

### areas
```
id (UUID) → Primary Key
name → Area/locality name (unique)
created_at, updated_at → Timestamps
```

### autos
```
id (UUID) → Primary Key
auto_no → Vehicle registration (unique)
owner_name → Owner's name
area_id → FK to areas
status → IN_BUSINESS | OUT_OF_BUSINESS | IDLE | ASSIGNED
last_updated_at → When status last changed
notes → Additional notes
created_at, updated_at, deleted_at → Timestamps
```

### companies
```
id (UUID) → Primary Key
name → Company name
required_autos → Number of autos needed
area_id → FK to areas
days_requested → Duration of assignment
status → REQUESTED | APPROVED | REJECTED
created_by_admin_id → FK to admins
created_at, updated_at, deleted_at → Timestamps
```

### assignments
```
id (UUID) → Primary Key
auto_id → FK to autos
company_id → FK to companies
start_date → Assignment start date
end_date → Assignment end date
status → ACTIVE | COMPLETED | PREBOOKED
created_at, updated_at → Timestamps
```

---

## Troubleshooting

### "Cannot find module 'pg'" Error
```bash
cd backend
npm install pg
npm run migrate
```

### Port 5000 Already in Use (Windows)
```powershell
# Find and kill process on port 5000
$process = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($process) {
  Stop-Process -Id $process.OwningProcess -Force
}

# Or change port in src/index.js:
# const PORT = 5001; // Use different port
```

### Port 3000 Already in Use (Windows)
```powershell
# Kill process on port 3000
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($process) {
  Stop-Process -Id $process.OwningProcess -Force
}
```

### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432

Solution:
1. Check PostgreSQL is running
2. Verify .env credentials match your PostgreSQL setup
3. On Windows: Look for PostgreSQL service in Services app
4. On Mac: brew services start postgresql
5. On Linux: sudo systemctl start postgresql
```

### Migration Error "relation already exists"
```bash
# Reset database (careful - deletes all data!)
cd backend
npm run migrate:rollback
npm run migrate
npm run seed
```

### JWT Token Expired
- Token expires after 7 days by default
- Login again to get a new token
- Update JWT_EXPIRE in .env if needed

### CORS Errors
- Backend runs on port 5000
- Frontend runs on port 3000
- CORS is configured in backend/src/index.js
- Vite proxy is configured in frontend/vite.config.js

---

## Performance Optimization

### Enable Real-time Polling
Dashboard polls every 10 seconds by default. To change:
```javascript
// frontend/src/pages/DashboardPage.jsx
const { data, refetch } = usePolling(dashboardService.getSummary, 5000); // 5 seconds
```

### Database Indices
Already created on frequently queried columns:
- `autos.auto_no`
- `autos.status`
- `autos.last_updated_at`
- `assignments.end_date`
- `assignments.status`

---

## Production Deployment

### Backend (Node.js)
```bash
cd backend
npm install --production
NODE_ENV=production npm start
```

### Frontend (React/Vite)
```bash
cd frontend
npm run build
# Output in dist/ folder
# Serve with: npx serve -s dist
```

### Environment Variables for Production
```
DB_HOST=production-db-host
DB_USER=prod_user
DB_PASSWORD=secure_password_here
JWT_SECRET=very_secure_secret_key_minimum_32_chars
NODE_ENV=production
PORT=5000
```

---

## Monitoring & Logs

### Backend Logs
```bash
# Development (with Morgan)
npm run dev
# Shows: GET /api/autos 200 15.234 ms - 1234

# Production
NODE_ENV=production npm start 2>&1 | tee app.log
```

### Check Database
```bash
# Connect to PostgreSQL
psql -U postgres -d admin_panel_db

# List tables
\dt

# Check records
SELECT COUNT(*) FROM autos;
SELECT COUNT(*) FROM assignments;

# Exit
\q
```

---

## Support & Resources

### Files in This Project
- `backend/` - Express server, models, migrations
- `frontend/` - React + Vite application
- `openapi.json` - API documentation
- `AdminPanel.postman_collection.json` - Postman requests
- `README.md` - Full documentation
- `setup.bat/setup.sh` - Automated setup

### Key Files to Know
- Backend entry: `backend/src/index.js`
- Frontend entry: `frontend/src/main.jsx`
- Database config: `backend/knexfile.js`
- API routes: `backend/src/routes/*.js`
- Page components: `frontend/src/pages/*.jsx`

### Testing Commands
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Both
npm test:coverage
```

---

## Success Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `admin_panel_db` created
- [ ] Backend dependencies installed (`npm install`)
- [ ] Backend migrations run (`npm run migrate`)
- [ ] Backend seeded (`npm run seed`)
- [ ] Backend running on port 5000 (`npm run dev`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Frontend running on port 3000 (`npm run dev`)
- [ ] Can access http://localhost:3000
- [ ] Can login with pragna@company.com / Test1234
- [ ] Dashboard shows summary cards
- [ ] Autos list displays data
- [ ] API calls work in Postman/curl

---

## Next Steps

1. **Customize Areas**: Edit `backend/src/seeds/001_initial_seed.js` to add your localities
2. **Add Companies**: Use the UI or API to register actual companies
3. **Bulk Import**: Add auto registration via CSV/XLS upload
4. **Notifications**: Add email alerts for priority autos
5. **Analytics**: Add charts and reporting dashboards
6. **Mobile**: Create React Native mobile app

---

Generated: December 2024
Version: 1.0.0

# Step-by-Step Setup Instructions - MongoDB Migration

## 🎯 Complete Setup in 5-10 Minutes

---

## STEP 1️⃣: Install MongoDB (2 minutes)

### Windows
```powershell
# Option A: Using Chocolatey (Recommended)
choco install mongodb-community

# Option B: Download installer
# Visit: https://www.mongodb.com/try/download/community
# Download for Windows
# Run installer with default settings
# Install as service (checked by default)

# Option C: Using MongoDB Atlas (No local install)
# Go to https://www.mongodb.com/cloud/atlas
# Create free account
# Create a cluster
# Get connection string
# Update MONGODB_URI in backend/.env

# Start MongoDB Service
net start MongoDB

# Verify MongoDB is running
tasklist | findstr mongo
```

### Mac
```bash
# Using Homebrew (Recommended)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Verify
brew services list | grep mongodb
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongod
sudo systemctl status mongod
```

---

## STEP 2️⃣: Setup Backend (2 minutes)

```powershell
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Copy environment file
Copy-Item .env.example .env

# Verify .env exists
Get-Content .env | Select-String MONGODB_URI

# Expected output:
# MONGODB_URI=mongodb://localhost:27017/admin_panel_db
```

### ⚙️ Optional: Configure Environment

If using MongoDB Atlas (cloud), edit `.env`:
```powershell
notepad .env
```

Find this line:
```
MONGODB_URI=mongodb://localhost:27017/admin_panel_db
```

Replace with MongoDB Atlas connection string:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/admin_panel_db
```

---

## STEP 3️⃣: Seed Database (1 minute)

```powershell
# Make sure you're in backend folder
cd backend

# Run seed script
npm run seed
```

### Expected Output:
```
✓ MongoDB connected successfully
🌱 Starting seed...
✓ Cleared existing data
✓ Areas seeded
✓ Admins seeded
✓ Autos seeded
✓ Companies seeded
✓ Assignments seeded (1 active with 1 day remaining)

✅ Seed completed successfully!

📋 Demo Credentials:
   Email: pragna@company.com
   Password: Test1234
   Role: SUPER_ADMIN
```

### 🐛 Troubleshooting Seed
```powershell
# If seed fails: Check MongoDB is running
net start MongoDB

# Then retry
npm run seed

# If still fails: Check connection string in .env
notepad .env

# Verify line: MONGODB_URI=mongodb://localhost:27017/admin_panel_db
```

---

## STEP 4️⃣: Start Backend (1 minute)

```powershell
# Still in backend folder
npm run dev
```

### Expected Output:
```
✓ MongoDB connected successfully
✓ Server running on port 5000
```

### 🚀 Backend is now running!

**✅ Backend:** http://localhost:5000  
**✅ Health Check:** http://localhost:5000/health

---

## STEP 5️⃣: Setup Frontend (2 minutes)

### Open NEW Terminal/PowerShell window

```powershell
# Navigate to frontend folder
cd frontend

# Install dependencies (if not done before)
npm install

# Copy environment file
Copy-Item .env.example .env

# Start development server
npm run dev
```

### Expected Output:
```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  press h + enter to show help
```

### 🚀 Frontend is now running!

**✅ Frontend:** http://localhost:3000

---

## STEP 6️⃣: Test Login (1 minute)

1. Open browser: **http://localhost:3000**
2. You'll see login page
3. Enter credentials:
   - **Email:** `pragna@company.com`
   - **Password:** `Test1234`
4. Click **Login**

### Expected Page:
✅ Dashboard loads  
✅ Shows dashboard with stats  
✅ Shows "1 day remaining" priority auto  
✅ Shows idle autos  
✅ Navbar shows logged-in user  

---

## STEP 7️⃣: Verify Everything Works (2 minutes)

### ✅ Dashboard Features

- [ ] Navigate to **Dashboard** - should show summary cards
- [ ] See **4 summary cards**:
  - In Business (count)
  - Out of Business (count)
  - Idle Slots (count)
  - 2-Days Remaining (count)
- [ ] See **Priority Autos** table (red highlighted)
- [ ] See **Idle Slots** table (yellow highlighted)
- [ ] Click **"+"** button to expand all autos list

### ✅ Autos Page Features

- [ ] Click **Autos** in navbar
- [ ] See list of autos with filters
- [ ] Try **search** by auto number (e.g., "KA01")
- [ ] Try **filter by area** dropdown
- [ ] Try **filter by status** dropdown
- [ ] Select autos with **checkboxes**
- [ ] Click **Bulk Assign** button
- [ ] Assign to company with date

### ✅ API Health

```powershell
# In PowerShell
curl http://localhost:5000/health

# Expected response:
# {"status":"ok"}
```

### ✅ Verify Database

```bash
# Open MongoDB shell
mongosh

# In the shell:
use admin_panel_db
show collections
db.admins.findOne()
db.autos.find().count()
db.assignments.findOne()
```

---

## 🎯 Complete Checklist

### Prerequisites
- [ ] Node.js installed (`node --version` shows v16+)
- [ ] MongoDB installed and running
- [ ] npm working (`npm --version` shows v8+)

### Backend Setup
- [ ] Backend folder has `node_modules` (from npm install)
- [ ] `.env` file exists with MONGODB_URI
- [ ] Seed completed successfully
- [ ] Backend server running on port 5000
- [ ] Health endpoint responds: http://localhost:5000/health

### Frontend Setup
- [ ] Frontend folder has `node_modules`
- [ ] `.env` file exists (can be empty)
- [ ] Frontend server running on port 3000
- [ ] Vite shows "ready in XXX ms"

### Login & Dashboard
- [ ] Can open http://localhost:3000
- [ ] Can login with pragna@company.com / Test1234
- [ ] Dashboard loads with data
- [ ] Navbar shows logged-in user
- [ ] Can navigate between pages

### Data Verification
- [ ] Can see 3 autos in database
- [ ] Can see 2 companies
- [ ] Can see 1 active assignment
- [ ] Can see priority auto (1 day remaining)

### Database Verification
- [ ] MongoDB running (`net start MongoDB` shows success)
- [ ] Can connect with mongosh
- [ ] Can see admin_panel_db database
- [ ] Can see admins collection with 2 records

---

## ⏱️ Estimated Time Breakdown

| Step | Activity | Time |
|------|----------|------|
| 1 | Install MongoDB | 2 min |
| 2 | Setup Backend | 2 min |
| 3 | Seed Database | 1 min |
| 4 | Start Backend | 1 min |
| 5 | Setup Frontend | 2 min |
| 6 | Test Login | 1 min |
| 7 | Verify Features | 2 min |
| **TOTAL** | **Complete Setup** | **~11 min** |

---

## 🚀 Quick Reference Commands

### Start Everything (After First Setup)

```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Open http://localhost:3000 in browser
```

### Reseed Database
```powershell
cd backend
npm run seed
```

### Clear Database (Development Only)
```bash
mongosh
use admin_panel_db
db.admins.deleteMany({})
db.autos.deleteMany({})
db.assignments.deleteMany({})
```

### Stop Services
```powershell
# Close both terminals (Ctrl+C in each)

# Or stop MongoDB service
net stop MongoDB
```

---

## 🐛 Troubleshooting During Setup

### Issue: "mongodb is not recognized"
```powershell
# Check if installed
where mongosh

# If not found, MongoDB not in PATH
# Reinstall or restart computer
choco install mongodb-community --force
```

### Issue: "Cannot find module 'mongoose'"
```powershell
cd backend
npm install mongoose
```

### Issue: "Port 5000 already in use"
```powershell
# Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID [PID] /F

# Or change PORT in .env to 5001
```

### Issue: "Port 3000 already in use"
```powershell
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Or Vite will ask to use different port
```

### Issue: "Cannot connect to MongoDB"
```powershell
# Verify MongoDB is running
tasklist | findstr mongo

# If not running:
net start MongoDB

# Check connection string in .env
notepad backend\.env

# Should be: mongodb://localhost:27017/admin_panel_db
```

### Issue: "Seed failed - no database"
```powershell
# MongoDB auto-creates on first write
# Just make sure MongoDB is running and retry
npm run seed

# If still fails:
net stop MongoDB
net start MongoDB
npm run seed
```

### Issue: "Cannot login - bad credentials"
```powershell
# Check seeding worked
mongosh
use admin_panel_db
db.admins.findOne()

# Should return admin with email pragna@company.com

# If missing, reseed:
npm run seed
```

---

## 📚 Next Steps After Setup

1. **Read Documentation**
   - `MONGODB_SETUP_GUIDE.md` - Detailed reference
   - `RUNBOOK.md` - Feature walkthrough
   - `QUICK_REFERENCE.md` - Quick commands

2. **Explore Features**
   - Create new autos
   - Create companies
   - Assign autos to companies
   - Search and filter
   - View dashboard updates

3. **Run Tests**
   ```powershell
   cd backend
   npm test
   ```

4. **Review Code**
   - `backend/src/models/` - Mongoose models
   - `backend/src/controllers/` - Business logic
   - `frontend/src/pages/` - React components

5. **Customize**
   - Add new fields to models
   - Create new API endpoints
   - Modify UI components
   - Add more features

---

## 💡 Pro Tips

1. **MongoDB Compass** - Download GUI for visual database management
2. **Postman** - Test API endpoints with collection
3. **VS Code** - Install MongoDB extension for database browsing
4. **Hot Reload** - Both backend and frontend auto-reload on code changes
5. **Logs** - Check terminal output for errors and debugging

---

## ✅ Success Indicators

When everything is set up correctly, you should see:

**Backend Terminal:**
```
✓ MongoDB connected successfully
✓ Server running on port 5000
```

**Frontend Terminal:**
```
  VITE v5.0.0  ready in XXX ms
  ➜  Local:   http://localhost:3000/
```

**Browser:**
- Login page loads at http://localhost:3000
- Dashboard displays with data after login
- Navbar shows user email
- No console errors

**Database:**
- MongoDB running (tasklist shows mongod.exe)
- Collections created in admin_panel_db
- Seed data visible in mongosh

---

## 🎉 You're Done!

Your MongoDB-powered admin panel is now running! 🚀

**Enjoy exploring the application!**

For issues or questions, check:
- `MONGODB_SETUP_GUIDE.md` - Detailed reference
- `QUICK_REFERENCE.md` - Common commands
- `MIGRATION_REPORT.md` - Technical details

---

Generated: December 20, 2025  
Setup Time: ~10 minutes  
Difficulty: Easy  
Status: ✅ Ready to Use

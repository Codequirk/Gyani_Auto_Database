# ✅ DUAL PORTAL SETUP - COMPLETE SUMMARY

**Date**: December 26, 2025  
**Status**: ✅ READY TO USE  
**Created by**: GitHub Copilot Assistant

---

## 📊 What Was Done

You now have a **completely separated frontend setup** with:

✅ **Admin Portal** running on **Port 3000** (directory: `frontend/`)  
✅ **Company Portal** running on **Port 3001** (directory: `company-portal/`)  
✅ **Backend Server** on **Port 5000** (directory: `backend/`) - SHARED  
✅ **MongoDB Database** - SHARED between both portals

---

## 🎯 Directory Structure

```
Connect/
├── backend/                          ← Backend API (Port 5000) - SHARED
│   ├── src/
│   ├── package.json
│   ├── .env
│   └── ...
│
├── frontend/                         ← Admin Portal (Port 3000)
│   ├── src/
│   ├── vite.config.js               (configured for port 3000)
│   ├── package.json                 (dev script: npm run dev → port 3000)
│   ├── .env                         (VITE_API_URL & VITE_PORTAL_TYPE=admin)
│   └── ...
│
├── company-portal/                  ← Company Portal (Port 3001)
│   ├── src/
│   ├── vite.config.js               (configured for port 3001)
│   ├── package.json                 (dev script: npm run dev → port 3001)
│   ├── .env                         (VITE_API_URL & VITE_PORTAL_TYPE=company)
│   └── ...
│
├── start-all.bat                    ← One-click startup (Windows)
├── start-all.ps1                    ← PowerShell startup
├── DUAL_PORTAL_SETUP.md             ← Architecture & detailed setup
├── INSTALLATION_GUIDE.md            ← Step-by-step installation
└── [Other documentation files]
```

---

## 🚀 HOW TO START

### 🎯 QUICKEST METHOD (One Click)
```powershell
# Navigate to project root
cd "C:\Users\pragn.LAPTOP-DAHFBVDA\OneDrive\Documents\Connect"

# Double-click this file:
start-all.bat
```

This will automatically start:
1. Backend (Port 5000)
2. Admin Portal (Port 3000)
3. Company Portal (Port 3001)

Each in its own window. **Wait ~10 seconds for all to start.**

### 📋 MANUAL METHOD (3 Terminals)

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Admin Portal:**
```powershell
cd frontend
npm run dev
```

**Terminal 3 - Company Portal:**
```powershell
cd company-portal
npm run dev
```

---

## 🌐 ACCESS POINTS

Once everything is running:

| Service | URL | Purpose |
|---------|-----|---------|
| **Admin Portal** | http://localhost:3000 | Admin dashboard & management |
| **Company Portal** | http://localhost:3001 | Company dashboard & requests |
| **Backend API** | http://localhost:5000 | REST API (shared) |
| **Backend Health** | http://localhost:5000/health | Check if backend is running |

---

## 🔐 LOGIN CREDENTIALS

### Admin Portal (Port 3000)
- **Email**: pragna@company.com
- **Password**: Test1234
- **Role**: SUPER_ADMIN

### Company Portal (Port 3001)
- Use company registration form or existing company credentials
- Each company has their own login

---

## 📝 WHAT CHANGED

### Files Created:
- ✅ `start-all.bat` - Batch script for Windows (starts all 3 services)
- ✅ `start-all.ps1` - PowerShell script (alternative)
- ✅ `DUAL_PORTAL_SETUP.md` - Comprehensive setup documentation
- ✅ `INSTALLATION_GUIDE.md` - Step-by-step installation guide
- ✅ `company-portal/` - Complete copy of frontend folder

### Files Modified:
- ✅ `frontend/vite.config.js` - Set port 3000 explicitly
- ✅ `frontend/package.json` - Added dev script with port 3000
- ✅ `company-portal/vite.config.js` - Set port 3001
- ✅ `company-portal/package.json` - Added dev script with port 3001
- ✅ `frontend/.env` - Added VITE_PORTAL_TYPE=admin
- ✅ `company-portal/.env` - Added VITE_PORTAL_TYPE=company

---

## 🔄 HOW IT WORKS

```
User on Admin Portal (3000)
        ↓
    Frontend React App
        ↓
    API Interceptor (auto-uses admin token)
        ↓
    http://localhost:5000/api
        ↓
    Backend (Node.js/Express)
        ↓
    MongoDB Database
        ↓
    Data returned to Admin Portal


User on Company Portal (3001)
        ↓
    Frontend React App
        ↓
    API Interceptor (auto-uses company token)
        ↓
    http://localhost:5000/api  (SAME backend!)
        ↓
    Backend (Node.js/Express)
        ↓
    MongoDB Database (SAME database!)
        ↓
    Data returned to Company Portal
```

**Key Points:**
- Both portals use the **SAME backend** on port 5000
- Both portals use the **SAME MongoDB database**
- Each portal has its **own authentication token** (admin vs company)
- The API service automatically routes to correct token based on URL
- Frontend code is identical in both portals (exact copies)

---

## 📦 BEFORE FIRST RUN - INSTALL DEPENDENCIES

**One-time setup** (run these commands):

```powershell
cd "C:\Users\pragn.LAPTOP-DAHFBVDA\OneDrive\Documents\Connect"

# Install backend dependencies
cd backend
npm install
cd ..

# Install admin portal dependencies
cd frontend
npm install
cd ..

# Install company portal dependencies
cd company-portal
npm install
cd ..

# Seed database (first time only)
cd backend
npm run seed
cd ..
```

---

## ⚙️ CONFIGURATION

### Backend (`backend/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/admin_panel_db
JWT_SECRET=your_secret_key
```

### Admin Portal (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_PORTAL_TYPE=admin
```

### Company Portal (`company-portal/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_PORTAL_TYPE=company
```

---

## 🛑 STOPPING SERVICES

### Using Batch File:
Just close the terminal windows.

### Manual:
Press `Ctrl+C` in each terminal, or close the windows.

### Force Stop All:
```powershell
# Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Stop MongoDB
net stop MongoDB
```

---

## 🔧 TROUBLESHOOTING

### Problem: Port Already in Use

**Solution:**
```powershell
# Kill process on port
$port = 3000  # Change to 3001 or 5000
netstat -ano | findstr :$port | ForEach-Object { 
    $parts = $_ -split '\s+'; 
    taskkill /PID $parts[-1] /F 
}
```

### Problem: MongoDB Won't Start

**Solution:**
```powershell
# Check if running
tasklist | findstr mongo

# Start service
net start MongoDB

# Check status
Get-Service MongoDB
```

### Problem: npm install fails

**Solution:**
```powershell
# Clear cache
npm cache clean --force

# Retry
npm install
```

### Problem: Can't connect to backend

**Solution:**
1. Verify backend is running: `curl http://localhost:5000/health`
2. Check .env file has correct API_URL
3. Check browser console (F12) for errors

---

## 📚 DOCUMENTATION FILES

You now have comprehensive documentation:

| File | Purpose |
|------|---------|
| `DUAL_PORTAL_SETUP.md` | Architecture and detailed setup |
| `INSTALLATION_GUIDE.md` | Step-by-step installation |
| `QUICK_REFERENCE.md` | Quick commands and tips |
| `SETUP_STEPS.md` | Original MongoDB setup (still valid) |

---

## 🎓 DEVELOPMENT WORKFLOW

### Making Changes to Admin Portal:
```powershell
cd frontend
# Edit files in src/
# Changes auto-reload on http://localhost:3000
```

### Making Changes to Company Portal:
```powershell
cd company-portal
# Edit files in src/
# Changes auto-reload on http://localhost:3001
```

### Making Changes to Backend:
```powershell
cd backend
# Edit files in src/
# Changes auto-reload via nodemon
```

### Syncing Code Between Portals:
Since both portals are separate copies:
- If you want changes in both portals, update both `frontend/` and `company-portal/`
- Or modify shared code and copy changes between them

---

## 🚀 NEXT STEPS

1. **Install dependencies** (if not done):
   ```powershell
   cd backend && npm install && npm run seed && cd ..
   cd frontend && npm install && cd ..
   cd company-portal && npm install && cd ..
   ```

2. **Start everything**:
   ```powershell
   cd "C:\Users\pragn.LAPTOP-DAHFBVDA\OneDrive\Documents\Connect"
   start-all.bat
   ```

3. **Test both portals**:
   - Admin: http://localhost:3000 (login with pragna@company.com / Test1234)
   - Company: http://localhost:3001 (register or login with company account)

4. **Start development**:
   - Edit code in `frontend/src/` or `company-portal/src/`
   - Changes auto-reload instantly

---

## ✅ VERIFICATION CHECKLIST

Before you start, verify:

- [ ] Node.js installed (`node --version` shows v16+)
- [ ] npm installed (`npm --version`)
- [ ] MongoDB installed and running (`net start MongoDB`)
- [ ] Port 5000 is free for backend
- [ ] Port 3000 is free for admin portal
- [ ] Port 3001 is free for company portal
- [ ] `node_modules` exists in `backend/`, `frontend/`, `company-portal/`
- [ ] `.env` files exist with correct URLs

---

## 📞 QUICK HELP

| Need | Command |
|------|---------|
| Start everything | `start-all.bat` |
| Start backend only | `cd backend && npm run dev` |
| Start admin only | `cd frontend && npm run dev` |
| Start company only | `cd company-portal && npm run dev` |
| Kill all node processes | `Get-Process node \| Stop-Process -Force` |
| Check port usage | `netstat -ano \| findstr :3000` |
| Clear npm cache | `npm cache clean --force` |
| Reseed database | `cd backend && npm run seed` |

---

## 🎉 YOU'RE ALL SET!

Your dual portal setup is complete and ready to use!

**To get started:**
1. Navigate to project root
2. Run `start-all.bat`
3. Open http://localhost:3000 (Admin) or http://localhost:3001 (Company)
4. Start developing!

---

**Created**: December 26, 2025  
**Status**: ✅ Ready for Development  
**Architecture**: Dual Frontend (Admin + Company) + Single Backend + Single Database

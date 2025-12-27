# Dual Portal Installation & First Run Guide

## ✅ Step 1: Install Dependencies (One-Time Setup)

Run this in PowerShell from the project root:

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

Write-Host "All dependencies installed successfully!" -ForegroundColor Green
```

## ✅ Step 2: Setup MongoDB

Make sure MongoDB is installed and running:

```powershell
# Start MongoDB service (if not running)
net start MongoDB

# Verify it's running
tasklist | findstr mongo
```

## ✅ Step 3: Seed Database (First Time Only)

```powershell
cd backend
npm run seed
cd ..
```

Expected output:
```
✓ MongoDB connected successfully
🌱 Starting seed...
✓ Areas seeded
✓ Admins seeded
✓ Autos seeded
✓ Companies seeded

✅ Seed completed successfully!

📋 Demo Credentials:
   Email: pragna@company.com
   Password: Test1234
   Role: SUPER_ADMIN
```

## 🚀 Step 4: Start Everything

### Quick Start (All in One Click)
From project root, double-click:
```
start-all.bat
```

### Manual Start (3 Separate Terminals)

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```
Wait for: `✓ Server running on port 5000`

**Terminal 2 - Admin Portal:**
```powershell
cd frontend
npm run dev
```
Wait for: `➜ Local: http://localhost:3000/`

**Terminal 3 - Company Portal:**
```powershell
cd company-portal
npm run dev
```
Wait for: `➜ Local: http://localhost:3001/`

## 🧪 Step 5: Test the Setup

### Test Backend
Open browser: http://localhost:5000/health

Expected response:
```json
{"status":"ok"}
```

### Test Admin Portal
1. Open: http://localhost:3000
2. Login with:
   - Email: `pragna@company.com`
   - Password: `Test1234`
3. You should see the Dashboard

### Test Company Portal
1. Open: http://localhost:3001
2. You should see the Company Login page
3. Register or use company credentials

## 📊 Verify All Services Running

```powershell
# Check all ports are in use
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5000
netstat -ano | findstr :27017  # MongoDB
```

## 🎯 Expected Results

When everything is running, you should see:

| Service | URL | Status |
|---------|-----|--------|
| Backend | http://localhost:5000/health | JSON response |
| Admin Portal | http://localhost:3000 | Login page loads |
| Company Portal | http://localhost:3001 | Company page loads |
| MongoDB | Port 27017 | Running |

## 🔄 Daily Startup

After initial setup, to start everything:

1. Make sure MongoDB is running:
   ```powershell
   net start MongoDB
   ```

2. Run the startup script:
   ```powershell
   cd "C:\Users\pragn.LAPTOP-DAHFBVDA\OneDrive\Documents\Connect"
   start-all.bat
   ```

3. Wait ~10 seconds for all services to start

4. Open browser:
   - Admin: http://localhost:3000
   - Company: http://localhost:3001

## ⚠️ Troubleshooting

### Issue: Port 3000/3001/5000 Already in Use

**Solution:**
```powershell
# Kill process on specific port
$port = 3000  # Change to 3001 or 5000 as needed
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($process) { Stop-Process -Id $process.OwningProcess -Force }
```

### Issue: MongoDB Won't Start

```powershell
# Reinstall MongoDB
choco uninstall mongodb-community
choco install mongodb-community

# Or check service status
Get-Service MongoDB -ErrorAction SilentlyContinue
```

### Issue: npm install fails

```powershell
# Clear npm cache
npm cache clean --force

# Retry install
npm install
```

### Issue: Node Modules Missing

```powershell
# Reinstall all three
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd company-portal && npm install && cd ..
```

## 📋 Checklist Before Starting

- [ ] Node.js installed (`node --version` shows v16+)
- [ ] npm working (`npm --version`)
- [ ] MongoDB installed and running
- [ ] Port 5000 free for backend
- [ ] Port 3000 free for admin portal
- [ ] Port 3001 free for company portal
- [ ] All three directories have `node_modules`
- [ ] `.env` files exist in frontend and company-portal

## 🎓 Learning Points

- **Backend** handles all business logic and serves both portals
- **Admin Portal** (port 3000) is for admin/staff management
- **Company Portal** (port 3001) is for companies/businesses
- They share the same database but have different UI/routes
- Both use the same backend API with different authentication tokens

## 🔗 Quick Links

- Admin Portal: http://localhost:3000
- Company Portal: http://localhost:3001
- Backend API: http://localhost:5000
- Backend Health: http://localhost:5000/health

## 📞 Need Help?

Check these files:
- `DUAL_PORTAL_SETUP.md` - Architecture and setup details
- `SETUP_STEPS.md` - Original MongoDB setup guide
- Backend logs in terminal
- Browser console (F12) for frontend errors

# Dual Portal Setup - Admin & Company Portals

This project now runs two separate frontend applications on different ports while sharing the same backend and database.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Backend Server                         │
│                  (Port 5000, Node.js)                    │
│            Handles all API requests for both             │
└─────────────────────────────────────────────────────────┘
                          ↑
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ↓                 ↓                 ↓
    ┌────────────┐  ┌────────────┐  ┌──────────────┐
    │  MongoDB   │  │   Admin    │  │   Company    │
    │  Database  │  │   Portal   │  │    Portal    │
    │            │  │ (Port 3000)│  │ (Port 3001)  │
    └────────────┘  └────────────┘  └──────────────┘
                      React App      React App
                     Admin Routes    Company Routes
```

## 📂 Directory Structure

```
Connect/
├── backend/                    # Node.js backend (Port 5000)
│   ├── src/
│   ├── package.json
│   └── ...
├── frontend/                   # Admin Portal (Port 3000)
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   ├── .env
│   └── ...
├── company-portal/             # Company Portal (Port 3001)
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   ├── .env
│   └── ...
├── start-all.bat               # Windows batch startup script
└── start-all.ps1               # PowerShell startup script
```

## 🚀 Quick Start

### Option 1: Using Batch File (Recommended for Windows)
```bash
# Navigate to project root
cd "C:\Users\pragn.LAPTOP-DAHFBVDA\OneDrive\Documents\Connect"

# Run the startup script
start-all.bat
```

This will open 3 separate command windows:
- Backend Server (Port 5000)
- Admin Portal (Port 3000)
- Company Portal (Port 3001)

### Option 2: Using PowerShell
```powershell
# Navigate to project root
cd "C:\Users\pragn.LAPTOP-DAHFBVDA\OneDrive\Documents\Connect"

# Run the PowerShell script
powershell -ExecutionPolicy Bypass -File .\start-all.ps1
```

### Option 3: Manual Start (3 separate terminals)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Backend runs on http://localhost:5000
```

**Terminal 2 - Admin Portal:**
```bash
cd frontend
npm install  # Only needed first time
npm run dev
# Admin Portal runs on http://localhost:3000
```

**Terminal 3 - Company Portal:**
```bash
cd company-portal
npm install  # Only needed first time
npm run dev
# Company Portal runs on http://localhost:3001
```

## 🔧 Configuration

### Admin Portal (frontend/.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_PORTAL_TYPE=admin
```

### Company Portal (company-portal/.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_PORTAL_TYPE=company
```

## 📋 Service URLs

| Service | URL | Type |
|---------|-----|------|
| Backend API | http://localhost:5000 | REST API |
| Backend Health Check | http://localhost:5000/health | Health Check |
| Admin Portal | http://localhost:3000 | Web App |
| Company Portal | http://localhost:3001 | Web App |

## 🔐 Authentication

- **Admin Portal**: Uses admin authentication (`auth_token` in localStorage)
- **Company Portal**: Uses company authentication (`company_auth_token` in localStorage)

The API service automatically detects which portal is being used and uses the appropriate token.

## 📦 Dependencies

Both frontend applications use:
- React 18.2.0
- Vite 5.0+
- Tailwind CSS
- React Router
- Axios

Backend uses:
- Node.js + Express
- MongoDB with Mongoose
- JWT for authentication

## 🛠️ Development

### Make changes to Admin Portal
```bash
cd frontend
# Edit files, they auto-reload via Vite hot module replacement
```

### Make changes to Company Portal
```bash
cd company-portal
# Edit files, they auto-reload via Vite hot module replacement
```

### Make changes to Backend
```bash
cd backend
# Edit files, they auto-reload via npm run dev (nodemon)
```

## 🧪 Building for Production

### Admin Portal
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Company Portal
```bash
cd company-portal
npm run build
# Output: company-portal/dist/
```

### Backend
```bash
cd backend
npm run build  # If applicable
```

## 🐛 Troubleshooting

### Port Already in Use
If you get "port already in use" errors:

```powershell
# Kill process on port 3000 (Admin)
netstat -ano | findstr :3000 | ForEach-Object { $parts = $_ -split '\s+'; taskkill /PID $parts[-1] /F }

# Kill process on port 3001 (Company)
netstat -ano | findstr :3001 | ForEach-Object { $parts = $_ -split '\s+'; taskkill /PID $parts[-1] /F }

# Kill process on port 5000 (Backend)
netstat -ano | findstr :5000 | ForEach-Object { $parts = $_ -split '\s+'; taskkill /PID $parts[-1] /F }
```

### MongoDB Not Running
```powershell
# Start MongoDB service
net start MongoDB

# Or verify it's installed
Get-Process mongod -ErrorAction SilentlyContinue
```

### Dependencies Missing
```bash
# Install dependencies for all three projects
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd company-portal && npm install && cd ..
```

## 📝 Notes

- Both frontend applications share the same React code but route differently based on URL
- The backend serves all API requests for both portals
- Database is shared between both portals
- Token routing is automatic in the API service based on URL path:
  - `/company/` routes use company token
  - All other routes use admin token

## 🔄 Syncing Code Changes

If you update code in the admin portal `frontend/` folder, remember to also update the company portal `company-portal/` folder if needed, or they could diverge.

Current approach: Both are exact copies, so keep them in sync when making shared changes.

## 📞 Support

For issues or questions, check the main project documentation.

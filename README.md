# Admin Panel Web App

Complete admin panel for auto/vehicle management with company assignments, role-based access control, and real-time dashboard.

## 🚀 Quick Start (5 minutes)

```powershell
# 1. Run automated setup (Windows)
.\setup-mongodb.bat

# 2. In one terminal (Backend)
cd backend
npm run dev

# 3. In another terminal (Frontend)
cd frontend
npm run dev

# 4. Open http://localhost:3000
# Login: pragna@company.com / Test1234
```

**For detailed setup:** See [MONGODB_SETUP_GUIDE.md](MONGODB_SETUP_GUIDE.md)

## Features

- **Admin Authentication**: Registration & login with JWT tokens and bcrypt password hashing
- **Multi-Admin Support**: Support for multiple admins with role-based access (SUPER_ADMIN, ADMIN)
- **Auto Management**: Create, update, delete vehicles with status tracking
- **Assignment Management**: Assign autos to companies with flexible date ranges
- **Priority Tracking**: Highlight autos nearing assignment end dates
- **Real-time Dashboard**: Live counts and status updates
- **Search & Filter**: Global search and filtering by area, company, status
- **Soft Delete**: Non-destructive deletion with audit trails

## Tech Stack

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios

**Backend:**
- Node.js/Express
- **MongoDB** (migrated from PostgreSQL)
- Mongoose (ODM)
- JWT (authentication)
- bcrypt (password hashing)

## Prerequisites

- Node.js 16+
- **MongoDB 4.4+** ([Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- npm or yarn

## Setup Instructions

### 1. Install MongoDB

**Windows:**
```powershell
# Download from https://www.mongodb.com/try/download/community
# Or use Chocolatey:
choco install mongodb-community

# Start service:
net start MongoDB
```

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Cloud Option (MongoDB Atlas):**
- No local installation needed
- Free tier available
- Get connection string from https://www.mongodb.com/cloud/atlas

### 2. Backend Setup

```powershell
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env - Update MONGODB_URI if using MongoDB Atlas
# Default: mongodb://localhost:27017/admin_panel_db

# Seed initial data
npm run seed

# Start development server
npm run dev
```

Backend runs on `http://localhost:5000`

### 3. Frontend Setup

```powershell
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

Frontend runs on `http://localhost:3000`

## Default Credentials

Use these credentials to log in:

**Admin 1 (SUPER_ADMIN):**
- Email: `pragna@company.com`
- Password: `Test1234`

**Admin 2 (ADMIN):**
- Email: `manager@company.com`
- Password: `Test1234`

## Database Configuration

```
Connect/
├── backend/
│   ├── src/
│   │   ├── migrations/       # Database migrations
│   │   ├── seeds/            # Seed scripts
│   │   ├── models/           # Database models
│   │   ├── controllers/      # Route controllers
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Express middleware
│   │   ├── utils/            # Utility functions
│   │   ├── tests/            # Unit tests
│   │   └── index.js          # Express app entry
│   ├── package.json
│   ├── knexfile.js           # Knex configuration
│   └── README.md
│
└── frontend/
    ├── src/
    │   ├── pages/            # Page components
    │   ├── components/       # Reusable components
    │   ├── services/         # API services
    │   ├── hooks/            # Custom hooks
    │   ├── context/          # React context
    │   ├── utils/            # Utility functions
    │   ├── tests/            # Unit tests
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## API Documentation

### Authentication

```
POST /api/auth/register-admin
POST /api/auth/login
```

### Admins
```
GET /api/admins
POST /api/admins
GET /api/admins/:id
PATCH /api/admins/:id
DELETE /api/admins/:id
```

### Areas
```
GET /api/areas
POST /api/areas
GET /api/areas/:id
```

### Autos
```
GET /api/autos?search=&area=&status=
POST /api/autos
GET /api/autos/:id
PATCH /api/autos/:id
DELETE /api/autos/:id
GET /api/autos/:id/assignments
```

### Companies
```
GET /api/companies
POST /api/companies
GET /api/companies/:id
PATCH /api/companies/:id
DELETE /api/companies/:id
```

### Assignments
```
GET /api/assignments/active
GET /api/assignments/priority
POST /api/assignments
POST /api/assignments/bulk
PATCH /api/assignments/:id
```

### Dashboard
```
GET /api/dashboard/summary
```

## Example API Calls

### Register Admin
```bash
curl -X POST http://localhost:5000/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Admin",
    "email": "newadmin@example.com",
    "password": "SecurePass123",
    "role": "ADMIN"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pragna@company.com",
    "password": "Test1234"
  }'
```

### Create Auto
```bash
curl -X POST http://localhost:5000/api/autos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "auto_no": "KA01AA5555",
    "owner_name": "John Doe",
    "area_id": "AREA_UUID",
    "notes": "Good condition"
  }'
```

### Bulk Assign Autos
```bash
curl -X POST http://localhost:5000/api/assignments/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "auto_ids": ["AUTO_ID_1", "AUTO_ID_2"],
    "company_id": "COMPANY_ID",
    "days": 7,
    "start_date": "2024-01-10"
  }'
```

## Running Tests

### Backend
```bash
cd backend

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Frontend
```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Database Schema

### admins
- `id` (UUID, primary key)
- `name` (string)
- `email` (string, unique)
- `password_hash` (string)
- `role` (enum: SUPER_ADMIN, ADMIN)
- `created_at`, `updated_at`, `deleted_at` (timestamps)
- `updated_by_admin_id` (UUID, FK to admins)

### areas
- `id` (UUID, primary key)
- `name` (string, unique)
- `created_at`, `updated_at` (timestamps)

### autos
- `id` (UUID, primary key)
- `auto_no` (string, unique)
- `owner_name` (string)
- `area_id` (UUID, FK to areas)
- `status` (enum: IN_BUSINESS, OUT_OF_BUSINESS, IDLE, ASSIGNED)
- `last_updated_at` (timestamp)
- `notes` (text)
- `created_at`, `updated_at`, `deleted_at` (timestamps)

### companies
- `id` (UUID, primary key)
- `name` (string)
- `required_autos` (integer)
- `area_id` (UUID, FK to areas)
- `days_requested` (integer)
- `status` (enum: REQUESTED, APPROVED, REJECTED)
- `created_by_admin_id` (UUID, FK to admins)
- `created_at`, `updated_at`, `deleted_at` (timestamps)

### assignments
- `id` (UUID, primary key)
- `auto_id` (UUID, FK to autos)
- `company_id` (UUID, FK to companies)
- `start_date` (date)
- `end_date` (date)
- `status` (enum: ACTIVE, COMPLETED, PREBOOKED)
- `created_at`, `updated_at` (timestamps)

### audit_logs
- `id` (UUID, primary key)
- `admin_id` (UUID, FK to admins)
- `action` (string)
- `payload` (JSONB)
- `timestamp` (timestamp)

## Key Features Explained

### Priority Logic
- Autos with assignment end_date within 2 days are marked as PRIORITY
- Highlighted in red on dashboard for quick attention
- Updates in real-time via polling (10s interval)

### Status Management
- **IN_BUSINESS**: Active auto available for assignment
- **OUT_OF_BUSINESS**: Auto marked unavailable
- **IDLE**: Assignment ended but not yet reassigned
- **ASSIGNED**: Currently assigned to a company

### Assignment Types
- **ACTIVE**: Current assignment in progress
- **COMPLETED**: Assignment finished, auto becomes IDLE
- **PREBOOKED**: Future assignment, doesn't mark auto as ASSIGNED yet

### Role-Based Access
- **SUPER_ADMIN**: Can create/delete admins, full system access
- **ADMIN**: Can manage autos, companies, assignments (create, update, view)

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DB_*` variables in `.env`
- Ensure database exists: `createdb admin_panel_db`

### CORS Errors
- Frontend proxy is configured in `vite.config.js`
- Ensure backend is running on `http://localhost:5000`

### JWT Errors
- Verify `JWT_SECRET` is set in `.env`
- Check token is being sent in Authorization header

## Performance Optimization

- Dashboard uses polling (10s) instead of WebSocket for real-time updates
- Autos list supports pagination via query params
- Indices on frequently queried columns (auto_no, end_date, status)
- Soft deletes prevent data loss while maintaining query performance

## Future Enhancements

- WebSocket support for real-time updates
- File upload for bulk registration (XLS/CSV)
- Advanced analytics and reporting
- Email notifications for priority autos
- Mobile app support
- Automated assignment recommendations

## License

ISC

## Support

For issues or questions, please check the backend/README.md or frontend/README.md for component-specific help.

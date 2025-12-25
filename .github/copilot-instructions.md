# Copilot Instructions - Gyani Auto Database

## Architecture Overview

**Tech Stack:**
- Backend: Node.js/Express, MongoDB (migrated from PostgreSQL), Mongoose ODM, JWT auth, bcrypt
- Frontend: React 18, Vite, Tailwind CSS, React Router, Axios

**Core Domains:**
- **Admin Panel**: Multi-admin management with role-based access (SUPER_ADMIN, ADMIN)
- **Auto Management**: Vehicles tracked with areas, statuses (IDLE, ASSIGNED, PRE_ASSIGNED)
- **Assignment Workflow**: Auto assignments to companies with date ranges and priority tracking
- **Company Portal**: Separate auth system for companies to view and manage assignments

**Key Files:**
- `backend/src/index.js` - Entry point mounting all routes with MongoDB connection
- `backend/src/models/{Admin,Auto,Company,Area,Assignment}.js` - Data access layer using class-based pattern
- `backend/src/controllers/` - Request handlers organized by feature (auth, auto, assignment, etc.)
- `frontend/src/services/api.js` - Axios client with interceptor logic for dual-token auth

## Critical Patterns

### Data Access Layer (Models)
All models use **class-based pattern with static methods** instead of exported functions. Models don't directly interact with Mongoose—they use imported Schemas:
```javascript
// backend/src/models/Admin.js pattern
class Admin {
  static async findById(id) {
    const admin = await AdminSchema.findOne({ id, deleted_at: null });
    return admin ? admin.toObject() : null;
  }
  static async create(data) {
    const id = uuidv4();
    const admin = new AdminSchema({ _id: id, id, ...data, created_at: new Date() });
    await admin.save();
    return this.findById(id);
  }
}
```
**Schemas live in `backend/src/models/schemas/` (separate files per entity). All models implement soft delete via `deleted_at` field.**

### Authentication & Authorization
- **Dual Token System**: `auth_token` (admin) and `company_auth_token` (company) stored in localStorage
- Axios interceptor in `frontend/src/services/api.js` routes requests by current route (`/company/*` uses company token, else admin token)
- Middleware in `backend/src/middleware/{auth.js, companyAuth.js}` validates tokens and decodes into `req.admin` or `req.company`
- JWT payload differentiates type: `decoded.type === 'company'` for company-specific validation

### Route Structure
Each feature has its own route file and controller:
- Routes: `backend/src/routes/{authRoutes,autoRoutes,assignmentRoutes,...}.js`
- Controllers: `backend/src/controllers/{authController,autoController,assignmentController,...}.js`
- Protected routes use middleware: `router.post('/', authMiddleware, controller.method)`
- Company portal has separate routes: `/api/company-portal/*` and `/api/company-tickets/*`

### Error Handling
- Global error handler in `backend/src/middleware/errorHandler.js` catches all async errors
- Controllers use `next(error)` to pass errors to handler
- Specific error messages for auth failures (401, 403, 409 for conflicts)

## Developer Workflows

### Setup
```bash
# 1. Ensure MongoDB running (net start MongoDB on Windows)
cd backend && npm install && npm run seed
cd ../frontend && npm install && npm run dev
# Backend: npm run dev (port 5000)
# Frontend: http://localhost:3000
# Demo: pragna@company.com / Test1234 (SUPER_ADMIN)
```

### Running Tests
```bash
npm run test          # Jest for backend
npm run test:watch   # Watch mode
npm run test:coverage
# Frontend: npm run test (Vitest)
```

### Adding New Features
1. **Backend**: Create model in `models/` with class pattern, controller in `controllers/`, route in `routes/`, mount in `index.js`
2. **Frontend**: Create page in `pages/`, service methods in `services/api.js`, route in `App.jsx`
3. **Database**: Add MongoDB schema in `models/schemas/` if new entity; seed data in `seeds/001_initial_seed.js` if dev data needed

### Debugging
- Backend console logs use ✓/✗ prefixes for status (see seedData function)
- MongoDB URI in `.env` defaults to `mongodb://localhost:27017/admin_panel_db`
- Frontend API interceptor logs token warnings to console if auth fails

## Project-Specific Conventions

### Auto Statuses
- `IDLE`: Not assigned to any company
- `ASSIGNED`: Currently assigned with active date range
- `PRE_ASSIGNED`: Reserved for future assignment

### Response Format
Controllers return consistent JSON: `{ ...data, token? }` for auth endpoints, `{ list: [...], count }` for list endpoints

### Soft Deletes
All core entities (Admin, Auto, Company, etc.) use `deleted_at` timestamp. Queries filter `deleted_at: null` by default. Never hard delete—always update `deleted_at` in delete handlers.

### URL Naming
- Admin endpoints: `/api/{entity}` (e.g., `/api/autos`, `/api/companies`)
- Company auth: `/api/company-auth/{method}` (register, login)
- Company portal: `/api/company-portal/{resource}`

## Cross-Component Communication

- Frontend calls backend via service methods (`areaService.list()`, `autoService.create()`)
- Backend validates assignments against auto availability in `assignmentController.createAssignment()`
- Company portal portal checks company auth separately (different middleware, routes)
- Dashboard aggregates counts from multiple models (see `dashboardController.getStats()` calls)

## External Dependencies Worth Knowing
- **Mongoose 7.7**: Document validation in schema definitions; no Knex query builder
- **express-validator**: Validation in controller route handlers (not shown but check existing controllers for pattern)
- **uuid**: All IDs generated with `uuidv4()`, stored as both `_id` and `id` field in Mongoose docs
- **date-fns** (frontend): Date formatting for calendar and assignment dates

## Common Gotchas
- Schemas use `deleted_at` filtering—always include in queries to avoid returning soft-deleted records
- Company portal uses different JWT type check (`decoded.type === 'company'`)—don't mix admin and company middleware
- Frontend API service route detection (`window.location.pathname.startsWith('/company/')`) means URL routing must align with token selection
- MongoDB connection pooling—reuse models, don't recreate schema instances

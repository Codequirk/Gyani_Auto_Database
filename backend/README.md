# Admin Panel Backend

Admin panel backend for auto/vehicle management system with company assignments.

## Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 12+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your PostgreSQL credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=admin_panel_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

4. Run migrations:
```bash
npm run migrate
```

5. Seed database:
```bash
npm run seed
```

6. Start development server:
```bash
npm run dev
```

Server will run on `http://localhost:5000`

## Testing

Run unit tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## API Endpoints

### Authentication
- `POST /api/auth/register-admin` - Register new admin
- `POST /api/auth/login` - Login admin

### Admins
- `GET /api/admins` - List all admins
- `POST /api/admins` - Create admin
- `GET /api/admins/:id` - Get admin details
- `PATCH /api/admins/:id` - Update admin
- `DELETE /api/admins/:id` - Delete admin (soft delete)

### Areas
- `GET /api/areas` - List areas
- `POST /api/areas` - Create area
- `GET /api/areas/:id` - Get area

### Autos
- `GET /api/autos` - List autos (supports search, filters)
- `POST /api/autos` - Create auto
- `GET /api/autos/:id` - Get auto details
- `PATCH /api/autos/:id` - Update auto
- `DELETE /api/autos/:id` - Delete auto
- `GET /api/autos/:id/assignments` - Get assignment history

### Companies
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company
- `GET /api/companies/:id` - Get company with assignments
- `PATCH /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

### Assignments
- `GET /api/assignments/active` - Get active assignments
- `GET /api/assignments/priority` - Get priority assignments (2 days remaining)
- `POST /api/assignments` - Create assignment
- `POST /api/assignments/bulk` - Bulk assign autos
- `PATCH /api/assignments/:id` - Update assignment

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard summary with counts

## Database Schema

### tables
- `admins` - Admin users with roles
- `areas` - Geographical areas/localities
- `autos` - Vehicles with status tracking
- `companies` - Companies requesting autos
- `assignments` - Auto-to-company assignments
- `audit_logs` - Audit trail for admin actions

## Example Usage

### Register Admin
```bash
curl -X POST http://localhost:5000/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Name",
    "email": "admin@example.com",
    "password": "Test1234",
    "role": "ADMIN"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Test1234"
  }'
```

### Create Auto
```bash
curl -X POST http://localhost:5000/api/autos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "auto_no": "KA01AA4444",
    "owner_name": "John Doe",
    "area_id": "AREA_UUID",
    "notes": "Good condition"
  }'
```

## Default Credentials (from seed)

Admin 1:
- Email: pragna@company.com
- Password: Test1234
- Role: SUPER_ADMIN

Admin 2:
- Email: manager@company.com
- Password: Test1234
- Role: ADMIN

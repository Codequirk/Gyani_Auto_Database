# Company Portal Feature - Complete Implementation Guide

## Overview
A complete company portal system has been integrated into the Gyani Auto Database system. This allows companies to register, raise auto requests (tickets), view their assignments, and track approval status while admins can manage and approve these requests.

---

## Architecture

### Dual Portal System
```
┌─────────────────────────────────────────┐
│     Admin Panel                         │
│  - Manages autos & assignments          │
│  - Approves company requests            │
│  - Views company tickets                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│     Company Portal                      │
│  - Register/Login                       │
│  - Raise auto requests (tickets)        │
│  - View assignments                     │
│  - Track request status                 │
└─────────────────────────────────────────┘

    ↕ Shared Backend & Database ↕
    
┌─────────────────────────────────────────┐
│     MongoDB Database                    │
│  - companies (with status, password)    │
│  - company_tickets (requests)           │
│  - assignments (autos to companies)     │
│  - autos, areas, admins, etc.          │
└─────────────────────────────────────────┘
```

---

## Backend Implementation

### 1. Database Changes

#### Updated CompanySchema (`backend/src/models/schemas/CompanySchema.js`)
**New Fields Added:**
- `email` (unique, indexed) - for company login
- `password_hash` - bcrypt hashed password
- `company_status` - NEW field tracking: `PENDING_APPROVAL` | `ACTIVE` | `INACTIVE` | `REJECTED`
- Indices on `company_status` for fast queries

#### New CompanyTicketSchema (`backend/src/models/schemas/CompanyTicketSchema.js`)
```javascript
{
  id: UUID,
  company_id: UUID (FK to companies),
  autos_required: Number,
  days_required: Number,
  start_date: Date,
  ticket_status: 'PENDING' | 'APPROVED' | 'REJECTED',
  notes: String (company notes),
  admin_notes: String,
  rejected_reason: String,
  approved_by_admin_id: UUID,
  created_at: Date,
  updated_at: Date
}
```

### 2. Models Created

#### CompanyTicket Model (`backend/src/models/CompanyTicket.js`)
```javascript
// Key Methods:
- findById(id)
- findByCompanyId(companyId)
- findPending() - all pending tickets
- findByStatus(status)
- create(data)
- update(id, data)
- approve(id, adminId)
- reject(id, reason)
- delete(id)
```

#### Company Model Updates
Added `findByEmail(email)` method for company authentication

### 3. Controllers Created

#### Company Auth Controller (`backend/src/controllers/companyAuthController.js`)
```javascript
exports.registerCompany - Register new company with optional initial request
exports.loginCompany - Company login with JWT token generation
```

**Flow:**
1. Company provides: name, email, password, contact_person, phone, autos_required, days, start_date
2. Password hashed with bcrypt
3. Company created with `company_status: 'PENDING_APPROVAL'`
4. Initial ticket created if details provided
5. JWT token returned (with `type: 'company'`)

#### Company Ticket Controller (`backend/src/controllers/companyTicketController.js`)
```javascript
exports.createTicket - Company creates new auto request
exports.getCompanyTickets - Get all tickets for a company
exports.getPendingTickets - Admin view pending tickets
exports.approveTicket - Admin approves (updates company_status to ACTIVE)
exports.rejectTicket - Admin rejects with reason
exports.updateTicket - Admin adds notes
```

#### Company Portal Controller (`backend/src/controllers/companyPortalController.js`)
```javascript
exports.getCompanyProfile - Get company details (safe)
exports.getCompanyAssignments - Get all company assignments enriched
exports.getCompanyDashboard - Full dashboard: summary, active, prebooked, priority, tickets
exports.updateCompanyProfile - Update contact info
```

**Dashboard Summary Includes:**
- Total assignments count
- Active assignments count
- Pre-booked assignments count
- Priority assignments count (2 days remaining)
- Pending tickets count
- Enriched assignment data with auto details
- Ticket status tracking

### 4. Middleware Created

#### Company Auth Middleware (`backend/src/middleware/companyAuth.js`)
```javascript
// Validates JWT token with type: 'company'
// Differentiates from admin tokens
// Attaches company data to req.company
```

### 5. Routes Created

#### Company Auth Routes (`/api/company-auth`)
```
POST /company-auth/register - Register new company
POST /company-auth/login - Company login
```

#### Company Portal Routes (`/api/company-portal`)
```
GET /company-portal/:company_id/profile - Get profile
PATCH /company-portal/:company_id/profile - Update profile
GET /company-portal/:company_id/assignments - View assignments
GET /company-portal/:company_id/dashboard - Full dashboard
```

#### Company Ticket Routes (`/api/company-tickets`)
```
POST /company-tickets - Create new ticket
GET /company-tickets/company/:company_id - Get company tickets
GET /company-tickets/admin/pending - Admin view pending
PATCH /company-tickets/admin/:id/approve - Approve
PATCH /company-tickets/admin/:id/reject - Reject
PATCH /company-tickets/admin/:id - Update notes
```

### 6. Main App Entry (`backend/src/index.js`)
Added new route registrations:
```javascript
app.use('/api/company-auth', companyAuthRoutes);
app.use('/api/company-portal', companyPortalRoutes);
app.use('/api/company-tickets', companyTicketRoutes);
```

---

## Frontend Implementation

### 1. Context Management

#### CompanyAuthContext (`frontend/src/context/CompanyAuthContext.jsx`)
```javascript
// Parallel to AdminAuthContext
// Stores:
- company: { id, name, email, contact_person, phone_number, status }
- token: JWT token
- login(companyData, token) - Sets company data & token
- logout() - Clears auth
- isAuthenticated, loading
```

**Key Difference from Admin Context:**
- Uses `company_auth_token` in localStorage
- Stores `company_data` separately
- Validates token by checking company profile
- Handles both company and admin auth simultaneously

### 2. Pages Created

#### CompanyLoginPage (`frontend/src/pages/CompanyLoginPage.jsx`)
**Features:**
- Toggle between Login & Register forms
- Login Form: email, password
- Register Form:
  - Company name, contact person, email, phone
  - Password
  - Optional: Autos required, days required, start date
- Validation on all fields
- Success message on registration (awaiting approval)
- Link back to admin panel

**Flow:**
1. User fills registration form with initial request details
2. Backend creates company + ticket
3. Company status: PENDING_APPROVAL
4. Admin sees ticket in "Company Requests" page
5. Admin can approve/reject
6. On approval, company_status → ACTIVE
7. Company can now login

#### CompanyDashboardPage (`frontend/src/pages/CompanyDashboardPage.jsx`)
**Features:**
- Summary Cards:
  - Total Assignments
  - Active Now
  - Pre-booked
  - Priority (2 days)
- Active Assignments Table:
  - Auto number, owner, area, dates, days left, status
- Pre-booked Assignments Table:
  - Upcoming assignments
- Pending Tickets Section:
  - Show tickets awaiting approval
  - Display admin notes
- "Raise New Request" Button/Modal
- Automatic refetch on approval

**Request Modal Form:**
- Autos required
- Days required
- Start date
- Additional notes
- Auto-fetches dashboard on success

#### CompanyNavbar (`frontend/src/components/CompanyNavbar.jsx`)
- Company Portal branding
- Dashboard link
- Company name dropdown
- Logout
- Link to Admin Panel

#### CompanyRequestsPage (`frontend/src/pages/CompanyRequestsPage.jsx`)
**Admin View of Company Requests**

**Features:**
- Filter by status: PENDING | APPROVED | REJECTED
- Display requests with:
  - Autos & days required
  - Start date
  - Company notes
  - Admin notes
  - Status badge
- Detailed Modal per request:
  - All details
  - Editable admin notes field
  - Approve/Reject buttons
  - Rejection reason textarea
- Real-time updates after action

**Admin Actions:**
- View request details
- Add/edit admin notes
- Approve (→ company_status = ACTIVE)
- Reject with reason
- Filter by status

### 3. Service Updates

#### Updated API Service (`frontend/src/services/api.js`)
**New Services Added:**

```javascript
export const companyAuthService = {
  register: (data) => api.post('/company-auth/register', data),
  login: (data) => api.post('/company-auth/login', data),
};

export const companyTicketService = {
  create: (data) => api.post('/company-tickets/', data),
  getByCompany: (companyId) => api.get(`/company-tickets/company/${companyId}`),
  getPending: () => api.get('/company-tickets/admin/pending'),
  approve: (id, data) => api.patch(`/company-tickets/admin/${id}/approve`, data),
  reject: (id, data) => api.patch(`/company-tickets/admin/${id}/reject`, data),
  update: (id, data) => api.patch(`/company-tickets/admin/${id}`, data),
};

export const companyPortalService = {
  getProfile: (companyId) => api.get(`/company-portal/${companyId}/profile`),
  updateProfile: (companyId, data) => api.patch(`/company-portal/${companyId}/profile`, data),
  getAssignments: (companyId) => api.get(`/company-portal/${companyId}/assignments`),
  getDashboard: (companyId) => api.get(`/company-portal/${companyId}/dashboard`),
};
```

**Dual Auth Support:**
- Request interceptor checks for both `auth_token` (admin) and `company_auth_token` (company)
- Uses whichever is available
- Prevents auth conflicts

### 4. Routing Updates

#### Updated App.jsx
```javascript
// New Imports:
import CompanyAuthProvider, useCompanyAuth
import CompanyLoginPage
import CompanyDashboardPage
import CompanyRequestsPage

// New Provider:
<CompanyAuthProvider>
  {/* Routes */}
</CompanyAuthProvider>

// New Routes:
<Route path="/company/login" element={<CompanyLoginPage />} />
<Route path="/company/dashboard" element={<CompanyProtectedRoute><CompanyDashboardPage /></CompanyProtectedRoute>} />
<Route path="/company-requests" element={<ProtectedRoute><CompanyRequestsPage /></ProtectedRoute>} />
```

### 5. Navigation Updates

#### Updated Admin Navbar
- Added "🔔 Requests" link to company requests page
- Added "→ Company Portal" link in user menu
- Allows admins to switch between portals

---

## Data Flow & Workflows

### Registration & Approval Workflow

```
1. Company Registration
   ├─ Company visits /company/login
   ├─ Clicks "Register"
   ├─ Fills: name, contact, email, password
   ├─ Optionally: autos_required, days_required, start_date
   └─ POST /company-auth/register

2. Backend Processing
   ├─ Hash password with bcrypt
   ├─ Create company with company_status: 'PENDING_APPROVAL'
   ├─ If ticket details provided:
   │  └─ Create CompanyTicket with status: 'PENDING'
   └─ Return JWT token

3. Company Portal Initial State
   ├─ Company logged in (token stored)
   ├─ Dashboard shows pending ticket (if created)
   ├─ Can create additional tickets
   └─ Cannot see assignments yet (awaiting approval)

4. Admin Reviews Request
   ├─ Admin navigates to /company-requests
   ├─ Views pending company requests
   ├─ Clicks "View & Manage"
   ├─ Reviews request details & notes
   └─ Can:
      ├─ Edit admin notes
      ├─ Approve ✓
      └─ Reject ✕

5. Approval
   ├─ Admin clicks Approve
   ├─ PATCH /company-tickets/admin/:id/approve
   ├─ Backend:
   │  ├─ Updates ticket_status: 'APPROVED'
   │  └─ Updates company_status: 'ACTIVE'
   └─ Company portal automatically updates

6. Company Can Now Use Portal
   ├─ View approved tickets
   ├─ See assignments (created by admin)
   ├─ Raise new tickets
   └─ Track assignments calendar
```

### Assignment Viewing Workflow

```
1. Admin assigns autos to company (existing functionality)
   ├─ POST /api/assignments or
   ├─ POST /api/assignments/bulk
   └─ Creates Assignment records with company_id

2. Company Dashboard Fetch
   ├─ GET /company-portal/:company_id/dashboard
   ├─ Backend queries:
   │  ├─ All assignments for company_id
   │  ├─ Filters: ACTIVE, PREBOOKED, COMPLETED
   │  ├─ Enriches with auto details (auto_no, owner_name, area)
   │  ├─ Calculates days_remaining for each
   │  └─ Separates priority (≤2 days)
   └─ Returns dashboard object

3. Company Portal Display
   ├─ Summary cards show counts
   ├─ Active assignments table
   ├─ Pre-booked assignments table
   ├─ Priority assignments highlighted
   └─ Real-time updates on new assignments
```

### Ticket Lifecycle

```
Company Ticket States:
PENDING ──Approve──> APPROVED
   │
   └──Reject──> REJECTED

Company Status Effect:
PENDING_APPROVAL ──(first ticket approved)──> ACTIVE
     │
     ├──(all tickets rejected)──> REJECTED
     └──Can't view assignments
```

---

## Key Features

### For Companies
✅ Register with initial auto request  
✅ Login with email/password  
✅ View all active assignments  
✅ See assignment details (auto #, owner, area, dates)  
✅ Track days remaining  
✅ View pre-booked assignments  
✅ See priority assignments (≤2 days remaining)  
✅ Raise new auto requests  
✅ View approval status of requests  
✅ See admin notes/feedback  
✅ Update company profile  
✅ Dashboard summary & statistics  

### For Admins
✅ View all pending company requests  
✅ Filter requests by status  
✅ View request details & company info  
✅ Add admin notes to requests  
✅ Approve requests (activate company)  
✅ Reject requests with reasons  
✅ Link in navbar to company requests page  
✅ View all existing companies  
✅ Manage assignments as before  
✅ Continue managing autos & areas  

### Synchronization
✅ Company registration automatically creates tickets  
✅ Admin approval automatically updates company status  
✅ Assignments visible immediately to company  
✅ Shared database ensures data consistency  
✅ Real-time updates on both portals  

---

## Database Synchronization

### Company Lifecycle

```
New Company Registration
↓
companies table: INSERT
  - id: UUID
  - name: string
  - email: unique string
  - password_hash: bcrypt hash
  - company_status: 'PENDING_APPROVAL'
  - status: 'ACTIVE'
  
company_tickets table: INSERT (if details provided)
  - company_id: FK to companies
  - ticket_status: 'PENDING'
  
↓
Admin Approves
↓
companies table: UPDATE
  - company_status: 'PENDING_APPROVAL' → 'ACTIVE'
  
company_tickets table: UPDATE
  - ticket_status: 'PENDING' → 'APPROVED'

↓
Company Now Active
↓
Can receive assignments via:
assignments table: INSERT
  - company_id: FK to companies
  - auto_id: FK to autos
  - start_date, end_date, days
```

### Real-time Data Reflection

**Admin creates assignment:**
```
PATCH /api/assignments/:id
→ assignments table UPDATE
→ Company dashboard automatically shows
  - Next GET /company-portal/:id/dashboard
  - Returns updated assignments list
```

**Company raises ticket:**
```
POST /company-tickets/
→ company_tickets table INSERT
→ Admin navigates to /company-requests
→ Next fetch shows new pending ticket
```

---

## API Endpoints Summary

### Company Authentication
```
POST /api/company-auth/register
  Body: { name, email, password, contact_person, phone_number?, autos_required?, days_required?, start_date? }
  Response: { company, token, message }

POST /api/company-auth/login
  Body: { email, password }
  Response: { company, token }
```

### Company Portal (Auth Required)
```
GET /api/company-portal/:company_id/profile
  Response: { company details without password }

PATCH /api/company-portal/:company_id/profile
  Body: { contact_person?, phone_number? }
  Response: { updated company }

GET /api/company-portal/:company_id/assignments
  Response: [ assignments enriched with auto details ]

GET /api/company-portal/:company_id/dashboard
  Response: { 
    company: { id, name, email, status },
    summary: { total, active, prebooked, priority, pending_tickets },
    active_assignments: [],
    prebooked_assignments: [],
    priority_assignments: [],
    tickets: [],
    pending_tickets: []
  }
```

### Company Tickets
```
POST /api/company-tickets/ (Company Auth Required)
  Body: { company_id, autos_required, days_required, start_date, notes? }
  Response: { ticket }

GET /api/company-tickets/company/:company_id (Company Auth Required)
  Response: [ tickets for company ]

GET /api/company-tickets/admin/pending (Admin Auth Required)
  Response: [ all pending tickets ]

PATCH /api/company-tickets/admin/:id/approve (Admin Auth Required)
  Body: { admin_id }
  Response: { ticket, message }

PATCH /api/company-tickets/admin/:id/reject (Admin Auth Required)
  Body: { reason }
  Response: { ticket }

PATCH /api/company-tickets/admin/:id (Admin Auth Required)
  Body: { admin_notes }
  Response: { ticket }
```

---

## Testing Checklist

### Company Flow
- [ ] Company registration with initial request
- [ ] Company can't login before approval
- [ ] Rejected company can't login
- [ ] Company login successful
- [ ] Dashboard shows pending approval status
- [ ] Can create new tickets while pending
- [ ] Admin approves → company can see assignments
- [ ] Company sees correct assignment details
- [ ] Days remaining calculates correctly
- [ ] Priority assignments highlighted (≤2 days)
- [ ] Company can update profile
- [ ] New tickets appear in admin panel

### Admin Flow
- [ ] Pending requests visible on /company-requests
- [ ] Can filter by status
- [ ] Can view request details
- [ ] Can add/edit admin notes
- [ ] Can approve requests
- [ ] Company status updates after approval
- [ ] Can reject with reason
- [ ] Existing companies still work
- [ ] Assignments work as before

### Data Sync
- [ ] New assignment visible to company immediately
- [ ] Multiple companies see only their data
- [ ] Admin can see all companies
- [ ] Company can't see other companies' data
- [ ] Tickets sync correctly between portals
- [ ] Notes sync correctly

---

## Files Modified/Created

### Backend
**Created:**
- `backend/src/models/schemas/CompanyTicketSchema.js`
- `backend/src/models/CompanyTicket.js`
- `backend/src/controllers/companyAuthController.js`
- `backend/src/controllers/companyTicketController.js`
- `backend/src/controllers/companyPortalController.js`
- `backend/src/routes/companyAuthRoutes.js`
- `backend/src/routes/companyPortalRoutes.js`
- `backend/src/routes/companyTicketRoutes.js`
- `backend/src/middleware/companyAuth.js`

**Modified:**
- `backend/src/models/schemas/CompanySchema.js` - Added email, password_hash, company_status
- `backend/src/models/Company.js` - Added findByEmail() method
- `backend/src/index.js` - Added new route registrations

### Frontend
**Created:**
- `frontend/src/context/CompanyAuthContext.jsx`
- `frontend/src/pages/CompanyLoginPage.jsx`
- `frontend/src/pages/CompanyDashboardPage.jsx`
- `frontend/src/pages/CompanyRequestsPage.jsx`
- `frontend/src/components/CompanyNavbar.jsx`

**Modified:**
- `frontend/src/App.jsx` - Added company routes & auth provider
- `frontend/src/services/api.js` - Added company services, dual auth support
- `frontend/src/components/Navbar.jsx` - Added company portal link

---

## Security Considerations

✅ Passwords hashed with bcrypt  
✅ JWT tokens with expiration (7 days)  
✅ Token type check (admin vs company)  
✅ Company can only see own assignments  
✅ Admin can approve/reject requests  
✅ Admin notes not visible to company  
✅ Soft deletes preserved  
✅ Created_at/updated_at timestamps  
✅ Password not sent in responses  
✅ Auth middleware on all protected routes  

---

## Future Enhancements

🔄 Email notifications on approval/rejection  
📧 Email notifications on new assignments  
📊 Company analytics dashboard  
📈 Request status tracking timeline  
🔐 Company password reset  
📱 Mobile optimized company portal  
🔔 Real-time notifications (WebSockets)  
📄 Document upload for requests  
⭐ Company ratings/reviews  
🤖 Automated assignment recommendations  

---

## Quick Start

### For Companies:
1. Navigate to `http://localhost:3000/company/login`
2. Click "Register"
3. Fill company details + optional auto request
4. Wait for admin approval
5. Once approved, login to see assignments

### For Admins:
1. Login to admin panel at `/login`
2. Navigate to "🔔 Requests" in navbar
3. Review pending company requests
4. Approve or reject with notes
5. Company portal auto-updates

---

**Implementation Complete!** ✅

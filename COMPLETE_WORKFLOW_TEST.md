# Complete Workflow Test - Company Auto Request to Assignment

## System Status
✅ Backend running on port 5000
✅ Frontend running on port 3001
✅ MongoDB connected
✅ All routes configured
✅ Assignment creation logic implemented

---

## Step-by-Step Workflow

### STEP 1: Company Registers and Raises Request

**Action**: Company registers on Company Portal with auto request
- URL: `http://localhost:3001/company/login` → Click "Register"
- Fill form:
  - Company Name: Test Company
  - Email: test@company.com
  - Password: password123
  - Contact Person: John Doe
  - Phone: 9876543210
  - **Autos Required: 2**
  - **Days Required: 10**
  - **Start Date: 2024-02-15** (or any future date)
  - **Preferred Area: Select any area**

**Expected Result**:
```javascript
POST /api/company-auth/register
{
  name: "Test Company",
  email: "test@company.com",
  password: "password123",
  contact_person: "John Doe",
  phone_number: "9876543210",
  autos_required: 2,
  days_required: 10,
  start_date: "2024-02-15",
  area_id: "area-uuid"
}

Response:
{
  id: "company-uuid",
  auth_token: "jwt-token",
  message: "Company registered successfully"
}
```

**Frontend Status**:
- ✅ Shows: "⏳ Your company registration is pending admin approval"
- ✅ Token stored in localStorage
- ✅ Redirects to dashboard

**Backend Status**:
- ✅ Company created with `company_status: "PENDING_APPROVAL"`
- ✅ CompanyTicket created with:
  - `ticket_status: "PENDING"`
  - `autos_required: 2`
  - `days_required: 10`
  - `start_date: "2024-02-15"`
  - `area_id: "area-uuid"`
  - `area_name: "Area Name"`

**Database Check**:
```javascript
// MongoDB:
db.companies.findOne({ email: "test@company.com" })
// Should show: company_status = "PENDING_APPROVAL"

db.company_tickets.findOne({ company_id: "company-uuid" })
// Should show: ticket_status = "PENDING", autos_required = 2, area_id set
```

---

### STEP 2: Admin Views Pending Requests

**Action**: Admin logs in and views Company Requests page
- URL: `http://localhost:3001/admin` → Click "Company Requests"

**API Call**:
```javascript
GET /api/company-tickets/admin/pending
// Returns all PENDING company tickets enriched with company details
```

**Expected Response**:
```javascript
[
  {
    id: "ticket-uuid",
    ticket_status: "PENDING",
    autos_required: 2,
    days_required: 10,
    start_date: "2024-02-15",
    area_id: "area-uuid",
    area_name: "Area Name",
    company: {
      id: "company-uuid",
      name: "Test Company",
      email: "test@company.com",
      contact_person: "John Doe",
      phone_number: "9876543210"
    }
  }
]
```

**Frontend Display**:
- ✅ Shows request card with:
  - Company name
  - Autos required: 2
  - Days: 10
  - Start date: 2024-02-15
  - **Preferred Area: Area Name**
  - Status: PENDING
  - Approve / Reject buttons

---

### STEP 3: Admin Clicks Approve (KEY STEP - WHERE ASSIGNMENTS ARE CREATED)

**Action**: Admin clicks "Approve Request" button

**What Happens on Backend**:
```javascript
PATCH /api/company-tickets/admin/{ticket-id}/approve
{
  admin_id: "admin-uuid"  // From JWT token
}
```

**Backend Processing in approveTicket()**:
```
1. Validate ticket exists ✅
2. Update ticket status → "APPROVED" ✅
3. Update company status → "ACTIVE" ✅
4. Get available autos in area:
   - Query: Auto.findAll({ area_id: "area-uuid" })
   - Gets: 5 available autos in that area
5. Select first 2 autos (autos_required = 2):
   - auto_id_1: "auto-uuid-1"
   - auto_id_2: "auto-uuid-2"
6. FOR EACH auto, create Assignment:
   Assignment.create({
     auto_id: "auto-uuid-1",
     company_id: "company-uuid",
     start_date: "2024-02-15",
     end_date: "2024-02-24", // 2024-02-15 + 9 = 10 days inclusive
     status: "PREBOOKED", // Because 2024-02-15 is future date
     notes: "From ticket approval: ..."
   })
   Assignment.create({
     auto_id: "auto-uuid-2",
     company_id: "company-uuid",
     start_date: "2024-02-15",
     end_date: "2024-02-24",
     status: "PREBOOKED",
     notes: "From ticket approval: ..."
   })
7. Return response with created assignments
```

**Expected Response from /approve**:
```javascript
{
  ticket: {
    id: "ticket-uuid",
    ticket_status: "APPROVED",  // ← Changed
    approved_by_admin_id: "admin-uuid"
  },
  assignments: [
    {
      id: "assignment-uuid-1",
      auto_id: "auto-uuid-1",
      company_id: "company-uuid",
      start_date: "2024-02-15T00:00:00Z",
      end_date: "2024-02-24T00:00:00Z",
      status: "PREBOOKED",
      notes: "From ticket approval: ..."
    },
    {
      id: "assignment-uuid-2",
      auto_id: "auto-uuid-2",
      company_id: "company-uuid",
      start_date: "2024-02-15T00:00:00Z",
      end_date: "2024-02-24T00:00:00Z",
      status: "PREBOOKED",
      notes: "From ticket approval: ..."
    }
  ],
  message: "Ticket approved, company activated, and 2 assignment(s) created"
}
```

**Frontend Feedback**:
- ✅ Shows: "Request approved successfully!"
- ✅ Request disappears from PENDING list
- ✅ Refreshes requests page

**Database Changes**:
```javascript
// MongoDB:

// 1. CompanyTicket updated:
db.company_tickets.findOne({ id: "ticket-uuid" })
// Shows: ticket_status = "APPROVED"

// 2. Company updated:
db.companies.findOne({ id: "company-uuid" })
// Shows: company_status = "ACTIVE" (was PENDING_APPROVAL)

// 3. Assignments CREATED:
db.assignments.find({ company_id: "company-uuid" })
// Returns: 2 records with auto_id_1 and auto_id_2
```

---

### STEP 4: Company Checks Dashboard (DATA SHOULD NOW BE VISIBLE)

**Action**: Company logs into portal and views dashboard

**Frontend Loads**:
```javascript
GET /api/company-portal/{company-id}/dashboard
```

**Backend Processing in getCompanyDashboard()**:
```
1. Find company ✅
2. Check company_status = "ACTIVE" ✅ (now that approval completed)
3. Get all assignments for company:
   - Query: Assignment.findByCompanyId("company-uuid")
   - Returns: 2 assignments (created during approval)
4. Filter by status:
   - Active: 0 (all are PREBOOKED because future date)
   - Prebooked: 2
5. Enrich with auto details:
   - For assignment 1: Get Auto details (auto_no, owner_name, area_name)
   - For assignment 2: Get Auto details
6. Calculate days_remaining:
   - end_date: 2024-02-24
   - today: 2024-01-10 (example)
   - days_remaining: 45 days
7. Get company tickets:
   - Query: CompanyTicket.findByCompanyId("company-uuid")
   - Returns: 1 ticket with status = "APPROVED"
```

**Expected Response**:
```javascript
{
  company: {
    id: "company-uuid",
    name: "Test Company",
    email: "test@company.com",
    status: "ACTIVE"  // ← Now ACTIVE, was PENDING_APPROVAL
  },
  summary: {
    total_assignments: 2,
    active_assignments: 0,
    prebooked_assignments: 2,  // ← Shows 2 assignments
    priority_count: 0,
    pending_tickets: 0
  },
  active_assignments: [],
  prebooked_assignments: [
    {
      id: "assignment-uuid-1",
      auto_id: "auto-uuid-1",
      auto_no: "TN-12-AB-1234",
      owner_name: "Owner Name",
      area_name: "Area Name",
      start_date: "2024-02-15T00:00:00Z",
      end_date: "2024-02-24T00:00:00Z",
      status: "PREBOOKED",
      days_remaining: 45
    },
    {
      id: "assignment-uuid-2",
      auto_id: "auto-uuid-2",
      auto_no: "TN-12-CD-5678",
      owner_name: "Owner Name 2",
      area_name: "Area Name",
      start_date: "2024-02-15T00:00:00Z",
      end_date: "2024-02-24T00:00:00Z",
      status: "PREBOOKED",
      days_remaining: 45
    }
  ],
  priority_assignments: [],
  tickets: [
    {
      id: "ticket-uuid",
      ticket_status: "APPROVED",
      autos_required: 2,
      days_required: 10,
      area_name: "Area Name"
    }
  ],
  pending_tickets: []
}
```

**Frontend Display**:
```
Company Name: Test Company
Status: 🟢 ACTIVE

┌─────────────────────────────────┐
│  Summary                         │
├─────────────────────────────────┤
│ Total Assignments: 2            │
│ Active: 0                       │
│ Prebooked: 2                    │
│ Priority: 0                     │
└─────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Prebooked Assignments (2)                               │
├──────┬──────┬─────────────┬──────┬────────────────────────┤
│ Auto │ Area │    Dates    │ Days │ Status                 │
├──────┼──────┼─────────────┼──────┼────────────────────────┤
│TN-12-│Area  │ Feb 15-24   │ 45   │ PREBOOKED              │
│AB-12 │Name  │             │      │ (Starts in future)     │
├──────┼──────┼─────────────┼──────┼────────────────────────┤
│TN-12-│Area  │ Feb 15-24   │ 45   │ PREBOOKED              │
│CD-56 │Name  │             │      │ (Starts in future)     │
└──────┴──────┴─────────────┴──────┴────────────────────────┘
```

**✅ EXPECTED RESULT: Company sees 2 assigned autos on dashboard!**

---

## Summary of Complete Workflow

| Step | Action | System | Result |
|------|--------|--------|--------|
| 1 | Company registers with request | Creates company (PENDING) + ticket (PENDING) | ✅ Registration complete |
| 2 | Admin views requests | Fetches pending tickets | ✅ Admin sees request |
| 3 | Admin clicks Approve | **Creates 2 assignments** | ✅ Assignments created, ticket APPROVED, company ACTIVE |
| 4 | Company views dashboard | Fetches assignments | ✅ **Company sees 2 autos** |

---

## Data Flow Diagram

```
┌─────────────────────────────────────┐
│ Company Portal                      │
│ - Register with auto request        │
│ - 2 autos, 10 days, area X          │
└────────────┬────────────────────────┘
             │ POST /company-auth/register
             ↓
        ┌─────────────────────────────┐
        │ Creates in Database:        │
        │ - Company (PENDING)         │
        │ - CompanyTicket (PENDING)   │
        │ - Status: Awaiting Approval │
        └──────────┬──────────────────┘
                   │
        ┌──────────────────────────────┐
        │ Admin Portal                 │
        │ - Views Company Requests     │
        │ - Sees pending request       │
        └────────────┬─────────────────┘
                     │ PATCH /company-tickets/admin/{id}/approve
                     ↓
        ┌───────────────────────────────────┐
        │ approveTicket() Function:         │
        │ 1. ticket_status → APPROVED   ✓   │
        │ 2. company_status → ACTIVE    ✓   │
        │ 3. Get autos in area X            │
        │ 4. Create Assignment 1        ✓   │
        │ 5. Create Assignment 2        ✓   │
        │ Response: "2 created"         ✓   │
        └────────────┬────────────────────┘
                     │ Now 2 assignments in DB
                     ↓
        ┌──────────────────────────────┐
        │ Company Portal               │
        │ - Login / Check Dashboard    │
        │ - GET /company-portal/{id}/  │
        │   dashboard                  │
        └────────────┬─────────────────┘
                     │ Fetch assignments
                     ↓
        ┌──────────────────────────────┐
        │ Dashboard Display:           │
        │ ✅ Company Status: ACTIVE    │
        │ ✅ 2 Prebooked Assignments   │
        │ ✅ Auto 1: TN-12-AB-1234     │
        │ ✅ Auto 2: TN-12-CD-5678     │
        │ ✅ Dates: Feb 15-24          │
        │ ✅ Area: Area X              │
        └──────────────────────────────┘
```

---

## Critical Path Verification

### ✅ Part 1: Request Created
- Company registration endpoint working
- CompanyTicket model creating records
- Ticket stored with all details (autos_required, days, area_id)

### ✅ Part 2: Admin Sees Request
- Admin route `/company-tickets/admin/pending` working
- Returns enriched tickets with company details
- Frontend displays in requests page

### ✅ Part 3: Admin Approves & Assignments Created
- approveTicket() endpoint working
- Auto selection logic working (filters by area)
- Assignment.create() called for each auto
- Assignments stored in database
- Response includes created assignments

### ✅ Part 4: Company Sees Assignments
- Company dashboard endpoint working
- Fetches assignments by company_id
- Enriches with auto details
- Calculates days_remaining
- Frontend displays in table

---

## Verification Checklist

After running through this workflow, verify:

- [ ] Company registration shows "Pending approval" message
- [ ] Admin sees request in Company Requests page
- [ ] Request shows correct area preference
- [ ] Admin approval shows "Request approved successfully!"
- [ ] Request disappears from pending list
- [ ] Company status message changes or auto-refreshes
- [ ] Company dashboard shows company status: ACTIVE
- [ ] Company dashboard shows 2 prebooked assignments
- [ ] Each assignment shows:
  - [ ] Auto number (TN-12-AB-1234 format)
  - [ ] Area name
  - [ ] Start and end dates
  - [ ] Days remaining
  - [ ] Status: PREBOOKED
- [ ] MongoDB has 2 assignment records
- [ ] Assignment records have correct dates
- [ ] Assignment status is PREBOOKED (or ACTIVE if start date is today)

---

## Troubleshooting

If dashboard still shows empty:

1. **Check Browser Console**: Look for API errors
2. **Check Network Tab**: Verify /company-portal/{id}/dashboard is called
3. **Check Server Logs**: Backend error messages
4. **Check Database**:
   ```javascript
   db.assignments.find({ company_id: "company-uuid" })
   // Should return 2 records
   ```
5. **Check Admin Response**: Did it say "2 assignment(s) created"?
6. **Force Refresh**: Ctrl+Shift+R to clear cache

---

**Status: ✅ Complete workflow ready to test**


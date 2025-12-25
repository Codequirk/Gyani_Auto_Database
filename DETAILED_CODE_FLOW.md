# 📊 Detailed Code Flow - What Happens at Each Step

## THE COMPLETE REQUEST → ASSIGNMENT → DASHBOARD FLOW

---

## 🔴 STEP 1: COMPANY REGISTERS WITH AUTO REQUEST

### Frontend: CompanyLoginPage.jsx
```javascript
// User fills form and clicks "Register"
const handleRegister = async (e) => {
  e.preventDefault();
  
  // Collect form data
  const registerData = {
    name: formData.name,
    email: formData.email,
    password: formData.password,
    contact_person: formData.contactPerson,
    phone_number: formData.phone,
    autos_required: parseInt(formData.autosRequired),     // 2
    days_required: parseInt(formData.daysRequired),       // 10
    start_date: formData.startDate,                       // 2024-02-15
    area_id: regAreaId || null                            // area-uuid
  };
  
  // Send to backend
  const response = await api.post('/company-auth/register', registerData);
  
  // Store token
  localStorage.setItem('company_auth_token', response.auth_token);
  
  // Redirect to company portal
  navigate('/company/dashboard');
};
```

### Backend: companyAuthController.js
```javascript
exports.registerCompany = async (req, res, next) => {
  // Extract data from request
  const { 
    name, email, password,
    contact_person, phone_number,
    autos_required, days_required, start_date, area_id
  } = req.body;
  
  // Hash password
  const password_hash = await bcrypt.hash(password, 10);
  
  // STEP 1: Create company in database
  const company = await Company.create({
    name,
    email,
    password_hash,
    contact_person,
    phone_number,
    company_status: 'PENDING_APPROVAL',  // ← KEY: Not yet approved
    status: 'INACTIVE'
  });
  
  // STEP 2: Get area name if area_id provided
  let areaName = 'Any Area';
  if (area_id) {
    const area = await Area.findById(area_id);
    if (area) {
      areaName = area.name;
    }
  }
  
  // STEP 3: Create initial ticket (company's request)
  const ticket = await CompanyTicket.create({
    company_id: company.id,
    autos_required: parseInt(autos_required),           // 2
    days_required: parseInt(days_required),             // 10
    start_date: new Date(start_date),                   // 2024-02-15
    area_id: area_id || null,                           // area-uuid
    area_name: areaName,                                // "Area Name"
    ticket_status: 'PENDING',                           // ← KEY: Waiting for approval
    notes: ''
  });
  
  // STEP 4: Generate JWT token for company
  const auth_token = jwt.sign(
    { 
      id: company.id,
      email: company.email,
      type: 'company'  // ← Identifies this as company token
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  // STEP 5: Return response
  res.json({
    id: company.id,
    name: company.name,
    auth_token: auth_token,
    message: 'Company registered, awaiting admin approval'
  });
};
```

### Database: What Gets Created
```javascript
// companies collection
{
  _id: ObjectId,
  id: "company-uuid",
  name: "Test Company XYZ",
  email: "test@company.com",
  password_hash: "$2a$10$...",
  contact_person: "John Doe",
  phone_number: "9876543210",
  company_status: "PENDING_APPROVAL",  // ← NOT YET APPROVED
  status: "INACTIVE",
  created_at: ISODate("2024-01-10T10:00:00Z"),
  updated_at: ISODate("2024-01-10T10:00:00Z")
}

// company_tickets collection
{
  _id: ObjectId,
  id: "ticket-uuid",
  company_id: "company-uuid",
  autos_required: 2,                    // Needs 2 autos
  days_required: 10,                    // For 10 days
  start_date: ISODate("2024-02-15"),    // Starting Feb 15
  area_id: "area-uuid",
  area_name: "Area Name",
  ticket_status: "PENDING",             // ← WAITING FOR APPROVAL
  notes: "",
  created_at: ISODate("2024-01-10T10:00:00Z"),
  updated_at: ISODate("2024-01-10T10:00:00Z")
}

// ❌ NO ASSIGNMENTS YET (will be created during approval)
```

### Frontend: What User Sees
```
Screen: Company Portal - Login page
Message: "⏳ Your company registration is pending admin approval"
Button: "Check Approval Status"
Status: NOT ACTIVE YET

Token stored: localStorage.company_auth_token = "jwt-token"
```

---

## 🟡 STEP 2: ADMIN VIEWS REQUEST & APPROVES

### Frontend: CompanyRequestsPage.jsx
```javascript
// Admin navigates to requests page
useEffect(() => {
  // Fetch ALL company tickets (not just pending)
  const response = await api.get('/company-tickets/admin/all');
  setAllRequests(response.data);
  
  // Local filtering
  const pending = response.data.filter(r => r.ticket_status === 'PENDING');
  setPendingRequests(pending);
}, []);

// Admin clicks APPROVE button
const handleApprove = async () => {
  const response = await api.patch(
    `/company-tickets/admin/${selectedRequest.id}/approve`,
    {
      admin_id: 'current_admin_id'  // From auth context
    }
  );
  
  // Response from backend
  console.log(response.data);
  // Shows: "2 assignment(s) created"
  
  // Refresh list
  fetchRequests();
};
```

### Backend: companyTicketController.js - approveTicket()

#### PART A: Initial Validation & Approval
```javascript
exports.approveTicket = async (req, res, next) => {
  const { id } = req.params;  // ticket-uuid
  const { admin_id } = req.body;
  
  // ✅ STEP 1: Validate
  if (!id || !admin_id) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  const ticket = await CompanyTicket.findById(id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  
  // ✅ STEP 2: Update ticket status to APPROVED
  const approvedTicket = await CompanyTicket.approve(id, admin_id);
  // Updates: ticket_status = "APPROVED"
  
  // ✅ STEP 3: Activate company (change PENDING_APPROVAL → ACTIVE)
  const company = await Company.findById(ticket.company_id);
  if (company && company.company_status === 'PENDING_APPROVAL') {
    await Company.update(ticket.company_id, { 
      company_status: 'ACTIVE'  // ← NOW ACTIVE!
    });
  }
```

#### PART B: Auto Selection
```javascript
  // ✅ STEP 4: Get available autos (filtered by area)
  try {
    let assignmentAutos = [];  // Will hold selected auto IDs
    
    // Build filter criteria
    const filterCriteria = {};
    if (ticket.area_id) {
      filterCriteria.area_id = ticket.area_id;  // Filter by area
    }
    
    // Get available autos from database
    const availableAutos = await Auto.findAll(filterCriteria);
    // Returns: [auto1, auto2, auto3, auto4, auto5, ...]
    
    // Select first N autos (N = autos_required)
    assignmentAutos = availableAutos
      .slice(0, ticket.autos_required)  // Take first 2
      .map(auto => auto.id);            // Get their IDs
    // Result: ["auto-uuid-1", "auto-uuid-2"]
```

#### PART C: Create Assignments
```javascript
    // ✅ STEP 5: Create assignment for each auto
    const assignments = [];
    const { getDateNDaysFromNow } = require('../utils/dateUtils');
    
    for (const autoId of assignmentAutos) {
      // Calculate end date
      const endDate = getDateNDaysFromNow(
        ticket.days_required - 1,  // 10 - 1 = 9
        ticket.start_date          // 2024-02-15
      );
      // Result: 2024-02-24 (15 + 9 = 24)
      
      // Determine status (PREBOOKED if future, ACTIVE if today/past)
      const status = new Date(ticket.start_date) > new Date() 
        ? 'PREBOOKED'  // Future date
        : 'ACTIVE';    // Today or past
      
      // CREATE ASSIGNMENT in database
      const assignment = await Assignment.create({
        auto_id: autoId,                           // "auto-uuid-1"
        company_id: ticket.company_id,             // "company-uuid"
        start_date: ticket.start_date,             // 2024-02-15
        end_date: endDate,                         // 2024-02-24
        status: status,                            // "PREBOOKED"
        notes: `From ticket approval: ...`
      });
      
      assignments.push(assignment);
    }
    // Result: Created 2 assignment records in database
```

#### PART D: Return Response
```javascript
    // ✅ STEP 6: Return success response
    res.json({
      ticket: approvedTicket,        // Updated ticket
      assignments: assignments,       // 2 created assignments
      message: 'Ticket approved, company activated, and 2 assignment(s) created'
    });
```

### Database: What Changes
```javascript
// companies collection - UPDATED
{
  id: "company-uuid",
  company_status: "ACTIVE"  // ← CHANGED from PENDING_APPROVAL
}

// company_tickets collection - UPDATED
{
  id: "ticket-uuid",
  ticket_status: "APPROVED"  // ← CHANGED from PENDING
}

// assignments collection - CREATED (NEW RECORDS)
[
  {
    _id: ObjectId,
    id: "assignment-uuid-1",
    auto_id: "auto-uuid-1",
    company_id: "company-uuid",
    start_date: ISODate("2024-02-15"),
    end_date: ISODate("2024-02-24"),
    status: "PREBOOKED",
    notes: "From ticket approval: ...",
    created_at: ISODate("2024-01-10T10:15:00Z")
  },
  {
    _id: ObjectId,
    id: "assignment-uuid-2",
    auto_id: "auto-uuid-2",
    company_id: "company-uuid",
    start_date: ISODate("2024-02-15"),
    end_date: ISODate("2024-02-24"),
    status: "PREBOOKED",
    notes: "From ticket approval: ...",
    created_at: ISODate("2024-01-10T10:15:00Z")
  }
]
```

### Frontend: Admin Sees
```
Alert: "Request approved successfully!"
Request disappears from PENDING list
Confirmation: Shows "2 assignment(s) created"
```

---

## 🟢 STEP 3: COMPANY VIEWS DASHBOARD

### Frontend: CompanyDashboardPage.jsx
```javascript
// Component mounts, fetches dashboard data
useEffect(() => {
  const fetchDashboard = async () => {
    try {
      // CRITICAL CALL: Get dashboard data
      const response = await api.get(`/company-portal/${company.id}/dashboard`);
      
      setDashboard(response.data);
      // Response includes:
      // - company status
      // - summary counts
      // - active_assignments (array)
      // - prebooked_assignments (array)  ← Will have 2 items now!
      
    } catch (err) {
      // Handle errors (e.g., PENDING_APPROVAL, INACTIVE)
      setError(errorMessage);
    }
  };
  
  fetchDashboard();
}, [company]);
```

### Backend: companyPortalController.js - getCompanyDashboard()

#### PART A: Validation
```javascript
exports.getCompanyDashboard = async (req, res, next) => {
  const { company_id } = req.params;
  
  // ✅ STEP 1: Get company
  const company = await Company.findById(company_id);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  // ✅ STEP 2: Check if company is ACTIVE
  if (company.company_status !== 'ACTIVE') {
    return res.status(403).json({ 
      error: 'Your account is pending approval or deactivated',
      status: company.company_status
    });
  }
  // ✅ Company IS ACTIVE (changed during approval)
```

#### PART B: Fetch & Filter Assignments
```javascript
  // ✅ STEP 3: Get all assignments for company
  const assignments = await Assignment.findByCompanyId(company_id);
  // Returns: [assignment1, assignment2]
  // (The 2 created during approval)
  
  // ✅ STEP 4: Separate by status
  const activeAssignments = assignments.filter(a => a.status === 'ACTIVE');
  // Result: [] (empty - none started yet)
  
  const prebookedAssignments = assignments.filter(a => a.status === 'PREBOOKED');
  // Result: [assignment1, assignment2] (both are PREBOOKED)
```

#### PART C: Enrich with Auto Details
```javascript
  // ✅ STEP 5: Enrich with auto information
  const enrichedPrebooked = await Promise.all(
    prebookedAssignments.map(async (assignment) => {
      // Fetch auto details
      const auto = await Auto.findById(assignment.auto_id);
      
      // Calculate days remaining
      const daysRemaining = computeDaysRemaining(assignment.end_date);
      
      return {
        ...assignment,
        auto_no: auto.auto_no,           // "TN-12-AB-1234"
        owner_name: auto.owner_name,     // "Owner Name"
        area_name: auto.area_name,       // "Area Name"
        days_remaining: daysRemaining     // 45
      };
    })
  );
  // Result: 2 enriched assignment objects
```

#### PART D: Get Tickets & Summary
```javascript
  // ✅ STEP 6: Get company's tickets
  const tickets = await CompanyTicket.findByCompanyId(company_id);
  const pendingTickets = tickets.filter(t => t.ticket_status === 'PENDING');
  
  // ✅ STEP 7: Build summary
  const summary = {
    total_assignments: assignments.length,        // 2
    active_assignments: activeAssignments.length, // 0
    prebooked_assignments: prebookedAssignments.length, // 2
    priority_count: 0,
    pending_tickets: pendingTickets.length        // 0
  };
```

#### PART E: Return Complete Dashboard
```javascript
  // ✅ STEP 8: Return dashboard response
  res.json({
    company: {
      id: company.id,
      name: company.name,
      email: company.email,
      status: company.company_status    // "ACTIVE"
    },
    summary: {
      total_assignments: 2,
      active_assignments: 0,
      prebooked_assignments: 2,         // ← SHOWS 2!
      priority_count: 0,
      pending_tickets: 0
    },
    active_assignments: [],             // ← Empty (none started)
    prebooked_assignments: [            // ← Contains 2 autos!
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
    tickets: [...],
    pending_tickets: []
  });
};
```

### Frontend: Display Dashboard
```javascript
// Render the response data
return (
  <div>
    <h2>Dashboard</h2>
    <p>Status: {dashboard.company.status}</p>  {/* ACTIVE */}
    
    <div>Summary</div>
    <p>Total: {dashboard.summary.total_assignments}</p>        {/* 2 */}
    <p>Prebooked: {dashboard.summary.prebooked_assignments}</p> {/* 2 */}
    
    <table>
      <thead>
        <tr>
          <th>Auto #</th>
          <th>Area</th>
          <th>Dates</th>
          <th>Days</th>
        </tr>
      </thead>
      <tbody>
        {dashboard.prebooked_assignments.map(assignment => (
          <tr key={assignment.id}>
            <td>{assignment.auto_no}</td>        {/* TN-12-AB-1234 */}
            <td>{assignment.area_name}</td>      {/* Area Name */}
            <td>{assignment.start_date} - {assignment.end_date}</td> {/* Feb 15-24 */}
            <td>{assignment.days_remaining}</td> {/* 45 */}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
```

### Frontend: What User Sees
```
✅ Status: ACTIVE (no longer "pending")
✅ Summary shows: 2 assignments
✅ Table shows: 2 rows with auto details
✅ Each row displays: auto number, area, dates, days remaining

┌────────────┬───────────┬─────────────┬──────┐
│ Auto       │ Area      │ Dates       │ Days │
├────────────┼───────────┼─────────────┼──────┤
│ TN-12-AB-  │ Area Name │ Feb 15 - 24 │ 45   │
│ 1234       │           │             │      │
├────────────┼───────────┼─────────────┼──────┤
│ TN-12-CD-  │ Area Name │ Feb 15 - 24 │ 45   │
│ 5678       │           │             │      │
└────────────┴───────────┴─────────────┴──────┘
```

---

## 📊 Data Journey Summary

```
REQUEST REGISTRATION (Step 1)
├─ Company Created: company_status = PENDING_APPROVAL
├─ Ticket Created: ticket_status = PENDING
├─ Area Selected: area_id stored
└─ Frontend: Shows "Pending approval"

ADMIN APPROVAL (Step 2) ⚡ CRITICAL ⚡
├─ Ticket Updated: ticket_status = APPROVED
├─ Company Updated: company_status = ACTIVE
├─ Autos Selected: From area (first 2 available)
├─ Assignment #1 Created:
│  ├─ auto_id: auto-uuid-1
│  ├─ dates: 2024-02-15 to 2024-02-24
│  ├─ status: PREBOOKED
│  └─ Database: Saved
├─ Assignment #2 Created:
│  ├─ auto_id: auto-uuid-2
│  ├─ dates: 2024-02-15 to 2024-02-24
│  ├─ status: PREBOOKED
│  └─ Database: Saved
└─ Response: "2 assignment(s) created"

COMPANY DASHBOARD (Step 3)
├─ Company Check: Status = ACTIVE ✓
├─ Fetch Assignments: Gets 2 records
├─ Enrich Data:
│  ├─ Assignment 1 + Auto details
│  ├─ Assignment 2 + Auto details
│  └─ Days remaining: 45
├─ Build Dashboard: All data ready
└─ Display: 2 autos shown in table
```

---

## Key Code Points

### Auto Selection Logic
```javascript
const filterCriteria = {};
if (ticket.area_id) {
  filterCriteria.area_id = ticket.area_id;  // Filter by area
}
const availableAutos = await Auto.findAll(filterCriteria);
assignmentAutos = availableAutos
  .slice(0, ticket.autos_required)  // Take first N
  .map(auto => auto.id);            // Get IDs only
```

### Date Calculation
```javascript
const endDate = getDateNDaysFromNow(
  ticket.days_required - 1,  // Subtract 1 for inclusive counting
  ticket.start_date
);
// Example: 10 days needed
// 2024-02-15 + (10-1) = 2024-02-24
// Total: 10 days (15, 16, 17, 18, 19, 20, 21, 22, 23, 24)
```

### Status Determination
```javascript
status: new Date(ticket.start_date) > new Date() 
  ? 'PREBOOKED'  // Future date = Not started yet
  : 'ACTIVE';    // Today or past = Already in use
```

---

## Flow Diagram

```
┌──────────────────────────────────────┐
│ STEP 1: COMPANY REGISTERS            │
├──────────────────────────────────────┤
│ companyAuthController.registerCompany│
│                                      │
│ Create: Company (PENDING_APPROVAL)   │
│ Create: Ticket (PENDING)             │
│ Return: JWT Token + Message          │
│                                      │
│ Database State:                      │
│ • companies: 1 PENDING record        │
│ • company_tickets: 1 PENDING record  │
│ • assignments: 0 records             │
└──────────────────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│ STEP 2: ADMIN APPROVES               │
├──────────────────────────────────────┤
│ companyTicketController.approveTicket│
│                                      │
│ Update: Ticket → APPROVED            │
│ Update: Company → ACTIVE             │
│ Select: 2 autos from area            │
│ Create: Assignment #1                │
│ Create: Assignment #2                │
│ Return: "2 created"                  │
│                                      │
│ Database State:                      │
│ • companies: 1 ACTIVE record         │
│ • company_tickets: 1 APPROVED record │
│ • assignments: 2 PREBOOKED records   │
└──────────────────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│ STEP 3: COMPANY VIEWS DASHBOARD      │
├──────────────────────────────────────┤
│ companyPortalController.getCompanyDash
│                                      │
│ Verify: Company status = ACTIVE ✓   │
│ Fetch: 2 assignments                 │
│ Enrich: Auto details + days calc     │
│ Return: Dashboard with 2 autos       │
│                                      │
│ Frontend Displays:                   │
│ • Status: ACTIVE                     │
│ • Summary: 2 assignments             │
│ • Table: 2 auto rows with details    │
└──────────────────────────────────────┘
           ↓
        ✅ DONE!
```

---

This is the **COMPLETE FLOW** of how a company request becomes assigned autos visible on the dashboard! 🚀


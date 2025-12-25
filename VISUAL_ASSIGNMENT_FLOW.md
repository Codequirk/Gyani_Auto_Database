# 🎨 Visual Guide - Manual Auto Assignment Flow

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOWS                            │
└──────────────────────────────────────────────────────────────────┘

╔════════════════════════════════════════════════════════════════════╗
║                    COMPANY PORTAL FLOW                             ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  1. REGISTER/LOGIN                                                 ║
║     └─→ Company Portal Home                                        ║
║                                                                    ║
║  2. REQUEST AUTOS                                                  ║
║     ├─ Fill request form:                                          ║
║     │  ├─ Number of autos required                                 ║
║     │  ├─ Duration (days)                                          ║
║     │  ├─ Start date                                               ║
║     │  └─ Preferred area (optional)                                ║
║     └─→ Submit Request                                             ║
║         └─→ Ticket created with status: PENDING                   ║
║                                                                    ║
║  3. WAIT FOR ADMIN APPROVAL                                        ║
║     └─→ Check status in "My Requests" page                         ║
║                                                                    ║
║  4. VIEW ASSIGNED AUTOS                                            ║
║     └─→ After approval, see autos in "My Autos" dashboard          ║
║         ├─ Auto number                                             ║
║         ├─ Owner/driver info                                       ║
║         ├─ Assignment dates                                        ║
║         └─ Status (PREBOOKED/ACTIVE)                               ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝


╔════════════════════════════════════════════════════════════════════╗
║                   ADMIN PORTAL FLOW (NEW!)                         ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  1. LOGIN AS ADMIN                                                 ║
║     └─→ Admin Portal Home                                          ║
║                                                                    ║
║  2. VIEW COMPANY REQUESTS                                          ║
║     ├─ Navigate to "Company Requests" page                         ║
║     └─ See list of all requests:                                   ║
║        ├─ PENDING (new requests waiting for approval)              ║
║        ├─ APPROVED (already approved)                              ║
║        └─ REJECTED (rejected requests)                             ║
║                                                                    ║
║  3. FILTER REQUESTS (optional)                                     ║
║     └─ Click PENDING tab to see only new requests                  ║
║                                                                    ║
║  4. VIEW REQUEST DETAILS                                           ║
║     ├─ Click on request card                                       ║
║     └─ Modal shows:                                                ║
║        ├─ Company name & contact                                   ║
║        ├─ Autos required                                           ║
║        ├─ Duration & start date                                    ║
║        ├─ Preferred area                                           ║
║        └─ Special notes (if any)                                   ║
║                                                                    ║
║  5. CLICK "APPROVE & ASSIGN" (NEW!)  ← NEW BUTTON                 ║
║     └─→ System loads available autos...                            ║
║                                                                    ║
║                                                                    ║
║  ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼                  ║
║                                                                    ║
║  ╔══════════════════════════════════════════════════════════════╗ ║
║  ║              AUTO SELECTION MODAL (NEW!)                    ║ ║
║  ╠══════════════════════════════════════════════════════════════╣ ║
║  ║                                                              ║ ║
║  ║  Title: "Select 2 Auto(s) to Assign"                        ║ ║
║  ║                                                              ║ ║
║  ║  ┌──────────────────────────────────────────────┐           ║ ║
║  ║  │ Request Summary:                             │           ║ ║
║  ║  │ • Company: ABC Logistics                     │           ║ ║
║  ║  │ • Autos to Select: 2                         │           ║ ║
║  ║  │ • Preferred Area: Area A                     │           ║ ║
║  ║  │ • Selected: 0 / 2                            │           ║ ║
║  ║  └──────────────────────────────────────────────┘           ║ ║
║  ║                                                              ║ ║
║  ║  Available Autos:                                            ║ ║
║  ║  ┌──────────────────────────────────────────────┐           ║ ║
║  ║  │ □ ABC-1001 (John Doe) - Area A              │ ← Click!  ║ ║
║  ║  ├──────────────────────────────────────────────┤           ║ ║
║  ║  │ □ ABC-1002 (Jane Smith) - Area A            │ ← Click!  ║ ║
║  ║  ├──────────────────────────────────────────────┤           ║ ║
║  ║  │ □ ABC-1003 (Bob Johnson) - Area A           │           ║ ║
║  ║  ├──────────────────────────────────────────────┤           ║ ║
║  ║  │ □ ABC-1004 (Alice Brown) - Area A           │           ║ ║
║  ║  └──────────────────────────────────────────────┘           ║ ║
║  ║  (Scrollable if more than 5 autos)                           ║ ║
║  ║                                                              ║ ║
║  ║  After selecting 2:                                          ║ ║
║  ║  ┌──────────────────────────────────────────────┐           ║ ║
║  ║  │ ☑ ABC-1001 (John Doe) - Area A        ✓    │ Highlight ║ ║
║  ║  ├──────────────────────────────────────────────┤           ║ ║
║  ║  │ ☑ ABC-1002 (Jane Smith) - Area A      ✓    │ Highlight ║ ║
║  ║  ├──────────────────────────────────────────────┤           ║ ║
║  ║  │ □ ABC-1003 (Bob Johnson) - Area A           │ (Disabled)║ ║
║  ║  └──────────────────────────────────────────────┘           ║ ║
║  ║                                                              ║ ║
║  ║  Selection Counter: 2 / 2 ✅                                 ║ ║
║  ║                                                              ║ ║
║  ║  Action Buttons:                                             ║ ║
║  ║  ┌─────────────────────────┬──────────────────────┐          ║ ║
║  ║  │ Confirm Assignment (2/2)│      Cancel         │          ║ ║
║  ║  └─────────────────────────┴──────────────────────┘          ║ ║
║  ║                                                              ║ ║
║  ║  Validations:                                                ║ ║
║  ║  • Can't select more than 2 → Alert shown                    ║ ║
║  ║  • Must select at least 1 → Confirm button disabled          ║ ║
║  ║  • Wrong area autos → Filtered out automatically             ║ ║
║  ║                                                              ║ ║
║  ╚══════════════════════════════════════════════════════════════╝ ║
║                                                                    ║
║  6. ADMIN SELECTS AUTOS                                           ║
║     ├─ Click checkboxes to select                                 ║
║     ├─ Selection counter shows progress: 0/2, 1/2, 2/2            ║
║     └─ Selected autos highlight in blue                           ║
║                                                                    ║
║  7. CONFIRM ASSIGNMENT                                            ║
║     ├─ Click "Confirm Assignment" button                          ║
║     ├─ Backend creates assignments                                ║
║     └─ Success message: "Request approved and 2 auto(s)assigned!" ║
║                                                                    ║
║  8. REQUEST STATUS UPDATED                                        ║
║     ├─ Status changes from PENDING → APPROVED                     ║
║     ├─ Company marked as ACTIVE                                   ║
║     └─ Modal closes automatically                                 ║
║                                                                    ║
║  9. ADMIN CAN CONTINUE                                            ║
║     └─ Process next pending request                               ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝


┌──────────────────────────────────────────────────────────────────┐
│                     DATABASE CHANGES                              │
└──────────────────────────────────────────────────────────────────┘

CompanyTicket (Request):
  ├─ id
  ├─ company_id
  ├─ autos_required: 2
  ├─ days_required: 5
  ├─ start_date: 2024-01-15
  ├─ area_id: area_a_123
  ├─ area_name: "Area A"
  ├─ ticket_status: PENDING → APPROVED
  └─ timestamp

Admin Approves with auto_ids = [auto_1, auto_2]
         ↓
Assignment Created #1:
  ├─ id: assignment_1
  ├─ auto_id: auto_1
  ├─ company_id: company_123
  ├─ start_date: 2024-01-15
  ├─ end_date: 2024-01-20
  ├─ status: PREBOOKED (or ACTIVE if start_date <= today)
  └─ notes: "From ticket approval..."

Assignment Created #2:
  ├─ id: assignment_2
  ├─ auto_id: auto_2
  ├─ company_id: company_123
  ├─ start_date: 2024-01-15
  ├─ end_date: 2024-01-20
  ├─ status: PREBOOKED
  └─ notes: "From ticket approval..."

Company:
  ├─ id: company_123
  ├─ name: "ABC Logistics"
  ├─ company_status: PENDING_APPROVAL → ACTIVE
  └─ other_fields


┌──────────────────────────────────────────────────────────────────┐
│                      API REQUEST FLOW                             │
└──────────────────────────────────────────────────────────────────┘

Step 1: Admin clicks "Approve & Assign"
┌────────────────────────────────────────────┐
│ Frontend sends:                            │
│ GET /api/autos?area_id=area_a_123         │
│                                            │
│ With header:                               │
│ Authorization: Bearer {admin_token}        │
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│ Backend returns:                           │
│ [                                          │
│   {                                        │
│     "id": "auto_1",                        │
│     "auto_no": "ABC-1001",                 │
│     "owner_name": "John Doe",              │
│     "area_id": "area_a_123",               │
│     "area_name": "Area A",                 │
│     "status": "AVAILABLE"                  │
│   },                                       │
│   ...                                      │
│ ]                                          │
└────────────────────────────────────────────┘
         ↓ Modal Displays Autos
Admin Selects 2 Autos
         ↓
Step 2: Admin clicks "Confirm Assignment"
┌────────────────────────────────────────────┐
│ Frontend sends:                            │
│ PATCH /api/company-tickets/admin/{id}/approve
│                                            │
│ Body:                                      │
│ {                                          │
│   "admin_id": "admin_user_123",            │
│   "auto_ids": ["auto_1", "auto_2"]         │
│ }                                          │
│                                            │
│ Header:                                    │
│ Authorization: Bearer {admin_token}        │
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│ Backend:                                   │
│ 1. Approve CompanyTicket                   │
│    ticket_status → APPROVED                │
│                                            │
│ 2. Activate Company                        │
│    company_status → ACTIVE                 │
│                                            │
│ 3. Create Assignments                      │
│    For auto_1: Create Assignment           │
│    For auto_2: Create Assignment           │
│    status: PREBOOKED (or ACTIVE)           │
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│ Backend returns:                           │
│ {                                          │
│   "ticket": {                              │
│     "id": "ticket_123",                    │
│     "ticket_status": "APPROVED",           │
│     ...                                    │
│   },                                       │
│   "assignments": [                         │
│     {"id": "asn_1", "auto_id": "auto_1"},  │
│     {"id": "asn_2", "auto_id": "auto_2"}   │
│   ],                                       │
│   "message": "Ticket approved and 2..."    │
│ }                                          │
└────────────────────────────────────────────┘
         ↓ Modal Closes
Admin Sees Success Message
Request Status Updates to APPROVED


┌──────────────────────────────────────────────────────────────────┐
│              COMPANY PORTAL SEES ASSIGNMENTS                      │
└──────────────────────────────────────────────────────────────────┘

Company Dashboard / My Autos Page:

╔════════════════════════════════════════════╗
║           MY ASSIGNED AUTOS                ║
╠════════════════════════════════════════════╣
║                                            ║
║  Auto Card #1:                             ║
║  ┌──────────────────────────────────────┐  ║
║  │ 🚗 ABC-1001                          │  ║
║  │ Owner: John Doe                      │  ║
║  │ From: Jan 15, 2024 - Jan 20, 2024    │  ║
║  │ Status: [PREBOOKED] (Starts Soon)    │  ║
║  │ Area: Area A                         │  ║
║  └──────────────────────────────────────┘  ║
║                                            ║
║  Auto Card #2:                             ║
║  ┌──────────────────────────────────────┐  ║
║  │ 🚗 ABC-1002                          │  ║
║  │ Owner: Jane Smith                    │  ║
║  │ From: Jan 15, 2024 - Jan 20, 2024    │  ║
║  │ Status: [PREBOOKED] (Starts Soon)    │  ║
║  │ Area: Area A                         │  ║
║  └──────────────────────────────────────┘  ║
║                                            ║
╚════════════════════════════════════════════╝


┌──────────────────────────────────────────────────────────────────┐
│                     ERROR SCENARIOS                               │
└──────────────────────────────────────────────────────────────────┘

Scenario 1: No Autos Available
  │ Admin clicks "Approve & Assign"
  │ System fetches autos from area
  │ No autos found in that area
  │         ↓
  │ Modal shows: "No autos available in this area"
  │ Confirm button disabled
  │ Admin must cancel and contact system admin

Scenario 2: Selection Exceeded
  │ Request needs: 2 autos
  │ Admin tries to select: 3 autos
  │         ↓
  │ Alert: "You can only select 2 auto(s)"
  │ 3rd auto cannot be selected
  │ Selection enforced

Scenario 3: Cancel Assignment
  │ Admin clicks "Approve & Assign"
  │ Modal shows autos
  │ Admin clicks "Cancel"
  │         ↓
  │ Modal closes
  │ Request still PENDING (no changes)
  │ Admin can process again later

Scenario 4: API Failure
  │ Admin clicks "Approve & Assign"
  │ Backend error loading autos
  │         ↓
  │ Error message displayed
  │ Modal doesn't appear
  │ Admin can retry


┌──────────────────────────────────────────────────────────────────┐
│                    KEY COMPONENTS                                 │
└──────────────────────────────────────────────────────────────────┘

Frontend Components:
├─ CompanyRequestsPage.jsx
│  ├─ State: selectedRequest, availableAutos, selectedAutos
│  ├─ Functions: handleApprove(), handleAssignAutos()
│  └─ Modal: Auto Selection Modal (NEW!)
│
└─ Modal Component
   ├─ Request summary section
   ├─ Available autos list (scrollable)
   ├─ Checkboxes for selection
   ├─ Selection counter
   └─ Action buttons (Confirm, Cancel)

Backend Components:
├─ companyTicketController.js
│  └─ approveTicket() function
│     ├─ Accepts auto_ids from request body
│     ├─ Creates assignments for selected autos
│     └─ Handles errors gracefully
│
└─ Auto Controller
   └─ findAll() with area filtering

Database Models:
├─ CompanyTicket
├─ Assignment
├─ Auto
└─ Company

API Endpoints:
├─ GET /api/autos?area_id={id}
└─ PATCH /api/company-tickets/admin/{id}/approve
```

---

## Visual Status Flow

```
REQUEST LIFECYCLE:

┌─────────┐      ┌──────────┐      ┌──────────┐
│ CREATED │ ───→ │ PENDING  │ ───→ │ APPROVED │
└─────────┘      └──────────┘      └──────────┘
                       ↓                  ↓
                  (Admin Action)   (Assignments Created)
                  (Modal Appears)  (Company Activated)


AUTO ASSIGNMENT PROCESS:

Step 1: Company Creates Request
   │
   ├─ CompanyTicket.create()
   └─ Status: PENDING

Step 2: Admin Views Request
   │
   ├─ CompanyRequestsPage renders list
   └─ Click to view details

Step 3: Admin Clicks "Approve & Assign" (NEW!)
   │
   ├─ handleApprove() called
   ├─ fetchAutos(area_id) via API
   ├─ Modal shows up with autos
   └─ Loading states managed

Step 4: Admin Selects Autos
   │
   ├─ toggleAutoSelection() updates Set
   ├─ Visual feedback (blue highlight)
   ├─ Counter updates (X/Y)
   └─ Validation enforced (max X autos)

Step 5: Admin Confirms
   │
   ├─ handleAssignAutos() called
   ├─ Backend receives auto_ids
   ├─ CompanyTicket.approve()
   ├─ Assignment.create() × N
   ├─ Company.activate()
   └─ Success message shown

Step 6: Company Sees Autos
   │
   ├─ Company logs in
   ├─ Checks dashboard/My Autos
   ├─ Sees newly assigned autos
   └─ With dates and details
```

---

## Before & After Comparison

**BEFORE** (Automatic):
```
Admin clicks "Approve"
         ↓
System auto-selects first N autos matching area
         ↓
Assignments created automatically
         ↓
Company gets random autos
         ↓
Admin has no control
```

**AFTER** (Manual Selection - NEW!):
```
Admin clicks "Approve & Assign"
         ↓
Modal shows all available autos
         ↓
Admin selects exactly which autos
         ↓
Admin confirms selection
         ↓
Assignments created for selected autos
         ↓
Company gets autos admin chose
         ↓
Admin has full control
```

---

## Key Improvements

✅ **Admin Control**: Choose exactly which autos to assign
✅ **Transparency**: See all available options before assigning
✅ **Flexibility**: Can optimize based on auto availability
✅ **Validation**: Prevents over-selection automatically
✅ **User Experience**: Interactive modal with visual feedback
✅ **Error Handling**: Graceful failures with helpful messages
✅ **Backward Compatible**: Old code still works if needed

---

**This visual guide shows the complete flow of the manual auto assignment system.**

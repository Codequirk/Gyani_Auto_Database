# Payment Feature Implementation - Auto Assignment with Cost Calculation

## Overview
Added a comprehensive payment feature that allows administrators to set cost per day for autos during assignment, automatically calculates total cost (cost_per_day × number_of_autos × number_of_days), and displays payment data organized by companies.

## Changes Made

### 1. Company Portal - Auto Assignment Wizard (company-portal/src/pages/AutosPage.jsx)

#### New Features:
- **Step 4: Cost Input** - Added a new step in the assignment wizard to ask for cost per day
- **Steps**: 1 (Select Company) → 2 (Select Area) → 3 (Set Dates & Days) → 4 (Cost Per Day) → 5 (Select Autos)
- **Payment Summary Display**: Shows real-time calculation of total cost before confirming

#### Changes:
```javascript
// State variables added:
const [wizardData, setWizardData] = useState({ 
  company_id: '', 
  area_id: '', 
  days: '', 
  start_date: '',
  cost_per_day: '',  // NEW
  selectedAutoIds: new Set()
});

// Modal updated to show 5 steps instead of 4
title={`Assign Autos - Step ${wizardStep}/5`}
```

#### Step 4 (Cost Input) UI:
- Input field for cost per auto per day
- Real-time calculation showing:
  - Cost per Auto per Day
  - Number of Days
  - Cost per Auto Total
  - Grand Total (cost × autos × days)

#### Data Flow:
```
assignmentService.bulk({
  auto_ids: [...],
  company_id: "...",
  days: 30,
  start_date: "2026-01-25",
  cost_per_day: 500,  // NEW
  is_prebooked: true
})
```

---

### 2. Admin Panel - Company Requests (frontend/src/pages/CompanyRequestsPage.jsx)

#### New Features:
- **Cost Input Modal** - Appears when auto assignment is initiated
- **Payment Calculation** - Before confirming assignment, admin must specify cost per auto per day
- **Total Cost Breakdown** - Shows calculated costs with currency formatting

#### Changes:
```javascript
// New state variables:
const [costPerDayForAssignment, setCostPerDayForAssignment] = useState('');
const [showCostInputModal, setShowCostInputModal] = useState(false);

// Modified flow:
handleAssignAutos() → Shows cost input modal → proceedWithAssignment(costPerDay)
```

#### Cost Input Modal UI:
Displays:
- Payment Calculation Summary
  - Number of Autos
  - Number of Days
- Cost Per Auto Per Day (input field)
- Total Cost Breakdown:
  - Cost per Auto per Day
  - Cost per Auto Total (all days)
  - Number of Autos
  - Grand Total

#### Data Flow:
```
api.patch(`/company-tickets/admin/${ticketId}/approve`, {
  admin_id: "...",
  auto_ids: [...],
  cost_per_day: 500  // NEW
})
```

---

### 3. Backend - Assignment Controller (backend/src/controllers/assignmentController.js)

#### Updated Function: `bulkAssignAutos`

**New Parameters:**
- `cost_per_day` - Cost per auto per day (optional)

**Functionality:**
```javascript
// Accept cost_per_day from request
const { auto_ids, company_id, days, start_date, cost_per_day, is_prebooked } = req.body;

// Create assignments as before
const assignments = await Assignment.createBulk(assignmentData);

// NEW: Create payment records if cost_per_day is provided
if (cost_per_day !== undefined && cost_per_day !== null && cost_per_day > 0) {
  for (const assignment of assignments) {
    await Payment.create({
      ticket_id: assignment.id,
      auto_id: assignment.auto_id,
      company_id: company_id,
      auto_no: auto.auto_no,
      owner_name: auto.owner_name,
      area_id: auto.area_id,
      area_name: auto.area_name,
      cost_per_day: parseFloat(cost_per_day),
      total_days: totalDays,
      total_cost: parseFloat(cost_per_day) * totalDays,
      payment_status: 'PENDING'
    });
  }
}
```

---

### 4. Backend - Company Ticket Controller (backend/src/controllers/companyTicketController.js)

#### Updated Function: `approveTicket`

**New Parameters:**
- `cost_per_day` - Cost per auto per day (optional)

**Functionality:**
- Accepts `cost_per_day` from request body
- For each assignment created, also creates a payment record
- Payment records include:
  - Ticket ID (assignment ID)
  - Auto ID
  - Company ID
  - Auto details (number, owner, area)
  - Cost per day
  - Total days
  - Total cost (calculated)
  - Payment status (PENDING)

```javascript
// Create payment record if cost_per_day is provided
if (cost_per_day !== undefined && cost_per_day !== null && cost_per_day > 0) {
  await Payment.create({
    ticket_id: assignment.id,
    auto_id: autoId,
    company_id: ticket.company_id,
    auto_no: auto.auto_no,
    owner_name: auto.owner_name || '',
    area_id: auto.area_id || null,
    area_name: auto.area_name || '',
    cost_per_day: parseFloat(cost_per_day),
    total_days: totalDays,
    total_cost: parseFloat(cost_per_day) * totalDays,
    payment_status: 'PENDING'
  });
}
```

---

### 5. Payment Admin Page - Company Overview (frontend/src/pages/PaymentAdminPage.jsx)

#### New Section: Companies List

**Location:** Top of payment details section

**Features:**
- Grid display of all companies with payment data
- Each card shows:
  - Company Name
  - Email
  - Phone
  - Autos Assigned (count)
  - Total Payment Value (calculated)
- Cards are clickable/hover-enabled for visual feedback

**Display Format:**
```
📋 Companies List
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Company Name    │ │ Company Name    │ │ Company Name    │
│ Email: ...      │ │ Email: ...      │ │ Email: ...      │
│ Phone: ...      │ │ Phone: ...      │ │ Phone: ...      │
│ Autos: 5        │ │ Autos: 3        │ │ Autos: 7        │
│ Total: ₹50,000  │ │ Total: ₹30,000  │ │ Total: ₹70,000  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Below:** Detailed payment breakdown by company (existing feature enhanced)

---

## Calculation Logic

### Formula:
```
Total Cost = Cost Per Auto Per Day × Number of Autos × Number of Days

Example:
- Cost per day: ₹500
- Number of autos: 3
- Number of days: 30
- Total: 500 × 3 × 30 = ₹45,000
```

### Where Applied:
1. **Company Portal Wizard** - Step 4 shows real-time calculation
2. **Admin Requests Panel** - Cost modal shows breakdown
3. **Backend** - Payment record stores calculated total_cost
4. **Payment Page** - Displays all totals organized by company

---

## Payment Record Structure

### Database Fields (payments table):
```
{
  id: UUID,
  ticket_id: UUID (assignment ID),
  auto_id: UUID,
  company_id: UUID,
  auto_no: string,
  owner_name: string,
  area_id: UUID (optional),
  area_name: string,
  cost_per_day: decimal(10,2),
  total_days: integer,
  total_cost: decimal(12,2),        // Calculated field
  payment_status: enum['PENDING', 'APPROVED', 'PAID', 'CANCELLED'],
  created_at: timestamp,
  updated_at: timestamp
}
```

---

## User Experience Flow

### Company Portal (Company Admin):

1. Navigate to Autos Management
2. Click "⚡ Assign Autos"
3. **Step 1**: Select Company
4. **Step 2**: Select Area
5. **Step 3**: Set Start Date & Number of Days
6. **Step 4**: Enter Cost Per Auto Per Day (NEW)
   - See real-time calculation of total cost
7. **Step 5**: Select Autos
   - See total cost for selected autos
8. Click "Assign Autos"
9. Autos assigned with payment records created

### Admin Panel (Company Admin):

1. Navigate to Company Requests
2. Click "Action" on a PENDING request
3. Select auto(s) to assign
4. Click "Confirm Assignment"
5. **NEW**: Modal appears asking for Cost Per Auto Per Day
6. Enter cost and see total calculation
7. Click "Confirm & Assign"
8. Request approved with payments created

### Payment Admin Page:

1. View all companies in card format (NEW)
2. Each card shows company summary with total payment value
3. Below, see detailed payment breakdown by company
4. Payments organized by area within each company
5. View individual auto payments with:
   - Auto number
   - Owner name
   - Cost per day
   - Total days
   - Total cost
   - Payment status

---

## Benefits

✅ **Automatic Calculation** - No manual calculation needed
✅ **Real-Time Visibility** - Admins see cost implications before confirming
✅ **Accurate Tracking** - Payment records created automatically
✅ **Company Organization** - Payments clearly organized by company
✅ **Cost Control** - Easy to review and manage payment costs
✅ **Audit Trail** - Complete payment history for each assignment

---

## Testing Checklist

- [ ] Company Portal: Cost input step shows correct calculations
- [ ] Admin Panel: Cost modal appears when assigning autos
- [ ] Backend: Payment records created with correct values
- [ ] Payment Page: Companies list displays with correct totals
- [ ] Payment Page: Detailed section shows all payments correctly
- [ ] Calculate total: ₹500 × 3 autos × 30 days = ₹45,000 ✓
- [ ] Currency formatting: Displays as ₹45,000 (Indian format) ✓

---

## Files Modified

1. `company-portal/src/pages/AutosPage.jsx` - Added cost input step
2. `frontend/src/pages/CompanyRequestsPage.jsx` - Added cost input modal
3. `backend/src/controllers/assignmentController.js` - Payment creation logic
4. `backend/src/controllers/companyTicketController.js` - Payment creation logic
5. `frontend/src/pages/PaymentAdminPage.jsx` - Added companies list section

---

## Summary

The payment feature is now fully integrated into the auto assignment workflow. When admins assign autos, they must specify a cost per day. The system automatically calculates the total cost (cost_per_day × number_of_autos × number_of_days) and creates payment records. The payment admin page displays all companies with their payment data in an organized, easy-to-read format.

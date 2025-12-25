# Auto-Suggestion Implementation for Company Requests - December 25, 2025

## Overview
Implemented intelligent auto-suggestion system for the Admin Portal's Company Requests page. When approving a company ticket, the system now automatically suggests autos based on priority and availability, while maintaining full manual control for the admin.

---

## Features Implemented

### 1. **Intelligent Auto-Suggestion Algorithm**
The backend suggests autos in this priority order:
1. **IDLE AUTOS** (never assigned) - First priority
2. **ASSIGNED AUTOS THAT ARE FREE** - Available on the requested dates

Only suggests autos that have:
- No conflicting assignments during the requested date range
- Are available in the requested area (if specified)

### 2. **System Indication**
When autos are auto-selected, the UI shows:
- 🤖 **"System Suggestion"** banner
- Count breakdown: `X Idle + Y Assigned = Z of N required`
- Visual confirmation: "✓ Already selected based on priority"

### 3. **Auto Type Badges**
Each suggested auto displays a colored badge:
- **YELLOW "IDLE"** - Never been assigned before
- **BLUE "ASSIGNED (FREE)"** - Has been assigned before, but free on requested dates

### 4. **Manual Intervention**
Admin can still:
- **Uncheck** any suggested auto to deselect it
- **Check** other available autos to add them
- **Modify** the selection before approval
- **Cancel** and start over

---

## Technical Changes

### Backend Changes

#### File: `backend/src/controllers/companyTicketController.js`

**New Endpoint:** `suggestAutosForTicket()`
- **Route:** `GET /company-tickets/admin/:id/suggest-autos`
- **Auth:** Admin only
- **Input:** Ticket ID in URL
- **Output:**
  ```json
  {
    "ticket_id": "uuid",
    "autos_required": 5,
    "suggested_autos": [
      {
        "id": "auto-id",
        "auto_no": "ABC-001",
        "owner_name": "John Doe",
        "area_name": "Downtown",
        "type": "IDLE",
        "availability": "Never assigned"
      },
      {
        "id": "auto-id-2",
        "auto_no": "ABC-002",
        "owner_name": "Jane Smith",
        "area_name": "Downtown",
        "type": "ASSIGNED",
        "availability": "Can be assigned on 2025-12-25 to 2025-12-30"
      }
    ],
    "suggested_auto_ids": ["auto-id", "auto-id-2", ...],
    "summary": {
      "total_suggested": 5,
      "idle_count": 3,
      "assigned_count": 2,
      "available_total": 12
    },
    "dates": {
      "start_date": "2025-12-25",
      "end_date": "2025-12-30"
    }
  }
  ```

**Logic:**
1. Get all autos in requested area
2. For each auto:
   - Check if it has ANY assignments that overlap with requested dates
   - If no conflicts: categorize as IDLE or ASSIGNED (based on total assignments)
3. Sort: IDLE first, then ASSIGNED
4. Return top N autos (N = autos_required)
5. Include metadata showing type and availability info

#### File: `backend/src/routes/companyTicketRoutes.js`
- Added new route: `router.get('/admin/:id/suggest-autos', authMiddleware, companyTicketController.suggestAutosForTicket);`
- Placed BEFORE company routes to ensure admin routes are matched first

### Frontend Changes

#### File: `frontend/src/pages/CompanyRequestsPage.jsx`

**Modified Function:** `handleApprove()`
- Now calls both `/autos` endpoint (to get list) AND new `/suggest-autos` endpoint
- Pre-selects suggested autos using `setSelectedAutos(newSelected)`
- Stores suggestion data in `selectedRequest._suggestionData`
- Shows loading state during fetch

**Updated Modal:** Auto Assignment Modal
- Displays "System Suggestion" banner with:
  - Robot emoji (🤖)
  - Idle vs Assigned breakdown
  - Total suggested count
  - Confirmation message
- Enhanced auto list items to show:
  - Type badge (IDLE/ASSIGNED) for suggested autos
  - Only suggested autos get the badge
  - Checkmarks remain for selected autos
- Full manual control:
  - Can uncheck suggested autos
  - Can check other autos
  - No restrictions on selection

---

## User Experience Flow

### Admin Portal - Company Requests Page

1. **View Request**
   - Click "View Details" on a PENDING ticket

2. **Approve Workflow**
   - Click "✓ Approve & Assign" button
   - System loads available autos and generates suggestions
   - Modal opens with:
     - Summary showing request details
     - **🤖 System Suggestion banner** (showing idle + assigned breakdown)
     - Auto list with suggested autos highlighted

3. **Review Suggestions**
   - Review which autos were suggested (marked with badges)
   - YELLOW = Idle (never assigned)
   - BLUE = Assigned but free on dates

4. **Modify if Needed**
   - Uncheck any suggested auto to deselect it
   - Check additional autos if needed
   - Change selection completely if desired

5. **Confirm**
   - Click "Confirm Assignment" to proceed
   - Backend creates assignments

---

## Data Flow Diagram

```
Admin clicks "Approve & Assign" on ticket
    ↓
handleApprove() called
    ├─ Fetch /autos (all autos in area)
    ├─ Fetch /company-tickets/admin/{id}/suggest-autos
    ├─ Receive suggested_auto_ids and suggestion metadata
    └─ Pre-select suggested autos using setSelectedAutos()
    
Modal opens with:
    ├─ System Suggestion banner (show idle + assigned count)
    ├─ Auto list with type badges
    └─ All suggested autos already checked
    
Admin can:
    ├─ Uncheck any suggested auto
    ├─ Check other autos
    └─ Manually modify selection
    
Click "Confirm Assignment"
    ├─ Send selected auto IDs to /company-tickets/admin/{id}/approve
    └─ Create assignments and close modal
```

---

## Example Scenario

### Company Request:
- **Requested:** 5 autos
- **For:** 25-30 Dec 2025
- **Area:** Downtown

### Available Autos in Downtown:
- ABC-001 (Idle) ✓
- ABC-002 (Idle) ✓
- ABC-003 (Assigned, free on dates) ✓
- ABC-004 (Assigned, free on dates) ✓
- ABC-005 (Assigned, free on dates) ✓
- ABC-006 (Assigned, busy on dates) ✗

### System Suggests:
- **IDLE:** ABC-001, ABC-002 (2 autos)
- **ASSIGNED (FREE):** ABC-003, ABC-004, ABC-005 (3 autos)
- **Total:** 5 of 5 required ✓

### Banner Shows:
```
🤖 System Suggestion
2 Idle + 3 Assigned = 5 of 5 required
✓ Already selected based on priority (idle first, then available assigned autos)
```

---

## Error Handling

1. **No Autos Available**
   - Shows: "No autos available in this area"
   - Admin can cancel and request approval later

2. **Fewer Autos Than Required**
   - System suggests all available autos
   - Count shows: "3 of 5 required"
   - Admin can proceed with fewer autos or cancel

3. **API Error on Suggestion**
   - Logs error to console
   - Shows alert message
   - Falls back to manual selection
   - Loads available autos normally

---

## Testing Checklist

- [ ] Admin approves a ticket with suggested autos
- [ ] Verify "System Suggestion" banner appears
- [ ] Verify idle autos are suggested first
- [ ] Verify assigned but free autos are suggested
- [ ] Verify type badges appear (IDLE vs ASSIGNED)
- [ ] Verify admin can uncheck suggested autos
- [ ] Verify admin can add other autos manually
- [ ] Verify confirmation shows correct count
- [ ] Verify assignments are created correctly
- [ ] Test with area filter (area specified in request)
- [ ] Test with no area filter (any area)
- [ ] Test when fewer autos available than requested
- [ ] Test when no autos available
- [ ] Verify manual selection still works if no suggestions

---

## Files Modified

1. ✅ `backend/src/controllers/companyTicketController.js`
   - Added `suggestAutosForTicket()` function

2. ✅ `backend/src/routes/companyTicketRoutes.js`
   - Added new route for suggestion endpoint

3. ✅ `frontend/src/pages/CompanyRequestsPage.jsx`
   - Modified `handleApprove()` to fetch suggestions
   - Updated auto assignment modal to show suggestions
   - Added auto type badges and indicators

---

## API Endpoints

### New Endpoint

**GET** `/company-tickets/admin/{id}/suggest-autos`
- **Auth:** Admin token required
- **Response:** JSON with suggested autos and metadata
- **Error Codes:** 404 (ticket not found), 500 (server error)

### Modified Endpoint

**PATCH** `/company-tickets/admin/{id}/approve`
- No changes - still accepts auto_ids
- Now receives pre-selected auto IDs from frontend

---

## Future Enhancements

1. **Admin Preferences**
   - Remember admin's preferred suggestion strategy
   - Override default priority order

2. **Smart Filtering**
   - Filter suggestions by auto rating
   - Prefer autos with better maintenance history

3. **Analytics**
   - Track suggestion acceptance rate
   - Show auto utilization patterns

4. **Batch Operations**
   - Suggest autos for multiple tickets at once
   - Bulk assignment workflow

---

## Notes

- Suggestion is **non-binding** - admin always has full control
- IDLE autos are prioritized to maximize auto utilization
- Assigned autos are only suggested if completely free on requested dates
- No changes to approval logic - still requires manual confirmation
- Backward compatible - manual selection still works if suggestion fails

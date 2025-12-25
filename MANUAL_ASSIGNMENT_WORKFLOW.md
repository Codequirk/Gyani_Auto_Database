# Manual Auto Assignment Workflow

## Overview
The system now implements a **manual auto assignment workflow** where admins can selectively assign autos to companies after approving their requests.

## Complete Workflow Steps

### Step 1: Company Registration & Auto Request
1. Company visits company portal
2. Logs in with company credentials
3. Navigates to "Request Autos" page
4. Fills in:
   - Number of autos required
   - Duration (days)
   - Start date
   - Preferred area (optional)
5. Submits request

**Result**: New `CompanyTicket` created with status `PENDING`

---

### Step 2: Admin Reviews Request
1. Admin logs in to admin portal
2. Navigates to "Company Requests" page
3. Sees list of pending requests
4. Can filter by status (PENDING, APPROVED, REJECTED)
5. Clicks on a request to view details

**Visible Details**:
- Company name & contact
- Number of autos required
- Duration needed
- Preferred area
- Request notes

---

### Step 3: Admin Approves & Selects Autos
1. Admin clicks **"✓ Approve & Assign"** button
2. System automatically loads all available autos in the requested area
3. A modal popup appears showing:
   - Request summary (Company, Autos to select, Preferred area, Selection count)
   - List of available autos with details:
     - Auto number
     - Owner name
     - Area name
     - Status

**Modal Features**:
- Checkboxes for each auto to select/deselect
- Selection counter shows: `{Selected}/{Required}`
- **Max selection limit** enforced (can't select more than required)
- Visual feedback on selected autos (blue highlight + checkmark)
- Two buttons:
  - **"Confirm Assignment"** - Creates assignments and closes modal
  - **"Cancel"** - Closes without approving

---

### Step 4: Admin Confirms Assignment
1. Admin selects the desired autos by clicking on them or their checkboxes
2. Can select up to the required number of autos
3. Selected autos show:
   - Blue border
   - Light blue background
   - Check mark on the right
4. Clicks **"Confirm Assignment"** button
5. System creates assignments and:
   - Approves the ticket
   - Activates the company (if in PENDING_APPROVAL)
   - Creates Assignment records for each selected auto
   - Shows success message

**Result**: 
- `CompanyTicket` status → `APPROVED`
- `Company` status → `ACTIVE`
- New `Assignment` records created with status `PREBOOKED` or `ACTIVE`

---

### Step 5: Company Sees Assigned Autos
1. Company logs into company portal
2. Navigates to "My Autos" or dashboard
3. Sees newly assigned autos:
   - Auto number
   - Assignment dates
   - Driver/owner info
   - Assignment status

**What Appears**:
- Auto cards with full details
- Availability calendar if auto has assignments
- Status badges (ACTIVE, PREBOOKED, etc.)

---

## Technical Implementation

### Frontend (React)
**File**: `frontend/src/pages/CompanyRequestsPage.jsx`

**New State Variables**:
```javascript
const [showAutoAssignmentModal, setShowAutoAssignmentModal] = useState(false);
const [availableAutos, setAvailableAutos] = useState([]);
const [selectedAutos, setSelectedAutos] = useState(new Set());
const [loadingAutos, setLoadingAutos] = useState(false);
```

**Key Functions**:
1. `handleApprove()` - Loads available autos and shows selection modal
2. `handleAssignAutos()` - Confirms selection and creates assignments
3. `toggleAutoSelection(autoId)` - Manages checkbox selections with max limit

**API Calls**:
- `GET /autos?area_id={areaId}` - Fetch available autos
- `PATCH /company-tickets/admin/{id}/approve` - Approve and assign
  - Body: `{ admin_id, auto_ids: [] }`

### Backend (Express.js)
**File**: `backend/src/controllers/companyTicketController.js`

**Function**: `approveTicket()`

**Behavior**:
```javascript
if (auto_ids && auto_ids.length > 0) {
  // Use manually selected autos
  assignmentAutos = auto_ids;
} else {
  // Fallback: auto-select available autos (backward compatible)
  assignmentAutos = availableAutos.slice(0, ticket.autos_required);
}

// Create assignments for each auto
for (const autoId of assignmentAutos) {
  await Assignment.create({
    auto_id: autoId,
    company_id: ticket.company_id,
    start_date: ticket.start_date,
    end_date: endDate,
    status: 'PREBOOKED' or 'ACTIVE'
  });
}
```

---

## Important Features

### ✓ Area Filtering
- System automatically filters autos by the area specified in the request
- If no area specified, shows all available autos

### ✓ Selection Validation
- Cannot select more autos than required (alert shown)
- Must select at least 1 auto to confirm
- Visual counter helps track selections

### ✓ Error Handling
- Loading states while fetching autos
- Error messages if auto loading fails
- Graceful fallback if assignment creation fails

### ✓ Company Activation
- When ticket approved, company status changes from PENDING_APPROVAL → ACTIVE
- Company can then see dashboard and manage assignments

---

## Testing the Workflow

### Test Case 1: Basic Assignment
1. Company registers with 2 autos needed for 5 days, Area A
2. Admin approves request
3. Modal shows 5 available autos in Area A
4. Admin selects 2 autos
5. Autos appear in company dashboard
6. ✓ **Success**: Assignments created with correct dates

### Test Case 2: Area Filtering
1. Company requests 2 autos for Area B
2. Admin clicks approve
3. Modal shows only autos in Area B
4. ✓ **Success**: Only relevant autos shown

### Test Case 3: Selection Limit
1. Request requires 2 autos
2. Admin tries to select 3 autos
3. Alert appears: "You can only select 2 autos"
4. 3rd auto cannot be selected
5. ✓ **Success**: Limit enforced

### Test Case 4: Cancel Flow
1. Admin clicks approve
2. Modal shows autos
3. Admin clicks "Cancel"
4. Modal closes without approving
5. Ticket still shows "PENDING" status
6. ✓ **Success**: No changes made

---

## API Endpoint Details

### Approve & Assign Ticket
**Endpoint**: `PATCH /api/company-tickets/admin/{id}/approve`

**Headers**:
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body** (with manual assignment):
```json
{
  "admin_id": "admin_user_id",
  "auto_ids": ["auto_id_1", "auto_id_2"]
}
```

**Success Response** (201):
```json
{
  "ticket": {
    "id": "ticket_id",
    "ticket_status": "APPROVED",
    "company_id": "company_id",
    "autos_required": 2,
    ...
  },
  "assignments": [
    {
      "id": "assignment_id_1",
      "auto_id": "auto_id_1",
      "company_id": "company_id",
      "start_date": "2024-01-15",
      "end_date": "2024-01-20",
      "status": "PREBOOKED"
    },
    ...
  ],
  "message": "Ticket approved, company activated, and 2 assignment(s) created"
}
```

### Get Available Autos
**Endpoint**: `GET /api/autos?area_id={areaId}`

**Response**:
```json
[
  {
    "id": "auto_id_1",
    "auto_no": "ABC-1234",
    "owner_name": "John Doe",
    "area_id": "area_id_1",
    "area_name": "Area A",
    "status": "AVAILABLE"
  },
  ...
]
```

---

## Troubleshooting

### Problem: "No autos available in this area"
**Cause**: No autos matching the area filter exist

**Solution**:
1. Check if autos exist in that area (admin autos page)
2. Admin can approve without area preference
3. Create more autos in that area

### Problem: Modal not showing after clicking approve
**Cause**: API call to fetch autos failed

**Solution**:
1. Check browser console for errors
2. Verify `/autos` endpoint is working
3. Check network tab in DevTools
4. Ensure admin token is valid

### Problem: Assignment not created
**Cause**: Backend error or invalid auto_ids

**Solution**:
1. Check backend console for errors
2. Verify auto_ids are valid
3. Check if autos are already assigned elsewhere
4. Try with fewer autos first

### Problem: Company doesn't see assigned autos
**Cause**: Dashboard not updated

**Solution**:
1. Refresh company portal page
2. Check company token is valid
3. Verify assignments were created (admin can check)
4. Check assignment status filter

---

## Key Differences from Previous Implementation

| Feature | Previous | Current |
|---------|----------|---------|
| Assignment | Automatic on approval | Manual selection in modal |
| User Flow | Approve → Instant assignment | Approve → Select autos → Assign |
| Admin Control | Limited (auto-selected) | Full (select specific autos) |
| Area Filtering | Auto-applied | Shows only requested area autos |
| Selection Count | Fixed | Enforced with validation |
| UI | Direct approval | Interactive modal selection |

---

## Files Modified

1. **frontend/src/pages/CompanyRequestsPage.jsx**
   - Added modal state management
   - Modified handleApprove to load autos
   - Added handleAssignAutos for manual assignment
   - Added toggleAutoSelection for checkbox handling
   - Added Auto Assignment Modal JSX

2. **backend/src/controllers/companyTicketController.js**
   - Modified approveTicket to accept auto_ids
   - Implements manual assignment with auto_ids
   - Fallback to automatic selection if auto_ids empty

---

## Next Steps

✅ **Completed**:
- Manual assignment workflow
- Modal UI with auto selection
- Backend support for manual assignment
- Area filtering
- Selection validation
- Company dashboard integration

⏳ **Potential Enhancements**:
- Auto availability calendar in modal
- Bulk assignment from request list
- Assignment scheduling UI improvements
- Analytics on assignment patterns
- Automatic area suggestions

---

## Support

For issues or questions:
1. Check browser console for JavaScript errors
2. Check backend console/logs for API errors
3. Verify all services running (MongoDB, backend, frontend)
4. Check network requests in DevTools
5. Review API responses for error details

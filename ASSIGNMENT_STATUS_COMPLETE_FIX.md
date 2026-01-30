# Assignment Status Fix - Comprehensive Update

## Problem Statement
The assignment status transitions were not working correctly:
1. Assignments were stuck in PREBOOKED status even when they became ACTIVE
2. Auto status was not changing to IDLE when assignments were completed
3. Days remaining could show negative values instead of 0
4. Status transitions were not automatic based on current date

## Solution Implemented

### 1. **Fixed Days Remaining Calculation**
**File:** `backend/src/utils/dateUtils.js`

Changed `computeDaysRemaining()` to return 0 instead of negative values when assignment is expired:
```javascript
function computeDaysRemaining(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const timeDiff = end - today;
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  // Return 0 if assignment has expired (no negative values)
  return daysDiff < 0 ? 0 : daysDiff;
}
```

### 2. **Status Transition Logic**
**Files:** 
- `backend/src/controllers/assignmentController.js`
- `backend/src/controllers/companyPortalController.js`

Added `getCorrectAssignmentStatus()` function that determines correct status based on dates:
```javascript
function getCorrectAssignmentStatus(startDate, endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  if (end < today) {
    return 'COMPLETED';  // End date passed
  } else if (start > today) {
    return 'PREBOOKED';  // Haven't started yet
  } else {
    return 'ACTIVE';     // Currently running
  }
}
```

### 3. **Automatic Status Updates**
Added `updateAutoStatusIfExpired()` helper that:
- Scans all assignments for an auto
- Updates each assignment to correct status based on current date
- Recalculates auto status based on its assignments:
  - **ASSIGNED**: If any assignment is ACTIVE
  - **PRE_ASSIGNED**: If only PREBOOKED assignments exist
  - **IDLE**: If all assignments are COMPLETED or none exist

### 4. **Updated API Endpoints**
All assignment retrieval endpoints now call `updateAutoStatusIfExpired()`:
- `getActiveAssignments()` - Auto-updates active assignments
- `getAssignmentsByCompany()` - Auto-updates company assignments
- `getCompanyAssignments()` - Auto-updates portal assignments
- `getCompanyDashboard()` - Auto-updates dashboard data
- `getPriorityAssignments()` - Auto-updates priority assignments

### 5. **Status Transition Flow**

```
PREBOOKED (before start_date)
    ↓ (Start date arrives)
ACTIVE (between start_date and end_date)
    ↓ (End date passes)
COMPLETED (after end_date)
```

**Auto Status Updates:**
- If any assignment is ACTIVE → Auto status = ASSIGNED
- If only PREBOOKED assignments exist → Auto status = PRE_ASSIGNED
- If all assignments are COMPLETED → Auto status = IDLE

### 6. **Fix All Existing Assignments**

A migration script has been created:
**File:** `backend/src/scripts/updateAssignmentStatuses.js`

To apply this fix to all existing assignments:
```bash
cd backend
node src/scripts/updateAssignmentStatuses.js
```

This script will:
1. Connect to MongoDB
2. Check all existing assignments
3. Update each assignment to correct status based on current date
4. Recalculate auto statuses based on assignment changes
5. Log all changes made

## Key Improvements

✅ **Automatic Status Transitions**: Assignments automatically transition from PREBOOKED → ACTIVE → COMPLETED based on current date

✅ **Correct Days Remaining**: Never shows negative values; shows 0 when expired

✅ **Auto Status Accuracy**: Auto status correctly reflects its current assignments

✅ **Real-time Updates**: Every API call checks and updates statuses automatically

✅ **Backward Compatible**: Existing assignments are fixed with the migration script

## Testing

After starting MongoDB and backend:

1. **Check assignment status** - Should show correct status (PREBOOKED, ACTIVE, or COMPLETED)
2. **Check days remaining** - Should show 0 for expired assignments, not negative
3. **Check auto status** - Should be IDLE once all assignments are COMPLETED
4. **Check status transitions** - As dates pass, status should automatically update

## Next Steps

1. Start MongoDB service
2. Run: `node src/scripts/updateAssignmentStatuses.js`
3. Restart backend server
4. Verify all assignments show correct statuses
5. Monitor auto statuses as dates progress

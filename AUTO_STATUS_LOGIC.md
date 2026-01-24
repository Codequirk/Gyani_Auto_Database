# Auto Status Logic & Assignment Lifecycle

## Overview
Auto statuses are now **dynamically calculated** based on current assignment dates, not stored as fixed values. This ensures accurate real-time status updates across the entire system.

---

## Status Definitions

### 1. **ACTIVE** 🟢
- **Condition:** `start_date <= today <= end_date`
- **Meaning:** Auto is currently assigned and working for a company
- **Display:** Primary status shown in UI
- **Can Transition To:** IDLE (when end_date passes), or another assignment status

### 2. **PREBOOKED** 🟣
- **Condition:** `start_date > today` (AND no ACTIVE assignment exists)
- **Meaning:** Auto is reserved for a future assignment
- **Display:** Secondary status in UI
- **Can Transition To:** ACTIVE (when start_date arrives), IDLE, or another assignment

### 3. **IDLE** ⚪
- **Condition:** No ACTIVE or PREBOOKED assignments exist
- **Meaning:** Auto is available for new assignments
- **Display:** Available status in UI
- **Can Transition To:** ACTIVE or PREBOOKED (when new assignment created)

### 4. **COMPLETED** 🔵
- **Condition:** `end_date < today` (NOT for display status)
- **Meaning:** Assignment period has ended
- **Display:** Only shown in assignment history/completed section
- **Auto-Delete:** 30 days after `end_date`, record is automatically deleted

---

## Lifecycle Flow

```
         Assignment Created
              |
              v
    ┌─────────────────┐
    │ PREBOOKED       │  (if start_date > today)
    │ ACTIVE          │  (if start_date <= today)
    │ IDLE            │  (if no assignments)
    └────────┬────────┘
             |
             | (Time passes, dates change)
             v
         Status Updates Automatically
             |
    ┌────────┴─────────┐
    |                  |
    v                  v
  ACTIVE            IDLE
   (working)      (no bookings)
    |
    | (end_date passes)
    v
  COMPLETED
  (in history table)
    |
    | (30 days after end_date)
    v
  DELETED
  (auto-removed)
```

---

## Key Features

### ✅ Real-Time Status Updates
- Status is **recalculated** every time:
  - An assignment is created
  - An assignment is updated
  - An assignment is deleted
  - Daily automatic update (via cleanup service)

### ✅ Automatic Transition
- **No manual intervention needed**
- Status changes automatically based on current date
- ACTIVE → COMPLETED happens at end_date without action

### ✅ Completed Assignment History
- **Not deleted immediately** when end_date passes
- **Visible in history table** for 30 days
- **Shows:**
  - Auto details
  - Company name
  - Start & end dates
  - Days since completion
  - Days remaining before deletion

### ✅ Automatic Cleanup
- **Scheduled job:** Runs daily at 2:00 AM
- **Deletes:** All assignments 30+ days after end_date
- **Updates:** Auto status to IDLE after cleanup
- **Manual cleanup:** Available via admin button

---

## Status Calculation Logic

### Algorithm
```javascript
function calculateAutoStatus(assignments) {
  // Filter only ACTIVE or PREBOOKED assignments
  const relevantAssignments = assignments.filter(a => 
    ['ACTIVE', 'PREBOOKED'].includes(a.status)
  );
  
  if (relevantAssignments.length === 0) return 'IDLE';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check for ACTIVE (today falls within range)
  for (const assignment of relevantAssignments) {
    if (startDate <= today && today <= endDate) {
      return 'ACTIVE';
    }
  }
  
  // Check for PREBOOKED (start date in future)
  for (const assignment of relevantAssignments) {
    if (startDate > today) {
      return 'PREBOOKED';
    }
  }
  
  return 'IDLE';
}
```

---

## API Endpoints

### Get Completed Assignments
```
GET /api/assignments/completed
Query Params:
  - autoId (optional): Filter by specific auto

Response:
[
  {
    id: "assignment-id",
    auto_id: "auto-id",
    auto_no: "MH-01-AB-1234",
    company_id: "company-id",
    company_name: "ABC Company",
    start_date: "2025-01-01",
    end_date: "2025-01-15",
    status: "COMPLETED",
    days_since_completion: 10,
    days_until_deletion: 20
  }
]
```

### Manual Cleanup
```
DELETE /api/assignments/cleanup/old-completed
Auth: Required (Admin token)

Response:
{
  message: "Successfully deleted 5 old completed assignments...",
  deletedCount: 5,
  affectedAutos: 3
}
```

---

## Backend Services

### Status Calculator Service
**File:** `backend/src/utils/statusCalculator.js`

Functions:
- `calculateAutoStatus(assignments)` - Main calculation logic
- `isCompletedAssignment(endDate)` - Check if completed
- `shouldDeleteAssignment(endDate)` - Check if 30+ days old
- `getCompletedAssignments(assignments)` - Filter completed
- `getAssignmentsToDelete(assignments)` - Filter to-delete

### Cleanup Service
**File:** `backend/src/services/cleanupService.js`

Functions:
- `startCleanupScheduler()` - Start daily cleanup job
- `stopCleanupScheduler()` - Stop scheduler
- `cleanupOldCompletedAssignments()` - Execute cleanup
- `triggerCleanupNow()` - Manual trigger

---

## Frontend Components

### Completed Assignments Pages
- **Admin:** `/frontend/src/pages/CompletedAssignmentsPage.jsx`
- **Company:** `/company-portal/src/pages/CompletedAssignmentsPage.jsx`

Features:
- List all completed assignments
- Show days since completion
- Show days until deletion (with color coding)
- Manual cleanup button (admin only)
- Delete history

### Status Display
- Shows: ACTIVE, PREBOOKED, or IDLE
- Updates: In real-time as dates pass
- Color coding: 🟢 Active, 🟣 Prebooked, ⚪ Idle

---

## Timeline Example

**Assignment Created:** Jan 1, 2025
- Start Date: Jan 5, 2025
- End Date: Jan 20, 2025

| Date | Status | Notes |
|------|--------|-------|
| Jan 1-4 | PREBOOKED | Future assignment |
| Jan 5 (midnight) | ACTIVE | Assignment starts |
| Jan 20 | ACTIVE → COMPLETED | End date reached |
| Jan 21+ | In History | Visible in completed table |
| Feb 20 | Auto-Deleted | 30 days after end_date |

---

## Database Changes

### assignments table
- `status` field now handles: ACTIVE, PREBOOKED, COMPLETED
- No new columns needed
- Date comparison done in code, not DB

### autos table
- `status` field: ACTIVE, PREBOOKED, IDLE (no COMPLETED)
- Status recalculated from assignments
- Display status: Derived from assignments

---

## Best Practices

✅ **Do:**
- Rely on status calculated from dates
- Use API to get completed assignments
- Trust automatic cleanup (runs daily)
- View history before 30 days pass if needed

❌ **Don't:**
- Manually update auto status
- Assume status is stored permanently
- Keep old completed data after 30 days
- Rely on old status values

---

## Configuration

### Cleanup Schedule
- **Time:** 2:00 AM daily
- **Timezone:** Server timezone
- **Frequency:** Once per day

To change schedule, edit `cleanupService.js`:
```javascript
cleanupJob = cron.schedule('0 2 * * *', ...);
//                         ^ Hour (0-23)
//                            ^ Minute (0-59)
```

### Deletion Window
- **Default:** 30 days after end_date
- **Defined in:** `statusCalculator.js`
- **To modify:** Update `shouldDeleteAssignment()` function

---

## Troubleshooting

### Status Not Updating
1. Check if assignment end_date is correct
2. Verify server timezone matches expected
3. Trigger manual cleanup if stuck
4. Check backend logs for errors

### Completed Assignment Disappeared
- **Expected:** After 30 days, automatically deleted
- **Check:** `days_until_deletion` in history table
- **Manual delete:** Use cleanup button if needed

### Scheduler Not Running
1. Check if `node-cron` is installed: `npm list node-cron`
2. Verify server started successfully
3. Check console for: `[CLEANUP] Scheduler started`
4. Manually trigger: `DELETE /api/assignments/cleanup/old-completed`

---

## Summary

The new status logic provides:
- ✅ Accurate, real-time status updates
- ✅ Automatic transitions (no manual updates)
- ✅ Complete assignment history
- ✅ Automatic old record cleanup
- ✅ Clear visibility into assignment lifecycle
- ✅ Predictable data retention (30 days)

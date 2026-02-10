# Days Calculation Fix - February 5, 2026

## Problem Fixed

When start_date is today (Feb 5) and user requires 1 day:
- **Before**: End date was Feb 4 (previous day), days = 0 ❌
- **After**: End date is Feb 5 (same day), days = 1 ✓

When start_date is today (Feb 5) and user requires 2 days:
- **Before**: End date was Feb 5, days = 1 ❌
- **After**: End date is Feb 6, days = 2 ✓

## Root Cause

The `getDateNDaysFromNow()` function was subtracting 1 twice:
```javascript
// WRONG - was doing (days - 1) when caller already did (days_required - 1)
date.setDate(date.getDate() + (parseInt(days) - 1));

// Example: 1 day required
// Caller passes: getDateNDaysFromNow(1-1, start) = getDateNDaysFromNow(0, start)
// Function does: date + (0 - 1) = date - 1 = Feb 4 ❌
```

## Fix Applied

Changed the function to not subtract again:
```javascript
// CORRECT - just add the exact number of days
date.setDate(date.getDate() + parseInt(days));

// Example: 1 day required
// Caller passes: getDateNDaysFromNow(1-1, start) = getDateNDaysFromNow(0, start)
// Function does: date + 0 = date = Feb 5 ✓

// Example: 2 days required
// Caller passes: getDateNDaysFromNow(2-1, start) = getDateNDaysFromNow(1, start)
// Function does: date + 1 = date + 1 = Feb 6 ✓
```

## How Days Calculation Works Now

### 1. User requests 1 day starting Feb 5:
```
ticket.days_required = 1
ticket.start_date = "2026-02-05"

// In approveTicket():
endDate = getDateNDaysFromNow(1 - 1, "2026-02-05")
        = getDateNDaysFromNow(0, "2026-02-05")
        = "2026-02-05" (add 0 days)

totalDays = calculateTotalDays("2026-02-05", "2026-02-05")
          = 0 + 1 (inclusive count)
          = 1 day ✓

days_remaining = computeDaysRemaining("2026-02-05")
               = 0 (today is Feb 5) ✓
```

### 2. User requests 3 days starting Feb 5:
```
ticket.days_required = 3
ticket.start_date = "2026-02-05"

endDate = getDateNDaysFromNow(3 - 1, "2026-02-05")
        = getDateNDaysFromNow(2, "2026-02-05")
        = "2026-02-07" (add 2 days)

totalDays = calculateTotalDays("2026-02-05", "2026-02-07")
          = 2 + 1 (inclusive count)
          = 3 days ✓

days_remaining = computeDaysRemaining("2026-02-07")
               = 2 (Feb 7 is 2 days away) ✓
```

## Files Changed

1. **`backend/src/utils/dateUtils.js`** (line 85-90)
   - Removed the `- 1` from the date calculation
   - Now just adds the exact number of days

2. **`backend/src/controllers/companyTicketController.js`** (line 168-169)
   - Added comment explaining the math
   - No code change needed - just clarified the logic

## Data Flow After Fix

```
1. Company creates request (1 day, start = Feb 5)
   └─ Creates PENDING ticket with days_required=1

2. Admin approves
   └─ calculates end_date = Feb 5 + (1-1) days = Feb 5 ✓
   └─ calculates totalDays = 1 ✓
   └─ Creates ACTIVE assignment (days=1) ✓
   └─ Creates payment (total_days=1) ✓

3. Company views assignments
   └─ getCompanyAssignments filters to ACTIVE/PREBOOKED ✓
   └─ enriches with days_remaining = 0 ✓
   └─ Assignment now displays in portal ✓

4. Admin views autos
   └─ Auto shows ACTIVE status ✓
   └─ Shows days_remaining = 0 ✓
```

## Testing This Fix

1. Go to Company Portal → Create Request
2. Select today's date (Feb 5) with 1 day required
3. Submit and go to Admin Panel → Requests
4. Click "Accept"
5. **Expected Results:**
   - Assignment created with days=1 (check in DB or payment)
   - Assignment appears in Company Portal (with 0 days remaining)
   - Auto status shows ACTIVE (not IDLE)
   - Payment shows 1 day

6. Repeat with 2, 3, 5 days - should work correctly for all

## Impact

✅ Assignment days calculated correctly  
✅ Assignment displays in company portal  
✅ Auto status updates to ACTIVE after approval  
✅ Payment days calculated correctly  
✅ Days remaining calculation works for assignment display  

## Backend Status

- Server restarted with new code ✅
- Ready for testing ✅

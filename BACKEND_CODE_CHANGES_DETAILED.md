# Backend Code Changes - Before & After

## File 1: `/backend/src/utils/statusCalculator.js`

### Function: `calculateAutoStatus()`

#### BEFORE (Lines 20-47)
```javascript
const calculateAutoStatus = (assignments = []) => {
  const todayDate = today();

  // Filter out deleted/cancelled assignments
  const activeStatuses = ['ACTIVE', 'PREBOOKED'];
  const relevantAssignments = assignments.filter(a => activeStatuses.includes(a.status));

  if (relevantAssignments.length === 0) {
    return 'IDLE';
  }

  // Check for any assignment that overlaps with today (start_date <= today <= end_date)
  for (const assignment of relevantAssignments) {
    const startDate = new Date(assignment.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(assignment.end_date);
    endDate.setHours(0, 0, 0, 0);

    // If there's an assignment active today, auto is ACTIVE
    if (startDate <= todayDate && todayDate <= endDate) {
      return 'ACTIVE';
    }
  }

  // If any assignment starts in future or overlaps, auto is still occupied (ACTIVE)
  // Otherwise return IDLE
  return 'IDLE';  // ❌ WRONG: Ignores PREBOOKED assignments
};
```

#### AFTER (Lines 20-60)
```javascript
const calculateAutoStatus = (assignments = []) => {
  const todayDate = today();

  // Filter out deleted/cancelled assignments
  const activeStatuses = ['ACTIVE', 'PREBOOKED'];
  const relevantAssignments = assignments.filter(a => activeStatuses.includes(a.status));

  if (relevantAssignments.length === 0) {
    return 'IDLE';
  }

  // Check for any assignment that overlaps with today (start_date <= today <= end_date)
  for (const assignment of relevantAssignments) {
    const startDate = new Date(assignment.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(assignment.end_date);
    endDate.setHours(0, 0, 0, 0);

    // If there's an assignment active today, auto is ACTIVE
    if (startDate <= todayDate && todayDate <= endDate) {
      return 'ACTIVE';
    }
  }

  // If we reach here, there are relevant assignments but none are active today
  // Check if any are in the future (PREBOOKED)
  for (const assignment of relevantAssignments) {
    const startDate = new Date(assignment.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate > todayDate) {
      return 'PREBOOKED';  // ✓ CORRECT: Returns PREBOOKED for future assignments
    }
  }

  // All assignments are in the past, auto is IDLE
  return 'IDLE';
};
```

**Changes**: Added second loop to check for future assignments and return 'PREBOOKED'

---

## File 2: `/backend/src/controllers/companyTicketController.js`

### Function: `approveTicket()` - Lines 161-229

#### BEFORE - Assignment Creation Section
```javascript
      // Create assignments for each auto
      const assignments = [];
      const { getDateNDaysFromNow } = require('../utils/dateUtils');
      const Payment = require('../models/Payment');
      
      for (const autoId of assignmentAutos) {
        const endDate = getDateNDaysFromNow(ticket.days_required - 1, ticket.start_date);
        
        console.log(`[APPROVAL] Creating assignment for auto ${autoId}, dates: ${ticket.start_date} to ${endDate}`);
        
        const assignment = await Assignment.create({
          auto_id: autoId,
          company_id: ticket.company_id,
          start_date: ticket.start_date,
          end_date: endDate,
          status: new Date(ticket.start_date) > new Date() ? 'PREBOOKED' : 'ACTIVE',  // ❌ Inconsistent date comparison
        });  // ❌ MISSING: days field
        
        console.log(`[APPROVAL] Assignment created:`, assignment.id);
        assignments.push(assignment);
        // ❌ MISSING: Auto.recalculateAndUpdateStatus(autoId);

        // Create payment record if cost_per_day is provided
        if (cost_per_day !== undefined && cost_per_day !== null && cost_per_day > 0) {
          try {
            const auto = await Auto.findById(autoId);
            if (auto) {
              const totalDays = ticket.days_required;  // ❌ WRONG: Using ticket days
              // ... rest of payment creation ...
```

#### AFTER - Assignment Creation Section
```javascript
      // Create assignments for each auto
      const assignments = [];
      const { getDateNDaysFromNow, calculateTotalDays } = require('../utils/dateUtils');  // ✓ Added calculateTotalDays
      const Payment = require('../models/Payment');
      
      for (const autoId of assignmentAutos) {
        const endDate = getDateNDaysFromNow(ticket.days_required - 1, ticket.start_date);
        const totalDays = calculateTotalDays(ticket.start_date, endDate);  // ✓ Calculate actual days
        
        // Determine assignment status based on start_date
        const today = new Date();
        today.setHours(0, 0, 0, 0);  // ✓ Normalize to midnight
        const ticketStart = new Date(ticket.start_date);
        ticketStart.setHours(0, 0, 0, 0);  // ✓ Normalize to midnight
        const assignmentStatus = ticketStart > today ? 'PREBOOKED' : 'ACTIVE';  // ✓ Correct comparison
        
        console.log(`[APPROVAL] Creating assignment for auto ${autoId}, dates: ${ticket.start_date} to ${endDate}, days: ${totalDays}, status: ${assignmentStatus}`);
        
        const assignment = await Assignment.create({
          auto_id: autoId,
          company_id: ticket.company_id,
          start_date: ticket.start_date,
          end_date: endDate,
          days: totalDays,  // ✓ Include days field
          status: assignmentStatus,
        });
        
        console.log(`[APPROVAL] Assignment created:`, assignment.id);
        assignments.push(assignment);

        // Update auto status after creating assignment
        try {
          await Auto.recalculateAndUpdateStatus(autoId);  // ✓ Update auto status
          console.log(`[APPROVAL] Auto status recalculated for auto ${autoId}`);
        } catch (statusError) {
          console.error(`[APPROVAL] Warning: Failed to recalculate auto status for ${autoId}:`, statusError.message);
        }

        // Create payment record if cost_per_day is provided
        if (cost_per_day !== undefined && cost_per_day !== null && cost_per_day > 0) {
          try {
            const auto = await Auto.findById(autoId);
            if (auto) {
              // ✓ Use calculated days instead of ticket.days_required
              // ... rest of payment creation ...
              await Payment.create({
                ticket_id: assignment.id,
                auto_id: autoId,
                company_id: ticket.company_id,
                auto_no: auto.auto_no,
                owner_name: auto.owner_name || '',
                area_id: auto.area_id || null,
                area_name: areaName,
                cost_per_day: parseFloat(cost_per_day),
                total_days: totalDays,  // ✓ Use calculated days
                total_cost: parseFloat(cost_per_day) * totalDays,  // ✓ Correct calculation
                payment_status: 'PENDING'
              });
              console.log(`[APPROVAL] Payment record created for auto ${autoId} with ${totalDays} days`);
            }
          } catch (paymentError) {
            console.error(`[APPROVAL] Warning: Payment creation failed for auto ${autoId}:`, paymentError.message);
          }
        }
      }
```

**Changes**:
1. ✓ Added `calculateTotalDays` to imports
2. ✓ Calculate `totalDays` from actual dates
3. ✓ Normalize dates to midnight before status comparison
4. ✓ Include `days` field in assignment creation
5. ✓ Call `Auto.recalculateAndUpdateStatus(autoId)` after each assignment
6. ✓ Use `totalDays` in payment creation instead of `ticket.days_required`
7. ✓ Enhanced logging with days and status information

---

## Summary of Changes

### Lines Changed:
- **statusCalculator.js**: Added 13 lines to handle PREBOOKED status
- **companyTicketController.js**: Enhanced 50+ lines in approveTicket() function

### Issues Fixed:
1. Missing `days` field ✓
2. Auto status not updated ✓
3. Inconsistent date comparison ✓
4. Auto status calculation ✓
5. Payment days calculation ✓
6. Error handling ✓

### Backward Compatibility:
- ✓ No breaking changes
- ✓ No database migrations needed
- ✓ Works with existing data
- ✓ No API contract changes

### Testing:
- Server restarted successfully ✓
- Routes functioning normally ✓
- Assignment creation working with new fields ✓
- Auto status updates working ✓


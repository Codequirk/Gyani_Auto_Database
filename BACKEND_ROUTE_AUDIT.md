# Backend Route Audit & Issues Found

## Critical Issues

### 1. ❌ Missing `days` Field in Assignment Creation (approveTicket)
**Location**: `/backend/src/controllers/companyTicketController.js` line 159-170

**Issue**: When approving a ticket and creating assignments, the `days` field is NOT being set:
```javascript
const assignment = await Assignment.create({
  auto_id: autoId,
  company_id: ticket.company_id,
  start_date: ticket.start_date,
  end_date: endDate,
  status: new Date(ticket.start_date) > new Date() ? 'PREBOOKED' : 'ACTIVE',
  // ⚠️ MISSING: days field
});
```

**Impact**: 
- The `days` field remains NULL in the database
- Payment calculations that rely on days will fail
- Frontend displays will be incomplete

**Fix**: Calculate and include `days` in the assignment:
```javascript
const days = ticket.days_required;
const assignment = await Assignment.create({
  auto_id: autoId,
  company_id: ticket.company_id,
  start_date: ticket.start_date,
  end_date: endDate,
  days: days,  // ADD THIS
  status: new Date(ticket.start_date) > new Date() ? 'PREBOOKED' : 'ACTIVE',
});
```

---

### 2. ⚠️ Inconsistent Date Status Comparison (approveTicket)
**Location**: `/backend/src/controllers/companyTicketController.js` line 168

**Issue**: Status determination uses inconsistent date comparison:
```javascript
status: new Date(ticket.start_date) > new Date() ? 'PREBOOKED' : 'ACTIVE',
```

**Problem**: 
- `ticket.start_date` is already a Date object (created on line 43)
- Comparing with `new Date()` includes time component
- Should normalize both to midnight for proper date comparison

**Fix**: Use the existing `getCorrectAssignmentStatus` helper function from assignmentController:
```javascript
const { getCorrectAssignmentStatus } = require('../controllers/assignmentController');
// Then use:
status: getCorrectAssignmentStatus(ticket.start_date, endDate),
```

OR implement inline normalization:
```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);
const ticketStart = new Date(ticket.start_date);
ticketStart.setHours(0, 0, 0, 0);
status: ticketStart > today ? 'PREBOOKED' : 'ACTIVE',
```

---

### 3. ❌ Auto Status NOT Updated After Assignment Creation
**Location**: `/backend/src/controllers/companyTicketController.js` line 170

**Issue**: After creating assignments in `approveTicket`, the auto status is NOT being recalculated:
```javascript
const assignment = await Assignment.create({
  auto_id: autoId,
  company_id: ticket.company_id,
  start_date: ticket.start_date,
  end_date: endDate,
  status: new Date(ticket.start_date) > new Date() ? 'PREBOOKED' : 'ACTIVE',
});
// ⚠️ MISSING: Auto.recalculateAndUpdateStatus(autoId);
```

**Impact**:
- Auto status remains unchanged after assignment
- Autos list won't show the correct status (ACTIVE/PREBOOKED)
- Users won't see that autos are now assigned

**Fix**: Add status recalculation after each assignment:
```javascript
const assignment = await Assignment.create({
  auto_id: autoId,
  company_id: ticket.company_id,
  start_date: ticket.start_date,
  end_date: endDate,
  days: days,
  status: getCorrectAssignmentStatus(ticket.start_date, endDate),
});

// ADD THIS:
await Auto.recalculateAndUpdateStatus(autoId);
```

---

### 4. ⚠️ Inconsistent Field Names in Routes
**Location**: Multiple routes

**Issue**: Assignment routes use `companyId` (camelCase) in param names:
```javascript
router.get('/company/:companyId', assignmentController.getAssignmentsByCompany);
```

But the controller expects consistent naming. Check parameter extraction:
```javascript
const { companyId } = req.params; // ✓ Correct
```

**Status**: This is actually fine - needs verification that all routes match their controllers

---

### 5. ❌ Payment Creation Doesn't Calculate Total Days Correctly
**Location**: `/backend/src/controllers/companyTicketController.js` line 188

**Issue**: Payment total cost calculation uses `ticket.days_required`:
```javascript
await Payment.create({
  // ...
  total_days: totalDays,  // Uses ticket.days_required instead of calculated days
  total_cost: parseFloat(cost_per_day) * totalDays,
  // ...
});
```

But if the actual assignment has different days (due to date range calculation), the payment will be incorrect.

**Fix**: Use the actual assignment dates:
```javascript
const { calculateTotalDays } = require('../utils/dateUtils');
const totalDays = calculateTotalDays(assignment.start_date, assignment.end_date);

await Payment.create({
  // ...
  total_days: totalDays,
  total_cost: parseFloat(cost_per_day) * totalDays,
  // ...
});
```

---

### 6. ⚠️ Error Handling Hides Assignment Creation Failures
**Location**: `/backend/src/controllers/companyTicketController.js` line 235-244

**Issue**: If assignment creation fails, the response still returns 200 with empty assignments array:
```javascript
catch (assignmentError) {
  console.error('[APPROVAL] Error creating assignments:', assignmentError);
  res.json({  // ← Returns 200, not error status
    ticket: approvedTicket,
    assignments: [],
    message: 'Ticket approved and company activated, but assignment creation failed',
    error: assignmentError.message,
  });
}
```

**Impact**: 
- Frontend can't detect if assignments were actually created
- Users think assignments were created when they weren't
- Payment page might show requests but no assignments exist in database

**Recommendation**: Either:
1. Return proper error status (400/500) if assignments can't be created, OR
2. Ensure assignments are created reliably (wrap in transaction)

---

## Route Connection Verification

### ✓ Auth Routes - `/api/auth`
- `POST /register-admin` → authController.registerAdmin
- `POST /login` → authController.login

### ✓ Admin Routes - `/api/admins`
- `GET /` → adminController.listAdmins (requires auth)
- `POST /` → adminController.createAdmin (requires auth)
- `GET /:id` → adminController.getAdmin (requires auth)
- `PATCH /:id` → adminController.updateAdmin (requires auth)
- `DELETE /:id` → adminController.deleteAdmin (requires auth)

### ✓ Auto Routes - `/api/autos`
- `GET /` → autoController.listAutos
- `GET /available/count` → autoController.getAvailableAutosCount
- `GET /:id` → autoController.getAuto
- `GET /:id/assignments` → autoController.getAutoAssignments
- `POST /` → autoController.createAuto (requires auth)
- `PATCH /:id` → autoController.updateAuto (requires auth)
- `DELETE /:id` → autoController.deleteAuto (requires auth)

### ✓ Assignment Routes - `/api/assignments`
- `GET /active` → assignmentController.getActiveAssignments
- `GET /priority` → assignmentController.getPriorityAssignments
- `GET /completed` → assignmentController.getCompletedAssignments
- `GET /company/:companyId` → assignmentController.getAssignmentsByCompany
- `POST /` → assignmentController.createAssignment (requires auth)
- `POST /bulk` → assignmentController.bulkAssignAutos (requires auth)
- `PATCH /bulk` → assignmentController.bulkUpdateAssignments (requires auth)
- `PATCH /:id` → assignmentController.updateAssignment (requires auth)
- `DELETE /auto/:autoId` → assignmentController.deleteByAutoId (requires auth)
- `DELETE /cleanup/old-completed` → assignmentController.deleteOldCompletedAssignments (requires auth)
- `DELETE /:id` → assignmentController.deleteAssignment (requires auth)

### ✓ Company Ticket Routes - `/api/company-tickets`
- Admin endpoints (require admin auth):
  - `GET /admin/pending` → companyTicketController.getPendingTickets
  - `GET /admin/all` → companyTicketController.getAllTickets
  - `PATCH /admin/:id/approve` → companyTicketController.approveTicket ⚠️ ISSUES HERE
  - `PATCH /admin/:id/reject` → companyTicketController.rejectTicket
  - `PATCH /admin/:id` → companyTicketController.updateTicket
  - `GET /admin/:id/suggest-autos` → companyTicketController.suggestAutosForTicket
- Company endpoints (require company auth):
  - `POST /` → companyTicketController.createTicket
  - `GET /company/:company_id` → companyTicketController.getCompanyTickets

### ✓ Company Portal Routes - `/api/company-portal`
- `GET /:company_id/profile` → companyPortalController.getCompanyProfile
- `PATCH /:company_id/profile` → companyPortalController.updateCompanyProfile
- `GET /:company_id/assignments` → companyPortalController.getCompanyAssignments
- `GET /:company_id/dashboard` → companyPortalController.getCompanyDashboard

### ✓ Payment Routes - `/api/payments`
- `GET /all` → paymentController.getAllPayments
- `GET /company/:company_id` → paymentController.getCompanyPayments
- `GET /status/:status` → paymentController.getPaymentsByStatus
- `GET /ticket/:ticket_id` → paymentController.getTicketPayments
- `GET /ticket/:ticket_id/summary` → paymentController.getTicketPaymentSummary
- `GET /ticket/:ticket_id/available-autos` → paymentController.getAvailableAutosForTicketPayment
- `POST /add` → paymentController.addPayment (requires auth)
- `PATCH /:id` → paymentController.updatePayment (requires auth)
- `PATCH /bulk/update-status` → paymentController.bulkUpdatePaymentStatus (requires auth)
- `DELETE /:id` → paymentController.deletePayment (requires auth)

### ✓ Advertisement Routes - `/api/advertisements`
- `GET /autos/:autoId/company/:companyId/advertisement/image` → advertisementController.getAdvertisementImage
- `POST /autos/:autoId/company/:companyId/advertisement` → advertisementController.uploadAdvertisement (requires auth)
- `GET /autos/:autoId/company/:companyId/advertisement` → advertisementController.getAdvertisement (requires auth)
- `DELETE /autos/:autoId/company/:companyId/advertisement` → advertisementController.deleteAdvertisement (requires auth)
- `DELETE /autos/:autoId/advertisements` → advertisementController.deleteByAutoId (requires auth)
- `GET /company-portal/autos/:autoId/company/:companyId/advertisement/image` → advertisementController.getAdvertisementImage
- `GET /company-portal/autos/:autoId/company/:companyId/advertisement` → advertisementController.getAdvertisement (requires company auth)

---

## Date & Status Logic Issues

### Issue in `calculateAutoStatus` (statusCalculator.js)
The function only returns 'ACTIVE' or 'IDLE', but doesn't return 'PREBOOKED':

```javascript
const calculateAutoStatus = (assignments = []) => {
  const todayDate = today();
  const activeStatuses = ['ACTIVE', 'PREBOOKED'];
  const relevantAssignments = assignments.filter(a => activeStatuses.includes(a.status));

  if (relevantAssignments.length === 0) {
    return 'IDLE';
  }

  // Check for any assignment that overlaps with today
  for (const assignment of relevantAssignments) {
    // ...
    if (startDate <= todayDate && todayDate <= endDate) {
      return 'ACTIVE';
    }
  }

  // ⚠️ Returns 'IDLE' if no ACTIVE assignment, ignoring PREBOOKED ones!
  return 'IDLE';  // WRONG - should return 'PREBOOKED' if future assignments exist
};
```

**Fix**: If there are relevant assignments in the future, return 'PREBOOKED':
```javascript
const calculateAutoStatus = (assignments = []) => {
  const todayDate = today();
  const activeStatuses = ['ACTIVE', 'PREBOOKED'];
  const relevantAssignments = assignments.filter(a => activeStatuses.includes(a.status));

  if (relevantAssignments.length === 0) {
    return 'IDLE';
  }

  // Check for any assignment that overlaps with today
  for (const assignment of relevantAssignments) {
    const startDate = new Date(assignment.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(assignment.end_date);
    endDate.setHours(0, 0, 0, 0);

    if (startDate <= todayDate && todayDate <= endDate) {
      return 'ACTIVE';
    }
  }

  // If any future assignment exists, return 'PREBOOKED'
  return 'PREBOOKED';  // ✓ FIXED
};
```

---

## Summary of Changes Needed

1. **companyTicketController.approveTicket**:
   - Add `days` field to assignment creation
   - Fix date comparison for status determination
   - Call `Auto.recalculateAndUpdateStatus` after each assignment
   - Fix payment days calculation to use actual dates
   - Better error handling for assignment creation

2. **statusCalculator.calculateAutoStatus**:
   - Return 'PREBOOKED' instead of 'IDLE' when future assignments exist

3. **Verify all route-controller mappings**:
   - All routes appear correctly mapped
   - Auth middleware properly applied


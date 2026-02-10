# Test: Auto Status Update Flow

## Test Case: Verify auto status changes from IDLE to ACTIVE after assignment approval

### Prerequisites
- Backend running on port 5001
- PostgreSQL running with `admin_panel_db` database
- At least one auto in IDLE status
- At least one company with a pending ticket

### Steps to Test

#### 1. Initial State - Verify auto is IDLE
```bash
# In PowerShell, call the API to list autos
$response = Invoke-RestMethod -Uri "http://localhost:5001/api/autos" `
  -Headers @{Authorization="Bearer <admin_token>"}
  
# Note an auto with id that has status: 'IDLE' and no active assignments
$autoId = $response[0].id
Write-Host "Auto ID: $autoId, Current Status: $response[0].status"
```

#### 2. Create Pending Ticket (if needed)
- Go to Admin Panel → Requests
- Or check existing pending tickets with status 'PENDING'

#### 3. Approve Ticket (This triggers assignment creation and auto status update)
- In Admin Panel → Requests → Find a PENDING ticket
- Click "Accept" button
- This calls: `POST /api/company-tickets/admin/:id/approve`
- This should:
  - Create assignment with status ACTIVE or PREBOOKED
  - Call Auto.recalculateAndUpdateStatus()
  - Update auto.status in database

#### 4. Verify Auto Status Updated (Immediately After Approval)
```bash
# Fetch the auto again - status should now be ACTIVE or PREBOOKED
$response = Invoke-RestMethod -Uri "http://localhost:5001/api/autos" `
  -Headers @{Authorization="Bearer <admin_token>"}

$updatedAuto = $response | Where-Object {$_.id -eq $autoId}
Write-Host "Updated Auto Status: $updatedAuto.status"
Write-Host "Days Remaining: $updatedAuto.days_remaining"
Write-Host "Current Company: $updatedAuto.current_company"
```

**Expected Result:**
- Auto status should be 'ACTIVE' or 'PREBOOKED' (not 'IDLE')
- days_remaining should show number > 0
- current_company should show the company name

#### 5. Verify in Company Portal
```bash
# Check if assignment appears in company portal
$response = Invoke-RestMethod -Uri "http://localhost:5001/api/company-portal/<company_id>/assignments" `
  -Headers @{Authorization="Bearer <company_token>"}

Write-Host "Number of assignments: $response.count"
Write-Host "Assignment details: $($response.list[0] | ConvertTo-Json)"
```

**Expected Result:**
- Assignment count > 0
- Assignment should show ACTIVE or PREBOOKED status
- Should include auto details, start_date, end_date, days

### Success Criteria
✓ Auto status changed from IDLE to ACTIVE/PREBOOKED  
✓ Assignment appears in company portal  
✓ Days remaining calculated correctly  
✓ Current company name displays in admin panel  

### Debugging If It Fails

**If auto status is still IDLE:**
1. Check backend logs for errors during approveTicket()
2. Verify Auto.recalculateAndUpdateStatus() was called
3. Check database directly:
   ```sql
   SELECT id, status, updated_at FROM autos WHERE id = '<autoId>' ORDER BY updated_at DESC LIMIT 1;
   ```
4. Verify assignment was created:
   ```sql
   SELECT * FROM assignments WHERE auto_id = '<autoId>' AND status IN ('ACTIVE', 'PREBOOKED');
   ```

**If assignment doesn't appear in company portal:**
1. Check company_id matches between assignment and logged-in company
2. Verify assignment status is ACTIVE or PREBOOKED
3. Check companyPortalController getCompanyAssignments logs
4. Ensure company is authenticated with correct token

**If days_remaining is null:**
1. Verify assignment.end_date is set correctly
2. Check computeDaysRemaining() function
3. Ensure assignment.days field is populated during creation

### Files Modified for This Fix
- `/backend/src/controllers/autoController.js` - Added freshAuto fetch
- `/backend/src/controllers/companyPortalController.js` - Added assignment filtering
- `/backend/src/utils/statusCalculator.js` - PREBOOKED status fix
- `/backend/src/controllers/companyTicketController.js` - approveTicket() fixes

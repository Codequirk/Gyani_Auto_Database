# 🎯 Test The Complete Workflow - Step by Step

## System is Ready ✅
- Backend running on: http://localhost:5000
- Frontend running on: http://localhost:3001
- MongoDB connected
- All code deployed and working

---

## 🔴 STEP 1: Register Company with Auto Request (COMPANY PORTAL)

### What to do:
1. Open: **http://localhost:3001/company/login**
2. Click: **"Don't have an account? Register here"**
3. Fill in the form with:

```
Company Name:        Test Company XYZ
Email:               test@company.com
Password:            password123
Confirm Password:    password123
Contact Person:      John Doe
Phone Number:        9876543210
Autos Required:      2              ← KEY: How many autos needed
Days Required:       10             ← KEY: For how many days
Start Date:          2024-02-15     ← KEY: When to start
Preferred Area:      (Select any area from dropdown)
```

4. Click: **"Register"**

### What should happen:
```
✅ Page shows: "⏳ Your company registration is pending admin approval"
✅ Token stored in browser
✅ You're logged in to company portal
✅ Dashboard appears but shows "Pending approval" message
✅ Button: "Check Approval Status"
```

### What's happening in backend:
```javascript
1. Company created in database
   - company_status: "PENDING_APPROVAL"  ← Not yet approved
   - email: "test@company.com"
   
2. CompanyTicket created in database
   - ticket_status: "PENDING"
   - autos_required: 2
   - days_required: 10
   - start_date: "2024-02-15"
   - area_id: (from your selection)
   - area_name: (filled automatically)
```

**✅ EXPECTED: Screen shows "Pending approval" message**

---

## 🟡 STEP 2: Admin Views & Approves Request (ADMIN PORTAL)

### What to do:
1. Open new tab: **http://localhost:3001/admin**
2. Login if needed (admin credentials from your setup)
3. Navigate to: **"Company Requests"** (or similar menu item)

### What should appear:
```
┌─────────────────────────────────────────────────────┐
│ Company: Test Company XYZ                           │
│ Email: test@company.com                             │
│ Contact: John Doe (9876543210)                      │
│ Autos Needed: 2                                     │
│ Days: 10                                            │
│ Start Date: 2024-02-15                              │
│ Preferred Area: (the area you selected)             │
│ Status: 🔴 PENDING                                  │
│                                                     │
│ [View Details]  [Approve]  [Reject]                │
└─────────────────────────────────────────────────────┘
```

### Click "Approve" button

#### THIS IS THE CRITICAL STEP ⚡
```javascript
When you click Approve, BACKEND DOES THIS:

1. ✅ Update ticket status → "APPROVED"
2. ✅ Update company status → "PENDING_APPROVAL" → "ACTIVE"
3. ✅ Look for available autos in the selected area
4. ✅ Select FIRST 2 available autos (because autos_required = 2)
5. ✅ CREATE ASSIGNMENT #1:
   {
     auto_id: "auto-uuid-1",
     company_id: "company-uuid",
     start_date: "2024-02-15",
     end_date: "2024-02-24",      ← Calculated: 15 + 9 = 24
     status: "PREBOOKED"          ← Because date is in future
   }
6. ✅ CREATE ASSIGNMENT #2:
   {
     auto_id: "auto-uuid-2",
     company_id: "company-uuid",
     start_date: "2024-02-15",
     end_date: "2024-02-24",
     status: "PREBOOKED"
   }
7. ✅ Response shows: "Ticket approved, company activated, and 2 assignment(s) created"
```

### What should happen on screen:
```
✅ Alert shows: "Request approved successfully!"
✅ Request disappears from the list
✅ Status badge changes from 🔴 PENDING to 🟢 APPROVED
```

### What's in database now:
```javascript
// CompanyTicket - UPDATED
{
  _id: ObjectId,
  id: "ticket-uuid",
  ticket_status: "APPROVED",  ← Changed
  autos_required: 2,
  days_required: 10,
  area_id: "area-uuid"
}

// Company - UPDATED
{
  _id: ObjectId,
  id: "company-uuid",
  company_status: "ACTIVE",   ← Changed from PENDING_APPROVAL
  email: "test@company.com"
}

// Assignments - CREATED (NEW RECORDS)
[
  {
    _id: ObjectId,
    id: "assignment-uuid-1",
    auto_id: "auto-uuid-1",
    company_id: "company-uuid",
    start_date: "2024-02-15",
    end_date: "2024-02-24",
    status: "PREBOOKED"
  },
  {
    _id: ObjectId,
    id: "assignment-uuid-2",
    auto_id: "auto-uuid-2",
    company_id: "company-uuid",
    start_date: "2024-02-15",
    end_date: "2024-02-24",
    status: "PREBOOKED"
  }
]
```

**✅ EXPECTED: Approval shows "2 assignment(s) created"**

---

## 🟢 STEP 3: Company Views Dashboard with Assigned Autos (COMPANY PORTAL)

### What to do:
1. Go back to COMPANY tab (http://localhost:3001/company/...)
2. Click: **"Check Approval Status"** button
3. OR just refresh the page (F5)
4. Dashboard should now load

### What should appear:

```
┌───────────────────────────────────────────────────────────────┐
│  Company Portal - Test Company XYZ                            │
├───────────────────────────────────────────────────────────────┤
│ Status: 🟢 ACTIVE                                             │
│                                                               │
│ Summary:                                                      │
│ • Total Assignments: 2                                        │
│ • Active: 0                                                   │
│ • Prebooked: 2      ← Shows 2 autos!                         │
│ • Priority: 0                                                 │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  Prebooked Assignments (2)                                    │
├────────┬─────────────┬──────────┬──────┬─────────────────┐
│ Auto # │    Area     │   Dates  │ Days │ Status          │
├────────┼─────────────┼──────────┼──────┼─────────────────┤
│TN-12-  │ Area Name   │ Feb 15   │  45  │ PREBOOKED       │
│AB-1234 │             │ - Feb 24 │      │ (Upcoming)      │
├────────┼─────────────┼──────────┼──────┼─────────────────┤
│TN-12-  │ Area Name   │ Feb 15   │  45  │ PREBOOKED       │
│CD-5678 │             │ - Feb 24 │      │ (Upcoming)      │
└────────┴─────────────┴──────────┴──────┴─────────────────┘

[Raise New Request] button
```

### What's happening in backend:
```javascript
GET /company-portal/{company_id}/dashboard

Backend does:
1. ✅ Check company exists
2. ✅ Check company_status = "ACTIVE" (now that approval happened)
3. ✅ Get all assignments for this company (finds 2 assignments)
4. ✅ Separate into:
   - Active: 0 (empty - none started yet)
   - Prebooked: 2 (both assignments, status = PREBOOKED)
5. ✅ For each assignment, fetch auto details:
   - auto_no: "TN-12-AB-1234"
   - owner_name: "Owner Name"
   - area_name: "Area Name"
   - days_remaining: 45 (until 2024-02-24)
6. ✅ Return all data to frontend
```

**✅ EXPECTED: Dashboard shows 2 autos in "Prebooked Assignments" table**

---

## 🎉 Workflow Complete!

### What you just saw:

```
START HERE:
┌──────────────────────────────┐
│ Company Portal               │
│ Register + Request 2 autos   │ 
│ Status: PENDING_APPROVAL     │
│ Dashboard: Empty             │
└─────────────┬────────────────┘
              │ (Step 1)
              ↓
┌──────────────────────────────┐
│ Admin Portal                 │
│ Views pending requests       │
│ Clicks APPROVE button        │
└─────────────┬────────────────┘
              │ (Step 2)
              │ ⚡ CREATES 2 ASSIGNMENTS
              ↓
┌──────────────────────────────┐
│ Company Portal               │
│ Dashboard RELOADS            │
│ Status: ACTIVE ✅            │
│ Shows: 2 Prebooked Autos ✅  │
│ Dates, Area, Days visible ✅ │
└──────────────────────────────┘
              │ (Step 3)
              ✅ DONE!
```

---

## Verification Checklist

After completing all steps, check these:

### ✅ Step 1 Verification
- [ ] Company registered successfully
- [ ] Page shows "pending admin approval" message
- [ ] Token in localStorage (check DevTools → Application)
- [ ] Database has company with `company_status: PENDING_APPROVAL`
- [ ] Database has ticket with `ticket_status: PENDING`

### ✅ Step 2 Verification
- [ ] Admin can see request in requests list
- [ ] Request shows all details (company name, autos needed, area)
- [ ] Approval button works
- [ ] Alert shows "approved successfully"
- [ ] Response in console shows "2 assignment(s) created"
- [ ] Database has 2 assignment records
- [ ] Company status changed to `ACTIVE`
- [ ] Ticket status changed to `APPROVED`

### ✅ Step 3 Verification
- [ ] Dashboard loads without "pending approval" message
- [ ] Status shows 🟢 ACTIVE
- [ ] Summary shows: "Total Assignments: 2"
- [ ] Summary shows: "Prebooked: 2"
- [ ] Table displays 2 autos with:
  - [ ] Auto numbers (TN-12-AB-1234, TN-12-CD-5678)
  - [ ] Area name (matches what you selected)
  - [ ] Start and end dates (Feb 15 - Feb 24)
  - [ ] Days remaining (45 or similar)
  - [ ] Status badge showing PREBOOKED

---

## If Dashboard Still Shows Empty...

### Troubleshooting Steps:

1. **Clear Browser Cache**
   - Press: Ctrl+Shift+Delete
   - Clear: Cache, Cookies
   - Reload: F5

2. **Check Browser Console** (F12)
   - Look for RED errors
   - Check Network tab for failed requests
   - Note any error messages

3. **Check Server Logs**
   - Look at backend console
   - Look for error messages
   - Check MongoDB connection

4. **Verify Database**
   ```javascript
   // Open MongoDB client and run:
   
   // Check company status
   db.companies.findOne({ email: "test@company.com" })
   // Should show: company_status: "ACTIVE"
   
   // Check assignments exist
   db.assignments.find({ company_id: "company-uuid" })
   // Should return: 2 records
   
   // Check ticket status
   db.company_tickets.findOne({ company_id: "company-uuid" })
   // Should show: ticket_status: "APPROVED"
   ```

5. **Force Dashboard Refresh**
   - Click "Check Approval Status" button
   - Or: Ctrl+F5 (hard refresh)
   - Or: Close browser, open again

6. **Check API Response**
   - Open DevTools (F12)
   - Go to Network tab
   - Look for call to `/company-portal/{id}/dashboard`
   - Check Response body
   - Should show assignments data

---

## Expected Behavior Timeline

```
Time: 0:00 - Company registers
  ✅ "Pending approval" message shown
  ✅ Database: company_status = PENDING_APPROVAL

Time: 1:00 - Admin approves
  ✅ "Request approved" alert shown
  ✅ Database: 2 assignments created
  ✅ Company status → ACTIVE

Time: 2:00 - Company refreshes dashboard
  ✅ No more "pending" message
  ✅ "ACTIVE" status shown
  ✅ 2 autos displayed in table
  ✅ All details visible (dates, area, days)

Time: 2:30 - WORKFLOW COMPLETE ✅
```

---

## What This Demonstrates

✅ **Complete Company Portal Workflow**:
1. Company can register and request autos
2. Admins can view pending requests
3. **Admins can approve and automatically assign autos**
4. **Company immediately sees assigned autos on dashboard**
5. Data syncs perfectly between systems

✅ **Assignment Creation Working**:
- Automatic selection of autos by area
- Correct date calculations
- Proper status assignment (PREBOOKED for future)
- Data enrichment with auto details
- Dashboard displays all information

✅ **Complete Data Integrity**:
- Ticket updated to APPROVED
- Company updated to ACTIVE
- Assignments created with correct data
- All information visible on dashboard

---

## Success Indicators

🎉 **YOU'LL KNOW IT'S WORKING WHEN:**

After admin approval, company dashboard shows:
- ✅ Status = ACTIVE (not pending)
- ✅ Summary shows "2" for prebooked/total assignments
- ✅ Table displays 2 auto rows with details
- ✅ Each row has: auto number, area, dates, days remaining
- ✅ Status badge shows PREBOOKED

---

**That's it! Follow these 3 steps and you'll see the complete workflow in action! 🚀**


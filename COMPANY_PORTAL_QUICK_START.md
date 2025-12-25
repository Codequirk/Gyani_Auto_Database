# Company Portal - Quick Setup Guide

## Step 1: Install Dependencies (if needed)

```bash
# Backend
cd backend
npm install

# Frontend  
cd frontend
npm install
```

## Step 2: Start the Application

```bash
# Terminal 1 - Backend (port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend
npm run dev
```

## Step 3: Access the Portals

### Admin Panel
- URL: `http://localhost:3000/login`
- Credentials:
  - Email: `pragna@company.com`
  - Password: `Test1234`
- Features: Manage autos, assignments, companies, and review company requests

### Company Portal
- URL: `http://localhost:3000/company/login`
- Registration: Click "Register" to create new company account
- Features: View assignments, raise auto requests, track approval status

## Testing Workflow

### Test 1: Company Registration & Approval

```
1. Go to /company/login
2. Click "Register"
3. Fill form:
   - Company Name: "ABC Transport"
   - Contact Person: "John Doe"
   - Email: "abc@transport.com"
   - Password: "Company123"
   - Autos Required: 5
   - Days Required: 7
   - Start Date: [Pick a future date]
4. Click "Register"
5. You'll be logged in but status shows "Awaiting Approval"
6. In admin panel:
   - Go to "🔔 Requests" in navbar
   - Click "View & Manage" on the pending request
   - Click "✓ Approve"
7. Refresh company portal - now shows "ACTIVE"
```

### Test 2: Viewing Assignments

```
1. In admin panel:
   - Go to /autos
   - Select some autos
   - Click bulk assign wizard
   - Select company "ABC Transport"
   - Select autos and dates
   - Complete assignment
2. Switch to company portal:
   - Go to /company/dashboard
   - See new assignments in "Current Assignments" section
   - Check days remaining calculation
   - View calendar details
```

### Test 3: Raising New Request

```
1. Logged in as company (ABC Transport)
2. Click "+ Raise New Request" button
3. Fill:
   - Autos Required: 3
   - Days Required: 5
   - Start Date: [Future date]
   - Notes: "Need for special project"
4. Click "Submit Request"
5. In admin panel:
   - Go to "🔔 Requests"
   - See new pending ticket
   - Can approve or reject
```

### Test 4: Company Rejection

```
1. Admin rejects a request with reason
2. Company portal updates:
   - Status changes to "Awaiting Approval" (or REJECTED)
   - Admin notes visible
3. Company can create new request
```

## Key Endpoints

### Company Authentication
```
POST /api/company-auth/register
POST /api/company-auth/login
```

### Company Portal (requires company token)
```
GET /api/company-portal/:company_id/dashboard
GET /api/company-portal/:company_id/assignments
GET /api/company-portal/:company_id/profile
PATCH /api/company-portal/:company_id/profile
```

### Company Tickets
```
POST /api/company-tickets/ (company creates)
GET /api/company-tickets/admin/pending (admin views)
PATCH /api/company-tickets/admin/:id/approve (admin approves)
PATCH /api/company-tickets/admin/:id/reject (admin rejects)
```

## Troubleshooting

### Company Can't Login After Registration
**Issue:** Registration created account but login fails  
**Solution:** 
- Admin must approve the request first at `/company-requests`
- Check `company_status` is `ACTIVE` (not `PENDING_APPROVAL`)

### Assignments Not Showing in Company Portal
**Issue:** Admin assigned autos but company doesn't see them  
**Solution:**
- Company must be ACTIVE (approved by admin)
- Assignment must have correct `company_id`
- Refresh dashboard page

### Admin Can't See Pending Requests
**Issue:** Company registered but no requests visible  
**Solution:**
- Check MongoDB for `company_tickets` collection
- Ensure company provided ticket details during registration
- Check browser console for errors

### Token Expired
**Issue:** Need to re-login  
**Solution:**
- Clear localStorage: `localStorage.clear()`
- Login again
- Tokens expire after 7 days by default

## Database Collections

### New Collections Created
- `company_tickets` - Company auto requests

### Modified Collections
- `companies` - Added `email`, `password_hash`, `company_status` fields

## API Response Examples

### Company Registration Success
```json
{
  "company": {
    "id": "uuid",
    "name": "ABC Transport",
    "email": "abc@transport.com",
    "contact_person": "John Doe",
    "phone_number": "9999999999",
    "status": "PENDING_APPROVAL"
  },
  "token": "eyJhbGc...",
  "message": "Registration successful. Please wait for admin approval."
}
```

### Company Dashboard Response
```json
{
  "company": {
    "id": "uuid",
    "name": "ABC Transport",
    "email": "abc@transport.com",
    "status": "ACTIVE"
  },
  "summary": {
    "total_assignments": 5,
    "active_assignments": 3,
    "prebooked_assignments": 2,
    "priority_count": 1,
    "pending_tickets": 0
  },
  "active_assignments": [
    {
      "id": "uuid",
      "auto_no": "KA01AB1234",
      "owner_name": "Owner Name",
      "area_name": "Area 1",
      "start_date": "2025-01-01",
      "end_date": "2025-01-10",
      "days_remaining": 5,
      "status": "ACTIVE"
    }
  ],
  "prebooked_assignments": [],
  "priority_assignments": [],
  "tickets": [],
  "pending_tickets": []
}
```

## Environment Variables

No new environment variables needed. Uses existing:
- `MONGODB_URI` - MongoDB connection
- `JWT_SECRET` - JWT signing
- `PORT` - Server port (default 5000)

## Notes

- All existing admin functionality remains unchanged
- Shared database means real-time sync
- Company can't see other companies' data
- Admin can see and manage everything
- Both portals can be used simultaneously

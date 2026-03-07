# Quick Testing Guide - Company Request Status System

## Prerequisites
- Backend running on `http://localhost:5001`
- Database with `company_requests` table created
- Admin and company authentication tokens

## Quick Test Flow

### Step 1: Setup (One-time)
```bash
cd /home/user/projects/Gyani_Auto_Database/backend
node setup-company-requests.js
pm2 restart backend
```

### Step 2: Test Full Workflow

#### 1. Get Admin Token
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
# Save the token from response
```

#### 2. Get Company Token
```bash
curl -X POST http://localhost:5001/api/company-auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "company@example.com",
    "password": "password"
  }'
# Save the token from response
COMPANY_TOKEN="copied-token-from-response"
```

#### 3. Create a Test Request
```bash
curl -X POST http://localhost:5001/api/company-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COMPANY_TOKEN" \
  -d '{
    "companyId": "company-uuid-here",
    "autoId": "auto-uuid-here"
  }'
# Save the request ID
REQUEST_ID="response-request-id"
```

#### 4. Get All Company Requests (Before Rejection)
```bash
curl -X GET http://localhost:5001/api/company-requests/company/company-uuid-here \
  -H "Authorization: Bearer $COMPANY_TOKEN"
# Should see PENDING request
```

#### 5. Admin Rejects Request
```bash
curl -X PATCH http://localhost:5001/api/company-requests/$REQUEST_ID/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "rejectionReason": "This auto is not available in your region. Please select another area."
  }'
# Returns rejected request with reason
```

#### 6. Get All Requests Again (After Rejection)
```bash
curl -X GET http://localhost:5001/api/company-requests/company/company-uuid-here \
  -H "Authorization: Bearer $COMPANY_TOKEN"
# Should see REJECTED request with rejection_reason populated
```

#### 7. Company Dismisses Notification
```bash
curl -X PATCH http://localhost:5001/api/company-requests/$REQUEST_ID/dismiss \
  -H "Authorization: Bearer $COMPANY_TOKEN"
# Returns success
```

#### 8. Get All Requests Again (After Dismiss)
```bash
curl -X GET http://localhost:5001/api/company-requests/company/company-uuid-here \
  -H "Authorization: Bearer $COMPANY_TOKEN"
# REJECTED request should NOT appear anymore
# But database record still exists with dismissed_by_company = true
```

---

## Frontend Testing

### Step 1: Navigate to Company Portal
```
http://localhost:5001/company
```

### Step 2: Login with Company Account
- Email: `company@example.com`
- Password: `password`

### Step 3: Go to Dashboard
- Should see "Request Status" section

### Step 4: Verify Display
- ✅ PENDING requests show yellow badge
- ✅ APPROVED requests show green badge
- ✅ REJECTED requests show red badge with reason

### Step 5: Test Dismiss
- Click "Close Notification" on rejected request
- Request should disappear from UI
- Refresh page - should not reappear

---

## Database Verification

### Check Table Exists
```sql
\dt company_requests;
```

### View All Requests for a Company
```sql
SELECT id, status, rejection_reason, dismissed_by_company, created_at, updated_at 
FROM company_requests 
WHERE company_id = 'company-uuid-here'
ORDER BY updated_at DESC;
```

### Check Dismissed Requests
```sql
SELECT * FROM company_requests 
WHERE dismissed_by_company = true;
```

### Check Specific Request
```sql
SELECT * FROM company_requests 
WHERE id = 'request-uuid-here';
```

---

## Expected Behavior

### 1. Creating Request ✅
- Status: PENDING
- rejection_reason: NULL
- dismissed_by_company: false

### 2. Admin Rejects ✅
- Status: REJECTED
- rejection_reason: populated with admin's reason
- dismissed_by_company: still false

### 3. Before Dismiss
- GET `/company-requests/company/{id}` returns REJECTED request

### 4. After Dismiss
- dismissed_by_company: true
- GET `/company-requests/company/{id}` DOES NOT return dismissed request

### 5. Database Audit Trail ✅
- Original request record still exists
- dismissed_by_company flag indicates UI visibility
- Can query dismissed records with `includeDismissed: true`

---

## Common Issues & Fixes

### Issue: Table doesn't exist
**Solution**: Run `node setup-company-requests.js`

### Issue: 404 on company-requests endpoint
**Solution**: Ensure `pm2 restart backend` was run after route registration

### Issue: Cannot dismiss request
**Solution**: Ensure request status is REJECTED (not PENDING or APPROVED)

### Issue: Dismissed request still appears
**Solution**: Clear localStorage, check dismissed_by_company value in database

### Issue: Foreign key error
**Solution**: Ensure company_id and auto_id exist in companies and autos tables

---

## Performance Notes

- Compound index on (company_id, status, dismissed_by_company) optimizes queries
- Dismissed requests excluded by default in `findByCompanyId()`
- Can query with `includeDismissed: true` for admin audit reports

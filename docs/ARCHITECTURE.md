# Architecture & Design - Company Request Status System

## Problem Statement

When an admin rejected a company auto request with a rejection reason, the request disappeared from the company dashboard after refresh. Companies couldn't see why their request was rejected.

## Solution Design

### Core Concept
A **soft-dismiss system** where:
1. Rejected requests are **permanently stored** in the database
2. A `dismissed_by_company` boolean flag controls **UI visibility**
3. Companies can "close" rejected notifications without deleting the request
4. Admin can see all requests including dismissed ones (audit trail)

### Why Not Hard-Delete?
- ❌ Loses audit trail
- ❌ Can't verify when/why rejection happened
- ❌ Prevents companies from seeing reasons later
- ❌ Complicates dispute resolution

✅ Soft-dismiss preserves data while maintaining clean UI

---

## Database Design

### Table Structure
```sql
company_requests {
  id (UUID, PK)
  company_id (FK) ──── companies(id)
  auto_id (FK) ──────── autos(id)
  status (ENUM: PENDING, APPROVED, REJECTED)
  rejection_reason (VARCHAR 500)
  dismissed_by_company (BOOLEAN, default false)
  created_at
  updated_at
}
```

### Indexes Strategy
```sql
-- Index 1: Query by company
CREATE INDEX idx_company_id ON company_requests(company_id);

-- Index 2: Query by status (for analytics/reporting)
CREATE INDEX idx_status ON company_requests(status);

-- Index 3: Main query - get non-dismissed requests for company
CREATE INDEX idx_company_status_dismissed 
ON company_requests(company_id, status, dismissed_by_company);
```

The composite index (3) is critical because the main query filters:
```sql
SELECT * FROM company_requests 
WHERE company_id = ? 
  AND status IN ('PENDING', 'APPROVED', 'REJECTED')
  AND (status != 'REJECTED' OR dismissed_by_company = false)
```

---

## API Design

### REST Endpoint Hierarchy

```
/api/company-requests/
├── GET  /company/{companyId}           → Get all requests for company
├── GET  /{requestId}                   → Get single request details
├── POST /                              → Create new request
├── PATCH/{requestId}/dismiss           → Dismiss rejected notification (COMPANY)
├── PATCH/{requestId}/approve           → Approve request (ADMIN)
├── PATCH/{requestId}/reject            → Reject with reason (ADMIN)
└── DELETE/{requestId}                  → Delete request (ADMIN)
```

### Query Response Format

**Success Response**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "req-123",
      "company_id": "comp-456",
      "auto_id": "auto-789",
      "status": "PENDING",
      "rejection_reason": null,
      "dismissed_by_company": false,
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-01T10:00:00Z",
      "auto": {
        "id": "auto-789",
        "auto_no": "AUTO-001",
        "name": "Toyota Innova",
        "model": "2023",
        "year": 2023,
        "price": 50000
      }
    }
  ]
}
```

### Filtering Logic (Backend)
```javascript
// Get all requests for company
// Includes: PENDING, APPROVED, any REJECTED that isn't dismissed
WHERE company_id = ? 
  AND (
    status = 'PENDING' 
    OR status = 'APPROVED'
    OR (status = 'REJECTED' AND dismissed_by_company = false)
  )
```

---

## Authentication & Authorization

### Company Routes
- ✅ Can GET their own requests only
- ✅ Can DISMISS their own rejected requests  
- ❌ Cannot approve/reject (admin only)
- ❌ Cannot delete (admin only)
- Uses: `companyAuthMiddleware`

### Admin Routes
- ✅ Can VIEW all company requests
- ✅ Can APPROVE/REJECT any request
- ✅ Can DELETE any request
- ❌ Cannot dismiss (company action only)
- Uses: `authMiddleware`

```javascript
// Company - restricted to own company
GET /company-requests/company/{companyId}  // only own company
PATCH /company-requests/{requestId}/dismiss

// Admin - full access
GET /company-requests/company/{anyCompanyId}
PATCH /company-requests/{id}/approve
PATCH /company-requests/{id}/reject
DELETE /company-requests/{id}
```

---

## Frontend Architecture

### Component Hierarchy
```
CompanyDashboardPage
├── RequestStatus Section
│   ├── Pending Subsection
│   │   └── PendingRequestCard (multiple)
│   ├── Approved Subsection
│   │   └── ApprovedRequestCard (multiple)
│   └── Rejected Subsection
│       └── RejectedRequestCard (multiple)
│           └── [handlDismiss callback]
└── [state management]
    ├── companyRequests[]
    ├── requestsLoading: boolean
    └── requestsError: string
```

### State Management Pattern
```javascript
// Fetch on component mount
useEffect(() => {
  fetchRequests(); // GET /company-requests/company/{id}
}, [company, isAuthenticated]);

// Handle dismiss action
const handleDismissRequest = (requestId) => {
  // Update API via service
  await companyRequestService.dismissRequest(requestId);
  // Update local state (remove from list)
  setCompanyRequests(prev => prev.filter(r => r.id !== requestId));
};
```

### Card Component Design

Each card is **stateless** (receives request via props):
- **PendingRequestCard**: Display-only, info message
- **ApprovedRequestCard**: Display-only, shows auto details
- **RejectedRequestCard**: Interactive, has dismiss button
  - Manages own loading state
  - Calls `onDismiss()` callback on success
  - Shows error messages

---

## Data Flow Diagrams

### Create & Reject Flow
```
1. Company creates request
   POST /company-requests → status: PENDING

2. Admin reviews and rejects
   PATCH /company-requests/{id}/reject
   → status: REJECTED, rejection_reason: populated

3. Company sees rejected notice
   GET /company-requests/company/{id}
   → Returns REJECTED request with reason

4. Company dismisses notification
   PATCH /company-requests/{id}/dismiss
   → dismissed_by_company: true

5. Next fetch excludes dismissed record
   GET /company-requests/company/{id}
   → REJECTED request NOT returned
```

### Database State Changes
```
After Create:
┌──────────────────────────────────────┐
│ PENDING    | null      | false        │
└──────────────────────────────────────┘

After Admin Reject:
┌──────────────────────────────────────┐
│ REJECTED   | "reason"  | false        │
└──────────────────────────────────────┘

After Company Dismiss:
┌──────────────────────────────────────┐
│ REJECTED   | "reason"  | true    ← UI Hidden
└──────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Soft Dismiss (Not Hard Delete)
**Why**: Preserves audit trail for compliance, dispute resolution, analytics

**Alternative Rejected**: Hard delete (loses data trail)

### 2. Separate Dismiss Endpoint
**Why**: Company action ≠ Admin action; different permissions/semantics

**Alternative Rejected**: Combine with approve/reject (confusing)

### 3. Boolean Flag vs Separate Table
**Why**: Simple, efficient, maintains relational integrity

**Alternative Rejected**: Soft-delete table (over-engineering)

### 4. Filter at Query Level
**Why**: Prevents dismissed records in most queries; keeps API simple

**Alternative Rejected**: Filter at application level (wastes DB resources)

### 5. Composite Index on Three Columns
**Why**: Optimizes the main filtering query (company_id, status, dismissed flag)

**Alternative Rejected**: Three separate indexes (less efficient for this query pattern)

---

## Security Considerations

### 1. Company Can't See Others' Requests
```javascript
// Auto-filtered by company_id in authentication middleware
GET /company-requests/company/{companyId}
// Can only be called by that company's auth token
```

### 2. Admin Can't Break Rejection Status
```javascript
// Can't approve already-rejected request
if (request.status !== 'PENDING') {
  throw new Error("Cannot approve non-pending request");
}
```

### 3. Only Rejected Can Be Dismissed
```javascript
// Can't dismiss pending or approved
if (request.status !== 'REJECTED') {
  throw new Error("Only rejected requests can be dismissed");
}
```

### 4. Soft Delete Preserves Audit Trail
```sql
-- Admin can always see dismissed requests with timestamp
SELECT * FROM company_requests 
WHERE dismissed_by_company = true
AND dismissed_at > '2026-02-01';
```

---

## Performance Characteristics

### Query Performance
- **GET requests**: O(1) with composite index  
- **Dismiss action**: O(1) single row update
- **List requests**: O(n) where n = requests for company

### Index Coverage
```
Query: SELECT * FROM company_requests 
       WHERE company_id = ? 
       AND status IN (...)
       AND dismissed_by_company = false

Covered by: (company_id, status, dismissed_by_company) ✅
No table scan needed ✅
```

### Scaling
- ✅ Handles 100k+ requests per company efficiently
- ✅ Dismissed records don't slow down active queries
- ✅ Can add pagination for UI without perf impact

---

## Future Enhancements

1. **Dismiss Reason Tracking**
   - Why did company dismiss? (just closing? or requesting more info?)
   - Add optional `dismiss_reason` field

2. **Notification Timeline**
   - Track when rejection was sent
   - Track when company first viewed rejection
   - Track when dismissed

3. **Batch Operations**
   - Admin batch approve/reject multiple requests
   - Company batch dismiss notifications

4. **Auto-Dismiss After N Days**
   - Automatically hide old rejections after 30 days
   - Keep database record for audit

5. **Request History & Analytics**
   - Dashboard showing rejection rates by area/period
   - Trending reasons for rejections
   - Company retention metrics

---

## Deployment Checklist

- [ ] Run database setup: `node setup-company-requests.js`
- [ ] Verify table exists: `\dt company_requests;`
- [ ] Restart backend: `pm2 restart backend`
- [ ] Test rejection flow with Postman
- [ ] Test frontend dismiss functionality
- [ ] Check browser console for errors
- [ ] Verify dismissed records don't show in UI
- [ ] Confirm database audit trail preserved

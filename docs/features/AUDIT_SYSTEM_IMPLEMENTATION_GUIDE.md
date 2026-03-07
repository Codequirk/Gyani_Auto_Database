# Audit System & Soft Delete Implementation Guide

## Overview

This guide shows how to implement a complete audit system with soft delete functionality across your backend.

**Key Features:**
- ✅ Automatic audit field tracking (created_by, created_on, updated_by, updated_on)
- ✅ Soft delete instead of hard delete
- ✅ Restore functionality for deleted records
- ✅ Complete audit trail (who changed what, when, from where)
- ✅ Query builders that exclude deleted records by default
- ✅ Admin APIs to view/restore deleted items
- ✅ Audit statistics dashboard

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST HANDLER                          │
│                  (Controller Layer)                         │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─→ Extract adminId from req.admin
             └─→ Pass to model methods
                    │
┌────────────────────┴──────────────────────────────────────────┐
│              MODEL LAYER (Business Logic)                     │
│                                                               │
│  Model.create(data, adminId)                                 │
│    ├─→ prepareAuditFieldsForCreate(data, adminId)           │
│    ├─→ Insert into DB                                        │
│    └─→ logAuditTrail()                                       │
│                                                               │
│  Model.update(id, data, adminId)                             │
│    ├─→ Fetch old values                                      │
│    ├─→ prepareAuditFieldsForUpdate(data, adminId)           │
│    ├─→ Update in DB                                          │
│    └─→ logAuditTrail() with old/new values                  │
│                                                               │
│  Model.softDelete(id, adminId)                               │
│    ├─→ Set is_deleted = true                                 │
│    ├─→ Set updated_by = adminId                              │
│    └─→ logAuditTrail(action: 'DELETE')                      │
│                                                               │
│  Model.restore(id, adminId)                                  │
│    ├─→ Set is_deleted = false                                │
│    └─→ logAuditTrail(action: 'RESTORE')                     │
└──────────┬───────────────────────────────────────────────────┘
           │
┌──────────────────────────────────────────────────────────────┐
│            AUDIT UTILITIES (auditUtils.js)                   │
│                                                               │
│  - getAuditContext()         # Extract user info from req    │
│  - prepareAuditFieldsForCreate()  # Add create audit fields  │
│  - prepareAuditFieldsForUpdate()  # Add update audit fields  │
│  - queryActive()             # Exclude deleted records        │
│  - softDelete()              # Set is_deleted = true         │
│  - restoreRecord()           # Set is_deleted = false        │
│  - logAuditTrail()           # Write to audit_logs table     │
└──────────────────────────────────────────────────────────────┘
           │
┌──────────────────────────────────────────────────────────────┐
│                    DATABASE                                  │
│                                                               │
│  Main Tables:                                                │
│  ├─ companies                                                │
│  │  ├─ id (PK)                                               │
│  │  ├─ name, email, phone...                                │
│  │  ├─ created_by (FK → admins)                             │
│  │  ├─ created_on (timestamp)                               │
│  │  ├─ updated_by (FK → admins, nullable)                   │
│  │  ├─ updated_on (timestamp)                               │
│  │  └─ is_deleted (boolean, default false)                  │
│  │                                                           │
│  ├─ autos                                                    │
│  ├─ assignments                                              │
│  └─ ... (all main tables)                                    │
│                                                               │
│  Audit Table:                                                │
│  └─ audit_logs                                               │
│     ├─ id (PK)                                               │
│     ├─ entity_type (table name)                              │
│     ├─ entity_id (record id)                                │
│     ├─ action (CREATE, UPDATE, DELETE, RESTORE)             │
│     ├─ changed_fields (JSON array)                           │
│     ├─ old_values (JSON object)                              │
│     ├─ new_values (JSON object)                              │
│     ├─ changed_by (FK → admins)                              │
│     ├─ ip_address                                            │
│     ├─ user_agent                                            │
│     └─ created_on (timestamp)                                │
└──────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Audit Utilities

**File:** `backend/src/utils/auditUtils.js`

Already created. Provides:
- `getAuditContext(req)` - Extract user from request
- `prepareAuditFieldsForCreate(data, userId)` - Add created_by, created_on
- `prepareAuditFieldsForUpdate(data, userId)` - Add updated_by, updated_on
- `softDelete(table, id, userId)` - Soft delete
- `restoreRecord(table, id, userId)` - Restore
- `queryActive(table)` - Query excluding deleted
- `logAuditTrail(data)` - Log to audit_logs

---

## Step 2: Create Audit Middleware

**File:** `backend/src/middleware/auditMiddleware.js`

Already created. Attaches `req.auditContext` to every request with user info.

---

## Step 3: Create Database Migrations

### 3a. Create audit_logs table

**File:** `backend/src/migrations/020_create_audit_logs.js`

```javascript
exports.up = function (knex) {
  return knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary();
    table.string('entity_type').notNullable();
    table.uuid('entity_id').notNullable();
    table.string('action').notNullable(); // CREATE, UPDATE, DELETE, RESTORE
    table.json('changed_fields').nullable();
    table.json('old_values').nullable();
    table.json('new_values').nullable();
    table.uuid('changed_by').notNullable();
    table.string('ip_address').nullable();
    table.string('user_agent').nullable();
    table.timestamp('created_on').defaultTo(knex.fn.now());
    
    table.foreign('changed_by').references('id').inTable('admins').onDelete('SET NULL');
    table.index(['entity_type', 'entity_id']);
    table.index('action');
    table.index('created_on');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('audit_logs');
};
```

### 3b. Add audit fields to existing tables

For each table (companies, autos, assignments, etc.):

**File:** `backend/src/migrations/021_add_audit_fields_to_companies.js`

```javascript
exports.up = function (knex) {
  return knex.schema.alterTable('companies', (table) => {
    table.uuid('created_by').nullable();
    table.timestamp('created_on').defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('updated_on').defaultTo(knex.fn.now());
    table.boolean('is_deleted').defaultTo(false);
    
    table.foreign('created_by').references('id').inTable('admins').onDelete('SET NULL');
    table.foreign('updated_by').references('id').inTable('admins').onDelete('SET NULL');
    
    table.index('is_deleted');
    table.index(['is_deleted', 'created_on']);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('companies', (table) => {
    table.dropForeign('created_by');
    table.dropForeign('updated_by');
    table.dropColumn('created_by');
    table.dropColumn('created_on');
    table.dropColumn('updated_by');
    table.dropColumn('updated_on');
    table.dropColumn('is_deleted');
  });
};
```

Run migrations:
```bash
cd backend
npm run migrate
```

---

## Step 4: Update Model Classes

Update all models to use audit utilities.

**Pattern:**

```javascript
// OLD - No audit
class Company {
  static async create(data) {
    await db('companies').insert(data);
  }
}

// NEW - With audit
class Company {
  static async create(data, adminId) {
    const auditedData = prepareAuditFieldsForCreate(data, adminId);
    await db('companies').insert(auditedData);
    await logAuditTrail({
      entityType: 'companies',
      entityId: data.id,
      action: 'CREATE',
      newValues: auditedData,
      changedBy: adminId,
    });
  }

  static async softDelete(id, adminId) {
    await db('companies').where({ id }).update({
      is_deleted: true,
      updated_by: adminId,
      updated_on: new Date(),
    });
    await logAuditTrail({
      entityType: 'companies',
      entityId: id,
      action: 'DELETE',
      changedBy: adminId,
    });
  }

  static async restore(id, adminId) {
    await db('companies').where({ id }).update({
      is_deleted: false,
      updated_by: adminId,
      updated_on: new Date(),
    });
    await logAuditTrail({
      entityType: 'companies',
      entityId: id,
      action: 'RESTORE',
      changedBy: adminId,
    });
  }

  // Queries automatically exclude deleted
  static async findAll() {
    return queryActive('companies');
  }
}
```

---

## Step 5: Update Controllers

Pass adminId to model methods:

```javascript
// OLD - No audit
exports.createCompany = async (req, res, next) => {
  const company = await Company.create(req.body);
  res.json(company);
};

// NEW - With audit
exports.createCompany = async (req, res, next) => {
  const adminId = req.admin?.id;
  const company = await Company.create(req.body, adminId);
  res.json({ message: 'Created', company });
};

// NEW - Delete endpoint (soft delete)
exports.deleteCompany = async (req, res, next) => {
  const adminId = req.admin?.id;
  await Company.softDelete(req.params.id, adminId);
  res.json({ message: 'Deleted (can be restored)' });
};

// NEW - Restore endpoint
exports.restoreCompany = async (req, res, next) => {
  const adminId = req.admin?.id;
  const company = await Company.restore(req.params.id, adminId);
  res.json({ message: 'Restored', company });
};

// NEW - Audit history endpoint
exports.getAuditHistory = async (req, res, next) => {
  const history = await Company.getAuditHistory(req.params.id);
  res.json({ audit_history: history });
};
```

---

## Step 6: Update Routes

Add new endpoints for audit functionality:

```javascript
router.delete('/:id', authMiddleware, companyController.deleteCompany);
router.post('/:id/restore', authMiddleware, companyController.restoreCompany);
router.get('/:id/audit-history', authMiddleware, companyController.getAuditHistory);
router.get('/deleted', authMiddleware, companyController.listDeletedCompanies);
```

---

## Step 7: Register Middleware in Main App

**File:** `backend/src/index.js`

```javascript
const auditMiddleware = require('./middleware/auditMiddleware');

// Add early in middleware chain
app.use(auditMiddleware);

// Then add auth middleware
app.use(authMiddleware);

// Then mount routes
app.use('/api/companies', require('./routes/companyRoutes'));
```

---

## API Examples

### Create with Audit
```bash
POST /api/companies
{
  "name": "ABC Corp",
  "email": "contact@abccorp.com"
}

Response:
{
  "company": {
    "id": "uuid",
    "name": "ABC Corp",
    "created_by": "admin-id",
    "created_on": "2026-02-13T10:00:00Z",
    "updated_by": "admin-id",
    "updated_on": "2026-02-13T10:00:00Z",
    "is_deleted": false
  }
}
```

### Update with Audit
```bash
PATCH /api/companies/uuid
{
  "status": "INACTIVE"
}

Audit Log:
{
  "action": "UPDATE",
  "changed_fields": ["status"],
  "old_values": { "status": "ACTIVE" },
  "new_values": { "status": "INACTIVE" },
  "changed_by": "admin-id"
}
```

### Soft Delete
```bash
DELETE /api/companies/uuid

Response:
{
  "message": "Company deleted (soft delete - can be restored)",
  "success": true
}

Database:
is_deleted = true, updated_by = admin-id, updated_on = now
```

### Restore
```bash
POST /api/companies/uuid/restore

Response:
{
  "message": "Company restored",
  "company": {
    "id": "uuid",
    "is_deleted": false
  }
}
```

### Get Audit History
```bash
GET /api/companies/uuid/audit-history

Response:
{
  "audit_history": [
    {
      "action": "CREATE",
      "changed_by": "admin-1",
      "changed_at": "2026-02-13T10:00:00Z",
      "new_values": { ... }
    },
    {
      "action": "UPDATE",
      "changed_by": "admin-1",
      "changed_at": "2026-02-13T11:30:00Z",
      "changed_fields": ["status"],
      "old_values": { "status": "ACTIVE" },
      "new_values": { "status": "INACTIVE" }
    }
  ]
}
```

---

## Implementation Checklist

- [ ] Create auditUtils.js
- [ ] Create auditMiddleware.js
- [ ] Create audit_logs table migration
- [ ] Add audit fields to all main table migrations
- [ ] Run migrations: `npm run migrate`
- [ ] Update Company model to use auditUtils
- [ ] Update other models (Auto, Assignment, etc.)
- [ ] Update company controller
- [ ] Update other controllers
- [ ] Update routes with restore/audit endpoints
- [ ] Add auditMiddleware to index.js
- [ ] Test:
  - [ ] Create record → verify audit fields set
  - [ ] Update record → verify audit log created
  - [ ] Soft delete → verify is_deleted = true
  - [ ] Restore → verify is_deleted = false
  - [ ] Get audit history → verify all changes logged

---

## Best Practices

1. **Always use soft delete** - Don't call `hardDelete()` unless absolutely necessary
2. **Pass adminId to models** - Never assume user in model layer
3. **Log all changes** - Even updates with no changes should be logged
4. **Clean old logs periodically** - Archive audit logs older than 1 year
5. **Use transactions for related deletes** - Delete parent and children atomically
6. **Index audit columns** - Add indexes on entity_id, created_on, is_deleted
7. **Encrypt sensitive audit data** - If storing passwords or tokens
8. **Archive audit logs** - Move to separate table after 6 months

---

## Performance Tips

1. Add indexes:
```sql
CREATE INDEX idx_is_deleted ON companies(is_deleted);
CREATE INDEX idx_created_on ON companies(created_on);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

2. Partition large tables by `created_on` to improve query performance

3. Use read replicas for audit queries to avoid blocking main DB

4. Consider materialized views for common audit queries

---

## Troubleshooting

**Q: Why are deleted records still showing?**
A: Check if you're using `queryAll()` instead of `queryActive()`. Always use `queryActive()` in find/list methods.

**Q: Audit logs not being created?**
A: Ensure:
1. audit_logs table exists
2. logAuditTrail() called in model methods
3. No errors in audit middleware

**Q: Can't restore deleted record?**
A: Check if record exists in DB with is_deleted=true. Use `queryAll()` to find it.

**Q: Audit fields are NULL?**
A: Ensure adminId is being passed from controller to model method.

---

## Security Considerations

1. Only admins should see audit history → Add role check
2. Only admins should see deleted records → Add permission check
3. Don't log passwords or sensitive data → Exclude from old_values
4. Verify user hasn't changed → Check IP, user agent, timestamp
5. Archive audit logs securely → Encrypt backups


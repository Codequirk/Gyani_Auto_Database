# Audit System - Quick Reference

## Files Created

1. **`backend/src/utils/auditUtils.js`**
   - Core audit utilities (create, update, delete, restore, query builders)
   - Import and use in models

2. **`backend/src/middleware/auditMiddleware.js`**
   - Captures user context from request
   - Attach early in middleware chain

3. **`backend/src/migrations/MIGRATION_TEMPLATE_audit_fields.js`**
   - Template for adding/removing audit fields
   - Copy and modify for each table

4. **`backend/src/models/CompanyWithAudit.example.js`**
   - Example model implementation
   - Shows all CRUD operations with audit

5. **`backend/src/controllers/companyControllerWithAudit.example.js`**
   - Example controller implementation
   - Shows all endpoints with audit context

6. **`backend/src/routes/companyRoutesWithAudit.example.js`**
   - Example routes with all CRUD + audit endpoints
   - Includes request/response examples

7. **`AUDIT_SYSTEM_IMPLEMENTATION_GUIDE.md`**
   - Complete step-by-step implementation guide
   - Architecture diagrams and best practices

8. **`AUDIT_SYSTEM_SQL_SCHEMA.sql`**
   - SQL schema for all tables with audit fields
   - Useful queries and monitoring scripts

---

## Implementation Checklist (3-4 hours)

### Phase 1: Setup (30 min)
- [ ] Copy `auditUtils.js` to `backend/src/utils/`
- [ ] Copy `auditMiddleware.js` to `backend/src/middleware/`
- [ ] Review MIGRATION_TEMPLATE_audit_fields.js

### Phase 2: Database Migrations (45 min)
- [ ] Create migration for audit_logs table
- [ ] Create migrations for each main table (companies, autos, assignments, etc.)
  - [ ] companies
  - [ ] autos
  - [ ] assignments
  - [ ] company_tickets
  - [ ] auto_monthly_payments
  - [ ] areas
  - [ ] admins
- [ ] Run migrations: `npm run migrate`
- [ ] Verify schema in database

### Phase 3: Model Updates (60 min)
- [ ] Update Company model with audit support
- [ ] Update Auto model
- [ ] Update Assignment model
- [ ] Update CompanyTicket model
- [ ] Update AutoMonthlyPayment model
- [ ] Update Area model
- [ ] Update Admin model
- [ ] Pattern: Add create/update/softDelete/restore methods

### Phase 4: Controller Updates (45 min)
- [ ] Update company controller with audit
- [ ] Update auto controller
- [ ] Update assignment controller
- [ ] Add delete (soft delete) endpoints
- [ ] Add restore endpoints
- [ ] Add audit history endpoints

### Phase 5: Routes & Middleware (30 min)
- [ ] Update company routes
- [ ] Update other routes
- [ ] Add `/deleted` endpoint
- [ ] Add `/:id/restore` endpoint
- [ ] Add `/:id/audit-history` endpoint
- [ ] Add auditMiddleware to main index.js

### Phase 6: Testing (45 min)
- [ ] Test create with audit fields
- [ ] Test update with audit log
- [ ] Test soft delete (is_deleted = true)
- [ ] Test restore (is_deleted = false)
- [ ] Test audit history retrieval
- [ ] Test list (excludes deleted)
- [ ] Test listDeleted (shows deleted)

---

## Quick Code Snippets

### Add to Main App (index.js)

```javascript
const auditMiddleware = require('./middleware/auditMiddleware');

// Add early in middleware chain
app.use(auditMiddleware);

// Then auth
app.use(authMiddleware);

// Then routes
app.use('/api/companies', require('./routes/companyRoutes'));
```

### Update Model Example

```javascript
// Import utilities
const {
  prepareAuditFieldsForCreate,
  prepareAuditFieldsForUpdate,
  softDelete,
  queryActive,
  logAuditTrail,
} = require('../utils/auditUtils');

// Create with audit
static async create(data, adminId) {
  const id = uuidv4();
  const auditedData = prepareAuditFieldsForCreate({ id, ...data }, adminId);
  await db('companies').insert(auditedData);
  await logAuditTrail({
    entityType: 'companies',
    entityId: id,
    action: 'CREATE',
    newValues: auditedData,
    changedBy: adminId,
  });
  return this.findById(id);
}

// Update with audit
static async update(id, data, adminId) {
  const oldRecord = await this.findById(id);
  const auditedData = prepareAuditFieldsForUpdate(data, adminId);
  await db('companies').where({ id }).update(auditedData);
  await logAuditTrail({
    entityType: 'companies',
    entityId: id,
    action: 'UPDATE',
    changedFields: Object.keys(data),
    oldValues: oldRecord,
    newValues: data,
    changedBy: adminId,
  });
  return this.findById(id);
}

// Soft delete
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

// Queries exclude deleted by default
static async findAll() {
  return queryActive('companies').orderBy('created_on', 'desc');
}

// Get deleted records
static async findDeleted() {
  return db('companies').where({ is_deleted: true });
}

// Restore
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
  return this.findById(id);
}
```

### Update Controller Example

```javascript
exports.createCompany = async (req, res, next) => {
  try {
    const adminId = req.admin?.id;
    const company = await Company.create(req.body, adminId);
    res.status(201).json({ message: 'Created', company });
  } catch (error) {
    next(error);
  }
};

exports.deleteCompany = async (req, res, next) => {
  try {
    const adminId = req.admin?.id;
    await Company.softDelete(req.params.id, adminId);
    res.json({ message: 'Deleted (can be restored)' });
  } catch (error) {
    next(error);
  }
};

exports.restoreCompany = async (req, res, next) => {
  try {
    const adminId = req.admin?.id;
    const company = await Company.restore(req.params.id, adminId);
    res.json({ message: 'Restored', company });
  } catch (error) {
    next(error);
  }
};

exports.getAuditHistory = async (req, res, next) => {
  try {
    const history = await Company.getAuditHistory(req.params.id);
    res.json({ audit_history: history });
  } catch (error) {
    next(error);
  }
};
```

### Add Routes

```javascript
router.post('/', authMiddleware, companyController.createCompany);
router.patch('/:id', authMiddleware, companyController.updateCompany);
router.delete('/:id', authMiddleware, companyController.deleteCompany);
router.post('/:id/restore', authMiddleware, companyController.restoreCompany);
router.get('/:id/audit-history', authMiddleware, companyController.getAuditHistory);
router.get('/deleted', authMiddleware, companyController.listDeletedCompanies);
```

---

## Key Points

### Audit Fields (auto-managed)
- **created_by**: Admin who created the record
- **created_on**: When record was created
- **updated_by**: Admin who last updated
- **updated_on**: When last updated
- **is_deleted**: Boolean flag for soft delete

### Always Use
- `queryActive(table)` for normal queries (excludes deleted)
- `prepareAuditFieldsForCreate()` when inserting
- `prepareAuditFieldsForUpdate()` when updating
- Pass `adminId` to all model methods
- Call `logAuditTrail()` after each change

### Never Use
- `db('table').delete()` - use softDelete() instead
- `db('table').insert(data)` - use prepareAuditFieldsForCreate() first
- `db('table').update(data)` - use prepareAuditFieldsForUpdate() first

### Audit History Shows
- When created and by whom
- All modifications with old/new values
- When deleted and by whom
- When restored and by whom

---

## Testing Commands

```bash
# Create company
curl -X POST http://localhost:5000/api/companies \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"Test","email":"test@example.com"}'

# Update company
curl -X PATCH http://localhost:5000/api/companies/uuid \
  -H "Authorization: Bearer TOKEN" \
  -d '{"status":"INACTIVE"}'

# Soft delete
curl -X DELETE http://localhost:5000/api/companies/uuid \
  -H "Authorization: Bearer TOKEN"

# Restore
curl -X POST http://localhost:5000/api/companies/uuid/restore \
  -H "Authorization: Bearer TOKEN"

# Get audit history
curl http://localhost:5000/api/companies/uuid/audit-history \
  -H "Authorization: Bearer TOKEN"

# List deleted
curl http://localhost:5000/api/companies/deleted \
  -H "Authorization: Bearer TOKEN"
```

---

## Database Backup Strategy

```bash
# Backup before migrations
mysqldump -u root -p database_name > backup_$(date +%Y%m%d).sql

# Run migrations
npm run migrate

# If something goes wrong, restore
mysql -u root -p database_name < backup_20260213.sql
```

---

## Performance Tuning

```sql
-- Add indexes after migration
CREATE INDEX idx_is_deleted ON companies(is_deleted);
CREATE INDEX idx_created_on ON companies(created_on);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Analyze table
ANALYZE TABLE companies;
ANALYZE TABLE audit_logs;

-- Archive old audit logs (yearly)
DELETE FROM audit_logs 
WHERE created_on < DATE_SUB(NOW(), INTERVAL 365 DAY);
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Deleted records still showing | Use `queryActive()` instead of raw `db()` query |
| Audit fields are NULL | Pass `adminId` to model method |
| Audit logs not created | Check `logAuditTrail()` call in model |
| Can't restore | Use `queryAll()` to find deleted, then `restore()` |
| Query slow | Add indexes on `is_deleted`, `created_on` |

---

## Next Steps

1. Review the example files
2. Start with one table (e.g., Company)
3. Add migrations
4. Update model
5. Update controller
6. Update routes
7. Test thoroughly
8. Repeat for other tables
9. Monitor audit logs in production

Good luck! 🚀

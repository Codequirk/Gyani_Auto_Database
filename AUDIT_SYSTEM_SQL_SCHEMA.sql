/**
 * SQL SCHEMA EXAMPLES - Audit Fields in All Tables
 * 
 * This file shows the complete database schema with audit fields
 * for all main tables. Use these as reference when running migrations.
 */

-- ============================================
-- AUDIT_LOGS TABLE (for tracking all changes)
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What changed
  entity_type VARCHAR(255) NOT NULL,        -- Table name (companies, autos, etc)
  entity_id UUID NOT NULL,                  -- Record ID
  action VARCHAR(50) NOT NULL,              -- CREATE, UPDATE, DELETE, RESTORE
  
  -- Change details
  changed_fields JSON,                      -- Array of field names that changed
  old_values JSON,                          -- Previous values
  new_values JSON,                          -- New values
  
  -- Who made the change
  changed_by UUID NOT NULL REFERENCES admins(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),                   -- IPv4 or IPv6
  user_agent TEXT,
  
  -- When
  created_on TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_action (action),
  INDEX idx_date (created_on)
);

-- ============================================
-- COMPANIES TABLE (with audit fields)
-- ============================================
CREATE TABLE companies (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business Data
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  address TEXT,
  area_id UUID REFERENCES areas(id),
  status VARCHAR(50) DEFAULT 'ACTIVE',      -- ACTIVE, INACTIVE
  
  -- Audit Fields
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_on TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_on TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Indexes
  INDEX idx_email (email),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_created_on (created_on),
  INDEX idx_soft_delete (is_deleted, created_on)
);

-- ============================================
-- AUTOS TABLE (with audit fields)
-- ============================================
CREATE TABLE autos (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business Data
  auto_no VARCHAR(50) UNIQUE NOT NULL,
  owner_name VARCHAR(255),
  driver_phone VARCHAR(20),
  area_id UUID REFERENCES areas(id),
  status VARCHAR(50),                        -- IDLE, ACTIVE, PREBOOKED
  
  -- Audit Fields
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_on TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_on TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Indexes
  INDEX idx_auto_no (auto_no),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_status (status),
  INDEX idx_created_on (created_on)
);

-- ============================================
-- ASSIGNMENTS TABLE (with audit fields)
-- ============================================
CREATE TABLE assignments (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business Data
  auto_id UUID NOT NULL REFERENCES autos(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50),                        -- ACTIVE, COMPLETED, PENDING
  cost_per_day DECIMAL(10, 2),
  
  -- Audit Fields
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_on TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_on TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Indexes
  INDEX idx_auto_id (auto_id),
  INDEX idx_company_id (company_id),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_date_range (start_date, end_date),
  INDEX idx_created_on (created_on)
);

-- ============================================
-- AREAS TABLE (with audit fields)
-- ============================================
CREATE TABLE areas (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business Data
  name VARCHAR(255) NOT NULL UNIQUE,
  pin_code VARCHAR(10),
  description TEXT,
  
  -- Audit Fields
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_on TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_on TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Indexes
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_created_on (created_on)
);

-- ============================================
-- AUTO_MONTHLY_PAYMENTS TABLE (with audit)
-- ============================================
CREATE TABLE auto_monthly_payments (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business Data
  auto_id UUID NOT NULL REFERENCES autos(id),
  company_id UUID REFERENCES companies(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_cost DECIMAL(10, 2) NOT NULL,
  advance_payment DECIMAL(10, 2),
  
  -- Audit Fields
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_on TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_on TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Indexes
  INDEX idx_auto_id (auto_id),
  INDEX idx_company_id (company_id),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_date_range (start_date, end_date),
  INDEX idx_created_on (created_on)
);

-- ============================================
-- COMPANY_TICKETS TABLE (with audit fields)
-- ============================================
CREATE TABLE company_tickets (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business Data
  company_id UUID NOT NULL REFERENCES companies(id),
  autos_required INT DEFAULT 0,
  days_required INT DEFAULT 0,
  area_id UUID REFERENCES areas(id),
  start_date DATE,
  ticket_status VARCHAR(50),                 -- PENDING, APPROVED, REJECTED
  
  -- Audit Fields
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_on TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_on TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Indexes
  INDEX idx_company_id (company_id),
  INDEX idx_status (ticket_status),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_created_on (created_on)
);

-- ============================================
-- ADMINS TABLE (with audit fields)
-- ============================================
CREATE TABLE admins (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business Data
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50),                          -- SUPER_ADMIN, ADMIN
  
  -- Audit Fields
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_on TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_on TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Indexes
  INDEX idx_email (email),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_created_on (created_on)
);

-- ============================================
-- USEFUL QUERIES
-- ============================================

-- Get all active companies (automatically excludes deleted)
SELECT * FROM companies WHERE is_deleted = FALSE ORDER BY created_on DESC;

-- Get deleted companies (for restore/purge operations)
SELECT * FROM companies WHERE is_deleted = TRUE ORDER BY updated_on DESC;

-- Get audit trail for a specific company
SELECT 
  action,
  changed_fields,
  old_values,
  new_values,
  changed_by,
  created_on
FROM audit_logs
WHERE entity_type = 'companies' 
  AND entity_id = 'company-uuid'
ORDER BY created_on DESC;

-- Get all changes by a specific admin
SELECT 
  entity_type,
  entity_id,
  action,
  created_on
FROM audit_logs
WHERE changed_by = 'admin-uuid'
ORDER BY created_on DESC;

-- Get daily activity summary
SELECT 
  DATE(created_on) as date,
  action,
  COUNT(*) as change_count,
  COUNT(DISTINCT entity_id) as unique_entities
FROM audit_logs
GROUP BY DATE(created_on), action
ORDER BY date DESC;

-- Find who created a record and all modifications
SELECT 
  'CREATE' as event,
  created_by as performed_by,
  created_on as performed_on,
  NULL as changed_fields
FROM companies
WHERE id = 'company-uuid'
UNION ALL
SELECT 
  action,
  changed_by,
  created_on,
  changed_fields
FROM audit_logs
WHERE entity_type = 'companies'
  AND entity_id = 'company-uuid'
ORDER BY performed_on DESC;

-- Soft delete cascade (soft delete all related records)
UPDATE assignments 
SET is_deleted = TRUE, updated_on = NOW()
WHERE company_id = 'company-uuid';

UPDATE auto_monthly_payments
SET is_deleted = TRUE, updated_on = NOW()
WHERE company_id = 'company-uuid';

UPDATE companies
SET is_deleted = TRUE, updated_on = NOW()
WHERE id = 'company-uuid';

-- Restore cascade
UPDATE companies
SET is_deleted = FALSE, updated_on = NOW()
WHERE id = 'company-uuid';

UPDATE assignments
SET is_deleted = FALSE, updated_on = NOW()
WHERE company_id = 'company-uuid';

UPDATE auto_monthly_payments
SET is_deleted = FALSE, updated_on = NOW()
WHERE company_id = 'company-uuid';

-- Audit log retention (keep last 1 year of logs, archive older)
DELETE FROM audit_logs
WHERE created_on < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Performance: Analyze table statistics
ANALYZE TABLE audit_logs;
ANALYZE TABLE companies;

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Which users are most active?
SELECT 
  changed_by,
  COUNT(*) as total_changes,
  COUNT(DISTINCT entity_id) as unique_records,
  MAX(created_on) as last_activity
FROM audit_logs
WHERE created_on > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY changed_by
ORDER BY total_changes DESC;

-- What's the most frequently modified entity type?
SELECT 
  entity_type,
  COUNT(*) as total_changes,
  COUNT(DISTINCT entity_id) as unique_records,
  COUNT(DISTINCT action) as action_types
FROM audit_logs
WHERE created_on > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY entity_type
ORDER BY total_changes DESC;

-- Records deleted in last 7 days
SELECT 
  entity_type,
  entity_id,
  changed_by,
  created_on
FROM audit_logs
WHERE action = 'DELETE'
  AND created_on > DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY created_on DESC;

-- Large bulk operations (more than 5 changes in 1 minute)
SELECT 
  changed_by,
  MIN(created_on) as operation_start,
  MAX(created_on) as operation_end,
  COUNT(*) as total_changes,
  COUNT(DISTINCT entity_id) as entities_affected
FROM audit_logs
GROUP BY changed_by, DATE(created_on), HOUR(created_on), MINUTE(created_on)
HAVING COUNT(*) > 5
ORDER BY operation_start DESC;

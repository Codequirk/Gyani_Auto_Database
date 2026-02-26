-- Migration: Add Google OAuth support to users table
-- Date: 2026-02-13
-- Description: Add columns for Google authentication and profile completion tracking

-- ============================================================================
-- ALTER TABLE for existing users table
-- ============================================================================

ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE users ADD COLUMN is_profile_complete BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
CREATE INDEX idx_users_profile_complete ON users(is_profile_complete);

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================
-- ALTER TABLE users DROP COLUMN google_id;
-- ALTER TABLE users DROP COLUMN auth_provider;
-- ALTER TABLE users DROP COLUMN is_profile_complete;
-- ALTER TABLE users DROP COLUMN created_at;
-- ALTER TABLE users DROP COLUMN updated_at;
-- DROP INDEX idx_users_google_id ON users;
-- DROP INDEX idx_users_email ON users;
-- DROP INDEX idx_users_auth_provider ON users;
-- DROP INDEX idx_users_profile_complete ON users;

-- ============================================================================
-- New Users Table Schema (if creating from scratch)
-- ============================================================================

/*
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  contact_person VARCHAR(255),
  company_name VARCHAR(255),
  phone_number VARCHAR(20),
  google_id VARCHAR(255) UNIQUE,
  auth_provider VARCHAR(50) DEFAULT 'local',
  is_profile_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_google_id (google_id),
  INDEX idx_auth_provider (auth_provider),
  INDEX idx_profile_complete (is_profile_complete)
);
*/

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check schema after migration
DESCRIBE users;

-- Count users by auth provider
SELECT auth_provider, COUNT(*) as total FROM users GROUP BY auth_provider;

-- Find incomplete profiles
SELECT id, email, contact_person, company_name, is_profile_complete 
FROM users 
WHERE is_profile_complete = false AND auth_provider = 'google';

-- Check for users without google_id (local auth)
SELECT COUNT(*) as local_auth_users 
FROM users 
WHERE auth_provider = 'local' AND google_id IS NULL;

-- Find duplicate emails (safety check)
SELECT email, COUNT(*) as count 
FROM users 
GROUP BY email 
HAVING count > 1;

-- Add dismissed_by_company column to company_tickets if it doesn't exist
ALTER TABLE company_tickets
ADD COLUMN IF NOT EXISTS dismissed_by_company BOOLEAN DEFAULT FALSE;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_company_tickets_company_status_dismissed 
ON company_tickets(company_id, ticket_status, dismissed_by_company);

-- Confirm the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'company_tickets' 
ORDER BY ordinal_position;

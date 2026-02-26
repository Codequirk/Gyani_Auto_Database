/**
 * Migration: Create CompanyUser records for pre-existing companies
 * 
 * This migration handles backward compatibility for companies that were created
 * before the CompanyUser system was implemented. It creates CompanyUser records
 * for all existing companies so they can login via email/password.
 * 
 * Migration date: December 2025
 */

exports.up = async function(knex) {
  console.log('[MIGRATION] Starting: Create CompanyUser records for existing companies');

  try {
    // Get all companies that have been requested/approved/active but don't have a CompanyUser
    const companiesWithoutUsers = await knex('companies')
      .leftJoin('company_users', 'companies.email', '=', 'company_users.email')
      .where('companies.deleted_at', null)
      .whereNotNull('companies.password_hash') // Only companies with password_hash
      .whereNull('company_users.id') // Don't have a CompanyUser record
      .select('companies.*');

    console.log(`  Found ${companiesWithoutUsers.length} companies without CompanyUser records`);

    if (companiesWithoutUsers.length === 0) {
      console.log('  ✓ No companies need migration');
      return;
    }

    // Create CompanyUser records for each company
    const companyUsersToCreate = companiesWithoutUsers.map(company => ({
      id: knex.raw('gen_random_uuid()'),
      email: company.email,
      password: company.password_hash, // Use existing password_hash
      is_verified: true, // Mark as verified since companies already exist
      verified_at: company.created_at, // Use company creation time as verification time
      company_name: company.name,
      phone_number: company.phone_number,
      company_person: company.contact_person,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: company.deleted_at, // Match company soft delete state
    }));

    // Batch insert (handle duplicates gracefully if email uniqueness causes issues)
    for (const user of companyUsersToCreate) {
      try {
        await knex('company_users').insert(user);
        console.log(`  ✓ Created CompanyUser for: ${user.email}`);
      } catch (err) {
        // If email already exists, skip it (shouldn't happen but be safe)
        if (err.code === '23505') { // Unique constraint violation
          console.log(`  ⚠ CompanyUser already exists for: ${user.email}`);
        } else {
          throw err;
        }
      }
    }

    console.log(`  ✓ Successfully created ${companyUsersToCreate.length} CompanyUser records`);
  } catch (error) {
    console.error('[MIGRATION] Error creating CompanyUser records:', error);
    throw error;
  }
};

exports.down = async function(knex) {
  console.log('[MIGRATION] Rolling back: Removing CompanyUser records created for existing companies');

  try {
    // Find CompanyUsers that correspond to Companies (via email match)
    const companyEmails = await knex('companies')
      .where('deleted_at', null)
      .select('email');

    const emails = companyEmails.map(c => c.email);

    if (emails.length > 0) {
      // Soft delete CompanyUser records that match company emails
      await knex('company_users')
        .whereIn('email', emails)
        .update({
          deleted_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        });

      console.log(`  ✓ Soft-deleted ${emails.length} CompanyUser records`);
    } else {
      console.log('  ✓ No CompanyUser records to rollback');
    }
  } catch (error) {
    console.error('[MIGRATION] Error rolling back:', error);
    throw error;
  }
};

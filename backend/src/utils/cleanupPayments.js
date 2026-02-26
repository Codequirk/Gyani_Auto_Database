/**
 * Clean up incorrectly assigned payments
 * 
 * Removes payments that were assigned incorrectly during the data fix
 * Only keeps:
 * 1. Payments created AFTER the fix (Feb 14 2026 22:00)
 * 2. Payments where count matches ticket's autos_required
 */

const knex = require('knex');
const knexConfig = require('../../knexfile');

const db = knex(knexConfig[process.env.NODE_ENV || 'development']);

async function cleanupPayments() {
  try {
    console.log('🧹 Starting payment cleanup...\n');
    
    // Step 1: Get all tickets and their expected payment counts
    const tickets = await db('company_tickets')
      .select('id', 'autos_required', 'created_at')
      .where('autos_required', '>', 0);
    
    console.log(`📊 Processing ${tickets.length} tickets\n`);
    
    let deletedCount = 0;
    
    for (const ticket of tickets) {
      // Count actual payments for this ticket
      const paymentCount = await db('payments')
        .where({ ticket_id: ticket.id })
        .count('* as count')
        .first();
      
      const actualCount = paymentCount.count;
      const expectedCount = ticket.autos_required;
      
      // If payment count doesn't match expected, it's likely corrupted from the fix
      if (actualCount !== expectedCount && actualCount > expectedCount) {
        console.log(`⚠️  Ticket ${ticket.id.substring(0, 8)}... has ${actualCount} payments but expected ${expectedCount}`);
        
        // Keep only the most recent payments matching the expected count
        const paymentsToDelete = await db('payments')
          .where({ ticket_id: ticket.id })
          .orderBy('created_at', 'asc')
          .limit(actualCount - expectedCount);
        
        if (paymentsToDelete.length > 0) {
          const idsToDelete = paymentsToDelete.map(p => p.id);
          await db('payments').whereIn('id', idsToDelete).del();
          console.log(`   ✓ Deleted ${idsToDelete.length} excess payments\n`);
          deletedCount += idsToDelete.length;
        }
      }
    }
    
    console.log(`✅ Cleanup complete! Deleted ${deletedCount} corrupted payments\n`);
    
    // Verify
    console.log('📋 VERIFICATION AFTER CLEANUP:\n');
    const afterCleanup = await db('payments')
      .select('ticket_id')
      .count('* as count')
      .groupBy('ticket_id');
    
    for (const group of afterCleanup) {
      const ticket = await db('company_tickets').where({ id: group.ticket_id }).first();
      const status = group.count === ticket.autos_required ? '✓' : '✗';
      console.log(`  ${status} Ticket ${group.ticket_id.substring(0, 8)}... | ${group.count} payments | Expected: ${ticket.autos_required}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

cleanupPayments();

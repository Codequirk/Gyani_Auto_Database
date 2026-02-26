/**
 * Fix Payment Ticket IDs - IMPROVED VERSION
 * 
 * This script fixes old payment records that were created with assignment IDs
 * instead of ticket IDs. It updates all payments to have the correct ticket_id
 * by matching payments to tickets based on timing.
 * 
 * Usage: node src/utils/fixPaymentTicketIds.js
 */

const knex = require('knex');
const knexConfig = require('../../knexfile');

const db = knex(knexConfig[process.env.NODE_ENV || 'development']);

async function fixPaymentTicketIds() {
  try {
    console.log('🔧 Starting improved payment ticket_id fix...\n');
    
    // Step 1: Get all payments that need fixing
    const paymentsToFix = await db('payments')
      .whereNull('ticket_id')
      .orWhereRaw('ticket_id NOT IN (SELECT id FROM company_tickets)');
    
    console.log(`⚠️  Found ${paymentsToFix.length} payments to fix\n`);
    
    if (paymentsToFix.length === 0) {
      console.log('✅ All payments already have correct ticket_ids!\n');
      await db.destroy();
      return;
    }
    
    // Step 2: Fix each payment by matching it to the correct ticket
    let fixedCount = 0;
    let failedCount = 0;
    
    for (const payment of paymentsToFix) {
      try {
        // Find the assignment for this payment
        const assignment = await db('assignments')
          .where({ auto_id: payment.auto_id, company_id: payment.company_id })
          .first();
        
        if (!assignment) {
          console.warn(`⚠️  No assignment found for payment ${payment.id}`);
          failedCount++;
          continue;
        }
        
        // Find the ticket that was active during this assignment's date range
        // Match by: same company, created_at closest to assignment date but before it
        const matchedTicket = await db('company_tickets')
          .where({ company_id: payment.company_id })
          .where('created_at', '<=', assignment.start_date || new Date())
          .orderBy('created_at', 'desc')
          .first();
        
        if (!matchedTicket) {
          console.warn(`⚠️  No matching ticket found for payment ${payment.id}`);
          failedCount++;
          continue;
        }
        
        // Update the payment with the matched ticket_id
        await db('payments')
          .where({ id: payment.id })
          .update({ ticket_id: matchedTicket.id });
        
        console.log(`✓ Payment ${payment.id.substring(0, 8)}... → Ticket ${matchedTicket.id.substring(0, 8)}...`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ Error fixing payment ${payment.id}:`, error.message);
        failedCount++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} payment records`);
    if (failedCount > 0) {
      console.log(`⚠️  Failed to fix ${failedCount} payments`);
    }
    
    // Step 3: Verify the fix
    const validPayments = await db('payments')
      .where(db.raw('ticket_id IN (SELECT id FROM company_tickets)'))
      .count('* as count')
      .first();
    
    const invalidPayments = await db('payments')
      .where(db.raw('ticket_id NOT IN (SELECT id FROM company_tickets)'))
      .count('* as count')
      .first();
    
    console.log(`\n📊 Verification:`);
    console.log(`   ✓ Valid payments: ${validPayments.count}`);
    console.log(`   ✗ Invalid payments: ${invalidPayments.count}\n`);
    
    console.log('🎉 Payment ticket_id fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing payments:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run the fix
fixPaymentTicketIds();

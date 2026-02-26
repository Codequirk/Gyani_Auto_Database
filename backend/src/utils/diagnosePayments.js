/**
 * Diagnostic script to check payment and ticket data
 */

const knex = require('knex');
const knexConfig = require('../../knexfile');

const db = knex(knexConfig[process.env.NODE_ENV || 'development']);

async function diagnosePayments() {
  try {
    console.log('📊 PAYMENT DATA DIAGNOSTIC\n');
    
    // Get all company tickets
    const tickets = await db('company_tickets').select('id', 'company_id', 'autos_required', 'created_at').orderBy('created_at', 'desc');
    console.log(`Found ${tickets.length} tickets:\n`);
    tickets.forEach((t, i) => {
      console.log(`  ${i+1}. Ticket ${t.id.substring(0, 8)}... | Company ${t.company_id.substring(0, 8)}... | Autos: ${t.autos_required} | Created: ${t.created_at}`);
    });
    
    // Get payment distribution by ticket
    console.log('\n📋 PAYMENT DISTRIBUTION BY TICKET:\n');
    const paymentsByTicket = await db('payments')
      .select('ticket_id')
      .count('* as count')
      .groupBy('ticket_id')
      .orderBy('count', 'desc');
    
    for (const group of paymentsByTicket) {
      const ticket = await db('company_tickets').where({ id: group.ticket_id }).first();
      console.log(`  Ticket ${group.ticket_id.substring(0, 8)}... | ${group.count} payments | Expected autos: ${ticket?.autos_required || 'N/A'}`);
    }
    
    // Sample payment records
    console.log('\n🔍 SAMPLE PAYMENTS (First 10):\n');
    const payments = await db('payments')
      .select('id', 'ticket_id', 'auto_id', 'company_id', 'cost_per_day', 'total_cost', 'created_at')
      .limit(10)
      .orderBy('created_at', 'desc');
    
    payments.forEach((p, i) => {
      console.log(`  ${i+1}. Payment ${p.id.substring(0, 8)}...`);
      console.log(`     Ticket: ${p.ticket_id.substring(0, 8)}...`);
      console.log(`     Cost: ₹${p.cost_per_day}/day → Total: ₹${p.total_cost}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

diagnosePayments();

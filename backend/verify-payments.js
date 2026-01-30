const db = require('./src/models/db');

async function verifyPayments() {
  try {
    console.log('\n=== PAYMENT SYSTEM VERIFICATION ===\n');
    
    // Check if payments table exists
    const hasTable = await db.schema.hasTable('payments');
    console.log(`✓ Payments table exists: ${hasTable}`);
    
    if (hasTable) {
      // Get table columns
      const columns = await db('payments').columnInfo();
      console.log('\nTable columns:');
      Object.keys(columns).forEach(col => {
        console.log(`  - ${col}`);
      });
      
      // Count payments
      const paymentCount = await db('payments').count('* as count').first();
      console.log(`\n✓ Total payments in database: ${paymentCount.count}`);
      
      // Show payments grouped by company
      const paymentsByCompany = await db('payments')
        .select('company_id')
        .countDistinct('auto_id as auto_count')
        .count('* as payment_count')
        .sum('total_cost as total_value')
        .groupBy('company_id');
      
      if (paymentsByCompany.length > 0) {
        console.log('\n✓ Payments by Company:');
        paymentsByCompany.forEach((row, index) => {
          console.log(`\n  Company ${index + 1}:`);
          console.log(`    - Company ID: ${row.company_id}`);
          console.log(`    - Total Auto Payments: ${row.payment_count}`);
          console.log(`    - Unique Autos: ${row.auto_count}`);
          console.log(`    - Total Value: ₹${parseFloat(row.total_value || 0).toFixed(2)}`);
        });
      }
      
      // Show all recent payments with details
      const recentPayments = await db('payments')
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(10);
      
      if (recentPayments.length > 0) {
        console.log('\n✓ Recent Payment Records (Last 10):');
        recentPayments.forEach((payment, index) => {
          console.log(`\n  Payment ${index + 1}:`);
          console.log(`    - Auto No: ${payment.auto_no || 'N/A'}`);
          console.log(`    - Owner: ${payment.owner_name || 'N/A'}`);
          console.log(`    - Area: ${payment.area_name || 'N/A'}`);
          console.log(`    - Cost/Day: ₹${parseFloat(payment.cost_per_day).toFixed(2)}`);
          console.log(`    - Days: ${payment.total_days}`);
          console.log(`    - Calculation: ₹${parseFloat(payment.cost_per_day).toFixed(2)} × ${payment.total_days} = ₹${parseFloat(payment.total_cost).toFixed(2)}`);
          console.log(`    - Status: ${payment.payment_status}`);
          console.log(`    - Created: ${new Date(payment.created_at).toLocaleString('en-IN')}`);
        });
      } else {
        console.log('\n⚠ No payments found in database yet');
        console.log('💡 Instructions to test:');
        console.log('   1. Go to Company Requests page');
        console.log('   2. Find a PENDING request');
        console.log('   3. Click "Action" → "Accept"');
        console.log('   4. Select autos to assign');
        console.log('   5. Enter cost per day (e.g., 500)');
        console.log('   6. Click "Confirm & Assign"');
        console.log('   7. Run this script again to verify payments were saved');
      }
    }
    
    console.log('\n=== VERIFICATION COMPLETE ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyPayments();

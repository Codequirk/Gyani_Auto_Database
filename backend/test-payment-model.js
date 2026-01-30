const Payment = require('./src/models/Payment');

async function testPaymentModel() {
  try {
    console.log('\n=== TESTING PAYMENT MODEL ===\n');
    
    const allPayments = await Payment.findAll();
    console.log('Total payments from model:', allPayments.length);
    console.log('Type:', typeof allPayments);
    console.log('Is array:', Array.isArray(allPayments));
    
    if (allPayments.length > 0) {
      console.log('\n✓ First payment:');
      const payment = allPayments[0];
      console.log(JSON.stringify(payment, null, 2));
    } else {
      console.log('\n⚠ No payments found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testPaymentModel();

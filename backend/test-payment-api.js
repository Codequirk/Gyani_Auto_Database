const axios = require('axios');

async function testPaymentAPI() {
  try {
    console.log('\n=== TESTING PAYMENT API ===\n');
    
    const baseURL = 'http://localhost:5000';
    const token = 'test-token'; // You may need to get a real token
    
    console.log('Testing GET /api/payments/all endpoint...\n');
    
    const response = await axios.get(`${baseURL}/api/payments/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Don't throw on any status
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response type: ${typeof response.data}`);
    console.log(`Is array: ${Array.isArray(response.data)}`);
    console.log(`Data length: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('\n✓ API returned payments:');
      response.data.slice(0, 3).forEach((payment, i) => {
        console.log(`\n  Payment ${i + 1}:`);
        console.log(`    - ID: ${payment.id}`);
        console.log(`    - Auto No: ${payment.auto_no}`);
        console.log(`    - Company ID: ${payment.company_id}`);
        console.log(`    - Cost/Day: ${payment.cost_per_day}`);
        console.log(`    - Total Cost: ${payment.total_cost}`);
      });
    } else if (response.status === 401) {
      console.log('\n⚠ Authorization error - need valid token');
    } else {
      console.log('\n⚠ No payments returned by API');
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
    console.log('\n⚠ Could not connect to backend');
    console.log('Make sure the backend server is running on http://localhost:5000');
  }
}

testPaymentAPI();

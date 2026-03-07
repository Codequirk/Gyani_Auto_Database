#!/usr/bin/env node
const axios = require('axios');

// Test the dashboard API response structure
async function testDashboardAPI() {
  try {
    // You need to update this company_id with an actual company ID from your database
    const companyId = process.argv[2] || '4de56135-3cf3-4687-be06-85dcb62e5177';
    
    console.log(`\n📡 Testing Dashboard API for company: ${companyId}\n`);
    
    const baseURL = 'http://localhost:3000'; // Update if your backend runs on different port
    const response = await axios.get(
      `${baseURL}/api/company-portal/${companyId}/dashboard`,
      {
        headers: {
          'Authorization': `Bearer YOUR_TOKEN_HERE`, // Token may be required
        },
        validateStatus: () => true, // Don't throw on any status
      }
    );
    
    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);
    console.log('\n📊 Response Body:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check for required fields
    console.log('\n✅ Field Existence Check:');
    console.log('- pending_tickets array exists:', !!response.data.pending_tickets);
    console.log('- rejected_tickets array exists:', !!response.data.rejected_tickets);
    console.log('- approved_tickets array exists:', !!response.data.approved_tickets);
    console.log('- summary.pending_tickets count exists:', !!response.data.summary?.pending_tickets);
    console.log('- summary.rejected_tickets count exists:', !!response.data.summary?.rejected_tickets);
    console.log('- active_assignments array exists:', !!response.data.active_assignments);
    console.log('- prebooked_assignments array exists:', !!response.data.prebooked_assignments);
    
    // Sample check - print first item from each array if exists
    if (response.data.rejected_tickets?.length > 0) {
      console.log('\n📋 Sample rejected ticket:');
      console.log(JSON.stringify(response.data.rejected_tickets[0], null, 2));
    }
    
    if (response.data.approved_tickets?.length > 0) {
      console.log('\n📋 Sample approved ticket:');
      console.log(JSON.stringify(response.data.approved_tickets[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

testDashboardAPI();

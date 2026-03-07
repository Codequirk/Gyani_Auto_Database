const dns = require('dns').promises;

(async () => {
  try {
    console.log('[DNS] Testing resolution of db.vdppfeswuqljrwilibqr.supabase.co');
    const addresses = await dns.resolve4('db.vdppfeswuqljrwilibqr.supabase.co');
    console.log('✓ IPv4:', addresses);
  } catch (err) {
    console.log('✗ IPv4 failed:', err.message);
  }

  try {
    console.log('[DNS] Testing IPv6 resolution...');
    const addresses = await dns.resolve6('db.vdppfeswuqljrwilibqr.supabase.co');
    console.log('✓ IPv6:', addresses);
  } catch (err) {
    console.log('✗ IPv6 failed:', err.message);
  }

  try {
    console.log('[DNS] Testing lookup (auto)...');
    const addresses = await dns.lookup('db.vdppfeswuqljrwilibqr.supabase.co', { all: true });
    console.log('✓ Lookup:', addresses);
  } catch (err) {
    console.log('✗ Lookup failed:', err.message);
  }

  try {
    console.log('[DNS] Testing getaddrinfo (what pg uses)...');
    const addresses = await dns.getaddrinfo('db.vdppfeswuqljrwilibqr.supabase.co');
    console.log('✓ Getaddrinfo:', addresses);
  } catch (err) {
    console.log('✗ Getaddrinfo failed:', err.message);
  }
})();

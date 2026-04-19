const fs = require('fs');

try {
  const envPath = require('path').resolve(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) process.env[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
  });
} catch (e) {}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

async function check() {
  const endpoint = `${SUPABASE_URL}/rest/v1/deals?select=id,is_active,is_verified,title`;
  const res = await fetch(endpoint, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const data = await res.json();
  if (!res.ok) console.error("Error", data);
  else {
    console.log(`Total deals in DB: ${data.length}`);
    if (data.length > 0) {
      console.log(`Sample valid deals:`, data.slice(0, 5));
    }
  }
}

check();

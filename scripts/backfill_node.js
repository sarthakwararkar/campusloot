const fs = require('fs');

try {
  // Try reading from .env in project root
  const envPath = require('path').resolve(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
    }
  });
} catch (e) {
  try {
     const envContent = fs.readFileSync('.env', 'utf-8');
     envContent.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
           process.env[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
        }
     });
  } catch(e2) {
     console.log('No .env file found.');
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://thevyutzufzxiorplvya.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: Missing SUPABASE_SERVICE_ROLE_KEY in .env file.");
  process.exit(1);
}

async function run() {
  console.log("Updating inactive deals to active using Supabase REST API...");
  const endpoint = `${SUPABASE_URL}/rest/v1/deals?is_active=eq.false`;
  try {
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ is_active: true })
    });
    
    if (!res.ok) {
        console.error("Failed to update deals:", await res.text());
        return;
    }
    
    const data = await res.json();
    console.log(`✅ Successfully updated ${data.length} deals to is_active = true.`);
  } catch(e) {
      console.error(e);
  }
}

run();

const SUPABASE_URL = 'https://thevyutzufzxiorplvya.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZXZ5dXR6dWZ6eGlvcnBsdnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODAyMzYsImV4cCI6MjA4OTc1NjIzNn0.3NGjr107BGKPwlOmyJk3YRo76KnZ5HgTFq1L46aBuuM';

async function checkAnonSort() {
  console.log("Fetching deals using best-deals equivalent...");
  
  // equivalent to .order('saves_count', { ascending: false })
  // .order('views_count', { ascending: false })
  // .order('created_at', { ascending: false })
  const endpoint = `${SUPABASE_URL}/rest/v1/deals?is_active=eq.true&order=saves_count.desc,views_count.desc,created_at.desc&select=*`;
  
  const res = await fetch(endpoint, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error("Supabase Error:", errorText);
  } else {
    const data = await res.json();
    console.log(`Fetched deals: ${data.length}`);
  }
}

checkAnonSort();

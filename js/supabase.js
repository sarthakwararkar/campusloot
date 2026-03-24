console.log('Supabase file loading...');
const SUPABASE_URL = 'https://thevyutzufzxiorplvya.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZXZ5dXR6dWZ6eGlvcnBsdnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODAyMzYsImV4cCI6MjA4OTc1NjIzNn0.3NGjr107BGKPwlOmyJk3YRo76KnZ5HgTFq1L46aBuuM';

if (!window.supabase) {
  console.error('Supabase SDK not found on window object!');
} else {
  console.log('Supabase SDK found, creating client...');
}

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
window.supabase = supabaseClient;
window.supabaseClient = supabaseClient;
console.log('Supabase client initialized and assigned to window.supabase and window.supabaseClient');

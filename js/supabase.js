/**
 * supabase.js - Central Supabase client initialization
 * Works with both CDN-loaded and ESM builds of @supabase/supabase-js
 */

const SUPABASE_URL = 'https://thevyutzufzxiorplvya.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZXZ5dXR6dWZ6eGlvcnBsdnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODAyMzYsImV4cCI6MjA4OTc1NjIzNn0.3NGjr107BGKPwlOmyJk3YRo76KnZ5HgTFq1L46aBuuM';

(function () {
  // The CDN exposes createClient on window.supabase - save before overwriting
  const createClientFn =
    (window.supabase && window.supabase.createClient) ||
    (window.supabaseJs && window.supabaseJs.createClient);

  if (!createClientFn) {
    console.error('[Supabase] SDK not found. Make sure the CDN script is loaded before supabase.js');
    window.supabase = null;
    window.supabaseClient = null;
    return;
  }

  const client = createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabase = client;
  window.supabaseClient = client;
  console.log('[Supabase] Client ready.');
})();

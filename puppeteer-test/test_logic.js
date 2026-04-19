const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://thevyutzufzxiorplvya.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZXZ5dXR6dWZ6eGlvcnBsdnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODAyMzYsImV4cCI6MjA4OTc1NjIzNn0.3NGjr107BGKPwlOmyJk3YRo76KnZ5HgTFq1L46aBuuM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEALS_PER_PAGE = 12;

async function fetchDeals(filters = {}) {
  const { category, search, sort = 'newest', page = 1 } = filters;
  const from = (page - 1) * DEALS_PER_PAGE;
  const to = from + DEALS_PER_PAGE - 1;

  let query = supabase
    .from('deals')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (sort === 'best-deals') {
    query = query.order('saves_count', { ascending: false })
                 .order('views_count', { ascending: false })
                 .order('created_at', { ascending: false });
  }

  query = query.range(from, to);

  try {
    const { data, error, count } = await query;
    if (error) {
       console.log("Q Err", error);
    }
    return { deals: data || [], total: count || 0 };
  } catch (err) {
    console.log("Err", err);
  }
}

async function test() {
   const res = await fetchDeals({ sort: 'best-deals' });
   console.log("Fetched UI deals:", res);
}
test();

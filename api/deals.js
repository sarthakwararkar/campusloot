const { createClient } = require('@supabase/supabase-js');

// These are public keys, safe for this proxy context
const SUPABASE_URL = 'https://thevyutzufzxiorplvya.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZXZ5dXR6dWZ6eGlvcnBsdnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODAyMzYsImV4cCI6MjA4OTc1NjIzNn0.3NGjr107BGKPwlOmyJk3YRo76KnZ5HgTFq1L46aBuuM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
  // Add CORS headers for local development if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { category, search, sort = 'newest', page = 1, limit = 12, type } = req.query;

  try {
    // Handle stats request
    if (type === 'stats') {
      const { count: dealsCount, error: dErr } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
        
      // Requesting profiles count
      const { count: usersCount, error: uErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (dErr) throw dErr;
      return res.status(200).json({ dealsCount: dealsCount || 0, usersCount: usersCount || 0 });
    }

    // Handle single deal request
    if (req.query.id) {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', req.query.id)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ deal: data });
    }

    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    let query = supabase
      .from('deals')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search && search.trim().length > 0) {
      const s = search.trim();
      query = query.or(`title.ilike.%${s}%,brand_name.ilike.%${s}%,description.ilike.%${s}%`);
    }

    switch (sort) {
      case 'most-saved':
        query = query.order('saves_count', { ascending: false });
        break;
      case 'expiring':
        query = query.not('expires_at', 'is', null).order('expires_at', { ascending: true });
        break;
      case 'best-deals':
        query = query.order('saves_count', { ascending: false })
                     .order('views_count', { ascending: false })
                     .order('created_at', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[API Proxy] Supabase Error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ deals: data, total: count });
  } catch (err) {
    console.error('[API Proxy] Critical Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const { createClient } = require('@supabase/supabase-js');

// Public keys fallback (though process.env is preferred in Vercel)
const FALLBACK_URL = 'https://thevyutzufzxiorplvya.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZXZ5dXR6dWZ6eGlvcnBsdnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODAyMzYsImV4cCI6MjA4OTc1NjIzNn0.3NGjr107BGKPwlOmyJk3YRo76KnZ5HgTFq1L46aBuuM';

const SUPABASE_URL = process.env.SUPABASE_URL || FALLBACK_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || FALLBACK_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
  // Tightened CORS (allow campusloot.com and vercel previews)
  const origin = req.headers.origin;
  if (origin && (origin.includes('campusloot') || origin.includes('vercel.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Fallback for local testing
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { type, id, category, search, sort = 'newest', page = 1, limit = 12 } = req.query;

  try {
    // 1. STATS
    if (type === 'stats') {
      const { count: dealsCount } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      return res.status(200).json({ dealsCount: dealsCount || 0, usersCount: usersCount || 0 });
    }

    // 2. SINGLE PROFILE
    if (type === 'profile' && id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ profile: data });
    }

    // 3. SAVED DEALS
    if (type === 'saved_deals' && id) {
      const { data, error } = await supabase
        .from('saved_deals')
        .select('deal_id, deals(*)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const deals = (data || []).map(d => d.deals).filter(Boolean);
      return res.status(200).json({ deals });
    }

    // 4. USER SUBMISSIONS
    if (type === 'user_submissions' && id) {
      const { data, error } = await supabase
        .from('deal_submissions')
        .select('*')
        .eq('submitted_by', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ submissions: data });
    }

    // 5. SINGLE DEAL
    if (req.query.id && !type) {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', req.query.id)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ deal: data });
    }

    // 6. LIST DEALS (DEFAULT)
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    let query = supabase
      .from('deals')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (category && category !== 'all') query = query.eq('category', category);
    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`title.ilike.%${s}%,brand_name.ilike.%${s}%,description.ilike.%${s}%`);
    }

    switch (sort) {
      case 'most-saved': query = query.order('saves_count', { ascending: false }); break;
      case 'expiring': query = query.not('expires_at', 'is', null).order('expires_at', { ascending: true }); break;
      case 'best-deals': 
        query = query.order('saves_count', { ascending: false }).order('created_at', { ascending: false }); 
        break;
      default: query = query.order('created_at', { ascending: false }); break;
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return res.status(200).json({ deals: data, total: count });
  } catch (err) {
    console.error('[API Proxy] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

const { createClient } = require('@supabase/supabase-js');

// Public keys fallback
const FALLBACK_URL = 'https://thevyutzufzxiorplvya.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZXZ5dXR6dWZ6eGlvcnBsdnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODAyMzYsImV4cCI6MjA4OTc1NjIzNn0.3NGjr107BGKPwlOmyJk3YRo76KnZ5HgTFq1L46aBuuM';

const SUPABASE_URL = process.env.SUPABASE_URL || FALLBACK_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || FALLBACK_KEY;

// Create a server-side client
// Note: For write operations, we will manually pass the user's JWT if provided
const getSupabaseClient = (authHeader) => {
  const options = {};
  if (authHeader) {
    options.global = { headers: { Authorization: authHeader } };
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
};

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('campusloot') || origin.includes('vercel.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseClient(req.headers.authorization);

  // --- GET REQUESTS ---
  if (req.method === 'GET') {
    const { type, id, category, search, sort = 'newest', page = 1, limit = 12, status = 'active' } = req.query;

    try {
      if (type === 'stats') {
        const { count: dealsCount } = await supabase.from('deals').select('*', { count: 'exact', head: true }).eq('is_active', true);
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        return res.status(200).json({ dealsCount: dealsCount || 0, usersCount: usersCount || 0 });
      }

      if (type === 'admin_stats') {
        const [dealsResult, usersResult, savesResult, pendingResult] = await Promise.all([
          supabase.from('deals').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('saved_deals').select('*', { count: 'exact', head: true }),
          supabase.from('deal_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ]);
        return res.status(200).json({
          totalDeals: dealsResult.count || 0,
          totalUsers: usersResult.count || 0,
          totalSaves: savesResult.count || 0,
          pendingSubmissions: pendingResult.count || 0
        });
      }

      if (type === 'profile' && id) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return res.status(200).json({ profile: data });
      }

      if (type === 'get_user') {
        // This verifies the JWT in the Authorization header and returns the user
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return res.status(200).json({ user });
      }

      if (type === 'saved_deals' && id) {
        const { data, error } = await supabase.from('saved_deals').select('deal_id, deals(*)').eq('user_id', id).order('created_at', { ascending: false });
        if (error) throw error;
        const deals = (data || []).map(d => d.deals).filter(Boolean);
        return res.status(200).json({ deals });
      }

      if (type === 'user_submissions' && id) {
        const { data, error } = await supabase.from('deal_submissions').select('*').eq('submitted_by', id).order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ submissions: data });
      }

      if (type === 'pending_submissions') {
        const { data, error } = await supabase
          .from('deal_submissions')
          .select('*, profiles!submitted_by(full_name, email)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ submissions: data });
      }

      if (type === 'scraped_pending') {
        const { data, error } = await supabase
          .from('deals')
          .select('*')
          .eq('source', 'scraped')
          .eq('needs_review', true)
          .eq('is_active', false)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return res.status(200).json({ deals: data });
      }

      if (type === 'all_deals_admin') {
        const { data, error } = await supabase
          .from('deals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return res.status(200).json({ deals: data });
      }

      if (req.query.id && !type) {
        const { data, error } = await supabase.from('deals').select('*').eq('id', req.query.id).maybeSingle();
        if (error) throw error;
        return res.status(200).json({ deal: data });
      }

      // Default: List Deals
      const from = (parseInt(page) - 1) * parseInt(limit);
      const to = from + parseInt(limit) - 1;
      let query = supabase.from('deals').select('*', { count: 'exact' });
      
      if (status === 'active') {
        query = query.eq('is_active', true);
      }

      if (category && category !== 'all') query = query.eq('category', category);
      if (search && search.trim()) {
        const s = search.trim();
        query = query.or(`title.ilike.%${s}%,brand_name.ilike.%${s}%,description.ilike.%${s}%`);
      }

      switch (sort) {
        case 'most-saved': query = query.order('saves_count', { ascending: false }); break;
        case 'expiring': query = query.not('expires_at', 'is', null).order('expires_at', { ascending: true }); break;
        case 'best-deals': query = query.order('saves_count', { ascending: false }).order('created_at', { ascending: false }); break;
        default: query = query.order('created_at', { ascending: false }); break;
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return res.status(200).json({ deals: data, total: count });
    } catch (err) {
      console.error('[API Proxy GET] Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // --- POST REQUESTS (Writes) ---
  if (req.method === 'POST') {
    const { action, table, data, id, field, value } = req.body;

    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Authorization header required for write operations' });
    }

    try {
      // 1. ACTION: UPVOTE / SAVE DEAL
      if (action === 'save_deal') {
        const { error } = await supabase.from('saved_deals').insert({ deal_id: id });
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 2. ACTION: UNSAVE DEAL
      if (action === 'unsave_deal') {
        const { error } = await supabase.from('saved_deals').delete().eq('deal_id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 3. ACTION: UPDATE PROFILE
      if (action === 'update_profile') {
        const { error } = await supabase.from('profiles').update(data).eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 4. ACTION: SUBMIT DEAL
      if (action === 'submit_deal') {
        const { error } = await supabase.from('deal_submissions').insert(data);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 5. ACTION: INCREMENT VIEW (RPC)
      if (action === 'increment_view') {
        const { error } = await supabase.rpc('increment_view', { deal_id_input: id });
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 6. ACTION: DELETE DEAL
      if (action === 'delete_deal') {
        const { error } = await supabase.from('deals').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 7. ACTION: TOGGLE DEAL STATUS (Admin)
      if (action === 'toggle_deal_status') {
        const { error } = await supabase.from('deals').update({ [field]: value }).eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 8. ACTION: APPROVE SUBMISSION
      if (action === 'approve_submission') {
        const { submission } = req.body;
        // Create the deal
        const { error: dealError } = await supabase.from('deals').insert({
          title: submission.title,
          description: submission.description || 'No description provided.',
          category: submission.category || 'other',
          brand_name: submission.brand_name || 'Unknown',
          discount_text: 'Student Deal',
          deal_url: submission.deal_url || '#',
          is_verified: true,
          is_active: true,
          submitted_by: submission.submitted_by,
          image_url: submission.image_url || null
        });
        if (dealError) throw dealError;

        // Update submission status
        const { error: updateError } = await supabase.from('deal_submissions').update({ status: 'approved' }).eq('id', id);
        if (updateError) throw updateError;
        return res.status(200).json({ success: true });
      }

      // 9. ACTION: REJECT SUBMISSION
      if (action === 'reject_submission') {
        const { reason } = req.body;
        const { error } = await supabase.from('deal_submissions').update({ status: 'rejected', rejection_reason: reason }).eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 10. ACTION: APPROVE SCRAPED DEAL
      if (action === 'approve_scraped') {
        const { error } = await supabase.from('deals').update({ is_active: true, is_verified: true, needs_review: false }).eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 11. ACTION: SKIP SCRAPED DEAL
      if (action === 'skip_scraped') {
        const { error } = await supabase.from('deals').update({ needs_review: false }).eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 12. ACTION: CREATE PROFILE (New User)
      if (action === 'create_profile') {
        const { error } = await supabase.from('profiles').insert(data);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 13. ACTION: SIGN IN
      if (action === 'sign_in') {
        const { email, password } = req.body;
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return res.status(200).json({ session: authData.session, user: authData.user });
      }

      // 14. ACTION: SIGN UP
      if (action === 'sign_up') {
        const { email, password, options } = req.body;
        const { data: authData, error } = await supabase.auth.signUp({ email, password, options });
        if (error) throw error;
        return res.status(200).json({ session: authData.session, user: authData.user });
      }

      // 15. ACTION: SIGN OUT
      if (action === 'sign_out') {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 16. ACTION: UPDATE PASSWORD
      if (action === 'update_password') {
        const { password } = req.body;
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 17. ACTION: RESET PASSWORD
      if (action === 'reset_password') {
        const { email, redirectTo } = req.body;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 18. ACTION: UPDATE DEAL (Generic)
      if (action === 'update_deal') {
        const { error } = await supabase.from('deals').update(data).eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // 19. ACTION: UPLOAD FILE
      if (action === 'upload_file') {
        const { bucket, fileName, fileContent, contentType } = req.body;
        if (!bucket || !fileName || !fileContent) {
          return res.status(400).json({ error: 'Missing bucket, fileName, or fileContent' });
        }
        
        // Convert base64 to Buffer
        const buffer = Buffer.from(fileContent, 'base64');
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, buffer, {
            contentType: contentType || 'image/png',
            upsert: true,
            cacheControl: '3600'
          });
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
          
        return res.status(200).json({ url: publicUrlData.publicUrl });
      }

      // 15. ACTION: SYNC EXTERNAL DEAL (Coupomated)
      if (action === 'sync_external_deal') {
        const { external_id, ...dealData } = data;
        
        // Try to find existing deal by external_id
        const { data: existingDeal } = await supabase
          .from('deals')
          .select('id')
          .eq('external_id', external_id)
          .single();

        if (existingDeal) {
          // Update existing
          const { error: updateError } = await supabase
            .from('deals')
            .update({ ...dealData, last_synced_at: new Date() })
            .eq('id', existingDeal.id);
          if (updateError) throw updateError;
          return res.status(200).json({ success: true, updated: true });
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('deals')
            .insert({ ...dealData, external_id, last_synced_at: new Date() });
          if (insertError) throw insertError;
          return res.status(200).json({ success: true, created: true });
        }
      }

      return res.status(400).json({ error: 'Invalid action: ' + action });
    } catch (err) {
      console.error('[API Proxy Write] Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

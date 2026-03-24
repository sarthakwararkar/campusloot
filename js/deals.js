/**
 * deals.js — Deal CRUD and query functions
 * Fetching, filtering, saving, submitting deals
 */

const DEALS_PER_PAGE = 12;

/**
 * Fetch deals with optional filters
 * @param {Object} filters - { category, search, sort, page }
 * @returns {Promise<{deals: Array, total: number}>}
 */
async function fetchDeals(filters = {}) {
  const { category, search, sort = 'newest', page = 1 } = filters;
  const from = (page - 1) * DEALS_PER_PAGE;
  const to = from + DEALS_PER_PAGE - 1;

  let query = supabase
    .from('deals')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .eq('is_verified', true);

  // Category filter
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  // Search filter
  if (search) {
    query = query.or(`title.ilike.%${search}%,brand_name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Sort
  switch (sort) {
    case 'most-saved':
      query = query.order('saves_count', { ascending: false });
      break;
    case 'expiring':
      query = query.not('expires_at', 'is', null).order('expires_at', { ascending: true });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  // Pagination
  query = query.range(from, to);

  try {
    const { data, error, count } = await query;
    if (error) {
      console.error('Supabase query error:', error);
      return { deals: [], total: 0 };
    }
    return { deals: data || [], total: count || 0 };
  } catch (err) {
    console.error('CRASH in fetchDeals query execution:', err);
    return { deals: [], total: 0 };
  }
}

/**
 * Fetch featured deals (first 3)
 * @returns {Promise<Array>}
 */
async function fetchFeaturedDeals() {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('is_active', true)
    .eq('is_verified', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error fetching featured deals:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch a single deal by ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function fetchDealById(id) {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching deal:', error);
    return null;
  }

  return data;
}

/**
 * Save a deal for the current user
 * @param {string} dealId
 */
async function saveDeal(dealId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const { error } = await supabase
    .from('saved_deals')
    .insert({ user_id: user.id, deal_id: dealId });

  if (error) throw error;

  // Increment saves_count
  await supabaseClient.rpc('increment_saves', { deal_id_input: dealId }).catch(() => {
    // RPC may not exist; use manual update
    supabaseClient.from('deals').update({ saves_count: supabaseClient.sql`saves_count + 1` }).eq('id', dealId);
  });
}

/**
 * Unsave (remove) a deal for the current user
 * @param {string} dealId
 */
async function unsaveDeal(dealId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const { error } = await supabase
    .from('saved_deals')
    .delete()
    .eq('user_id', user.id)
    .eq('deal_id', dealId);

  if (error) throw error;
}

/**
 * Get all saved deal IDs for a user (as a Set)
 * @param {string} userId
 * @returns {Promise<Set<string>>}
 */
async function getSavedDealIds(userId) {
  const { data, error } = await supabase
    .from('saved_deals')
    .select('deal_id')
    .eq('user_id', userId);

  if (error) return new Set();
  return new Set((data || []).map(d => d.deal_id));
}

/**
 * Get all saved deals (full deal data) for a user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getSavedDeals(userId) {
  const { data, error } = await supabase
    .from('saved_deals')
    .select('deal_id, deals(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved deals:', error);
    return [];
  }

  return (data || []).map(d => d.deals).filter(Boolean);
}

/**
 * Submit a new deal
 * @param {Object} formData
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function submitDeal(formData) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'You must be logged in' };

  // Check submission limit
  const canSubmit = await checkSubmissionLimit(user.id);
  if (!canSubmit) {
    return { success: false, error: 'You have reached the daily submission limit (3 per day). Try again tomorrow!' };
  }

  const { error } = await supabase
    .from('deal_submissions')
    .insert({
      submitted_by: user.id,
      title: sanitizeInput(formData.title),
      description: sanitizeInput(formData.description, 1000),
      brand_name: sanitizeInput(formData.brand_name),
      deal_url: sanitizeInput(formData.deal_url, 2000),
      category: formData.category
    });

  if (error) {
    return { success: false, error: 'Failed to submit deal. Please try again.' };
  }

  return { success: true, error: null };
}

/**
 * Increment the view count for a deal
 * @param {string} dealId
 */
async function incrementView(dealId) {
  // Use raw SQL to atomically increment
  await supabase
    .from('deals')
    .update({ views_count: undefined })
    .eq('id', dealId);

  // Since we can't do atomic increment easily with the JS client,
  // we'll fetch current count and update
  const { data } = await supabase
    .from('deals')
    .select('views_count')
    .eq('id', dealId)
    .single();

  if (data) {
    await supabase
      .from('deals')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', dealId);
  }
}

/**
 * Fetch deals count and users count for stats
 * @returns {Promise<{dealsCount: number, usersCount: number}>}
 */
async function fetchStats() {
  const { count: dealsCount } = await supabase
    .from('deals')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('is_verified', true);

  const { count: usersCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  return { dealsCount: dealsCount || 0, usersCount: usersCount || 0 };
}

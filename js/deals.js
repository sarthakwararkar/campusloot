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
    .select('*')
    .eq('is_active', true);

  // Category filter
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  // Search filter
  if (search && search.trim().length > 0) {
    const s = search.trim();
    query = query.or(`title.ilike.%${s}%,brand_name.ilike.%${s}%,description.ilike.%${s}%`);
  }

  // Sort
  switch (sort) {
    case 'most-saved':
      query = query.order('saves_count', { ascending: false });
      break;
    case 'expiring':
      query = query.not('expires_at', 'is', null).order('expires_at', { ascending: true });
      break;
    case 'best-deals':
      // Simplified: use saves_count first
      query = query.order('saves_count', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  // Pagination
  query = query.range(from, to);

  try {
    console.log('[Deals] Fetching:', filters);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out after 15s')), 15000)
    );

    const { data, error, count } = await Promise.race([query, timeoutPromise]);
    
    if (error) {
      console.error('[Supabase] Error:', error);
      return { deals: [], total: 0 };
    }
    
    // Since we removed 'count: exact', we'll estimate or just use length for now
    const total = count !== null && count !== undefined ? count : (data?.length || 0);
    console.log(`[Deals] Success: ${data?.length || 0} items fetched.`);
    return { deals: data || [], total: total };
  } catch (err) {
    console.error('[Deals] Error:', err.message || err);
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
 * Casual-priority category weights (higher = shown first on homepage)
 */
const CASUAL_CATEGORIES = ['food', 'clothing', 'ott', 'electronics', 'services', 'other', 'courses', 'software', 'local'];

/**
 * Fetch diverse casual deals for homepage.
 * Pulls top deals prioritizing casual categories (food, fashion, OTT, electronics)
 * and ensures category diversity (max 2 per category).
 * Falls back to featured deals if not enough casual deals exist.
 * @param {number} limit - total deals to return (default 6)
 * @returns {Promise<Array>}
 */
async function fetchCasualDeals(limit = 6) {
  try {
    // Fetch a larger pool sorted by engagement
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('is_active', true)
      .order('saves_count', { ascending: false })
      .order('views_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(80);

    if (error || !data || data.length === 0) {
      console.warn('fetchCasualDeals: falling back to featured deals');
      return await fetchFeaturedDeals();
    }

    // Score each deal: casual category bonus + engagement + recency
    const now = Date.now();
    const scored = data.map(deal => {
      const catIdx = CASUAL_CATEGORIES.indexOf(deal.category);
      // Lower index = more casual = higher bonus (food=50, clothing=45, ott=40...)
      const casualBonus = catIdx >= 0 ? (CASUAL_CATEGORIES.length - catIdx) * 5 : 0;
      const saves = (deal.saves_count || 0) * 3;
      const views = (deal.views_count || 0) * 0.5;
      const ageMs = now - (deal.created_at ? new Date(deal.created_at).getTime() : now);
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyBonus = isNaN(ageDays) ? 0 : (ageDays < 7 ? 15 : ageDays < 30 ? 5 : 0);
      const featuredBonus = deal.is_featured ? 10 : 0;
      return { ...deal, _score: casualBonus + saves + views + recencyBonus + featuredBonus };
    });

    // Sort by score descending
    scored.sort((a, b) => b._score - a._score);

    // Pick diverse results: max 2 per category
    const result = [];
    const catCount = {};
    for (const deal of scored) {
      if (result.length >= limit) break;
      const cat = deal.category || 'other';
      catCount[cat] = (catCount[cat] || 0) + 1;
      if (catCount[cat] <= 2) {
        result.push(deal);
      }
    }

    // If we didn't fill enough, add more without category limit
    if (result.length < limit) {
      for (const deal of scored) {
        if (result.length >= limit) break;
        if (!result.find(d => d.id === deal.id)) {
          result.push(deal);
        }
      }
    }

    return result;
  } catch (err) {
    console.error('CRASH in fetchCasualDeals:', err);
    return await fetchFeaturedDeals();
  }
}

/**
 * Fetch a single deal by ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function fetchDealById(id) {
  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle to avoid 406 errors if not found

    if (error) {
      console.error('Error fetching deal:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('CRASH in fetchDealById:', err);
    return null;
  }
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

  // Increment saves_count via RPC
  const { error: rpcError } = await supabase.rpc('increment_saves', { deal_id_input: dealId });
  if (rpcError) console.error('Error incrementing saves_count:', rpcError);
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

  // Decrement saves_count via RPC
  await supabase.rpc('decrement_saves', { deal_id_input: dealId });
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
      category: formData.category,
      image_url: formData.image_url ? formData.image_url : null
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
  try {
    // Use RPC for atomic increment
    const { error } = await supabase.rpc('increment_view', { deal_id_input: dealId });
    if (error) {
      console.warn('Error incrementing view count (RPC may be missing):', error);
      // Fallback: manual increment if RPC fails (optional, but let's just log for now)
    }
  } catch (err) {
    console.error('CRASH in incrementView:', err);
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
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  return { dealsCount: dealsCount || 0, usersCount: usersCount || 0 };
}

/**
 * Update a deal's fields
 * @param {string} id 
 * @param {Object} fields 
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function updateDeal(id, fields) {
  try {
    const { error } = await supabase.from('deals').update(fields).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a deal
 * @param {string} id 
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function deleteDeal(id) {
  try {
    const { error } = await supabase.from('deals').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch a user's deal submissions
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
async function getUserSubmissions(userId) {
  const { data, error } = await supabase
    .from('deal_submissions')
    .select('*')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching user submissions:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch scraped deals awaiting review
 * @returns {Promise<Array>}
 */
async function fetchScrapedPendingDeals() {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('source', 'scraped')
    .eq('needs_review', true)
    .eq('is_active', false)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching scraped deals:', error);
    return [];
  }
  return data || [];
}

/**
 * Approve a scraped deal (makes it active and visible)
 * @param {string} id - deal UUID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function approveScrapedDeal(id) {
  const { error } = await supabase
    .from('deals')
    .update({ is_active: true, is_verified: true, needs_review: false })
    .eq('id', id);
  return { success: !error, error: error?.message || null };
}

/**
 * Skip a scraped deal (not useful, but don't delete it)
 * @param {string} id - deal UUID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function skipScrapedDeal(id) {
  const { error } = await supabase
    .from('deals')
    .update({ needs_review: false })
    .eq('id', id);
  return { success: !error, error: error?.message || null };
}

/**
 * Update just the image URL of an existing deal (used for backfill)
 * @param {string} id 
 * @param {string} imageUrl 
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function updateDealImage(id, imageUrl) {
  try {
    const { error } = await supabase.from('deals').update({ image_url: imageUrl }).eq('id', id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

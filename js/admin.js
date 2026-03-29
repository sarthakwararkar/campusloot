/**
 * admin.js — Admin-only functions
 * Pending submissions, deal management, stats
 */

/**
 * Fetch all pending deal submissions
 * @returns {Promise<Array>}
 */
async function fetchPendingSubmissions() {
  const { data, error } = await supabase
    .from('deal_submissions')
    .select('*, users!submitted_by(full_name, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }

  return data || [];
}

/**
 * Approve a deal submission — creates a new deal entry and updates status
 * @param {Object} submission - the submission object
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function approveDeal(submission) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Create the deal
  const { error: dealError } = await supabase
    .from('deals')
    .insert({
      title: submission.title,
      description: submission.description || 'No description provided.',
      category: submission.category || 'other',
      brand_name: submission.brand_name || 'Unknown',
      discount_text: 'Student Deal',
      deal_url: submission.deal_url || '#',
      is_verified: true,
      is_active: true,
      submitted_by: submission.submitted_by,
      approved_by: user.id
    });

  if (dealError) {
    return { success: false, error: 'Failed to create deal' };
  }

  // Update submission status
  const { error: updateError } = await supabase
    .from('deal_submissions')
    .update({ status: 'approved' })
    .eq('id', submission.id);

  if (updateError) {
    return { success: false, error: 'Deal created but failed to update submission status' };
  }

  return { success: true, error: null };
}

/**
 * Reject a deal submission
 * @param {string} submissionId
 * @param {string} reason - rejection reason
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function rejectDeal(submissionId, reason) {
  const { error } = await supabase
    .from('deal_submissions')
    .update({
      status: 'rejected',
      rejection_reason: sanitizeInput(reason)
    })
    .eq('id', submissionId);

  if (error) {
    return { success: false, error: 'Failed to reject submission' };
  }

  return { success: true, error: null };
}

/**
 * Toggle a deal's active/featured/verified status
 * @param {string} dealId
 * @param {string} field - 'is_active', 'is_featured', or 'is_verified'
 * @param {boolean} value
 * @returns {Promise<{success: boolean}>}
 */
async function toggleDealStatus(dealId, field, value) {
  const { error } = await supabase
    .from('deals')
    .update({ [field]: value })
    .eq('id', dealId);

  return { success: !error };
}

/**
 * Fetch all deals for admin management (including inactive/unverified)
 * @returns {Promise<Array>}
 */
async function fetchAllDealsAdmin() {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching admin deals:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch admin dashboard stats
 * @returns {Promise<Object>}
 */
async function fetchAdminStats() {
  const [dealsResult, usersResult, savesResult, pendingResult] = await Promise.all([
    supabase.from('deals').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('saved_deals').select('*', { count: 'exact', head: true }),
    supabase.from('deal_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  ]);

  return {
    totalDeals: dealsResult.count || 0,
    totalUsers: usersResult.count || 0,
    totalSaves: savesResult.count || 0,
    pendingSubmissions: pendingResult.count || 0
  };
}

/**
 * admin.js — Admin-only functions
 * Pending submissions, deal management, stats
 */

/**
 * Fetch all pending deal submissions
 * @returns {Promise<Array>}
 */
async function fetchPendingSubmissions() {
  try {
    const res = await fetch('/api/deals?type=pending_submissions');
    const data = await res.json();
    return data.submissions || [];
  } catch (err) {
    console.error('Error fetching submissions:', err);
    return [];
  }
}

/**
 * Approve a deal submission — creates a new deal entry and updates status
 * @param {Object} submission - the submission object
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function approveDeal(submission) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'approve_submission',
        id: submission.id,
        submission: submission
      })
    });
    const result = await res.json();
    return { success: !result.error, error: result.error || null };
  } catch (err) {
    console.error('Error approving deal:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Reject a deal submission
 * @param {string} submissionId
 * @param {string} reason - rejection reason
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function rejectDeal(submissionId, reason) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'reject_submission',
        id: submissionId,
        reason: sanitizeInput(reason)
      })
    });
    const result = await res.json();
    return { success: !result.error, error: result.error || null };
  } catch (err) {
    console.error('Error rejecting deal:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Toggle a deal's active/featured/verified status
 * @param {string} dealId
 * @param {string} field - 'is_active', 'is_featured', or 'is_verified'
 * @param {boolean} value
 * @returns {Promise<{success: boolean}>}
 */
async function toggleDealStatus(dealId, field, value) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'toggle_deal_status',
        id: dealId,
        field: field,
        value: value
      })
    });
    const result = await res.json();
    return { success: !result.error };
  } catch (err) {
    console.error('Error toggling deal status:', err);
    return { success: false };
  }
}

/**
 * Fetch all deals for admin management (including inactive/unverified)
 * @returns {Promise<Array>}
 */
async function fetchAllDealsAdmin() {
  try {
    const res = await fetch('/api/deals?type=all_deals_admin');
    const data = await res.json();
    return data.deals || [];
  } catch (err) {
    console.error('Error fetching admin deals:', err);
    return [];
  }
}

/**
 * Fetch admin dashboard stats
 * @returns {Promise<Object>}
 */
async function fetchAdminStats() {
  try {
    const res = await fetch('/api/deals?type=admin_stats');
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    return {
      totalDeals: 0,
      totalUsers: 0,
      totalSaves: 0,
      pendingSubmissions: 0
    };
  }
}

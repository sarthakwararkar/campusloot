/**
 * auth.js — Authentication functions
 * Handles login, signup, logout, session management
 */

/**
 * Sign up a new user with email and password
 * Also creates a profile entry in the users table
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @param {string} college
 * @param {string} city
 * @returns {Promise<{user: Object|null, error: string|null}>}
 */
async function signUp(email, password, name, college, city) {
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          college_name: college,
          city: city
        }
      }
    });

    if (error) {
      return { user: null, error: error.message };
    }

    // Create user profile in profiles table via proxy
    if (data.user) {
      try {
        const headers = await getAuthHeaders();
        const profileData = {
          id: data.user.id,
          email: email,
          full_name: name,
          college_name: college,
          city: city
        };
        
        await fetch('/api/deals', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'create_profile',
            data: profileData
          })
        });
      } catch (profileErr) {
        console.error('Profile creation error via proxy:', profileErr);
      }
    }

    return { user: data.user, error: null };
  } catch (err) {
    return { user: null, error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: Object|null, error: string|null}>}
 */
async function signIn(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (err) {
    return { user: null, error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Sign in with Google OAuth
 */
async function signInWithGoogle() {
  try {
    // Show loading state on the Google button
    const googleBtn = document.getElementById('google-btn');
    if (googleBtn) {
      googleBtn.disabled = true;
      googleBtn.querySelector('span').textContent = 'Redirecting to Google...';
    }

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/index.html',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      console.error('[Auth] Google OAuth error:', error.message);
      if (typeof showToast === 'function') {
        showToast('Google sign-in failed: ' + error.message, 'error');
      }
      // Reset button
      if (googleBtn) {
        googleBtn.disabled = false;
        googleBtn.querySelector('span').textContent = 'Continue with Google';
      }
    }
    // If successful, Supabase redirects the browser — no further action needed here
  } catch (err) {
    console.error('[Auth] Google OAuth exception:', err);
    if (typeof showToast === 'function') {
      showToast('Something went wrong with Google sign-in. Please try again.', 'error');
    }
  }
}

/**
 * Sign out the current user
 */
async function signOut() {
  // Clear profile cache on sign out
  sessionStorage.removeItem(PROFILE_CACHE_KEY);
  
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showToast('Error signing out', 'error');
  }
}

/**
 * Get headers including Authorization JWT for proxy calls
 */
async function getAuthHeaders() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.access_token) {
      return { 
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };
    }
  } catch (err) {
    console.warn('Could not get session for headers:', err);
  }
  return { 'Content-Type': 'application/json' };
}

/**
 * Get the currently logged-in user
 * @returns {Promise<Object|null>}
 */
let _cachedUser = null;

/**
 * Get current authenticated user
 * Uses in-memory cache and getSession for maximum performance
 */
async function getCurrentUser() {
  if (_cachedUser) return _cachedUser;
  try {
    // getSession is much faster as it checks local storage
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      _cachedUser = session.user;
      // Refresh in background
      supabaseClient.auth.getUser().then(({ data }) => {
        if (data?.user) _cachedUser = data.user;
      });
      return _cachedUser;
    }
    
    // Fallback to getUser if no session (more thorough)
    const { data: { user } } = await supabaseClient.auth.getUser();
    _cachedUser = user;
    return user;
  } catch {
    return null;
  }
}

// Persistent session-based cache for profiles to avoid redundant API calls across page navigations
const PROFILE_CACHE_KEY = 'cl_profile_cache';
const PROFILE_CACHE_TTL = 300000; // 5 minutes cache for better cross-page experience

/**
 * Get the current user's profile from the users table
 * @returns {Promise<Object|null>}
 */
async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Check persistent session cache
  try {
    const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) {
      const { profile, userId, timestamp } = JSON.parse(cached);
      // Ensure cache is for the same user and hasn't expired (5 min)
      if (userId === user.id && (Date.now() - timestamp < PROFILE_CACHE_TTL)) {
        // Trigger background refresh to keep cache fresh, but return cached data immediately
        refreshProfileCache(user.id);
        return profile;
      }
    }
  } catch (e) {
    console.warn('Profile cache read error:', e);
  }

  return refreshProfileCache(user.id);
}

/**
 * Internal helper to fetch profile and update cache
 */
async function refreshProfileCache(userId) {
  try {
    const res = await fetch(`/api/deals?type=profile&id=${userId}`);
    if (!res.ok) return null;
    const { profile } = await res.json();
    
    sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      profile,
      userId: userId,
      timestamp: Date.now()
    }));
    return profile;
  } catch (err) {
    console.error('refreshProfileCache error:', err);
    return null;
  }
}

/**
 * Require authentication — redirect to login if not logged in
 */
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

/**
 * Require admin role — redirect to home if not admin
 */
async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;

  const profile = await getCurrentProfile();

  if (!profile || profile.role !== 'admin') {
    window.location.href = 'index.html';
    return null;
  }

  return user;
}

/**
 * Listen to auth state changes
 * @param {Function} callback - receives (event, session)
 */
function onAuthChange(callback) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// Listen for auth state changes (handles OAuth redirect callbacks)
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // For OAuth users (Google), auto-create profile if it doesn't exist
    try {
      const user = session.user;
      const provider = user.app_metadata?.provider;

      if (provider === 'google') {
        // Check if profile exists using proxy logic
        const profile = await getCurrentProfile();
        
        if (!profile) {
          // Create profile from Google metadata via proxy
          const meta = user.user_metadata || {};
          const headers = await getAuthHeaders();
          
          await fetch('/api/deals', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'create_profile',
              data: {
                id: user.id,
                email: user.email,
                full_name: meta.full_name || meta.name || '',
                avatar_url: meta.avatar_url || meta.picture || '',
                college_name: '',
                city: ''
              }
            })
          });
          console.log('[Auth] Created profile for Google user via proxy:', user.email);
        }
      }
    } catch (profileErr) {
      console.warn('[Auth] Profile sync error (non-fatal):', profileErr);
    }

    // If on login page, redirect to index
    if (window.location.pathname.includes('login.html')) {
      window.location.href = 'index.html';
    }
  }
});

/**
 * Send password reset email
 * @param {string} email
 * @returns {Promise<{error: string|null}>}
 */
async function resetPassword(email) {
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login.html'
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Update user password
 * @param {string} newPassword
 * @returns {Promise<{error: string|null}>}
 */
async function updatePassword(newPassword) {
  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Update user profile (includes Name, College, City, Avatar URL, etc.)
 * @param {string} userId
 * @param {Object} updates - { full_name, college_name, city, avatar_url, bio }
 * @returns {Promise<{error: string|null}>}
 */
async function updateProfile(userId, updates) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'update_profile',
        id: userId,
        data: updates
      })
    });
    const result = await res.json();
    return { error: result.error || null };
  } catch (err) {
    console.error('Update profile error:', err);
    return { error: 'Failed to update profile via proxy.' };
  }
}

/**
 * Upload profile picture to Supabase Storage
 * @param {File} file - The image file to upload
 * @param {string} userId - Current user ID
 * @returns {Promise<{url: string|null, error: string|null}>}
 */
async function uploadAvatar(file, userId) {
  try {
    // Basic validation
    if (!file.type.startsWith('image/')) return { url: null, error: 'File must be an image.' };
    if (file.size > 2 * 1024 * 1024) return { url: null, error: 'Maximum size is 2MB.' };

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
    const base64 = await fileToBase64(file);

    const headers = await getAuthHeaders();
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'upload_file',
        bucket: 'avatar',
        fileName,
        fileContent: base64,
        contentType: file.type
      })
    });

    const result = await res.json();
    if (result.error) return { url: null, error: result.error };

    return { url: result.url, error: null };
  } catch (err) {
    console.error('[Auth] Upload failure:', err);
    return { url: null, error: 'Critical upload failure.' };
  }
}

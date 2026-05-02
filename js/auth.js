/**
 * auth.js — Authentication functions
 * Handles login, signup, logout, session management
 */

/**
 * Sign up a new user with email and password
 * Also creates a profile entry in the users table via the proxy
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @param {string} college
 * @param {string} city
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
async function signUp(email, password, name, college, city) {
  try {
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sign_up',
        email,
        password,
        options: {
          data: {
            full_name: name,
            college_name: college,
            city: city
          }
        }
      })
    });

    const result = await res.json();
    if (result.error) return { data: null, error: result.error };

    // Set the session on the client side so local storage is updated
    if (result.session) {
      await supabaseClient.auth.setSession(result.session);
      
      // Create user profile in profiles table via proxy as well (redundant but safe)
      try {
        const headers = { 
          'Authorization': `Bearer ${result.session.access_token}`,
          'Content-Type': 'application/json' 
        };
        await fetch('/api/deals', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'create_profile',
            data: {
              id: result.session.user.id,
              email: email,
              full_name: name,
              college_name: college,
              city: city
            }
          })
        });
      } catch (profileErr) {
        console.warn('Profile creation sync warning:', profileErr);
      }
    }
    
    return { data: result, error: null };
  } catch (err) {
    console.error('signUp error:', err);
    return { data: null, error: err.message || 'Something went wrong during sign up' };
  }
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
async function signIn(email, password) {
  try {
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sign_in',
        email,
        password
      })
    });

    const result = await res.json();
    if (result.error) return { data: null, error: result.error };

    // Set the session on the client side
    if (result.session) {
      await supabaseClient.auth.setSession(result.session);
    }
    
    return { data: result, error: null };
  } catch (err) {
    console.error('signIn error:', err);
    return { data: null, error: err.message || 'Something went wrong during sign in' };
  }
}

/**
 * Sign in with Google (OAuth)
 */
async function signInWithGoogle() {
  try {
    // OAuth still needs to be handled by Supabase redirect directly for browser support
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/index.html'
      }
    });
    if (error) throw error;
  } catch (err) {
    console.error('Google Sign In Error:', err);
    if (typeof showToast === 'function') showToast('Google login failed', 'error');
  }
}

/**
 * Sign out current user
 */
async function signOut() {
  try {
    const headers = await getAuthHeaders();
    // 1. Tell the server to invalidate session via proxy
    fetch('/api/deals', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'sign_out' })
    }).catch(err => console.warn('Signout proxy call failed:', err));

    // 2. Clear client-side session
    await supabaseClient.auth.signOut();
    _cachedUser = null;
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Sign Out Error:', err);
    if (typeof showToast === 'function') showToast('Error signing out', 'error');
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
let _userPromise = null;

/**
 * Get current authenticated user
 * Uses in-memory cache and getSession for maximum performance
 */
async function getCurrentUser() {
  if (_cachedUser) return _cachedUser;
  if (_userPromise) return _userPromise;
  
  _userPromise = (async () => {
    try {
      // getSession is near-instant as it reads from local storage/cookies
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (session?.user) {
        // If we have a local session, we're likely logged in.
        // We'll return this immediately to keep the UI responsive,
        // but we'll verify it via our PROXY in the background (or foreground if requested)
        _cachedUser = session.user;
        
        // Use proxy to verify the user instead of direct Supabase auth.getUser() 
        // This bypasses potential ISP blocks on the Supabase domain.
        fetch(`/api/deals?type=get_user`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }).then(res => res.json()).then(data => {
          if (data?.user) _cachedUser = data.user;
        }).catch(err => console.warn('User verification via proxy failed:', err));

        return _cachedUser;
      }
      
      // Fallback if no local session
      return null;
    } catch (err) {
      console.error('getCurrentUser error:', err);
      return null;
    } finally {
      _userPromise = null;
    }
  })();
  
  return _userPromise;
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
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reset_password',
        email,
        redirectTo: window.location.origin + '/login.html'
      })
    });

    const result = await res.json();
    if (result.error) return { error: result.error };
    return { error: null };
  } catch (err) {
    console.error('resetPassword error:', err);
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
    const headers = await getAuthHeaders();
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'update_password',
        password: newPassword
      })
    });

    const result = await res.json();
    if (result.error) return { error: result.error };
    return { error: null };
  } catch (err) {
    console.error('updatePassword error:', err);
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

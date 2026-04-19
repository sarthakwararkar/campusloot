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

    // Create user profile in profiles table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          full_name: name,
          college_name: college,
          city: city
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
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
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showToast('Error signing out', 'error');
  }
}

/**
 * Get the currently logged-in user
 * @returns {Promise<Object|null>}
 */
async function getCurrentUser() {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Get the current user's profile from the users table
 * @returns {Promise<Object|null>}
 */
async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const res = await fetch(`/api/deals?type=profile&id=${user.id}`);
    if (!res.ok) return null;
    const { profile } = await res.json();
    return profile;
  } catch (err) {
    console.error('Error fetching profile via proxy:', err);
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

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
        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingProfile) {
          // Create profile from Google metadata
          const meta = user.user_metadata || {};
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: meta.full_name || meta.name || '',
            avatar_url: meta.avatar_url || meta.picture || '',
            college_name: '',
            city: ''
          });
          console.log('[Auth] Created profile for Google user:', user.email);
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
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: 'Something went wrong. Please try again.' };
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

    const { data, error } = await supabase.storage
      .from('avatar')
      .upload(fileName, file, { 
        upsert: true,
        cacheControl: '3600'
      });

    if (error) return { url: null, error: error.message };

    const { data: { publicUrl } } = supabase.storage
      .from('avatar')
      .getPublicUrl(fileName);

    return { url: publicUrl, error: null };
  } catch (err) {
    console.error('[Auth] Upload failure:', err);
    return { url: null, error: 'Critical upload failure.' };
  }
}

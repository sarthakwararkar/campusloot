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
 * Sign in with Google OAuth (placeholder — needs OAuth setup)
 */
async function signInWithGoogle() {
  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/index.html'
      }
    });

    if (error) {
      showToast('Google login is not yet configured. Please use email login.', 'error');
    }
  } catch (err) {
    showToast('Google login is not yet configured. Please use email login.', 'error');
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

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
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
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
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
 * Update user profile
 * @param {string} userId
 * @param {Object} updates - { full_name, college_name, city }
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

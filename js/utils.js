/**
 * utils.js — Utility / helper functions
 * Sanitization, toast notifications, formatting, validation
 */

/**
 * Sanitize user input: strip HTML tags, trim, limit length
 * @param {string} str - raw input
 * @param {number} maxLength - max allowed length (default 500)
 * @returns {string} sanitized string
 */
function sanitizeInput(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  // Strip HTML tags
  const div = document.createElement('div');
  div.textContent = str;
  let clean = div.textContent || div.innerText || '';
  clean = clean.trim();
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }
  return clean;
}

/**
 * Escape HTML for XSS prevention
 * @param {string} str
 * @returns {string} escaped string
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Normalize a string to an http(s) URL for <img src>
 * @param {string} str
 * @returns {string|null}
 */
function normalizeHttpUrl(str) {
  if (!str || typeof str !== 'string') return null;
  const t = str.trim();
  if (!t) return null;
  if (t.startsWith('//')) return `https:${t}`;
  if (/^https?:\/\//i.test(t)) return t;
  return null;
}

/**
 * First usable image URL from common Supabase / API column names
 * @param {Object} deal
 * @returns {string|null}
 */
function firstDealImageFieldUrl(deal) {
  if (!deal) return null;
  const keys = ['image_url', 'thumbnail_url', 'logo_url', 'image'];
  for (const k of keys) {
    const u = normalizeHttpUrl(deal[k]);
    if (u) return u;
  }
  return null;
}

/**
 * Favicon URL derived from deal link (when no custom image exists or it fails)
 * @param {Object} deal
 * @returns {string|null}
 */
function dealFaviconUrl(deal) {
  if (!deal) return null;
  const raw = deal.affiliate_url || deal.deal_url;
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '#') return null;
  try {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(href);
    if (!u.hostname || u.hostname === 'localhost') return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=128`;
  } catch {
    return null;
  }
}

/**
 * Alt text for deal images
 * @param {Object} deal
 * @returns {string}
 */
function getDealImageAlt(deal) {
  if (!deal) return 'Deal';
  return deal.brand_name || deal.title || 'Deal';
}

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = icons[type] || icons.info;
  toast.appendChild(icon);

  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);

  container.appendChild(toast);

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Format a timestamp into relative time (e.g., "2 days ago")
 * @param {string} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) > 1 ? 's' : ''} ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} month${Math.floor(diffDay / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDay / 365)} year${Math.floor(diffDay / 365) > 1 ? 's' : ''} ago`;
}

/**
 * Detect user currency based on IP or fallback to INR
 * @returns {Promise<string>} 'INR' or 'USD'
 */
async function getUserCurrency() {
  const cached = localStorage.getItem('cl_currency');
  if (cached) return cached;

  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const currency = data.country_code === 'IN' ? 'INR' : 'USD';
    localStorage.setItem('cl_currency', currency);
    return currency;
  } catch (err) {
    // Silent fallback to INR for local/CORS issues to keep console clean
    return 'INR';
  }
}

/**
 * Global currency state (initialized on page load)
 */
let USER_CURRENCY = 'INR';
try {
  USER_CURRENCY = localStorage.getItem('cl_currency') || 'INR';
} catch(e) {
  console.warn('localStorage blocked, defaulting to INR');
}
getUserCurrency().then(c => { 
  if (c !== USER_CURRENCY) {
    USER_CURRENCY = c;
    // Trigger a re-render if needed, or just let natural navigation handle it
  }
});

const EXCHANGE_RATE = 83.0; // 1 USD = 83 INR

/**
 * Format and convert price based on user location
 * @param {string|number} price
 * @returns {string}
 */
function formatPrice(price) {
  if (!price && price !== 0) return '';
  let str = String(price).trim();
  
  // Handle non-numeric price strings
  const lowerStr = str.toLowerCase();
  if (lowerStr === 'free' || lowerStr === 'varies' || str.startsWith('%') || str.includes('% OFF') || lowerStr.includes('pricing')) {
    return str;
  }

  const isUSD = str.includes('$');
  const isINR = str.includes('₹');
  
  // Extract numeric value
  let numericValue = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (isNaN(numericValue)) return str;

  // Conversion and Formatting logic
  if (USER_CURRENCY === 'INR') {
    if (isUSD) {
      numericValue = Math.round(numericValue * EXCHANGE_RATE);
    }
    // Format as Indian Currency (e.g. ₹1,500)
    return `₹${numericValue.toLocaleString('en-IN')}`;
  } else {
    // For International Students (USD)
    if (isINR || (!isUSD && !isINR)) {
      // Convert INR to USD
      numericValue = (numericValue / EXCHANGE_RATE).toFixed(2);
    }
    // Format as USD (e.g. $19.99)
    return `$${numericValue}`;
  }
}

/**
 * Check if user has exceeded daily submission limit (max 3 per day)
 * @param {string} userId
 * @returns {Promise<boolean>} true if under the limit (can submit)
 */
async function checkSubmissionLimit(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count, error } = await supabaseClient
    .from('deal_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('submitted_by', userId)
    .gte('created_at', today.toISOString());

  if (error) return false;
  return count < 3;
}

/**
 * Basic email validation
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  // Block temporary/disposable email domains
  const blockedDomains = ['tempmail.com', 'throwaway.email', 'guerrillamail.com', 'yopmail.com', 'mailinator.com', 'trashmail.com', '10minutemail.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  return !blockedDomains.includes(domain);
}

/**
 * Validate password (min 8 chars, must contain letter and number)
 * @param {string} password
 * @returns {{valid: boolean, message: string}}
 */
function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true, message: '' };
}

/**
 * Get URL query parameter
 * @param {string} name
 * @returns {string|null}
 */
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Debounce function for search input
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Set loading state on a button
 * @param {HTMLElement} btn
 * @param {boolean} loading
 */
function setButtonLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader loader-sm"></span>';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || 'Submit';
  }
}

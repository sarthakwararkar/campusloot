/**
 * analytics.js — Lightweight event tracking & analytics
 * Integrates with Google Analytics 4 (GA4) when configured.
 * Also provides internal analytics via Supabase for deal clicks.
 */

// ---- Google Analytics 4 ----
// Replace 'G-XXXXXXXXXX' with your actual GA4 measurement ID
const GA_MEASUREMENT_ID = 'G-0PYTSBMC55';

if (GA_MEASUREMENT_ID) {
  // Load gtag.js asynchronously
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href
  });

  // Make gtag globally accessible
  window.gtag = gtag;
}

// ---- Internal Analytics ----

/**
 * Track an outbound deal click (for affiliate revenue tracking)
 * @param {string} dealId
 * @param {string} destinationUrl
 * @param {string} source - where the click came from ('card', 'detail', 'trending')
 */
async function trackDealClick(dealId, destinationUrl, source = 'detail') {
  // GA4 event
  if (window.gtag) {
    window.gtag('event', 'deal_click', {
      deal_id: dealId,
      destination_url: destinationUrl,
      click_source: source
    });
  }

  // Supabase analytics (non-blocking)
  try {
    const user = await getCurrentUser?.();
    await supabase?.from('analytics_clicks')?.insert({
      deal_id: dealId,
      user_id: user?.id || null,
      destination_url: destinationUrl,
      source: source,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent
    });
  } catch (err) {
    // Silent fail — analytics should never break the user experience
    console.debug('[Analytics] Click tracking failed:', err.message);
  }
}

/**
 * Track a page view (for internal analytics)
 * @param {string} pageName
 */
function trackPageView(pageName) {
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: pageName,
      page_location: window.location.href
    });
  }
}

/**
 * Track a signup event
 * @param {string} method - 'email' or 'google'
 */
function trackSignup(method) {
  if (window.gtag) {
    window.gtag('event', 'sign_up', { method: method });
  }
}

/**
 * Track a deal save event
 * @param {string} dealId
 */
function trackDealSave(dealId) {
  if (window.gtag) {
    window.gtag('event', 'deal_save', { deal_id: dealId });
  }
}

/**
 * Track a search event
 * @param {string} searchTerm
 */
function trackSearch(searchTerm) {
  if (window.gtag) {
    window.gtag('event', 'search', { search_term: searchTerm });
  }
}

/**
 * cookie-consent.js — Shared cookie consent banner
 * Include this once on every page instead of duplicating the inline script.
 */
(function () {
  if (localStorage.getItem('cookieConsent')) return;

  const banner = document.createElement('div');
  banner.id = 'cookie-consent-banner';
  banner.style.cssText = [
    'position:fixed', 'bottom:0', 'left:0', 'right:0',
    'background:rgba(10,10,10,0.95)', 'backdrop-filter:blur(20px)',
    '-webkit-backdrop-filter:blur(20px)',
    'color:#fff', 'padding:16px 24px', 
    'font-family:Inter,sans-serif', 'z-index:9999',
    'display:flex', 'justify-content:center', 'align-items:center',
    'gap:16px', 'flex-wrap:wrap',
    'border-top:1px solid rgba(255,255,255,0.1)',
    'box-shadow:0 -8px 32px rgba(0,0,0,0.4)'
  ].join(';');

  banner.innerHTML = `
    <span style="font-size:14px;color:#94a3b8;">
      We use cookies to improve your experience. See our 
      <a href="privacy.html" style="color:#818cf8;text-decoration:underline;">Privacy Policy</a>.
    </span>
    <div style="display:flex;gap:8px;">
      <button id="cookie-accept" style="background:#4f46e5;color:#fff;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;transition:background 0.2s;">Accept</button>
      <button id="cookie-decline" style="background:transparent;color:#94a3b8;border:1px solid rgba(255,255,255,0.15);padding:8px 20px;border-radius:8px;cursor:pointer;font-size:13px;transition:all 0.2s;">Decline</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('cookie-accept').onclick = function () {
    localStorage.setItem('cookieConsent', 'accepted');
    banner.style.display = 'none';
  };
  document.getElementById('cookie-decline').onclick = function () {
    localStorage.setItem('cookieConsent', 'declined');
    banner.style.display = 'none';
  };
})();

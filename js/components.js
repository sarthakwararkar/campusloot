/**
 * components.js — Reusable UI component render functions
 * All dynamic content uses textContent for XSS safety
 * Updated: 2026-03-26 17:35
 */

/**
 * Mount deal image (custom URL, then site favicon, then letter placeholder)
 * @param {HTMLElement} container - .deal-card-image or .deal-detail-image
 * @param {Object} deal
 * @param {Object} [options]
 * @param {string} [options.placeholderClass]
 * @param {string} [options.imgClass]
 * @param {boolean} [options.lazy=true]
 */
function mountDealImage(container, deal, options = {}) {
  const placeholderClass = options.placeholderClass || 'deal-card-image-placeholder';
  const lazy = options.lazy !== false;
  const primary = firstDealImageFieldUrl(deal);
  const favicon = dealFaviconUrl(deal);
  const alt = getDealImageAlt(deal);

  const showPlaceholder = () => {
    const ph = document.createElement('div');
    ph.className = placeholderClass;
    const letter = (alt || '?').trim().charAt(0) || '?';
    ph.textContent = letter.toUpperCase();
    ph.setAttribute('aria-hidden', 'true');
    container.appendChild(ph);
  };

  const appendImg = (src, allowFaviconFallback) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    if (options.imgClass) img.className = options.imgClass;
    if (lazy) img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      img.remove();
      if (allowFaviconFallback && favicon && src !== favicon) {
        appendImg(favicon, false);
      } else {
        showPlaceholder();
      }
    };
    container.appendChild(img);
  };

  if (primary) {
    appendImg(primary, Boolean(favicon));
  } else if (favicon) {
    appendImg(favicon, false);
  } else {
    showPlaceholder();
  }
}

/**
 * Render a deal card element
 * @param {Object} deal - deal data from Supabase
 * @param {Object} options - { savedDeals: Set, showSave: boolean }
 * @returns {HTMLElement}
 */
function renderDealCard(deal, options = {}) {
  const { savedDeals = new Set(), showSave = true } = options;
  const isSaved = savedDeals.has(deal.id);

  const card = document.createElement('article');
  card.className = 'deal-card group relative bg-white/12 backdrop-blur-2xl border border-white/20 rounded-2xl p-5 hover:border-indigo-400/50 transition-all duration-500 cursor-pointer overflow-hidden shadow-2xl';
  card.dataset.dealId = deal.id;
  card.dataset.category = deal.category;
  card.addEventListener('click', (e) => {
    if (e.target.closest('.save-btn')) return;
    if (deal.id) {
      window.location.href = `deal.html?id=${encodeURIComponent(deal.id)}`;
    } else {
      console.error('renderDealCard: Deal ID missing on card click', deal);
    }
  });

  if (showSave) {
    const saveContainer = document.createElement('div');
    saveContainer.className = 'absolute top-6 right-6 z-10';
    const saveBtn = document.createElement('button');
    saveBtn.className = `w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center transition-colors save-btn ${isSaved ? 'saved text-error' : 'text-on-surface-variant hover:text-error'}`;
    saveBtn.innerHTML = `<span class="material-symbols-outlined text-xl" style="${isSaved ? 'font-variation-settings: \\"FILL\\" 1;' : ''}">bookmark</span>`;
    saveBtn.onclick = (e) => {
      e.stopPropagation();
      handleSaveClick(deal.id, saveBtn);
    };
    saveContainer.appendChild(saveBtn);
    card.appendChild(saveContainer);
  }

  const hasBanner = !!deal.image_url;
  const imageDiv = document.createElement('div');
  imageDiv.className = hasBanner
    ? 'deal-card-image aspect-[16/9] md:aspect-[4/3] rounded-xl bg-slate-50 mb-6 overflow-hidden flex items-center justify-center transition-opacity'
    : 'deal-card-image aspect-square rounded-xl bg-slate-50 mb-6 overflow-hidden flex items-center justify-center p-8 transition-opacity';

  mountDealImage(imageDiv, deal, {
    placeholderClass: 'text-6xl text-on-surface-variant font-black opacity-30 select-none',
    imgClass: hasBanner ? 'w-full h-full object-cover' : 'w-24 h-24 object-contain mix-blend-multiply'
  });
  card.appendChild(imageDiv);

  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'space-y-1 mb-6';

  const titleRow = document.createElement('div');
  titleRow.className = 'flex items-center gap-2';
  const priceSpan = document.createElement('span');
  priceSpan.className = 'text-indigo-400 font-bold text-2xl drop-shadow-[0_0_10px_rgba(129,140,248,0.3)]';
  priceSpan.textContent = formatPrice(deal.deal_price || deal.discount_text || 'Free');
  titleRow.appendChild(priceSpan);

  if (deal.is_featured) {
    const verifiedBadge = document.createElement('span');
    verifiedBadge.className = 'bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide';
    verifiedBadge.textContent = 'Featured';
    titleRow.appendChild(verifiedBadge);
  }

  // Sponsored badge
  if (deal.is_sponsored) {
    const sponsoredBadge = document.createElement('span');
    sponsoredBadge.className = 'bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide';
    sponsoredBadge.textContent = 'Sponsored';
    titleRow.appendChild(sponsoredBadge);
  }
  bodyDiv.appendChild(titleRow);

  const brandObj = document.createElement('h3');
  brandObj.className = 'font-semibold text-lg text-white/90 line-clamp-1';
  brandObj.textContent = deal.brand_name || 'Brand';
  bodyDiv.appendChild(brandObj);

  const descObj = document.createElement('p');
  descObj.className = 'text-sm text-white/50 line-clamp-1';
  descObj.textContent = deal.title || deal.description || '';
  bodyDiv.appendChild(descObj);

  // Expiry countdown badge
  if (deal.expires_at) {
    const expiryDate = new Date(deal.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0 && daysLeft <= 3) {
      const expiryBadge = document.createElement('span');
      expiryBadge.className = 'text-xs text-amber-400 font-bold mt-1 flex items-center gap-1';
      expiryBadge.innerHTML = `<span class="material-symbols-outlined text-sm">timer</span> ${daysLeft === 1 ? 'Expires tomorrow' : 'Expires in ' + daysLeft + ' days'}`;
      bodyDiv.appendChild(expiryBadge);
    } else if (daysLeft <= 0) {
      const expiredBadge = document.createElement('span');
      expiredBadge.className = 'text-xs text-red-400 font-bold mt-1 flex items-center gap-1';
      expiredBadge.innerHTML = `<span class="material-symbols-outlined text-sm">event_busy</span> Expired`;
      bodyDiv.appendChild(expiredBadge);
    }
  }

  // Coupon code copy button
  if (deal.coupon_code) {
    const couponDiv = document.createElement('div');
    couponDiv.className = 'flex items-center gap-2 mt-2 bg-emerald-900/20 border border-emerald-500/20 rounded-lg px-3 py-1.5';
    const codeSpan = document.createElement('span');
    codeSpan.className = 'text-emerald-400 font-mono font-bold text-sm flex-1';
    codeSpan.textContent = deal.coupon_code;
    couponDiv.appendChild(codeSpan);
    const copyBtn = document.createElement('button');
    copyBtn.className = 'text-emerald-400/60 hover:text-emerald-300 transition-colors';
    copyBtn.innerHTML = '<span class="material-symbols-outlined text-sm">content_copy</span>';
    copyBtn.title = 'Copy code';
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(deal.coupon_code).then(() => showToast('Coupon code copied!', 'success'));
    };
    couponDiv.appendChild(copyBtn);
    bodyDiv.appendChild(couponDiv);
  }

  card.appendChild(bodyDiv);

  // Source badge for verified scraped deals
  if (deal.source === 'scraped' && deal.is_verified) {
    const badge = document.createElement('span');
    badge.className = 'badge-verified';
    badge.textContent = '✓ Verified';
    badge.style.position = 'absolute';
    badge.style.top = '12px';
    badge.style.left = '12px';
    badge.style.zIndex = '2';
    card.appendChild(badge);
  }

  const claimBtn = document.createElement('a');
  claimBtn.className = 'w-full py-3 mt-2 bg-white/5 text-indigo-400 font-bold rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm border border-white/5 group-hover:border-indigo-400 shadow-inner no-underline';
  claimBtn.innerHTML = `View Deal <span class="material-symbols-outlined text-lg">arrow_forward</span>`;
  
  if (deal.id) {
    claimBtn.href = `deal.html?id=${encodeURIComponent(deal.id)}`;
  } else {
    claimBtn.href = '#';
    console.warn('renderDealCard: Deal ID missing', deal);
  }

  claimBtn.onclick = (e) => {
    e.stopPropagation();
    // Standard link behavior will take over for navigation
  };
  card.appendChild(claimBtn);

  return card;
}

/**
 * Handle save/unsave click on deal card
 * @param {string} dealId
 * @param {HTMLElement} btn
 */
async function handleSaveClick(dealId, btn) {
  const user = await getCurrentUser();
  if (!user) {
    showLoginModal();
    return;
  }
  const isSaved = btn.classList.contains('saved');
  try {
    const icon = btn.querySelector('.material-symbols-outlined');
    if (isSaved) {
      await unsaveDeal(dealId);
      btn.classList.remove('saved', 'text-error');
      btn.classList.add('text-on-surface-variant');
      if (icon) icon.style.fontVariationSettings = '"FILL" 0';
      btn.title = 'Save deal';
      showToast('Deal removed from saves', 'info');
    } else {
      await saveDeal(dealId);
      btn.classList.add('saved', 'text-error');
      btn.classList.remove('text-on-surface-variant');
      if (icon) icon.style.fontVariationSettings = '"FILL" 1';
      btn.title = 'Unsave deal';
      showToast('Deal saved!', 'success');
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

/**
 * Render a loader/spinner
 * @param {string} size - 'sm' or default
 * @returns {HTMLElement}
 */
function renderLoader(size = '') {
  const container = document.createElement('div');
  container.className = 'loader-container';
  const spinner = document.createElement('div');
  spinner.className = `loader ${size === 'sm' ? 'loader-sm' : ''}`;
  container.appendChild(spinner);
  return container;
}

/**
 * Render an empty state component
 * @param {string} icon - emoji icon
 * @param {string} title
 * @param {string} message
 * @param {Object} action - { text, href } for optional CTA button
 * @returns {HTMLElement}
 */
function renderEmptyState(icon, title, message, action = null) {
  const container = document.createElement('div');
  container.className = 'empty-state';

  const iconEl = document.createElement('div');
  iconEl.className = 'empty-state-icon';
  iconEl.textContent = icon;
  container.appendChild(iconEl);

  const h3 = document.createElement('h3');
  h3.textContent = title;
  container.appendChild(h3);

  const p = document.createElement('p');
  p.textContent = message;
  container.appendChild(p);

  if (action) {
    const btn = document.createElement('a');
    btn.href = action.href || '#';
    btn.className = 'btn btn-primary';
    btn.textContent = action.text;
    container.appendChild(btn);
  }

  return container;
}

/**
 * Show a login prompt modal
 */
function showLoginModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const modal = document.createElement('div');
  modal.className = 'modal';

  modal.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'modal-header';
  const h3 = document.createElement('h3');
  h3.textContent = 'Login Required';
  header.appendChild(h3);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => overlay.remove());
  header.appendChild(closeBtn);
  modal.appendChild(header);

  const body = document.createElement('div');
  body.className = 'modal-body';
  body.textContent = 'You need to be logged in to save deals and access premium features. Create a free account to get started!';
  modal.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-ghost';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());
  actions.appendChild(cancelBtn);

  const loginBtn = document.createElement('a');
  loginBtn.href = 'login.html';
  loginBtn.className = 'btn btn-primary';
  loginBtn.textContent = 'Login / Sign Up';
  actions.appendChild(loginBtn);

  modal.appendChild(actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

/**
 * Render a category pill
 * @param {string} category - category name
 * @param {boolean} isActive
 * @param {Function} onClick - callback when clicked
 * @returns {HTMLElement}
 */
function renderCategoryPill(category, isActive, onClick) {
  const pill = document.createElement('button');
  pill.className = `category-pill ${isActive ? 'active' : ''}`;
  pill.dataset.category = category;
  pill.textContent = category === 'all' ? '🔥 All' : getCategoryLabel(category);
  pill.addEventListener('click', () => onClick(category));
  return pill;
}

/**
 * Map category key to display label with emoji
 * @param {string} key
 * @returns {string}
 */
function getCategoryLabel(key) {
  const labels = {
    'all': '🔥 All',
    'software': '💻 Software',
    'food': '🍕 Food',
    'courses': '📚 Courses',
    'ott': '🎬 OTT',
    'local': '📍 Local',
    'other': '🎁 Other',
    'services': '🛠️ Services',
    'electronics': '📱 Electronics',
    'clothing': '👕 Clothing'
  };
  return labels[key] || key;
}

/**
 * Render skeleton loading cards
 * @param {number} count
 * @returns {HTMLElement}
 */
function renderSkeletonCards(count = 6) {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'deal-card';
    card.innerHTML = `
      <div class="deal-card-image skeleton" style="height:180px"></div>
      <div class="deal-card-body">
        <div class="skeleton" style="height:14px;width:60px;margin-bottom:12px"></div>
        <div class="skeleton" style="height:22px;width:100%;margin-bottom:12px"></div>
        <div class="skeleton" style="height:16px;width:100px;margin-bottom:20px"></div>
        <div style="display:flex;justify-content:space-between;padding-top:16px;border-top:1px solid var(--border-light)">
          <div class="skeleton" style="height:24px;width:70px"></div>
          <div class="skeleton" style="height:36px;width:90px;border-radius:10px"></div>
        </div>
      </div>
    `;
    fragment.appendChild(card);
  }
  return fragment;
}

/**
 * Render the site header
 * @param {string} activePage - current page identifier
 */
function renderHeader(activePage = '') {
  const header = document.getElementById('site-header');
  if (!header) {
    console.warn('Site header container not found');
    return;
  }

  header.className = 'header w-full z-50';
  header.innerHTML = `
    <div class="header-inner">
      <a href="index.html" class="logo group">
        <div class="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
          <span class="material-symbols-outlined text-indigo-400 text-2xl" style="font-variation-settings: 'FILL' 1;">rocket_launch</span>
        </div>
        <span class="text-xl font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">Campus<span class="text-indigo-400">Loot</span></span>
      </a>
      <nav class="nav-links hidden md:flex" id="nav-links">
        <a href="deals.html" class="text-sm font-medium ${activePage === 'deals' ? 'active' : ''} transition-colors">Explore</a>
        <a href="categories.html" class="text-sm font-medium ${activePage === 'categories' ? 'active' : ''} transition-colors">Categories</a>
        <a href="trending.html" class="text-sm font-medium ${activePage === 'trending' ? 'active' : ''} transition-colors">Trending</a>
      </nav>
      <div class="nav-auth hidden md:flex" id="nav-auth"></div>
      <button class="hamburger md:hidden text-white" id="hamburger-btn" aria-label="Toggle menu">
        <span class="material-symbols-outlined">menu</span>
      </button>
    </div>
    <div class="hidden md:hidden bg-black/95 backdrop-blur-2xl border-b border-white/5" id="mobile-nav">
      <div class="flex flex-col p-6 gap-4">
        <a href="deals.html" class="text-slate-400 hover:text-white font-medium">Explore</a>
        <a href="categories.html" class="text-slate-400 hover:text-white font-medium">Categories</a>
        <a href="trending.html" class="text-slate-400 hover:text-white font-medium">Trending</a>
        <div id="mobile-auth" class="pt-4 border-t border-white/5 flex flex-col gap-2"></div>
      </div>
    </div>
  `;

  // Hamburger toggle
  const hamburger = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.toggle('hidden');
    });
  }

  // Update auth buttons
  updateAuthNav();
}

/**
 * Update the auth section in the header based on login state
 */
async function updateAuthNav() {
  const navAuth = document.getElementById('nav-auth');
  const mobileAuth = document.getElementById('mobile-auth');
  if (!navAuth) return;

  const user = await getCurrentUser();

  if (user) {
    let profile = null;
    try {
      // Use the proxy-powered function from auth.js
      profile = await getCurrentProfile();
    } catch (err) {
      console.error('Failed to fetch profile in nav, falling back to email', err);
    }

    const name = profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0];
    const isAdmin = profile?.role === 'admin';

    navAuth.innerHTML = '';

    if (isAdmin) {
      const adminLink = document.createElement('a');
      adminLink.href = 'admin.html';
      adminLink.className = 'text-sm font-medium text-slate-400 hover:text-white transition-colors';
      adminLink.textContent = 'Admin';
      navAuth.appendChild(adminLink);
    }

    const profileLink = document.createElement('a');
    profileLink.href = 'profile.html';
    profileLink.className = 'flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors';
    
    // Create avatar element
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'w-7 h-7 flex items-center justify-center';
    
    if (profile?.avatar_url) {
      const avatarImg = document.createElement('img');
      avatarImg.src = profile.avatar_url;
      avatarImg.className = 'w-7 h-7 rounded-full object-cover border border-white/10';
      avatarImg.loading = 'eager'; // Prioritize profile image
      avatarContainer.appendChild(avatarImg);
    } else {
      const avatarIcon = document.createElement('span');
      avatarIcon.className = 'material-symbols-outlined text-lg';
      avatarIcon.textContent = 'account_circle';
      avatarContainer.appendChild(avatarIcon);
    }
    profileLink.appendChild(avatarContainer);
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    profileLink.appendChild(nameSpan);
    navAuth.appendChild(profileLink);

    const settingsHeaderLink = document.createElement('a');
    settingsHeaderLink.href = 'settings.html';
    settingsHeaderLink.className = 'text-sm font-medium text-slate-400 hover:text-white transition-colors ml-4';
    settingsHeaderLink.innerHTML = '<span class="material-symbols-outlined text-lg align-bottom">settings</span>';
    settingsHeaderLink.title = 'Settings';
    navAuth.appendChild(settingsHeaderLink);

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'px-5 py-2 text-sm font-bold text-slate-300 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', async () => {
      await signOut();
      window.location.href = 'index.html';
    });
    navAuth.appendChild(logoutBtn);

    // Mobile auth
    if (mobileAuth) {
      mobileAuth.innerHTML = '';
      if (isAdmin) {
        const mAdminLink = document.createElement('a');
        mAdminLink.href = 'admin.html';
        mAdminLink.textContent = '⚙️ Admin Dashboard';
        mobileAuth.appendChild(mAdminLink);
      }
      const mProfileLink = document.createElement('a');
      mProfileLink.href = 'profile.html';
      mProfileLink.textContent = `👤 ${name}`;
      mobileAuth.appendChild(mProfileLink);

      const mSettingsLink = document.createElement('a');
      mSettingsLink.href = 'settings.html';
      mSettingsLink.textContent = `⚙️ Settings`;
      mobileAuth.appendChild(mSettingsLink);
      const mLogoutLink = document.createElement('a');
      mLogoutLink.href = '#';
      mLogoutLink.textContent = 'Logout';
      mLogoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await signOut();
        window.location.href = 'index.html';
      });
      mobileAuth.appendChild(mLogoutLink);
    }
  } else {
    navAuth.innerHTML = '';
    const loginBtn = document.createElement('a');
    loginBtn.href = 'login.html';
    loginBtn.className = 'text-sm font-medium text-slate-400 hover:text-white transition-colors';
    loginBtn.textContent = 'Login';
    navAuth.appendChild(loginBtn);

    const joinBtn = document.createElement('a');
    joinBtn.href = 'login.html';
    joinBtn.className = 'px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-full hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20';
    joinBtn.textContent = 'Join';
    navAuth.appendChild(joinBtn);

    if (mobileAuth) {
      mobileAuth.innerHTML = '';
      const mLoginLink = document.createElement('a');
      mLoginLink.href = 'login.html';
      mLoginLink.textContent = '🔑 Login / Sign Up';
      mobileAuth.appendChild(mLoginLink);
    }
  }
}

/**
 * Render the site footer
 */
function renderFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;

  footer.className = 'w-full bg-black/80 backdrop-blur-2xl border-t border-white/5 py-16 relative z-10';
  footer.innerHTML = `
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <a href="index.html" class="flex items-center gap-2 group">
          <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <span class="material-symbols-outlined text-white text-xl" style="font-variation-settings: 'FILL' 1;">shopping_bag</span>
          </div>
          <span class="text-2xl font-bold tracking-tight text-white">Campus<span class="text-indigo-400">Loot</span></span>
        </a>
        <div class="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          <a href="privacy.html" class="text-sm font-medium text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
          <a href="terms.html" class="text-sm font-medium text-slate-400 hover:text-white transition-colors">Terms of Service</a>
          <a href="advertise.html" class="text-sm font-medium text-slate-400 hover:text-white transition-colors">Partner with Us</a>
          <a href="contact.html" class="text-sm font-medium text-slate-400 hover:text-white transition-colors">Contact</a>
        </div>
      </div>
      <div class="flex flex-col md:flex-row items-center justify-between pt-10 border-t border-white/5 text-sm text-slate-500">
        <p>© ${new Date().getFullYear()} CampusLoot. Empowering the next generation of leaders.</p>
        <p>Student verified India wide.</p>
      </div>
    </div>
  `;
}
/**
 * Render a standardized pagination component
 * @param {string} containerId - The ID of the container element
 * @param {number} currentPage - Currently active page
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items per page
 * @param {function} onPageChange - Callback function when a page is clicked
 */
function renderPagination(containerId, currentPage, totalItems, itemsPerPage, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return;

  const paginationNav = document.createElement('div');
  paginationNav.className = 'pagination-nav';

  // Limit visible pages (e.g., 1, 2, 3... last)
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onPageChange(i);
    });
    paginationNav.appendChild(btn);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement('span');
      dots.className = 'pagination-dots';
      dots.textContent = '...';
      paginationNav.appendChild(dots);
    }

    const lastBtn = document.createElement('button');
    lastBtn.className = `pagination-btn ${totalPages === currentPage ? 'active' : ''}`;
    lastBtn.textContent = totalPages;
    lastBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onPageChange(totalPages);
    });
    paginationNav.appendChild(lastBtn);
  }

  container.appendChild(paginationNav);
}

/**
 * Render a centralized floating navigation bar for mobile/dashboard
 * @param {string} activeItem - currently active nav item
 */
function renderFloatingNav(activeItem = '') {
  const navContainer = document.getElementById('floating-nav');
  if (!navContainer) return;

  const items = [
    { id: 'home', icon: 'home', label: 'Home', href: 'index.html' },
    { id: 'deals', icon: 'explore', label: 'Explore', href: 'deals.html' },
    { id: 'post', icon: 'add_circle', label: 'Post', href: 'submit.html', primary: true },
    { id: 'profile', icon: 'person', label: 'Profile', href: 'profile.html' },
    { id: 'settings', icon: 'settings', label: 'Settings', href: 'settings.html' }
  ];

  navContainer.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 shadow-2xl z-[100] transition-transform duration-500';
  
  navContainer.innerHTML = items.map(item => `
    <a href="${item.href}" 
       class="flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 relative group
              ${item.primary ? 'bg-indigo-600 text-white mx-1 shadow-lg shadow-indigo-600/40 hover:scale-110 active:scale-95' : 'text-slate-400 hover:text-white'}
              ${activeItem === item.id && !item.primary ? 'text-indigo-400 bg-white/5' : ''}"
       title="${item.label}">
      <span class="material-symbols-outlined ${item.primary ? 'text-2xl' : 'text-xl'}">${item.icon}</span>
    </a>
  `).join('');
}

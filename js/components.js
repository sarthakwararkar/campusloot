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
  card.className = 'group relative bg-surface-container-lowest rounded-3xl p-5 shadow-sm hover:shadow-[0_20px_50px_rgba(74,64,224,0.08)] transition-all duration-300 transform hover:-translate-y-2 cursor-pointer';
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
    saveBtn.className = `w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center transition-colors save-btn ${isSaved ? 'text-error' : 'text-on-surface-variant hover:text-error'}`;
    saveBtn.innerHTML = `<span class="material-symbols-outlined text-xl" style="${isSaved ? 'font-variation-settings: \\"FILL\\" 1;' : ''}">bookmark</span>`;
    saveBtn.onclick = (e) => {
      e.stopPropagation();
      handleSaveClick(deal.id, saveBtn);
      const icon = saveBtn.querySelector('span');
      if (saveBtn.classList.contains('saved')) {
          icon.style = 'font-variation-settings: "FILL" 1;';
          saveBtn.classList.remove('text-on-surface-variant');
          saveBtn.classList.add('text-error');
      } else {
          icon.style = '';
          saveBtn.classList.remove('text-error');
          saveBtn.classList.add('text-on-surface-variant');
      }
    };
    saveContainer.appendChild(saveBtn);
    card.appendChild(saveContainer);
  }

  const imageDiv = document.createElement('div');
  imageDiv.className = 'aspect-square rounded-2xl bg-surface-container-low mb-6 overflow-hidden flex items-center justify-center p-8 group-hover:scale-[1.02] transition-transform';
  mountDealImage(imageDiv, deal, { 
      placeholderClass: 'text-6xl text-on-surface-variant font-black opacity-30 select-none',
      imgClass: 'w-24 h-24 object-contain mix-blend-multiply'
  });
  card.appendChild(imageDiv);

  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'space-y-1 mb-6';

  const titleRow = document.createElement('div');
  titleRow.className = 'flex items-center gap-2';
  const priceSpan = document.createElement('span');
  priceSpan.className = 'text-primary font-bold text-2xl';
  priceSpan.textContent = formatPrice(deal.deal_price || deal.discount_text || 'Free');
  titleRow.appendChild(priceSpan);
  
  if (deal.is_featured) {
    const verifiedBadge = document.createElement('span');
    verifiedBadge.className = 'bg-tertiary-container/30 text-tertiary px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter';
    verifiedBadge.textContent = 'Featured';
    titleRow.appendChild(verifiedBadge);
  }
  bodyDiv.appendChild(titleRow);

  const brandObj = document.createElement('h3');
  brandObj.className = 'font-headline font-bold text-lg text-on-surface line-clamp-1';
  brandObj.textContent = deal.brand_name || 'Brand';
  bodyDiv.appendChild(brandObj);

  const descObj = document.createElement('p');
  descObj.className = 'text-sm text-on-surface-variant line-clamp-1';
  descObj.textContent = deal.title || deal.description || '';
  bodyDiv.appendChild(descObj);

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

  const claimBtn = document.createElement('button');
  claimBtn.className = 'w-full py-4 bg-surface-container-low text-primary font-bold rounded-2xl group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-secondary group-hover:text-white transition-all duration-300 flex items-center justify-center gap-2';
  claimBtn.innerHTML = `View Deal <span class="material-symbols-outlined text-lg">arrow_forward</span>`;
  claimBtn.onclick = (e) => { 
    e.stopPropagation(); 
    if (deal.id) {
      window.location.href = `deal.html?id=${encodeURIComponent(deal.id)}`; 
    } else {
      console.error('renderDealCard: Deal ID missing on button click', deal);
      // Fallback: try card dataset
      const id = card.dataset.dealId;
      if (id) {
        window.location.href = `deal.html?id=${encodeURIComponent(id)}`;
      }
    }
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
    if (isSaved) {
      await unsaveDeal(dealId);
      btn.classList.remove('saved');
      btn.innerHTML = '🤍';
      btn.title = 'Save deal';
      showToast('Deal removed from saves', 'info');
    } else {
      await saveDeal(dealId);
      btn.classList.add('saved');
      btn.innerHTML = '❤️';
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
  if (!header) return;

  header.className = 'header';
  header.innerHTML = `
    <div class="header-inner">
      <a href="index.html" class="logo">🎓 Campus<span>Loot</span></a>
      <nav class="nav-links" id="nav-links">
        <a href="index.html" class="${activePage === 'home' ? 'active' : ''}">Home</a>
        <a href="deals.html" class="${activePage === 'deals' ? 'active' : ''}">All Deals</a>
        <a href="categories.html" class="${activePage === 'categories' ? 'active' : ''}">Categories</a>
        <a href="trending.html" class="${activePage === 'trending' ? 'active' : ''}">Trending</a>
        <a href="submit.html" class="${activePage === 'submit' ? 'active' : ''}">Submit Deal</a>
      </nav>
      <div class="nav-auth" id="nav-auth"></div>
      <button class="hamburger" id="hamburger-btn" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
    </div>
    <div class="mobile-nav" id="mobile-nav">
      <a href="index.html">Home</a>
      <a href="deals.html">All Deals</a>
      <a href="categories.html">Categories</a>
      <a href="trending.html">Trending</a>
      <a href="submit.html">Submit a Deal</a>
      <div id="mobile-auth"></div>
    </div>
  `;

  // Hamburger toggle
  const hamburger = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav');
  hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
  });

  // Scroll shadow
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
  });

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
    // Fetch user profile for role check
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    const name = profile?.full_name || user.email.split('@')[0];
    const isAdmin = profile?.role === 'admin';

    navAuth.innerHTML = '';

    if (isAdmin) {
      const adminLink = document.createElement('a');
      adminLink.href = 'admin.html';
      adminLink.className = 'btn btn-ghost btn-sm';
      adminLink.textContent = '⚙️ Admin';
      navAuth.appendChild(adminLink);
    }

    const profileLink = document.createElement('a');
    profileLink.href = 'profile.html';
    profileLink.className = 'btn btn-ghost btn-sm';
    profileLink.textContent = `👤 ${name}`;
    navAuth.appendChild(profileLink);

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-outline btn-sm';
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
    loginBtn.className = 'btn btn-primary btn-sm';
    loginBtn.textContent = 'Login';
    navAuth.appendChild(loginBtn);

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

  footer.className = 'footer';
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="logo">🎓 Campus<span>Loot</span></a>
          <p>India's #1 student deals platform. Discover exclusive discounts, freebies, and offers curated just for college students.</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <div class="footer-links">
            <a href="index.html">Home</a>
            <a href="deals.html">All Deals</a>
            <a href="submit.html">Submit a Deal</a>
          </div>
        </div>
        <div>
          <h4>Categories</h4>
          <div class="footer-links">
            <a href="deals.html?category=software">Software</a>
            <a href="deals.html?category=courses">Courses</a>
            <a href="deals.html?category=ott">OTT</a>
            <a href="deals.html?category=food">Food</a>
          </div>
        </div>
        <div>
          <h4>Account</h4>
          <div class="footer-links">
            <a href="login.html">Login</a>
            <a href="profile.html">Profile</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        &copy; ${new Date().getFullYear()} CampusLoot. Made with 💜 for Indian students.
      </div>
    </div>
  `;
}

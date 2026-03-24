/**
 * components.js — Reusable UI component render functions
 * All dynamic content uses textContent for XSS safety
 */

/**
 * Mount deal image (custom URL, then site favicon, then letter placeholder)
 * @param {HTMLElement} container - .deal-card-image or .deal-detail-image
 * @param {Object} deal
 * @param {Object} [options]
 * @param {string} [options.placeholderClass]
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

  const card = document.createElement('div');
  card.className = 'deal-card';
  card.dataset.dealId = deal.id;
  card.dataset.category = deal.category;

  // Image section (URL from DB, else favicon from deal link, else placeholder)
  const imageDiv = document.createElement('div');
  imageDiv.className = 'deal-card-image';
  mountDealImage(imageDiv, deal, { placeholderClass: 'deal-card-image-placeholder' });

  // Featured badge
  if (deal.is_featured) {
    const featuredBadge = document.createElement('span');
    featuredBadge.className = 'badge badge-featured deal-card-featured';
    featuredBadge.textContent = '⭐ Featured';
    imageDiv.appendChild(featuredBadge);
  }

  // Save button
  if (showSave) {
    const saveBtn = document.createElement('button');
    saveBtn.className = `deal-card-save ${isSaved ? 'saved' : ''}`;
    saveBtn.innerHTML = isSaved ? '❤️' : '🤍';
    saveBtn.title = isSaved ? 'Unsave deal' : 'Save deal';
    saveBtn.setAttribute('aria-label', isSaved ? 'Unsave deal' : 'Save deal');
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleSaveClick(deal.id, saveBtn);
    });
    imageDiv.appendChild(saveBtn);
  }

  card.appendChild(imageDiv);

  // Body
  const body = document.createElement('div');
  body.className = 'deal-card-body';

  const category = document.createElement('div');
  category.className = 'deal-card-category';
  category.textContent = deal.category;
  body.appendChild(category);

  const title = document.createElement('h3');
  title.className = 'deal-card-title';
  const titleLink = document.createElement('a');
  titleLink.href = `deal.html?id=${deal.id}`;
  titleLink.textContent = deal.title;
  title.appendChild(titleLink);
  body.appendChild(title);

  const brand = document.createElement('div');
  brand.className = 'deal-card-brand';
  brand.textContent = deal.brand_name;
  body.appendChild(brand);

  // Footer with price and claim button
  const footer = document.createElement('div');
  footer.className = 'deal-card-footer';

  const priceDiv = document.createElement('div');
  priceDiv.className = 'deal-card-price';

  if (deal.original_price) {
    const originalPrice = document.createElement('span');
    originalPrice.className = 'original';
    originalPrice.textContent = deal.original_price;
    priceDiv.appendChild(originalPrice);
  }

  const currentPrice = document.createElement('span');
  currentPrice.className = 'current';
  currentPrice.textContent = deal.deal_price || deal.discount_text || 'Free';
  priceDiv.appendChild(currentPrice);

  footer.appendChild(priceDiv);

  const claimBtn = document.createElement('a');
  claimBtn.href = `deal.html?id=${deal.id}`;
  claimBtn.className = 'btn btn-primary btn-sm';
  claimBtn.textContent = 'View Deal';
  footer.appendChild(claimBtn);

  body.appendChild(footer);
  card.appendChild(body);

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
    'other': '🎁 Other'
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
      <div class="deal-card-image skeleton" style="height:160px"></div>
      <div class="deal-card-body">
        <div class="skeleton" style="height:14px;width:60px;margin-bottom:8px"></div>
        <div class="skeleton" style="height:20px;width:100%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:14px;width:80px;margin-bottom:16px"></div>
        <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border-light)">
          <div class="skeleton" style="height:20px;width:60px"></div>
          <div class="skeleton" style="height:32px;width:80px;border-radius:8px"></div>
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
      .from('users')
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

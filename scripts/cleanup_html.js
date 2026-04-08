/**
 * cleanup_html.js — One-time script to batch-fix all HTML pages:
 * 1. Remove `class="light"` from <html> tag
 * 2. Replace inline cookie consent banner with shared js/cookie-consent.js
 * 3. Add js/analytics.js and js/cookie-consent.js script tags
 * 4. Remove duplicate Material Symbols font links
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const files = [
  'submit.html', 'login.html', 'admin.html', 'profile.html',
  'trending.html', 'categories.html', 'privacy.html', 'terms.html',
  '404.html', 'forgot-password.html', 'verify-email.html'
];

files.forEach(f => {
  const filePath = path.join(dir, f);
  if (!fs.existsSync(filePath)) {
    console.log('Skipped (not found):', f);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Fix <html class="light" lang="en"> → <html lang="en">
  if (content.includes('class="light"')) {
    content = content.replace(/<html\s+class="light"\s+lang="en">/g, '<html lang="en">');
    changed = true;
  }

  // 2. Remove inline cookie consent banner script
  const cookiePattern = /\s*<!-- Cookie Consent Banner -->\s*<script>[\s\S]*?acceptCookies[\s\S]*?<\/script>/g;
  if (cookiePattern.test(content)) {
    content = content.replace(cookiePattern, '\n  <!-- Cookie consent loaded via js/cookie-consent.js -->');
    changed = true;
  }

  // 3. Add analytics.js if not present (before star-background.js)
  if (!content.includes('js/analytics.js')) {
    if (content.includes('js/star-background.js')) {
      content = content.replace(
        '<script src="js/star-background.js"></script>',
        '<script src="js/analytics.js"></script>\n    <script src="js/star-background.js"></script>'
      );
      changed = true;
    }
  }

  // 4. Add cookie-consent.js if not present (after star-background.js)
  if (!content.includes('js/cookie-consent.js')) {
    if (content.includes('js/star-background.js')) {
      content = content.replace(
        '<script src="js/star-background.js"></script>',
        '<script src="js/star-background.js"></script>\n    <script src="js/cookie-consent.js"></script>'
      );
      changed = true;
    }
  }

  // 5. Remove duplicate Material Symbols link tags
  const matSymPattern = /<link\s+href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined[^"]*"\s+rel="stylesheet"\s*\/?\s*>/g;
  const matches = content.match(matSymPattern);
  if (matches && matches.length > 1) {
    // Keep only the first occurrence
    let first = true;
    content = content.replace(matSymPattern, (match) => {
      if (first) { first = false; return match; }
      return ''; // Remove duplicates
    });
    // Clean up leftover blank lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', f);
  } else {
    console.log('No changes needed:', f);
  }
});

console.log('\nDone! All HTML files cleaned up.');

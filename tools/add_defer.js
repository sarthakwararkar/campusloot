const fs = require('fs');
const path = require('path');

const files = [
  'index.html', 'deals.html', 'deal.html', 'categories.html', 'trending.html',
  'login.html', 'profile.html', 'submit.html', 'admin.html', 'privacy.html',
  'terms.html', 'contact.html', 'advertise.html'
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add defer to <script src="..."> tags that don't already have it and aren't async
  // Specifically target external scripts we control or common CDNs
  content = content.replace(/<script(?![^>]*\b(defer|async)\b)(?=[^>]*\bsrc\b)[^>]*>/gi, (match) => {
    if (match.includes('defer') || match.includes('async')) return match;
    return match.replace('<script', '<script defer');
  });

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file} with defer tags.`);
});

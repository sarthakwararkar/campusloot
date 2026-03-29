const fs = require('fs');

// ==== Format Categories.html ====
let catHtml = fs.readFileSync('categories.html', 'utf8');
catHtml = catHtml.replace('<title>Explore Deals | UniDeals India</title>', '<title>Categories | UniDeals India</title>');
catHtml = catHtml.replace('>Latest Deals.</h1>', '>Category Deals.</h1>');

// Move underline
const exploreRegexStr = `class="text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 pb-1 font-['Plus_Jakarta_Sans'] font-bold tracking-tight transition-all" href="deals.html"`;
const exploreNewStr = `class="text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors font-['Plus_Jakarta_Sans'] font-bold tracking-tight" href="deals.html"`;
catHtml = catHtml.replace(exploreRegexStr, exploreNewStr);

const catRegexStr = `class="text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors font-['Plus_Jakarta_Sans'] font-bold tracking-tight" href="categories.html"`;
const catNewStr = `class="text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 pb-1 font-['Plus_Jakarta_Sans'] font-bold tracking-tight transition-all" href="categories.html"`;
catHtml = catHtml.replace(catRegexStr, catNewStr);

fs.writeFileSync('categories.html', catHtml);

// ==== Format Trending.html ====
let trendHtml = fs.readFileSync('trending.html', 'utf8');
trendHtml = trendHtml.replace('<title>Explore Deals | UniDeals India</title>', '<title>Trending Deals | UniDeals India</title>');
trendHtml = trendHtml.replace('>Latest Deals.</h1>', '>Trending Now.</h1>');

// Move underline
trendHtml = trendHtml.replace(exploreRegexStr, exploreNewStr);

const trendRegexStr = `class="text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors font-['Plus_Jakarta_Sans'] font-bold tracking-tight" href="trending.html"`;
const trendNewStr = `class="text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 pb-1 font-['Plus_Jakarta_Sans'] font-bold tracking-tight transition-all" href="trending.html"`;
trendHtml = trendHtml.replace(trendRegexStr, trendNewStr);

// Modify loadDeals call in trending
trendHtml = trendHtml.replace(
    'await loadDeals({ sort: currentSort, category: currentCategory, search: currentSearch });',
    "await loadDeals({ sort: 'most-saved', category: currentCategory, search: currentSearch });"
);

fs.writeFileSync('trending.html', trendHtml);

console.log('Categories and Trending pages configured.');

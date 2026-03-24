const fs = require('fs');

// Simple dot env parser
try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
    }
  });
} catch (e) {
  console.log('No .env file found. Reading from environment variables...');
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://thevyutzufzxiorplvya.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: Missing SUPABASE_SERVICE_ROLE_KEY in .env file.");
  console.error("You need the Service Role Key to bypass Row Level Security and insert deals.");
  process.exit(1);
}

// Supabase REST API helper
async function insertDealsToSupabase(deals) {
  const endpoint = `${SUPABASE_URL}/rest/v1/deals`;
  
  // 1. Fetch existing deals to prevent duplicates by deal_url
  const existingRes = await fetch(`${endpoint}?select=deal_url`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  
  const existingData = await existingRes.json();
  const existingUrls = new Set(existingData.map(d => d.deal_url));
  
  // 2. Filter new deals
  const newDeals = deals.filter(d => !existingUrls.has(d.deal_url));
  
  if (newDeals.length === 0) {
    console.log('✅ No new deals to insert. Database is up to date.');
    return;
  }

  // 3. Bulk insert new deals
  const insertRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(newDeals)
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    console.error('❌ Failed to insert deals into Supabase:', err);
  } else {
    console.log(`✅ Successfully inserted ${newDeals.length} new deals into CampusLoot!`);
  }
}

// Scrape GamerPower API
async function scrapeGamerPower() {
  console.log('🚀 Fetching latest software and game discounts from GamerPower...');
  try {
    const res = await fetch('https://www.gamerpower.com/api/giveaways?sort-by=date');
    const giveaways = await res.json();

    // Map the external API format into our CampusLoot Database Schema
    const mappedDeals = giveaways.slice(0, 10).map(item => ({
      title: item.title,
      description: item.description,
      deal_url: item.open_giveaway_url,
      affiliate_url: item.open_giveaway_url, // Here you would inject Admitad/Cuelinks tags
      original_price: item.worth === 'N/A' ? null : item.worth,
      deal_price: 'Free', // Gamerpower strictly tracks 100% off offers
      discount_text: '100% OFF',
      category: 'software', // Categorizing games/digital as software
      brand_name: item.platforms.split(',')[0], // e.g., 'Steam', 'Epic Games'
      image_url: item.image || item.thumbnail,
      is_featured: false,
      is_active: true,
      is_verified: true // Auto-approved since it comes from an automated trusted source
    }));

    console.log(`📡 Fetched and mapped ${mappedDeals.length} deals. Syncing...`);
    await insertDealsToSupabase(mappedDeals);
    
  } catch (err) {
    console.error('❌ Scraping failed:', err);
  }
}

// Scrape DummyJSON API for laptops and phones as student tech deals
async function scrapeDummyJSON() {
  console.log('🚀 Fetching tech discounts (Laptops & Phones) from DummyJSON...');
  try {
    const urls = [
      'https://dummyjson.com/products/category/laptops',
      'https://dummyjson.com/products/category/smartphones'
    ];
    
    let allProducts = [];
    for (const url of urls) {
      const res = await fetch(url);
      const data = await res.json();
      allProducts = allProducts.concat(data.products || []);
    }

    const mappedDeals = allProducts.slice(0, 15).map(item => {
      const discount = Math.round(item.discountPercentage);
      const originalPrice = parseFloat(item.price).toFixed(2);
      const dealPrice = (item.price * (1 - discount/100)).toFixed(2);

      return {
        title: `Student Special: ${item.title}`,
        description: item.description,
        deal_url: `https://dummyjson.com/products/${item.id}`,
        affiliate_url: null,
        original_price: `$${originalPrice}`,
        deal_price: `$${dealPrice}`,
        discount_text: `${discount}% OFF`,
        category: 'other', // Or hardware if added later
        brand_name: item.brand || 'TechBrand',
        image_url: item.thumbnail,
        is_featured: discount > 15, // Feature deep discounts
        is_active: true,
        is_verified: true
      };
    });

    console.log(`📡 Fetched and mapped ${mappedDeals.length} tech deals. Syncing...`);
    await insertDealsToSupabase(mappedDeals);

  } catch (err) {
    console.error('❌ DummyJSON Scraping failed:', err);
  }
}

const EVERGREEN_INDIAN_DEALS = [
  {
    title: 'Apple Education Store: Save on MacBook & iPad',
    description: 'Special pricing for students and educators on new MacBooks and iPads. Includes discount on AppleCare+.',
    deal_url: 'https://www.apple.com/in-edu/store',
    brand_name: 'Apple India',
    discount_text: 'Student Pricing',
    category: 'software',
    image_url: 'https://www.apple.com/v/education/home/f/images/promo/back-to-school/promo_bts__f6sv90x70mue_large.jpg',
    is_featured: true,
    is_active: true,
    is_verified: true
  },
  {
    title: 'Samsung Student Advantage: Up to 50% Off',
    description: 'Get exclusive discounts on Galaxy smartphones, tablets, laptops, and monitors with your student ID.',
    deal_url: 'https://www.samsung.com/in/microsite/student-advantage/',
    brand_name: 'Samsung India',
    discount_text: 'Up to 50% OFF',
    category: 'software',
    image_url: 'https://images.samsung.com/is/image/samsung/assets/in/p6_otla/Student_Advantage_M_600x600.jpg',
    is_featured: true,
    is_active: true,
    is_verified: true
  },
  {
    title: 'Indigo Student Discount: 6% Off + 10kg Extra Baggage',
    description: 'Special fares for students aged 12 and above. Extra 10kg baggage allowance included.',
    deal_url: 'https://www.goindigo.in/add-on-services/student-discount.html',
    brand_name: 'IndiGo',
    discount_text: '6% OFF',
    category: 'local',
    image_url: 'https://www.goindigo.in/content/dam/indigov2/6e-website/header/Indigo-Logo-Header.png',
    is_featured: true,
    is_active: true,
    is_verified: true
  },
  {
    title: 'GitHub Student Developer Pack',
    description: 'Get free access to the best developer tools in one place so you can learn by doing. Worth over $200k.',
    deal_url: 'https://education.github.com/pack',
    brand_name: 'GitHub',
    discount_text: 'Free Tools',
    category: 'software',
    image_url: 'https://education.github.com/assets/pack/logo-pack-9378170c4f8287515ba92afce47c458739199d79900c14f04d0c915f074d306b.png',
    is_featured: true,
    is_active: true,
    is_verified: true
  },
  {
    title: 'Spotify Premium Student: 3 Months Free',
    description: 'Enjoy ad-free music, offline playback, and Hulu/SHOWTIME (if available) for just ₹59/month after trial.',
    deal_url: 'https://www.spotify.com/in-en/student/',
    brand_name: 'Spotify',
    discount_text: '3 Months FREE',
    category: 'ott',
    image_url: 'https://www-growth.workshops.spotify.com/media/premium/student/student_offer_640.png',
    is_featured: false,
    is_active: true,
    is_verified: true
  }
];

// Scrape FakeStoreAPI for fashion and lifestyle deals
async function scrapeFakeStore() {
  console.log('🚀 Fetching fashion and lifestyle deals from FakeStoreAPI...');
  try {
    const res = await fetch('https://fakestoreapi.com/products?limit=10');
    const products = await res.json();

    const mappedDeals = products.map(item => ({
      title: `Student Fashion: ${item.title}`,
      description: item.description,
      deal_url: `https://fakestoreapi.com/products/${item.id}`,
      brand_name: 'Fashion Hub',
      discount_text: '20% OFF',
      category: item.category === 'jewelery' ? 'other' : 'local',
      image_url: item.image,
      deal_price: `$${(item.price * 0.8).toFixed(2)}`,
      original_price: `$${item.price.toFixed(2)}`,
      is_featured: false,
      is_active: true,
      is_verified: true
    }));

    console.log(`📡 Fetched and mapped ${mappedDeals.length} lifestyle deals. Syncing...`);
    await insertDealsToSupabase(mappedDeals);
  } catch (err) {
    console.error('❌ FakeStore Scraping failed:', err);
  }
}

async function syncEvergreen() {
  console.log('🚀 Syncing Evergreen Indian Student Deals...');
  await insertDealsToSupabase(EVERGREEN_INDIAN_DEALS);
}

// Run the scrapers
console.log('=============================================');
console.log('   CampusLoot Deal Sync - Automation Job     ');
console.log('=============================================');
async function runAll() {
  await syncEvergreen();
  await scrapeGamerPower();
  await scrapeDummyJSON();
  await scrapeFakeStore();
}
runAll();

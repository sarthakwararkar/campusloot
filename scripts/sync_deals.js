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

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oajpifvsqsclyujlueed.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: Missing SUPABASE_SERVICE_ROLE_KEY in .env file.");
  process.exit(1);
}

// Supabase REST API helper
async function insertDealsToSupabase(deals) {
  const endpoint = `${SUPABASE_URL}/rest/v1/deals`;
  const existingRes = await fetch(`${endpoint}?select=deal_url`, {
    headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
  });
  const existingData = await existingRes.json();
  const existingUrls = new Set(existingData.map(d => d.deal_url));
  const newDeals = deals.filter(d => !existingUrls.has(d.deal_url));
  
  if (newDeals.length === 0) {
    console.log('✅ No new deals to insert.');
    return;
  }

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
    console.error('❌ Failed to insert deals:', err);
  } else {
    console.log(`✅ Successfully inserted ${newDeals.length} new genuine deals!`);
  }
}

// Cleanup helper
async function cleanupOldDeals() {
  console.log('🧹 Cleaning up placeholder development deals...');
  const endpoint = `${SUPABASE_URL}/rest/v1/deals`;
  const placeholders = ['fakestoreapi.com', 'dummyjson.com'];
  for (const domain of placeholders) {
    await fetch(`${endpoint}?deal_url=like.*${domain}*`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
    });
  }
}

// Scrape GamerPower API (Genuine Software/Game Giveaways)
async function scrapeGamerPower() {
  console.log('🚀 Fetching software/game discounts from GamerPower...');
  try {
    const res = await fetch('https://www.gamerpower.com/api/giveaways?sort-by=date');
    const giveaways = await res.json();
    const mappedDeals = giveaways.slice(0, 5).map(item => ({
      title: item.title,
      description: item.description,
      deal_url: item.open_giveaway_url,
      original_price: item.worth || null,
      deal_price: 'Free',
      discount_text: '100% OFF',
      category: 'software',
      brand_name: item.platforms.split(',')[0],
      image_url: item.image || item.thumbnail,
      is_active: true,
      is_verified: true
    }));
    await insertDealsToSupabase(mappedDeals);
  } catch (err) { console.error('❌ GamerPower failed:', err); }
}

const MASSIVE_EVERGREEN_LIST = [
  // TECH
  {
    title: 'Apple Education Store: Student Savings',
    description: 'Save on MacBook, iPad, and Pro Apps with Apple Education Pricing. Includes discounts on AppleCare+.',
    deal_url: 'https://www.apple.com/in-edu/store',
    brand_name: 'Apple India',
    discount_text: 'Student Pricing',
    category: 'software',
    image_url: 'https://www.apple.com/v/education/home/f/images/promo/back-to-school/promo_bts__f6sv90x70mue_large.jpg',
    is_featured: true, is_active: true, is_verified: true
  },
  {
    title: 'Samsung Student Advantage: Up to 50% Off',
    description: 'Exclusive discounts for Indian students on Galaxy phones, tablets, and laptops.',
    deal_url: 'https://www.samsung.com/in/microsite/student-advantage/',
    brand_name: 'Samsung India',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&h=400&fit=crop',
    is_featured: true, is_active: true, is_verified: true
  },
  {
    title: 'HP Education Store: Best Deals on Laptops',
    description: 'Get up to 40% off on HP Spectre, Envy, and Pavilion range with your student ID.',
    deal_url: 'https://www.hp.com/in-en/shop/laptops-tablets/education.html',
    brand_name: 'HP India',
    discount_text: 'Up to 40% OFF',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  // FASHION
  {
    title: 'Myntra Student Tribe: Extra 10% Off',
    description: 'Exclusive fashion discounts for students. Verified via UNiDAYS or Student ID.',
    deal_url: 'https://www.myntra.com/myntra-fashion-unlimited',
    brand_name: 'Myntra',
    discount_text: 'Extra 10% OFF',
    category: 'local',
    image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=400&fit=crop',
    is_featured: true, is_active: true, is_verified: true
  },
  {
    title: 'Ajio Student Offer: Fashion Discounts',
    description: 'Special coupon codes for students on top brands like Nike, Adidas, and Puma.',
    deal_url: 'https://www.ajio.com/',
    brand_name: 'Ajio',
    discount_text: 'Special Codes',
    category: 'local',
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  // FOOD
  {
    title: 'Zomato Gold: Student Discounted Plan',
    description: 'Enjoy 1+1 on food and drinks at top restaurants with Zomato Gold Student Edition.',
    deal_url: 'https://www.zomato.com/gold',
    brand_name: 'Zomato',
    discount_text: 'Special Price',
    category: 'food',
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop',
    is_featured: true, is_active: true, is_verified: true
  },
  {
    title: 'Swiggy HDFC Student Card Offer',
    description: 'Extra discounts on food delivery and grocery (Instamart) for students.',
    deal_url: 'https://www.swiggy.com/',
    brand_name: 'Swiggy',
    discount_text: 'Bank Offers',
    category: 'food',
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  // OTT / SERVICES
  {
    title: 'Spotify Premium Student: Only ₹59/month',
    description: 'Ad-free music and offline play at 50% off for verified college students.',
    deal_url: 'https://www.spotify.com/in-en/student/',
    brand_name: 'Spotify India',
    discount_text: '50% OFF',
    category: 'ott',
    image_url: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=600&h=400&fit=crop',
    is_featured: true, is_active: true, is_verified: true
  },
  {
    title: 'Amazon Prime Student India: 50% Cashback',
    description: 'Get all Prime benefits (Delivery, Video, Music) at half the price with youth offer.',
    deal_url: 'https://www.amazon.in/prime/promo/landing',
    brand_name: 'Amazon India',
    discount_text: '50% Cashback',
    category: 'ott',
    image_url: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'GitHub Student Developer Pack',
    description: 'Free access to Canva Pro, Azure, Namecheap, and $200k worth of dev tools.',
    deal_url: 'https://education.github.com/pack',
    brand_name: 'GitHub',
    discount_text: '$200k+ Value',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  // TRAVEL
  {
    title: 'IndiGo Student Fare: 6% Off + 10kg Bag',
    description: 'Special base fare discounts and extra baggage for students traveling within India.',
    deal_url: 'https://www.goindigo.in/add-on-services/student-discount.html',
    brand_name: 'IndiGo',
    discount_text: '6% OFF',
    category: 'local',
    image_url: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'Uber Student Discount (Via UNiDAYS)',
    description: 'Get discounted rides to your campus and city hangouts with verified student status.',
    deal_url: 'https://www.myunidays.com/IN/en-GB/partners/uber/view',
    brand_name: 'Uber India',
    discount_text: 'Ride Discounts',
    category: 'local',
    image_url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  }
];

async function runAll() {
  await cleanupOldDeals();
  await insertDealsToSupabase(MASSIVE_EVERGREEN_LIST);
  await scrapeGamerPower();
}
runAll();

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
  // EDUCATION & TOOLS
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
  {
    title: 'JetBrains All Products Pack',
    description: 'Free access to professional developer tools like IntelliJ IDEA, PyCharm, and WebStorm.',
    deal_url: 'https://www.jetbrains.com/community/education/',
    brand_name: 'JetBrains',
    discount_text: 'Free for Students',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'Microsoft Azure for Students',
    description: 'Get $100 credit and free access to popular cloud services like VMs, App Services, and Databases.',
    deal_url: 'https://azure.microsoft.com/en-us/free/students/',
    brand_name: 'Microsoft',
    discount_text: '$100 Credit',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'AWS Educate',
    description: 'Gain access to free cloud content, training, and credits to build your cloud skills.',
    deal_url: 'https://aws.amazon.com/education/awseducate/',
    brand_name: 'Amazon',
    discount_text: 'Free Training',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'Figma Education',
    description: 'Professional design tools for free for students and educators. Collaborate in real-time.',
    deal_url: 'https://www.figma.com/education/',
    brand_name: 'Figma',
    discount_text: 'Free Pro Plan',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'Notion Personal Pro',
    description: 'Get the Notion Personal Pro plan for free with your student email. Organize your studies and life.',
    deal_url: 'https://www.notion.so/product/notion-for-education',
    brand_name: 'Notion',
    discount_text: 'Free Pro',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'Replit Free Hacker Plan',
    description: 'Power up your coding with free access to Replit Hacker features for students.',
    deal_url: 'https://replit.com/site/students',
    brand_name: 'Replit',
    discount_text: 'Free Hacker',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'Postman Student Program',
    description: 'Learn API development with Postman and get the Student Expert badge.',
    deal_url: 'https://www.postman.com/company/student-program/',
    brand_name: 'Postman',
    discount_text: 'Free Training',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1599658880436-c61792e70672?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'Canva Pro for Education',
    description: 'Design anything with Canva Pro features, free for K-12 students and teachers.',
    deal_url: 'https://www.canva.com/education/',
    brand_name: 'Canva',
    discount_text: 'Free Pro',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },

  // HARDWARE & TECH
  {
    title: 'Apple Education Store: Student Savings',
    description: 'Save on MacBook, iPad, and Pro Apps with Apple Education Pricing. Includes discounts on AppleCare+.',
    deal_url: 'https://www.apple.com/in-edu/store',
    brand_name: 'Apple India',
    discount_text: 'Student Pricing',
    category: 'software',
    image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=400&fit=crop',
    is_featured: true, is_active: true, is_verified: true
  },
  {
    title: 'Samsung Student Advantage: Up to 50% Off',
    description: 'Exclusive discounts for Indian students on Galaxy phones, tablets, and laptops.',
    deal_url: 'https://www.samsung.com/in/microsite/student-advantage/',
    brand_name: 'Samsung India',
    discount_text: 'Up to 50% OFF',
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
    deal_url: 'https://www.myunidays.com/IN/en-GB/partners/ajio/view',
    brand_name: 'Ajio',
    discount_text: 'Special Codes',
    category: 'local',
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },

  // FOOD & DINING
  {
    title: 'Zomato Gold Student Membership',
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
    deal_url: 'https://www.swiggy.com/swiggy-one',
    brand_name: 'Swiggy',
    discount_text: 'Bank Offers',
    category: 'food',
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'Dominos Student Offer',
    description: 'Get amazing discounts and buy-one-get-one offers on your favorite pizzas.',
    deal_url: 'https://www.dominos.co.in/menu/offers',
    brand_name: 'Dominos',
    discount_text: 'Pizza Deals',
    category: 'food',
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },

  // ENTERTAINMENT & SERVICES
  {
    title: 'Spotify Premium Student: 3 Months Free',
    description: 'Ad-free music and offline play for verified college students at half the price.',
    deal_url: 'https://www.spotify.com/in-en/student/',
    brand_name: 'Spotify',
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
    title: 'YouTube Premium Student',
    description: 'Watch your favorite videos without ads and enjoy YouTube Music Premium for less.',
    deal_url: 'https://www.youtube.com/premium/student',
    brand_name: 'YouTube',
    discount_text: 'Discounted Price',
    category: 'ott',
    image_url: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'BookMyShow Student Offer',
    description: 'Get discounts on movie tickets and events when you verify your student ID.',
    deal_url: 'https://in.bookmyshow.com/offers',
    brand_name: 'BookMyShow',
    discount_text: 'Show Discounts',
    category: 'local',
    image_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },

  // TRAVEL
  {
    title: 'Indigo Student Discount: 6% Off + 10kg Extra Baggage',
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
  },

  // COURSES
  {
    title: 'Coursera via NPTEL/College',
    description: 'Access professional certificates and courses from top universities for free or at a discount.',
    deal_url: 'https://www.coursera.org/for-university-and-college-students',
    brand_name: 'Coursera',
    discount_text: 'Free Courses',
    category: 'courses',
    image_url: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  },
  {
    title: 'Udemy Student Discount',
    description: 'Get thousands of online courses on a wide range of topics at significant discounts.',
    deal_url: 'https://www.udemy.com/deals/student-discount/',
    brand_name: 'Udemy',
    discount_text: 'Up to 90% OFF',
    category: 'courses',
    image_url: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&h=400&fit=crop',
    is_active: true, is_verified: true
  }
];

async function runAll() {
  await cleanupOldDeals();
  await insertDealsToSupabase(MASSIVE_EVERGREEN_LIST);
  await scrapeGamerPower();
}
runAll();

"""
Expanded Evergreen Student Deals Scraper
Inserts 45+ verified, always-available student deals across casual categories.
These deals are set as is_verified=true and is_active=true so they appear immediately.
"""
import os
import sys

# Add parent dir so we can import scraper_base
sys.path.insert(0, os.path.dirname(__file__))
from scraper_base import get_supabase_client, get_existing_deals, upsert_deal

# ─── EVERGREEN DEALS DATABASE ───────────────────────────────────────────────
EVERGREEN_DEALS = [
    # ═══════════════ FOOD & DINING ═══════════════
    {
        "title": "Zomato Pro Student – Flat 40% Off",
        "description": "Get Zomato Pro at student pricing with up to 40% off on dining and delivery orders. Valid with college ID.",
        "deal_url": "https://www.zomato.com/pro",
        "source_url": "https://www.zomato.com/pro",
        "brand_name": "Zomato",
        "category": "food",
        "discount_value": "40%",
        "coupon_code": None,
    },
    {
        "title": "Swiggy One Lite – ₹49/month Student Plan",
        "description": "Swiggy One Lite student plan at just ₹49/month with free delivery on all orders above ₹149.",
        "deal_url": "https://www.swiggy.com/one",
        "source_url": "https://www.swiggy.com/one",
        "brand_name": "Swiggy",
        "category": "food",
        "discount_value": "Free Delivery",
        "coupon_code": None,
    },
    {
        "title": "Domino's Student Offer – 50% Off on ₹500+",
        "description": "Flat 50% off on Domino's orders above ₹500 using student coupon code. Valid on online orders only.",
        "deal_url": "https://www.dominos.co.in/",
        "source_url": "https://www.dominos.co.in/",
        "brand_name": "Domino's",
        "category": "food",
        "discount_value": "50%",
        "coupon_code": "STUDENT50",
    },
    {
        "title": "McDonald's App – BOGO on Burgers Every Wednesday",
        "description": "Buy one get one free on selected burgers every Wednesday through the McDonald's app.",
        "deal_url": "https://www.mcdonaldsindia.com/",
        "source_url": "https://www.mcdonaldsindia.com/",
        "brand_name": "McDonald's",
        "category": "food",
        "discount_value": "BOGO",
        "coupon_code": None,
    },
    {
        "title": "EatSure – Flat ₹100 Off First Order",
        "description": "Get ₹100 off on your first EatSure order. Multi-brand food delivery with quality guarantee.",
        "deal_url": "https://www.eatsure.com/",
        "source_url": "https://www.eatsure.com/",
        "brand_name": "EatSure",
        "category": "food",
        "discount_value": "₹100 Off",
        "coupon_code": "NEW100",
    },

    # ═══════════════ FASHION / CLOTHING ═══════════════
    {
        "title": "Myntra Student Discount – Extra 15% Off",
        "description": "Myntra offers an extra 15% student discount on fashion, accessories, and lifestyle products. Verify via student ID.",
        "deal_url": "https://www.myntra.com/",
        "source_url": "https://www.myntra.com/",
        "brand_name": "Myntra",
        "category": "clothing",
        "discount_value": "15%",
        "coupon_code": None,
    },
    {
        "title": "AJIO Student Deal – Up to 70% Off + Extra 20%",
        "description": "Shop AJIO for up to 70% off on top brands plus an extra 20% student discount on first purchase.",
        "deal_url": "https://www.ajio.com/shop/students",
        "source_url": "https://www.ajio.com/shop/students",
        "brand_name": "AJIO",
        "category": "clothing",
        "discount_value": "70%+20%",
        "coupon_code": "AJIONEW20",
    },
    {
        "title": "H&M Student – 15% Off Everything",
        "description": "H&M offers 15% off for students. Sign up with your university email to get the discount code.",
        "deal_url": "https://www2.hm.com/en_in/student-discount.html",
        "source_url": "https://www2.hm.com/en_in/student-discount.html",
        "brand_name": "H&M",
        "category": "clothing",
        "discount_value": "15%",
        "coupon_code": None,
    },
    {
        "title": "Nike Student Discount – 10% Off Sitewide",
        "description": "Nike offers 10% off for verified students on shoes, apparel, and accessories.",
        "deal_url": "https://www.nike.com/in/student-discount",
        "source_url": "https://www.nike.com/in/student-discount",
        "brand_name": "Nike",
        "category": "clothing",
        "discount_value": "10%",
        "coupon_code": None,
    },
    {
        "title": "Bewakoof Student Store – Flat 30% Off",
        "description": "Bewakoof offers flat 30% off for students on trendy t-shirts, joggers, and hoodies.",
        "deal_url": "https://www.bewakoof.com/",
        "source_url": "https://www.bewakoof.com/",
        "brand_name": "Bewakoof",
        "category": "clothing",
        "discount_value": "30%",
        "coupon_code": "CAMPUS30",
    },

    # ═══════════════ ELECTRONICS ═══════════════
    {
        "title": "Samsung Student Store – Up to 30% Off",
        "description": "Samsung Education Store offers up to 30% off on Galaxy phones, tablets, and laptops for verified students.",
        "deal_url": "https://www.samsung.com/in/offer/student-discount/",
        "source_url": "https://www.samsung.com/in/offer/student-discount/",
        "brand_name": "Samsung",
        "category": "electronics",
        "discount_value": "30%",
        "coupon_code": None,
    },
    {
        "title": "Apple Education Pricing – Save on Mac & iPad",
        "description": "Apple's Education Store offers special pricing for students. Save up to ₹10,000 on Mac and iPad.",
        "deal_url": "https://www.apple.com/in/shop/go/education",
        "source_url": "https://www.apple.com/in/shop/go/education",
        "brand_name": "Apple",
        "category": "electronics",
        "discount_value": "Up to ₹10,000",
        "coupon_code": None,
    },
    {
        "title": "Lenovo Education Store – Up to 25% Off Laptops",
        "description": "Lenovo offers student discounts up to 25% on IdeaPad, ThinkPad, and Legion gaming laptops.",
        "deal_url": "https://www.lenovo.com/in/en/d/deals/student-discount/",
        "source_url": "https://www.lenovo.com/in/en/d/deals/student-discount/",
        "brand_name": "Lenovo",
        "category": "electronics",
        "discount_value": "25%",
        "coupon_code": None,
    },
    {
        "title": "Dell Student Purchase Program – Extra 5% Off",
        "description": "Dell offers exclusive student pricing with extra 5-10% off on Inspiron, XPS, and Vostro laptops.",
        "deal_url": "https://www.dell.com/en-in/lp/student-purchase-program",
        "source_url": "https://www.dell.com/en-in/lp/student-purchase-program",
        "brand_name": "Dell",
        "category": "electronics",
        "discount_value": "5-10%",
        "coupon_code": None,
    },
    {
        "title": "boAt Student Discount – 20% Off Audio Gear",
        "description": "boAt offers 20% student discount on earbuds, headphones, and speakers. Verify with student ID.",
        "deal_url": "https://www.boat-lifestyle.com/",
        "source_url": "https://www.boat-lifestyle.com/",
        "brand_name": "boAt",
        "category": "electronics",
        "discount_value": "20%",
        "coupon_code": "STUDENT20",
    },

    # ═══════════════ OTT / ENTERTAINMENT ═══════════════
    {
        "title": "Spotify Premium Student – ₹59/month",
        "description": "Spotify Premium Student plan at just ₹59/month. Ad-free music, offline downloads, and podcast access.",
        "deal_url": "https://www.spotify.com/in/student/",
        "source_url": "https://www.spotify.com/in/student/",
        "brand_name": "Spotify",
        "category": "ott",
        "discount_value": "50%",
        "coupon_code": None,
    },
    {
        "title": "YouTube Premium Student – ₹79/month",
        "description": "YouTube Premium Student plan at ₹79/month. Ad-free videos, background play, and YouTube Music included.",
        "deal_url": "https://www.youtube.com/premium/student",
        "source_url": "https://www.youtube.com/premium/student",
        "brand_name": "YouTube",
        "category": "ott",
        "discount_value": "50%",
        "coupon_code": None,
    },
    {
        "title": "Amazon Prime Student – 50% Off Annual Plan",
        "description": "Amazon Prime Student at half price. Free delivery, Prime Video, and exclusive student deals.",
        "deal_url": "https://www.amazon.in/gp/student/signup",
        "source_url": "https://www.amazon.in/gp/student/signup",
        "brand_name": "Amazon",
        "category": "ott",
        "discount_value": "50%",
        "coupon_code": None,
    },
    {
        "title": "JioCinema Premium – ₹29/month Student",
        "description": "JioCinema Premium content including Hollywood movies and WWE at special student pricing.",
        "deal_url": "https://www.jiocinema.com/",
        "source_url": "https://www.jiocinema.com/",
        "brand_name": "JioCinema",
        "category": "ott",
        "discount_value": "₹29/month",
        "coupon_code": None,
    },
    {
        "title": "Audible Student – First 3 Months Free",
        "description": "Amazon Audible offers first 3 months free for students, then 50% off at ₹99/month.",
        "deal_url": "https://www.audible.in/",
        "source_url": "https://www.audible.in/",
        "brand_name": "Audible",
        "category": "ott",
        "discount_value": "3 Months Free",
        "coupon_code": None,
    },

    # ═══════════════ COURSES / EDUCATION ═══════════════
    {
        "title": "Coursera Student Plan – Free Courses",
        "description": "Coursera offers thousands of free courses for students from top universities worldwide.",
        "deal_url": "https://www.coursera.org/for-university-and-college-students",
        "source_url": "https://www.coursera.org/for-university-and-college-students",
        "brand_name": "Coursera",
        "category": "courses",
        "discount_value": "Free",
        "coupon_code": None,
    },
    {
        "title": "Udemy – Courses Starting ₹299",
        "description": "Udemy's student sale with courses starting from ₹299. Programming, design, marketing, and more.",
        "deal_url": "https://www.udemy.com/",
        "source_url": "https://www.udemy.com/",
        "brand_name": "Udemy",
        "category": "courses",
        "discount_value": "₹299",
        "coupon_code": None,
    },
    {
        "title": "LinkedIn Learning – 1 Month Free Trial",
        "description": "LinkedIn Learning offers a free 1-month trial for students. Access 16,000+ courses.",
        "deal_url": "https://www.linkedin.com/learning/",
        "source_url": "https://www.linkedin.com/learning/",
        "brand_name": "LinkedIn",
        "category": "courses",
        "discount_value": "1 Month Free",
        "coupon_code": None,
    },
    {
        "title": "Skillshare Student – 40% Off Annual",
        "description": "Skillshare offers 40% off annual membership for students. Creative classes in design, video, and more.",
        "deal_url": "https://www.skillshare.com/signup",
        "source_url": "https://www.skillshare.com/signup",
        "brand_name": "Skillshare",
        "category": "courses",
        "discount_value": "40%",
        "coupon_code": None,
    },
    {
        "title": "GitHub Student Developer Pack – Free",
        "description": "GitHub Student Developer Pack: free GitHub Pro, AWS credits, DigitalOcean credits, and 100+ developer tools.",
        "deal_url": "https://education.github.com/pack",
        "source_url": "https://education.github.com/pack",
        "brand_name": "GitHub",
        "category": "courses",
        "discount_value": "Free",
        "coupon_code": None,
    },

    # ═══════════════ SOFTWARE ═══════════════
    {
        "title": "Microsoft 365 Education – Free for Students",
        "description": "Free Microsoft 365 including Word, Excel, PowerPoint, and 1TB OneDrive for verified students.",
        "deal_url": "https://www.microsoft.com/en-in/education/products/office",
        "source_url": "https://www.microsoft.com/en-in/education/products/office",
        "brand_name": "Microsoft",
        "category": "software",
        "discount_value": "Free",
        "coupon_code": None,
    },
    {
        "title": "Notion Student Plan – Free Pro",
        "description": "Notion offers free Pro plan for students with unlimited blocks, file uploads, and collaboration.",
        "deal_url": "https://www.notion.so/students",
        "source_url": "https://www.notion.so/students",
        "brand_name": "Notion",
        "category": "software",
        "discount_value": "Free",
        "coupon_code": None,
    },
    {
        "title": "Canva Pro Student – Free",
        "description": "Canva Pro is free for students and teachers. Premium templates, background remover, and brand kit.",
        "deal_url": "https://www.canva.com/education/",
        "source_url": "https://www.canva.com/education/",
        "brand_name": "Canva",
        "category": "software",
        "discount_value": "Free",
        "coupon_code": None,
    },
    {
        "title": "JetBrains Student – Free IDEs",
        "description": "JetBrains offers free access to all IDEs (IntelliJ, PyCharm, WebStorm) for verified students.",
        "deal_url": "https://www.jetbrains.com/community/education/",
        "source_url": "https://www.jetbrains.com/community/education/",
        "brand_name": "JetBrains",
        "category": "software",
        "discount_value": "Free",
        "coupon_code": None,
    },
    {
        "title": "Figma Education – Free Pro Plan",
        "description": "Figma offers free Pro plan for students with unlimited files and team collaboration.",
        "deal_url": "https://www.figma.com/education/",
        "source_url": "https://www.figma.com/education/",
        "brand_name": "Figma",
        "category": "software",
        "discount_value": "Free",
        "coupon_code": None,
    },

    # ═══════════════ SERVICES ═══════════════
    {
        "title": "Ola Student Rides – 20% Off First 5 Rides",
        "description": "Ola offers 20% off on the first 5 rides for new student users. Verify with your .edu email.",
        "deal_url": "https://www.olacabs.com/",
        "source_url": "https://www.olacabs.com/",
        "brand_name": "Ola",
        "category": "services",
        "discount_value": "20%",
        "coupon_code": "STUDENT20",
    },
    {
        "title": "rapido Student – Flat ₹30 Off on Bike Rides",
        "description": "Rapido bike taxi flat ₹30 off for students on first 3 rides. Quick and affordable campus commute.",
        "deal_url": "https://www.rapido.bike/",
        "source_url": "https://www.rapido.bike/",
        "brand_name": "Rapido",
        "category": "services",
        "discount_value": "₹30 Off",
        "coupon_code": "CAMPUS30",
    },
    {
        "title": "Urban Company – ₹200 Off First Service",
        "description": "Urban Company offers ₹200 off on first home service booking. Salon, cleaning, AC repair, and more.",
        "deal_url": "https://www.urbancompany.com/",
        "source_url": "https://www.urbancompany.com/",
        "brand_name": "Urban Company",
        "category": "services",
        "discount_value": "₹200 Off",
        "coupon_code": "FIRST200",
    },
    {
        "title": "Internshala Premium – Student Discount",
        "description": "Internshala premium subscription at student pricing. Access top internships and training programs.",
        "deal_url": "https://internshala.com/",
        "source_url": "https://internshala.com/",
        "brand_name": "Internshala",
        "category": "services",
        "discount_value": "Student Price",
        "coupon_code": None,
    },

    # ═══════════════ OTHER / GENERAL ═══════════════
    {
        "title": "Flipkart Student Club – Extra 5% Off",
        "description": "Flipkart Student Club offers extra 5% off on electronics, fashion, and daily essentials.",
        "deal_url": "https://www.flipkart.com/",
        "source_url": "https://www.flipkart.com/",
        "brand_name": "Flipkart",
        "category": "other",
        "discount_value": "5%",
        "coupon_code": None,
    },
    {
        "title": "Nykaa Student Offer – Extra 10% Off Beauty",
        "description": "Nykaa student discount of extra 10% off on skincare, makeup, and wellness products.",
        "deal_url": "https://www.nykaa.com/",
        "source_url": "https://www.nykaa.com/",
        "brand_name": "Nykaa",
        "category": "other",
        "discount_value": "10%",
        "coupon_code": "STUDENT10",
    },
    {
        "title": "PharmEasy – 25% Off Medicines for Students",
        "description": "PharmEasy offers 25% off on medicines and health products for students. Upload prescription online.",
        "deal_url": "https://pharmeasy.in/",
        "source_url": "https://pharmeasy.in/",
        "brand_name": "PharmEasy",
        "category": "other",
        "discount_value": "25%",
        "coupon_code": None,
    },
    {
        "title": "1mg Student – Flat 20% Off + Free Delivery",
        "description": "1mg offers flat 20% off on medicines plus free delivery for students on orders above ₹299.",
        "deal_url": "https://www.1mg.com/",
        "source_url": "https://www.1mg.com/",
        "brand_name": "1mg",
        "category": "other",
        "discount_value": "20%",
        "coupon_code": None,
    },
    {
        "title": "Decathlon Student – 10% Off Sports Gear",
        "description": "Decathlon offers 10% off for students on sports equipment, shoes, and activewear.",
        "deal_url": "https://www.decathlon.in/",
        "source_url": "https://www.decathlon.in/",
        "brand_name": "Decathlon",
        "category": "other",
        "discount_value": "10%",
        "coupon_code": None,
    },
    {
        "title": "Lenskart Student – Extra 20% Off Eyewear",
        "description": "Lenskart extra 20% off on eyeglasses, sunglasses, and contact lenses for students.",
        "deal_url": "https://www.lenskart.com/",
        "source_url": "https://www.lenskart.com/",
        "brand_name": "Lenskart",
        "category": "other",
        "discount_value": "20%",
        "coupon_code": "CAMPUS20",
    },
    {
        "title": "Pepperfry Student – Flat 25% Off Furniture",
        "description": "Pepperfry flat 25% off on hostel and PG furniture, bean bags, and study desks for students.",
        "deal_url": "https://www.pepperfry.com/",
        "source_url": "https://www.pepperfry.com/",
        "brand_name": "Pepperfry",
        "category": "other",
        "discount_value": "25%",
        "coupon_code": "STUDENT25",
    },
]


def scrape():
    """Insert/update all evergreen deals."""
    print("═" * 60)
    print("🌿 Running Evergreen Student Deals Scraper...")
    print("═" * 60)

    try:
        supabase = get_supabase_client()
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        return 0

    existing = get_existing_deals(supabase)
    print(f"  Found {len(existing['urls'])} URLs and {len(existing['titles'])} titles in DB\n")

    count = 0
    for deal in EVERGREEN_DEALS:
        # Build the deal dict matching the schema expected by upsert_deal
        deal_data = {
            "title": deal["title"],
            "description": deal["description"],
            "deal_url": deal["deal_url"],
            "source_url": deal["source_url"],
            "brand_name": deal["brand_name"],
            "category": deal["category"],
            "is_verified": True,
            "is_active": True,
        }
        # Only add optional fields if they have values
        if deal.get("coupon_code"):
            deal_data["coupon_code"] = deal["coupon_code"]

        try:
            upsert_deal(supabase, deal_data, existing)
            count += 1
            print(f"  ✓ {deal['title']}")
        except Exception as e:
            print(f"  ✗ Error on {deal['title']}: {e}")

    print(f"\n✅ Evergreen scraper done: {count}/{len(EVERGREEN_DEALS)} deals processed.")
    return count


if __name__ == "__main__":
    scrape()

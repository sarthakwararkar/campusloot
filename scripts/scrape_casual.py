"""
Casual Deals Scraper — CampusLoot
Scrapes free, public deal aggregator pages for casual student deals.
Sources:
  1. Reddit r/IndianDeals — free JSON API, no auth needed
  2. Reddit r/dealsforstudents — free JSON API
No API keys required. 100% free.
"""
import os
import sys
import json
import time
import requests

sys.path.insert(0, os.path.dirname(__file__))
from scraper_base import upsert_deal

HEADERS = {
    "User-Agent": "CampusLoot-Student-Deals-Bot/1.0 (educational project)"
}

# Category keyword mapping for auto-categorization
CATEGORY_KEYWORDS = {
    "food": ["zomato", "swiggy", "dominos", "pizza", "burger", "food", "restaurant", "dining", "eatsure", "mcdonald"],
    "clothing": ["myntra", "ajio", "h&m", "nike", "adidas", "fashion", "clothes", "shirt", "shoes", "bewakoof", "zara"],
    "electronics": ["samsung", "apple", "laptop", "phone", "earbuds", "headphone", "tablet", "boat", "realme", "oneplus"],
    "ott": ["spotify", "netflix", "prime", "hotstar", "youtube", "jiocinema", "audible", "streaming"],
    "software": ["github", "microsoft", "notion", "canva", "figma", "jetbrains", "adobe", "software"],
    "courses": ["coursera", "udemy", "skillshare", "linkedin learning", "course", "certification", "edx"],
    "services": ["ola", "uber", "rapido", "urban company", "internshala", "ride", "taxi"],
}


def guess_category(title, text=""):
    """Auto-categorize a deal based on title and description keywords."""
    combined = f"{title} {text}".lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in combined:
                return cat
    return "other"


def scrape_reddit_sub(subreddit, limit=25):
    """Scrape a subreddit's hot posts using Reddit's free JSON API."""
    url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
    count = 0
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"  ⚠ Reddit r/{subreddit} returned {resp.status_code}")
            return 0

        data = resp.json()
        posts = data.get("data", {}).get("children", [])

        for post in posts:
            p = post.get("data", {})
            # Skip stickied/pinned posts, self-posts with no URL, and NSFW
            if p.get("stickied") or p.get("over_18"):
                continue

            title = p.get("title", "").strip()
            if not title or len(title) < 10:
                continue

            # Get the deal URL (external link or post URL)
            deal_url = p.get("url", "")
            if not deal_url or "reddit.com" in deal_url:
                deal_url = f"https://www.reddit.com{p.get('permalink', '')}"

            description = (p.get("selftext", "") or "")[:500]
            if not description:
                description = f"Deal found on r/{subreddit}: {title}"

            category = guess_category(title, description)
            score = p.get("score", 0)

            # Only import deals with positive engagement
            if score < 3:
                continue

            result = upsert_deal(
                title=title[:200],
                description=description,
                deal_url=deal_url,
                brand=f"r/{subreddit}",
                category=category,
                discount_value="",
                coupon_code=None,
                source=f"reddit_{subreddit}",
                is_verified=False,  # Needs admin review
                is_active=False,    # Needs admin review
            )
            if result:
                count += 1
                print(f"  ✓ [{category}] {title[:60]}...")
            else:
                print(f"  ✗ Skipped: {title[:60]}...")

    except requests.exceptions.RequestException as e:
        print(f"  ✗ Network error on r/{subreddit}: {e}")
    except json.JSONDecodeError as e:
        print(f"  ✗ JSON parse error on r/{subreddit}: {e}")

    return count


def scrape():
    """Run all casual deal scrapers."""
    total = 0

    print("═" * 60)
    print("🔍 Scraping Reddit r/IndianDeals...")
    print("═" * 60)
    total += scrape_reddit_sub("IndianDeals", limit=30)
    time.sleep(2)  # Rate limiting

    print("\n" + "═" * 60)
    print("🔍 Scraping Reddit r/dealsforstudents...")
    print("═" * 60)
    total += scrape_reddit_sub("dealsforstudents", limit=20)
    time.sleep(2)

    print("\n" + "═" * 60)
    print("🔍 Scraping Reddit r/IndianGaming (deals only)...")
    print("═" * 60)
    total += scrape_reddit_sub("IndianGaming", limit=20)

    print(f"\n✅ Casual scraper done: {total} new deals imported.")
    return total


if __name__ == "__main__":
    scrape()

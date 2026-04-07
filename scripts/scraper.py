#!/usr/bin/env python3
"""
CampusLoot deal scraper v1.1
Targets: StudentBeans India, Amazon Student India, GitHub Student Pack, etc.
Handles deduping by title and source_url.
"""

import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime, timezone
import time

# Robust environment variable loading
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.")
    exit(1)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"❌ ERROR: Failed to initialize Supabase client: {e}")
    exit(1)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
}

def get_existing_deals() -> dict:
    """Fetch all deals to avoid duplicates. Returns {source_url: id, title: id}."""
    try:
        # Fetching both title and source_url for smart matching
        result = supabase.table("deals").select("id, title, source_url").execute()
        
        urls = {row["source_url"]: row["id"] for row in result.data if row.get("source_url")}
        titles = {row["title"].lower().strip(): row["id"] for row in result.data if row.get("title")}
        return {"urls": urls, "titles": titles}
    except Exception as e:
        print(f"  Warning: Failed to fetch existing deals: {e}")
        return {"urls": {}, "titles": {}}

def upsert_deal(deal: dict, existing: dict):
    """Insert deal if new, update existing if match found by URL or Title."""
    url = deal.get("source_url", "")
    title = deal.get("title", "").strip()
    title_lower = title.lower()
    
    # 1. Check if URL already exists
    deal_id = existing["urls"].get(url)
    
    # 2. If not, check if Title already exists (Fuzzy/Partial matching)
    if not deal_id:
        # Check for exact match first
        deal_id = existing["titles"].get(title_lower)
        
        # If no exact match, check if any DB title is IN the scraped title (or vice versa)
        if not deal_id:
            for db_title_lower, db_id in existing["titles"].items():
                if db_title_lower in title_lower or title_lower in db_title_lower:
                    if len(db_title_lower) > 5: # Avoid matching very short titles like "Dell"
                        deal_id = db_id
                        break

    if deal_id:
        try:
            # Update existing deal (sync source_url if it was missing)
            update_payload = {
                "last_scraped_at": datetime.now(timezone.utc).isoformat(),
            }
            if not existing["urls"].get(url):
                update_payload["source_url"] = url
            
            supabase.table("deals").update(update_payload).eq("id", deal_id).execute()
            print(f"  [updated] {title}")
        except Exception as e:
            print(f"  Error updating {title}: {e}")
        return

    # 3. Truly new deal — insert
    deal["source"] = "scraped"
    deal["needs_review"] = True
    deal["is_active"] = False # Default to inactive for review
    deal["last_scraped_at"] = datetime.now(timezone.utc).isoformat()
    
    try:
        supabase.table("deals").insert(deal).execute()
        print(f"  [new] {title}")
    except Exception as e:
        print(f"  Error inserting {title}: {e}")

def scrape_studentbeans_india(existing: dict):
    """Scrape StudentBeans India deals listing."""
    print("Scraping StudentBeans India...")
    try:
        url = "https://www.studentbeans.com/student-discount/in"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        print(f"  Status code: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"  Warning: StudentBeans returned status {resp.status_code}. Might be blocked.")
            return

        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Broad selectors to handle layout changes
        cards = (
            soup.select("a[data-testid='offer-card']") or 
            soup.select(".offer-card, [class*='OfferCard']") or
            soup.select("a[href*='/student-discount/']") # Broadest fallback
        )
            
        print(f"  Found {len(cards)} items")
        
        for card in cards[:25]:
            title_el = card.select_one("[data-testid='offer-title']") or card.select_one("h3, .title, [class*='Title']")
            brand_el = card.select_one("[data-testid='brand-name']") or card.select_one(".brand, [class*='Brand']")
            discount_el = card.select_one("[data-testid='discount-text']") or card.select_one(".discount, [class*='Discount']")
            
            href = card.get("href", "")
            if not href: continue
            
            if not href.startswith("http"):
                link = "https://www.studentbeans.com" + href
            else:
                link = href

            if not title_el:
                continue

            upsert_deal({
                "title": title_el.get_text(strip=True),
                "brand_name": brand_el.get_text(strip=True) if brand_el else "Unknown",
                "description": discount_el.get_text(strip=True) if discount_el else "",
                "category": "software",
                "source_url": link,
                "deal_url": link,
            }, existing)
    except Exception as e:
        print(f"  StudentBeans error: {e}")

def scrape_static_deals(existing: dict):
    """Handles well-known evergreen student deals - updated to match existing DB names."""
    static_deals = [
        {
            "title": "GitHub Student Developer Pack",
            "brand_name": "GitHub",
            "description": "Free access to GitHub Pro, Copilot, and 100+ developer tools for students.",
            "category": "software",
            "source_url": "https://education.github.com/pack",
            "deal_url": "https://education.github.com/pack",
            "is_verified": True,
        },
        {
            "title": "Spotify Premium Student",
            "brand_name": "Spotify",
            "description": "Get Spotify Premium at half price with valid student email. Includes ad-free music.",
            "category": "ott",
            "source_url": "https://www.spotify.com/in-en/student/",
            "deal_url": "https://www.spotify.com/in-en/student/",
            "is_verified": True,
        },
        {
            "title": "Notion Personal Pro",
            "brand_name": "Notion",
            "description": "Full Notion Personal Pro plan free with .edu or verified student email.",
            "category": "software",
            "source_url": "https://www.notion.so/product/notion-for-education",
            "deal_url": "https://www.notion.so/product/notion-for-education",
            "is_verified": True,
        },
        {
            "title": "Apple Education Store: Save on MacBook & iPad",
            "brand_name": "Apple",
            "description": "Save on MacBook, iPad, and Pro Apps with Apple's official India Education Store.",
            "category": "other",
            "source_url": "https://www.apple.com/in-edu/store",
            "deal_url": "https://www.apple.com/in-edu/store",
            "is_verified": True,
        },
        {
            "title": "Amazon Prime Student India: 50% Cashback",
            "brand_name": "Amazon",
            "description": "Youth Offer: 50% cashback on Prime membership setup for 18-24 year olds.",
            "category": "other",
            "source_url": "https://www.amazon.in/prime/promo/landing",
            "deal_url": "https://www.amazon.in/prime/promo/landing",
            "is_verified": True,
        },
        {
            "title": "Canva Pro for Education",
            "brand_name": "Canva",
            "description": "Premium design tools free for students and teachers at verified institutions.",
            "category": "software",
            "source_url": "https://www.canva.com/education/",
            "deal_url": "https://www.canva.com/education/",
            "is_verified": True,
        }
    ]
    
    print("Checking static evergreen deals...")
    for deal in static_deals:
        upsert_deal(deal, existing)

if __name__ == "__main__":
    start_time = time.time()
    print(f"--- CampusLoot Scraper Started: {datetime.now(timezone.utc)} ---")
    
    existing = get_existing_deals()
    print(f"Found {len(existing['urls'])} URLs and {len(existing['titles'])} Titles in database\n")

    scrape_static_deals(existing)
    scrape_studentbeans_india(existing)
    
    duration = time.time() - start_time
    print(f"\n--- Scraper Finished in {duration:.2f} seconds ---")

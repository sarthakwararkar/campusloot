#!/usr/bin/env python3
"""
CampusLoot deal scraper.
Targets: StudentBeans India, UNiDAYS India, Amazon Student India, GitHub Student Pack,
Spotify Student India, Apple Education Store India.
Run via GitHub Actions every 6 hours.
"""

import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime, timezone
import time

# Robust environment variable loading
SUPABASE_URL = os.getenv("SUPABASE_URL")
# Use the correct key name — matching both .env and original scripts
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
    "Accept-Language": "en-US,en;q=0.5",
}

def get_existing_urls() -> set:
    """Fetch all source_urls already in the DB to avoid duplicates."""
    try:
        result = supabase.table("deals").select("source_url").execute()
        return {row["source_url"] for row in result.data if row.get("source_url")}
    except Exception as e:
        print(f"  Warning: Failed to fetch existing URLs: {e}")
        return set()

def upsert_deal(deal: dict, existing_urls: set):
    """Insert deal if new, update last_scraped_at if exists."""
    url = deal.get("source_url", "")
    if not url:
        return

    if url in existing_urls:
        try:
            # Just update the last_scraped_at timestamp
            supabase.table("deals").update(
                {"last_scraped_at": datetime.now(timezone.utc).isoformat()}
            ).eq("source_url", url).execute()
            print(f"  [updated] {deal['title']}")
        except Exception as e:
            print(f"  Error updating {url}: {e}")
        return

    # New deal — insert with needs_review=true
    deal["source"] = "scraped"
    deal["needs_review"] = True
    deal["is_active"] = False
    deal["is_featured"] = False
    deal["is_verified"] = False
    deal["last_scraped_at"] = datetime.now(timezone.utc).isoformat()
    
    try:
        supabase.table("deals").insert(deal).execute()
        print(f"  [new] {deal['title']}")
    except Exception as e:
        print(f"  Error inserting {deal['title']}: {e}")

def scrape_studentbeans_india(existing_urls: set):
    """Scrape StudentBeans India deals listing."""
    print("Scraping StudentBeans India...")
    try:
        url = "https://www.studentbeans.com/student-discount/in"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # StudentBeans markers can change frequently. Adding a fallback check.
        cards = soup.select("a[data-testid='offer-card']")
        if not cards:
            # Fallback to a broader selector if data-testid is missing
            cards = soup.select(".offer-card, [class*='OfferCard']")
            
        print(f"  Found {len(cards)} cards")
        
        for card in cards[:20]:
            title_el = card.select_one("[data-testid='offer-title']") or card.select_one("h3, .title")
            brand_el = card.select_one("[data-testid='brand-name']") or card.select_one(".brand")
            discount_el = card.select_one("[data-testid='discount-text']") or card.select_one(".discount")
            
            href = card.get("href", "")
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
            }, existing_urls)
    except Exception as e:
        print(f"  StudentBeans error: {e}")

def scrape_static_deals(existing_urls: set):
    """Handles well-known evergreen student deals."""
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
            "title": "Spotify Premium Student — ₹59/month",
            "brand_name": "Spotify",
            "description": "Get Spotify Premium at half price with valid student email. Includes ad-free music.",
            "category": "ott",
            "source_url": "https://www.spotify.com/in-en/student/",
            "deal_url": "https://www.spotify.com/in-en/student/",
            "is_verified": True,
        },
        {
            "title": "Notion Personal Pro — Free for Students",
            "brand_name": "Notion",
            "description": "Full Notion Personal Pro plan free with .edu or verified student email.",
            "category": "software",
            "source_url": "https://www.notion.so/students",
            "deal_url": "https://www.notion.so/students",
            "is_verified": True,
        },
        {
            "title": "Apple Education Store Discounts",
            "brand_name": "Apple",
            "description": "Save on MacBook, iPad, and Pro Apps with Apple's official India Education Store.",
            "category": "other",
            "source_url": "https://www.apple.com/in-edu/store",
            "deal_url": "https://www.apple.com/in-edu/store",
            "is_verified": True,
        },
        {
            "title": "Amazon Prime Student — 50% Off",
            "brand_name": "Amazon",
            "description": "Youth Offer: 50% cashback on Prime membership setup for 18-24 year olds.",
            "category": "other",
            "source_url": "https://www.amazon.in/b?node=10096591031",
            "deal_url": "https://www.amazon.in/b?node=10096591031",
            "is_verified": True,
        },
        {
            "title": "Canva Pro — Free for Education",
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
        upsert_deal(deal, existing_urls)

def mark_dead_deals():
    """Check deals with source_url — if they 404, mark is_active=false."""
    print("Checking for dead deals...")
    try:
        result = supabase.table("deals").select("id, source_url").eq("source", "scraped").eq("is_active", True).execute()
        for deal in result.data:
            url = deal.get("source_url")
            if not url:
                continue
            try:
                # Use a small timeout and allow redirects
                resp = requests.head(url, headers=HEADERS, timeout=8, allow_redirects=True)
                if resp.status_code == 404:
                    supabase.table("deals").update({"is_active": False}).eq("id", deal["id"]).execute()
                    print(f"  [dead] {url}")
            except Exception:
                pass  # Ignore network errors during dead check
    except Exception as e:
        print(f"  Error checking dead deals: {e}")

if __name__ == "__main__":
    start_time = time.time()
    print(f"--- CampusLoot Scraper Started: {datetime.now(timezone.utc)} ---")
    
    existing = get_existing_urls()
    print(f"Found {len(existing)} existing source URLs in database\n")

    # Run each task independently
    scrape_static_deals(existing)
    scrape_studentbeans_india(existing)
    
    # mark_dead_deals() # Optional: Disable if taking too long in GH Actions
    
    duration = time.time() - start_time
    print(f"\n--- Scraper Finished in {duration:.2f} seconds ---")

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

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]  # service role key, not anon key

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CampusLootBot/1.0; +https://campusloot.in)"
}

def get_existing_urls() -> set:
    """Fetch all source_urls already in the DB to avoid duplicates."""
    result = supabase.table("deals").select("source_url").execute()
    return {row["source_url"] for row in result.data if row.get("source_url")}

def upsert_deal(deal: dict, existing_urls: set):
    """Insert deal if new, update last_scraped_at if exists."""
    url = deal.get("source_url", "")
    if url in existing_urls:
        # Just update the last_scraped_at timestamp
        supabase.table("deals").update(
            {"last_scraped_at": datetime.now(timezone.utc).isoformat()}
        ).eq("source_url", url).execute()
        print(f"  [updated] {deal['title']}")
        return

    # New deal — insert with needs_review=true
    deal["source"] = "scraped"
    deal["needs_review"] = True
    deal["is_active"] = False
    deal["is_featured"] = False
    deal["is_verified"] = False
    deal["last_scraped_at"] = datetime.now(timezone.utc).isoformat()
    supabase.table("deals").insert(deal).execute()
    print(f"  [new] {deal['title']}")

def scrape_studentbeans_india(existing_urls: set):
    """Scrape StudentBeans India deals listing."""
    print("Scraping StudentBeans India...")
    try:
        url = "https://www.studentbeans.com/student-discount/in"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("a[data-testid='offer-card']")
        for card in cards[:20]:
            title = card.select_one("[data-testid='offer-title']")
            brand = card.select_one("[data-testid='brand-name']")
            discount = card.select_one("[data-testid='discount-text']")
            link = "https://www.studentbeans.com" + card.get("href", "")
            if not title:
                continue
            upsert_deal({
                "title": title.get_text(strip=True),
                "brand_name": brand.get_text(strip=True) if brand else "Unknown",
                "description": discount.get_text(strip=True) if discount else "",
                "category": "software",
                "source_url": link,
                "deal_url": link,
            }, existing_urls)
    except Exception as e:
        print(f"  StudentBeans error: {e}")

def scrape_github_student_pack(existing_urls: set):
    """GitHub Student Pack is a known static deal."""
    print("Checking GitHub Student Pack...")
    deal_url = "https://education.github.com/pack"
    upsert_deal({
        "title": "GitHub Student Developer Pack",
        "brand_name": "GitHub",
        "description": "Free access to GitHub Pro, Copilot, and 100+ developer tools for students.",
        "category": "software",
        "source_url": deal_url,
        "deal_url": deal_url,
        "is_verified": True,
    }, existing_urls)

def scrape_spotify_student(existing_urls: set):
    """Spotify Student India — known deal."""
    print("Checking Spotify Student India...")
    deal_url = "https://www.spotify.com/in-en/student/"
    upsert_deal({
        "title": "Spotify Premium Student — 50% Off",
        "brand_name": "Spotify",
        "description": "Get Spotify Premium at half price with valid student email. ₹59/month instead of ₹119.",
        "category": "ott",
        "source_url": deal_url,
        "deal_url": deal_url,
        "is_verified": True,
    }, existing_urls)

def scrape_notion_student(existing_urls: set):
    """Notion Student Plan — free."""
    print("Checking Notion Student...")
    deal_url = "https://www.notion.so/students"
    upsert_deal({
        "title": "Notion Personal Pro — Free for Students",
        "brand_name": "Notion",
        "description": "Full Notion Personal Pro plan free with .edu or verified student email.",
        "category": "software",
        "source_url": deal_url,
        "deal_url": deal_url,
        "is_verified": True,
    }, existing_urls)

def scrape_apple_education(existing_urls: set):
    """Apple Education Store India."""
    print("Checking Apple Education India...")
    deal_url = "https://www.apple.com/in-edu/store"
    upsert_deal({
        "title": "Apple Education Pricing — Up to ₹9,000 off MacBook",
        "brand_name": "Apple",
        "description": "Students get exclusive discounts on Mac and iPad through Apple's Education Store.",
        "category": "other",
        "source_url": deal_url,
        "deal_url": deal_url,
        "is_verified": True,
    }, existing_urls)

def scrape_amazon_student(existing_urls: set):
    """Amazon Prime Student India."""
    print("Checking Amazon Prime Student...")
    deal_url = "https://www.amazon.in/b?node=10096591031"
    upsert_deal({
        "title": "Amazon Prime Student — 6 Months Free",
        "brand_name": "Amazon",
        "description": "Students get 6 months of Amazon Prime free, then 50% off. Includes Prime Video, free delivery.",
        "category": "other",
        "source_url": deal_url,
        "deal_url": deal_url,
        "is_verified": True,
    }, existing_urls)

def scrape_canva_education(existing_urls: set):
    """Canva for Education."""
    print("Checking Canva Education...")
    deal_url = "https://www.canva.com/education/"
    upsert_deal({
        "title": "Canva Pro — Free for Students",
        "brand_name": "Canva",
        "description": "Full Canva Pro free for students and educators. Premium templates, brand kit, background remover.",
        "category": "software",
        "source_url": deal_url,
        "deal_url": deal_url,
        "is_verified": True,
    }, existing_urls)

def mark_dead_deals():
    """Check deals with source_url — if they 404, mark is_active=false."""
    print("Checking for dead deals...")
    result = supabase.table("deals").select("id, source_url").eq("source", "scraped").eq("is_active", True).execute()
    for deal in result.data:
        url = deal.get("source_url")
        if not url:
            continue
        try:
            resp = requests.head(url, headers=HEADERS, timeout=8, allow_redirects=True)
            if resp.status_code == 404:
                supabase.table("deals").update({"is_active": False}).eq("id", deal["id"]).execute()
                print(f"  [dead] {url}")
        except Exception:
            pass  # network error — don't mark dead, might be temporary

if __name__ == "__main__":
    print(f"CampusLoot Scraper — {datetime.now(timezone.utc)}")
    existing = get_existing_urls()
    print(f"Found {len(existing)} existing deals in DB\n")

    scrape_github_student_pack(existing)
    scrape_spotify_student(existing)
    scrape_notion_student(existing)
    scrape_apple_education(existing)
    scrape_amazon_student(existing)
    scrape_canva_education(existing)
    scrape_studentbeans_india(existing)

    mark_dead_deals()
    print("\nDone.")

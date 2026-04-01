#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
from scraper_base import get_supabase_client, get_existing_deals, upsert_deal, HEADERS, rate_limit_delay

def scrape_evergreen_software(supabase, existing):
    print("Scraping Evergreen Software Deals...")
    deals = [
        {"title": "GitHub Student Developer Pack", "brand": "GitHub", "url": "https://education.github.com/pack"},
        {"title": "JetBrains All Products Pack", "brand": "JetBrains", "url": "https://www.jetbrains.com/community/education/"},
        {"title": "Notion Personal Pro", "brand": "Notion", "url": "https://www.notion.so/students"},
        {"title": "Figma Education", "brand": "Figma", "url": "https://www.figma.com/education/"},
        {"title": "Canva Pro for Education", "brand": "Canva", "url": "https://www.canva.com/education/"},
    ]
    
    for d in deals:
        try:
            print(f"  Checking {d['title']}...")
            resp = requests.get(d["url"], headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                description = soup.title.string.strip() if soup.title else ""
                
                # Expand description with meta summary if possible
                meta_desc = soup.find("meta", attrs={"name": "description"})
                if meta_desc and meta_desc.get("content"):
                    description = meta_desc["content"].strip()

                upsert_deal(supabase, {
                    "title": d["title"],
                    "brand_name": d["brand"],
                    "description": description,
                    "category": "software",
                    "source_url": d["url"],
                    "deal_url": d["url"],
                    "is_verified": True
                }, existing)
                rate_limit_delay()
        except Exception as e:
            print(f"  Error checking {d['title']}: {e}")

def scrape_evergreen_entertainment(supabase, existing):
    print("Scraping Evergreen Entertainment Deals...")
    deals = [
        {"title": "Spotify Premium Student", "brand": "Spotify", "url": "https://www.spotify.com/in-en/student/"},
        {"title": "YouTube Premium Student", "brand": "YouTube", "url": "https://www.youtube.com/premium/student"},
        {"title": "BookMyShow Movie Discounts", "brand": "BookMyShow", "url": "https://in.bookmyshow.com/offers"},
        {"title": "Swiggy Student Rewards: Swiggy One Lite @ \u20b91", "brand": "Swiggy", "url": "https://blog.swiggy.com/swiggy-catalyst/sign-up-for-the-swiggy-student-rewards-program-with-your-college-id-card-now/"},
    ]
    
    for d in deals:
        try:
            print(f"  Checking {d['title']}...")
            resp = requests.get(d["url"], headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                meta_desc = soup.find("meta", attrs={"name": "description"})
                description = meta_desc["content"].strip() if meta_desc and meta_desc.get("content") else ""

                upsert_deal(supabase, {
                    "title": d["title"],
                    "brand_name": d["brand"],
                    "description": description,
                    "category": "ott" if "ott" in d.get("category", "") else "other",
                    "source_url": d["url"],
                    "deal_url": d["url"],
                    "is_verified": True
                }, existing)
                rate_limit_delay()
        except Exception as e:
            print(f"  Error checking {d['title']}: {e}")

if __name__ == "__main__":
    supabase = get_supabase_client()
    existing = get_existing_deals(supabase)
    
    scrape_evergreen_software(supabase, existing)
    scrape_evergreen_entertainment(supabase, existing)

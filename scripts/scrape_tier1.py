import requests
from bs4 import BeautifulSoup
from scraper_base import get_supabase_client, get_existing_deals, upsert_deal, HEADERS, rate_limit_delay

def scrape_grabon(supabase, existing):
    """Scrapes GrabOn Education Coupons"""
    print("Scraping GrabOn...")
    url = "https://www.grabon.in/education-coupons/"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"  GrabOn failed: {resp.status_code}")
            return
        
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select('div[data-type="cp"]')
        print(f"  Found {len(cards)} GrabOn deals")
        
        for card in cards:
            title_tag = card.select_one("p.title")
            if not title_tag: continue
            
            title = title_tag.get_text(strip=True)
            link_tag = card.find("a")
            link = "https://www.grabon.in" + link_tag['href'] if link_tag and 'href' in link_tag.attrs else url
            
            desc_tag = card.select_one(".bm")
            desc = desc_tag.get_text(strip=True) if desc_tag else "Check GrabOn for details"
            
            deal_data = {
                "title": title,
                "description": desc,
                "deal_url": link,
                "source_url": link,
                "brand_name": "GrabOn",
                "category": "Education"
            }
            
            upsert_deal(supabase, deal_data, existing)
            rate_limit_delay()
    except Exception as e:
        print(f"  GrabOn error: {e}")

def scrape_desidime(supabase, existing):
    """Scrapes DesiDime Education/Student deals"""
    print("Scraping DesiDime...")
    url = "https://www.desidime.com/groups/education"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"  DesiDime failed: {resp.status_code}")
            return
        
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("article")
        print(f"  Found {len(cards)} DesiDime deals")
        
        for card in cards:
            title_tag = card.select_one('a[href^="/deals/"]')
            if not title_tag: continue
            
            title = title_tag.get_text(strip=True)
            link = "https://www.desidime.com" + title_tag['href']
            
            store_tag = card.select_one('a[href^="/stores/"]')
            merchant = store_tag.get_text(strip=True) if store_tag else "DesiDime"
            
            deal_data = {
                "title": title,
                "description": f"Student deal found on DesiDime for {merchant}",
                "deal_url": link,
                "source_url": link,
                "brand_name": merchant,
                "category": "Student"
            }
            
            upsert_deal(supabase, deal_data, existing)
            rate_limit_delay()
    except Exception as e:
        print(f"  DesiDime error: {e}")

if __name__ == "__main__":
    try:
        supabase = get_supabase_client()
        existing = get_existing_deals(supabase)
        scrape_grabon(supabase, existing)
        scrape_desidime(supabase, existing)
    except Exception as e:
        print(f"Initialization error: {e}")

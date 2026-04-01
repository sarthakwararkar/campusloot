import requests
from bs4 import BeautifulSoup
import time

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
}

def dry_run_tier1():
    print("--- Dry Run: GrabOn ---")
    try:
        url = "https://www.grabon.in/education-coupons/"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        print(f"Status: {resp.status_code}, Length: {len(resp.text)}")
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("div[data-type='cp']")
        print(f"Found {len(cards)} GrabOn cards")
        for card in cards[:3]:
            title = card.select_one("p.title")
            print(f"  - {title.get_text(strip=True) if title else 'No Title'}")
    except Exception as e:
        print(f"GrabOn error: {e}")

    print("\n--- Dry Run: CouponDunia ---")
    try:
        url = "https://www.coupondunia.in/category/education-and-learning/education"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select(".offer-card-container")
        print(f"Found {len(cards)} CouponDunia cards")
        for card in cards[:3]:
            title = card.select_one("h3.offer-get-code-link")
            print(f"  - {title.get_text(strip=True) if title else 'No Title'}")
    except Exception as e:
        print(f"CouponDunia error: {e}")

if __name__ == "__main__":
    dry_run_tier1()

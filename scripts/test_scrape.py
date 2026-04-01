import requests
from bs4 import BeautifulSoup
import time

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
}

def check_grabon():
    print("--- Testing GrabOn ---")
    url = "https://www.grabon.in/education-coupons/"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select('div[data-type="cp"]')
        print(f"Success! Found {len(cards)} deals.")
        for card in cards[:3]:
            title = card.select_one("p.title")
            print(f"  [Deal] {title.get_text(strip=True) if title else 'Unknown'}")
    except Exception as e:
        print(f"Error: {e}")

def check_desidime():
    print("\n--- Testing DesiDime ---")
    url = "https://www.desidime.com/groups/education"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("article")
        print(f"Success! Found {len(cards)} deals.")
        for card in cards[:3]:
            title_tag = card.select_one('a[href^="/deals/"]')
            print(f"  [Deal] {title_tag.get_text(strip=True) if title_tag else 'Unknown'}")
    except Exception as e:
        print(f"Error: {e}")

def check_evergreen():
    print("\n--- Testing Evergreen (Swiggy) ---")
    url = "https://blog.swiggy.com/swiggy-catalyst/sign-up-for-the-swiggy-student-rewards-program-with-your-college-id-card-now/"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        print(f"Success! Reached Swiggy blog. Title: {soup.title.string.strip() if soup.title else 'No Title'}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_grabon()
    check_desidime()
    check_evergreen()

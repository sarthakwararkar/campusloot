#!/usr/bin/env python3
import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime, timezone
import time

# Load env from .env if it exists (for local testing)
# Look for .env in the project root (parent of scripts/)
_env_paths = [
    os.path.join(os.path.dirname(__file__), "..", ".env"),  # ../. env (project root)
    os.path.join(os.path.dirname(__file__), ".env"),        # scripts/.env
    ".env",                                                  # CWD fallback
]
for _env_path in _env_paths:
    try:
        with open(_env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and "=" in line and not line.startswith("#"):
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip().replace('"', '').replace("'", ""))
        break  # Stop after first successful load
    except FileNotFoundError:
        continue

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing SUPABASE environment variables.")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# Use this to keep standard headers
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
}

def get_existing_deals(supabase: Client) -> dict:
    """Fetch all deals to avoid duplicates. Returns {source_url: id, title: id}."""
    try:
        result = supabase.table("deals").select("id, title, source_url").execute()
        urls = {row["source_url"]: row["id"] for row in result.data if row.get("source_url")}
        titles = {row["title"].lower().strip(): row["id"] for row in result.data if row.get("title")}
        return {"urls": urls, "titles": titles}
    except Exception as e:
        print(f"  Warning: Failed to fetch existing deals: {e}")
        return {"urls": {}, "titles": {}}

def upsert_deal(supabase: Client, deal: dict, existing: dict):
    """Insert deal if new, update existing if match found by URL or Title."""
    url = deal.get("source_url", "")
    title = deal.get("title", "").strip()
    title_lower = title.lower()
    
    deal_id = existing["urls"].get(url)
    
    if not deal_id:
        deal_id = existing["titles"].get(title_lower)
        if not deal_id:
            for db_title_lower, db_id in existing["titles"].items():
                if db_title_lower in title_lower or title_lower in db_title_lower:
                    if len(db_title_lower) > 5:
                        deal_id = db_id
                        break

    if deal_id:
        try:
            update_payload = {
                "last_scraped_at": datetime.now(timezone.utc).isoformat(),
            }
            if not existing["urls"].get(url):
                update_payload["source_url"] = url
            
            supabase.table("deals").update(update_payload).eq("id", deal_id).execute()
        except Exception as e:
            print(f"  Error updating {title}: {e}")
        return

    # Truly new deal
    deal.setdefault("source", "scraped")
    deal.setdefault("needs_review", True)
    deal.setdefault("is_active", False)
    deal["last_scraped_at"] = datetime.now(timezone.utc).isoformat()
    
    try:
        supabase.table("deals").insert(deal).execute()
        print(f"  [new] {title}")
    except Exception as e:
        print(f"  Error inserting {title}: {e}")

def rate_limit_delay():
    """Mandatory 2-second delay between requests."""
    time.sleep(2)

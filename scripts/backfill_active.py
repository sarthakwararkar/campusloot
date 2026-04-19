#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from scraper_base import get_supabase_client

def backfill():
    print("Connecting to Supabase...")
    supabase = get_supabase_client()
    try:
        # Update deals that are currently inactive
        print("Backfilling deals. Setting is_active = True...")
        res = supabase.table("deals").update({"is_active": True}).eq("is_active", False).execute()
        print(f"Successfully updated {len(res.data)} deals to be active.")
    except Exception as e:
        print(f"Error backfilling deals: {e}")

if __name__ == "__main__":
    backfill()

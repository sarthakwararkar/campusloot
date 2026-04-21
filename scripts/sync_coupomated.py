import os
import requests
import json
from datetime import datetime

# Configuration
COUPOMATED_API_TOKEN = os.environ.get('COUPOMATED_API_TOKEN', 'Epr0DPHVLFRQFVKkXBoGpp7WuEPyXVnT')
# The Coupomated API URL - this is a sample based on their documentation
# You should verify the exact endpoint from your dashboard
COUPOMATED_API_URL = f"https://api.coupomated.com/v1/coupons?token={COUPOMATED_API_TOKEN}&format=json"

# CampusLoot API Proxy
CAMPUSLOOT_PROXY_URL = "https://campusloot.vercel.app/api/deals"
# You might need a service role key or admin JWT for this
# For now, we assume the proxy allows this action if coming from a trusted source
ADMIN_JWT = os.environ.get('ADMIN_JWT', '') 

def fetch_coupomated_deals():
    print(f"[{datetime.now()}] Fetching deals from Coupomated...")
    try:
        response = requests.get(COUPOMATED_API_URL)
        response.raise_for_status()
        data = response.json()
        
        if not data.get('result'):
            print(f"Error from Coupomated: {data.get('message')}")
            return []
            
        return data.get('data', [])
    except Exception as e:
        print(f"Failed to fetch from Coupomated: {e}")
        return []

def sync_to_campusloot(deals):
    print(f"[{datetime.now()}] Syncing {len(deals)} deals to CampusLoot...")
    
    success_count = 0
    for deal in deals:
        # Map Coupomated fields to CampusLoot schema
        mapped_data = {
            "external_id": str(deal.get('offer_id')),
            "title": deal.get('title'),
            "description": deal.get('description', ''),
            "deal_url": deal.get('affiliate_link'),
            "image_url": deal.get('image_url'),
            "brand_name": deal.get('source', 'Unknown'),
            "category": "other", # You can map categories if needed
            "discount_text": "Coupomated Deal",
            "is_active": True,
            "is_verified": True
        }
        
        try:
            payload = {
                "action": "sync_external_deal",
                "data": mapped_data
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            if ADMIN_JWT:
                headers["Authorization"] = f"Bearer {ADMIN_JWT}"
                
            res = requests.post(CAMPUSLOOT_PROXY_URL, json=payload, headers=headers)
            res.raise_for_status()
            
            result = res.json()
            if result.get('success'):
                success_count += 1
        except Exception as e:
            print(f"Failed to sync deal {deal.get('offer_id')}: {e}")
            
    print(f"[{datetime.now()}] Sync complete. {success_count}/{len(deals)} deals processed.")

if __name__ == "__main__":
    deals = fetch_coupomated_deals()
    if deals:
        sync_to_campusloot(deals)
    else:
        print("No deals found to sync.")

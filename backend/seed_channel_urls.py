import os
import sys
from sqlalchemy import text, create_engine
from pathlib import Path
from dotenv import load_dotenv
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

env_path = Path('backend/.env')
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found!")
    sys.exit(1)

# Base URL mappings for channels
CHANNEL_URLS = {
    "Amazon India": "https://www.amazon.in/gp/product/{id}?th=1",
    "Flipkart": "https://www.flipkart.com/product/p/itme?pid=",
    "Tata Cliq": "https://www.tatacliq.com/",
    "Myntra": "https://www.myntra.com/",
    "Nykaa": "https://www.nykaa.com/",
    "Nykaa Fashion": "https://www.nykaafashion.com/",
    "AJIO": "https://www.ajio.com/p/",
    "Meesho": "https://www.meesho.com/",
}

def seed_urls():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Updating Channel Base URLs...")
        for label, url in CHANNEL_URLS.items():
            # Check if channel exists
            res = conn.execute(text("SELECT id, metadata_json FROM reference_data WHERE reference_data_type='CHANNEL' AND label=:l"), {"l": label})
            row = res.fetchone()
            if row:
                cid, meta = row
                if not meta:
                    meta = {}
                elif isinstance(meta, str):
                    meta = json.loads(meta)
                
                meta['base_url'] = url
                conn.execute(text("UPDATE reference_data SET metadata_json=:m WHERE id=:id"), {"m": json.dumps(meta), "id": cid})
                conn.commit()
                print(f"Updated {label} with base_url: {url}")
            else:
                # If it doesn't exist, create it
                key = label.lower().replace(' ', '_')
                meta = {'base_url': url}
                conn.execute(text("INSERT INTO reference_data (reference_data_type, label, key, metadata_json) VALUES ('CHANNEL', :l, :k, :m)"), 
                             {"l": label, "k": key, "m": json.dumps(meta)})
                conn.commit()
                print(f"Created {label} with base_url: {url}")

if __name__ == "__main__":
    seed_urls()

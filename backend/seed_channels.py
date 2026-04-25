from sqlalchemy import create_engine, text
import os

DATABASE_URL = "postgresql://postgres.jljcnubiqfjinlnadslg:bXwpjzSuQWAIwxCu@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

def seed_channels():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Seeding Channels...")
        
        # Get Platform IDs to use as parents if needed, but for now we'll just add Channels
        # Amazon India, Amazon US, Flipkart, Myntra, etc.
        channels = [
            ("Amazon India", "chan_amz_in"),
            ("Amazon US", "chan_amz_us"),
            ("Flipkart", "chan_fk"),
            ("Myntra", "chan_myn"),
            ("Nykaa", "chan_nykaa"),
            ("AJIO", "chan_ajio"),
            ("Shopify Store", "chan_shopify")
        ]
        
        for label, key in channels:
            # Check if exists
            res = conn.execute(text("SELECT id FROM reference_data WHERE reference_data_type='CHANNEL' AND label=:l"), {"l": label})
            if not res.fetchone():
                conn.execute(text("""
                    INSERT INTO reference_data (reference_data_type, label, key, display_order, is_active, created_at, updated_at)
                    VALUES ('CHANNEL', :l, :k, 0, true, now(), now())
                """), {"l": label, "k": key})
                print(f"Added channel: {label}")
        
        conn.commit()
        print("Seeding complete.")

if __name__ == "__main__":
    seed_channels()

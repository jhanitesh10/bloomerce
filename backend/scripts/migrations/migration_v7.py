import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    if not DATABASE_URL:
        print("DATABASE_URL not found in environment")
        return

    # Handle postgres:// vs postgresql://
    url = DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(url)
    
    with engine.connect() as conn:
        print("Running PostgreSQL Migration v7...")
        
        try:
            # 1. Add 'icon' column to reference_data
            # check if exists first
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='reference_data' AND column_name='icon'"))
            if not res.fetchone():
                print("Adding 'icon' column to reference_data...")
                conn.execute(text("ALTER TABLE reference_data ADD COLUMN icon VARCHAR(255)"))
            
            # 2. Rename channel_reference_id to ecommerce_channel_reference_id in sales_orders
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='channel_reference_id'"))
            if res.fetchone():
                res_new = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='ecommerce_channel_reference_id'"))
                if not res_new.fetchone():
                    print("Renaming channel_reference_id to ecommerce_channel_reference_id in sales_orders...")
                    conn.execute(text("ALTER TABLE sales_orders RENAME COLUMN channel_reference_id TO ecommerce_channel_reference_id"))
            else:
                # If channel_reference_id doesn't exist, check if ecommerce_channel_reference_id exists. If not, add it.
                res_new = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='ecommerce_channel_reference_id'"))
                if not res_new.fetchone():
                    print("Adding ecommerce_channel_reference_id column to sales_orders...")
                    conn.execute(text("ALTER TABLE sales_orders ADD COLUMN ecommerce_channel_reference_id INTEGER REFERENCES reference_data(id)"))

            # 3. Handle platform_reference_id data migration if needed
            res_plat = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='platform_reference_id'"))
            if res_plat.fetchone():
                print("Migrating platform_reference_id data to ecommerce_channel_reference_id...")
                conn.execute(text("UPDATE sales_orders SET ecommerce_channel_reference_id = platform_reference_id WHERE ecommerce_channel_reference_id IS NULL"))

            # 4. Update existing 'CHANNEL' type to 'ECOMMERCE_CHANNEL'
            print("Updating reference_data_type from 'CHANNEL' to 'ECOMMERCE_CHANNEL'...")
            conn.execute(text("UPDATE reference_data SET reference_data_type = 'ECOMMERCE_CHANNEL' WHERE reference_data_type = 'CHANNEL'"))

            conn.commit()
            print("PostgreSQL Migration v7 successful.")
        except Exception as e:
            print(f"Error during migration: {e}")
            # conn.rollback() # engine.connect() context manager handles transaction if used with begin() or manual commit.
            # actually with engine.connect() in newer sqlalchemy you might need to use begin()

if __name__ == "__main__":
    run_migration()

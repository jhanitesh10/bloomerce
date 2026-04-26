import os
from sqlalchemy import text, create_engine
from pathlib import Path
from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    if not DATABASE_URL:
        print("DATABASE_URL not found!")
        return

    print(f"Connecting to: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("Checking for channel_reference_id in sales_orders...")
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='sales_orders' AND column_name='channel_reference_id';
        """))
        
        if not result.fetchone():
            print("Adding channel_reference_id column to sales_orders...")
            conn.execute(text("ALTER TABLE sales_orders ADD COLUMN channel_reference_id INTEGER REFERENCES reference_data(id);"))
            conn.commit()
            print("Migration successful: added channel_reference_id.")
        else:
            print("Column 'channel_reference_id' already exists.")

        # Also check for platform_reference_id just in case
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='sales_orders' AND column_name='platform_reference_id';
        """))
        if not result.fetchone():
             print("Adding platform_reference_id column to sales_orders...")
             conn.execute(text("ALTER TABLE sales_orders ADD COLUMN platform_reference_id INTEGER REFERENCES reference_data(id);"))
             conn.commit()
             print("Migration successful: added platform_reference_id.")

if __name__ == "__main__":
    run_migration()

from sqlalchemy import text, create_engine

# Use the DATABASE_URL from .env or environment
DATABASE_URL = "postgresql://postgres.jljcnubiqfjinlnadslg:bXwpjzSuQWAIwxCu@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

def run_migration():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("Checking for platform_identifiers column...")
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='sku_master' AND column_name='platform_identifiers';
        """))
        
        if not result.fetchone():
            print("Adding platform_identifiers column to sku_master...")
            conn.execute(text("ALTER TABLE sku_master ADD COLUMN platform_identifiers JSONB;"))
            conn.commit()
            print("Migration successful.")
        else:
            print("Column 'platform_identifiers' already exists.")

if __name__ == "__main__":
    run_migration()

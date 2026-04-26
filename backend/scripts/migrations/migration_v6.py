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
        # Helper to rename column if it exists
        def rename_column(table, old_name, new_name):
            print(f"Checking for {old_name} in {table}...")
            result = conn.execute(text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='{table}' AND column_name='{old_name}';
            """))
            if result.fetchone():
                print(f"Renaming {old_name} to {new_name} in {table}...")
                conn.execute(text(f"ALTER TABLE {table} RENAME COLUMN \"{old_name}\" TO \"{new_name}\";"))
                conn.commit()
                print("Success.")
            else:
                print(f"Column {old_name} not found in {table}.")

        rename_column('sku_master', 'createdAt', 'created_at')
        rename_column('sku_master', 'updatedAt', 'updated_at')
        rename_column('sku_master', 'deletedAt', 'deleted_at')

if __name__ == "__main__":
    run_migration()

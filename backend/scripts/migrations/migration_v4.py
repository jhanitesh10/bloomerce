import sqlite3
import os

# Path to your database
DB_PATH = 'backend/bloomerce_local.db'

def run_migration():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(sku_master)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'platform_identifiers' not in columns:
            print("Adding platform_identifiers column to sku_master...")
            cursor.execute("ALTER TABLE sku_master ADD COLUMN platform_identifiers JSON")
            conn.commit()
            print("Migration successful.")
        else:
            print("Column 'platform_identifiers' already exists.")

    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()

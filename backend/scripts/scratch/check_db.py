import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

env_path = Path('backend/.env')
load_dotenv(dotenv_path=env_path)

db_url = os.getenv("DATABASE_URL")
print(f"Connecting to: {db_url}")

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"Result: {result.fetchone()}")
        print("Connection successful!")
except Exception as e:
    print(f"Connection failed: {e}")

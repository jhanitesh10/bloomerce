import os
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

load_dotenv('backend/.env')
engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    res = conn.execute(text("SELECT label FROM reference_data WHERE reference_data_type='CHANNEL'"))
    for row in res:
        print(f"'{row[0]}'")

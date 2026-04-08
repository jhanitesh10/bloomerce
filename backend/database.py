from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv() # Load variables from .env if present

# Default to local sqlite for development if docker is not running.
# To use MySQL, set DATABASE_URL="mysql+pymysql://user:userpassword@127.0.0.1:3306/bloomerce_db"
# SQLAlchemy 1.4+ requires 'postgresql://' instead of 'postgres://'
# Render/Heroku often provide strings starting with 'postgres://'
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bloomerce_local.db")
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

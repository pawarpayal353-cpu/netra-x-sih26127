"""
Database configuration.

Defaults to a local SQLite file for zero-configuration demo mode.
Set DATABASE_URL in .env to point at PostgreSQL (+PostGIS) for production,
e.g. postgresql+psycopg2://user:pass@localhost:5432/netrax
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./netrax.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

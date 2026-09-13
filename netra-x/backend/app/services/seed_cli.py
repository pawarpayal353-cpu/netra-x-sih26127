"""
Run with: python -m app.services.seed_cli
Drops and recreates all tables, then reseeds full demo data.
"""
from app.services.seed import reset_and_seed

if __name__ == "__main__":
    reset_and_seed()
    print("NETRA-X demo data reseeded.")

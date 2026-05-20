from sqlalchemy import text
from database import engine

with engine.connect() as conn:
    result = conn.execute(text(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
        "ORDER BY table_name"
    ))
    tables = result.fetchall()
    print(f"\nTables on Supabase ({len(tables)} total):")
    for (name,) in tables:
        print(f"  OK  {name}")
    print("\nDone.")

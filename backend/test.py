from sqlalchemy import text
from database import engine

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version();"))

        for row in result:
            print(row)

    print("Connected to Supabase successfully!")

except Exception as e:
    print("Connection failed:")
    print(e)
import psycopg2
import os

DB_URL = "postgresql://postgres:postgres@100.96.255.69:5432/ps3"

try:
    conn = psycopg2.connect(DB_URL, connect_timeout=5)
    print("SUCCESS: Connected to Cato's DB")
    conn.close()
except Exception as e:
    print(f"FAILED: Could not connect to Cato's DB: {e}")

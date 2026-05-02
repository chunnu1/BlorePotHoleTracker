import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    db_user = os.getenv("DB_USER")
    db_pass = os.getenv("DB_PASS")
    db_name = os.getenv("DB_NAME", "potholes")
    instance_connection_name = os.getenv("INSTANCE_CONNECTION_NAME")
    db_host = os.getenv("DB_HOST", "localhost")

    # If running on Cloud Run, use the Unix socket
    if os.getenv("K_SERVICE"):
        # Connect using the Unix socket provided by Cloud SQL Auth Proxy
        conn = psycopg2.connect(
            user=db_user,
            password=db_pass,
            dbname=db_name,
            host=f"/cloudsql/{instance_connection_name}",
            cursor_factory=psycopg2.extras.DictCursor
        )
    else:
        # Standard TCP connection
        conn = psycopg2.connect(
            user=db_user,
            password=db_pass,
            dbname=db_name,
            host=db_host,
            cursor_factory=psycopg2.extras.DictCursor
        )
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Log connection info
    print(f"Initializing database: {conn.dsn}")
    
    # Ensure PostGIS is enabled
    cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    
    # Force recreation for troubleshooting (CAUTION: deletes data)
    # cursor.execute("DROP TABLE IF EXISTS potholes;")
    # cursor.execute("DROP TABLE IF EXISTS admin;")

    # Create potholes table with PostGIS geography type
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS potholes (
            id SERIAL PRIMARY KEY,
            taluk TEXT,
            reports_count INTEGER DEFAULT 1,
            image_data TEXT,
            mla TEXT,
            mp TEXT,
            mla_photo_url TEXT,
            mp_photo_url TEXT,
            location GEOGRAPHY(Point, 4326)
        )
    ''')
    
    # Create spatial index
    cursor.execute("CREATE INDEX IF NOT EXISTS potholes_location_idx ON potholes USING GIST (location);")
    
    # Create admin table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin (
            id SERIAL PRIMARY KEY,
            password_hash TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

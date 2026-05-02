import os
import psycopg2
import psycopg2.extras
from typing import Optional

def get_db_connection():
    # Use environment variables for connection
    db_user = os.getenv("DB_USER", "postgres")
    db_pass = os.getenv("DB_PASS", "postgres")
    db_name = os.getenv("DB_NAME", "potholes")
    db_host = os.getenv("DB_HOST", "localhost") # Default to localhost for local dev if needed
    
    # If running on Cloud Run, use the Cloud SQL unix socket
    instance_connection_name = os.getenv("INSTANCE_CONNECTION_NAME")
    
    if instance_connection_name:
        # Cloud SQL Unix Socket connection
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
    
    # Ensure PostGIS is enabled
    cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    
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
    
    cursor.execute("SELECT COUNT(*) FROM admin")
    if cursor.fetchone()[0] == 0:
        import hashlib
        default_hash = hashlib.sha256("admin123".encode()).hexdigest()
        cursor.execute("INSERT INTO admin (password_hash) VALUES (%s)", (default_hash,))

    conn.commit()
    conn.close()

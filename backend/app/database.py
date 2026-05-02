import sqlite3
import sys

DB_FILE = "potholes.sqlite"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.enable_load_extension(True)
    try:
        if sys.platform == 'win32':
            conn.load_extension('mod_spatialite')
        elif sys.platform == 'darwin':
            conn.load_extension('mod_spatialite.dylib')
        else:
            conn.load_extension('mod_spatialite.so')
    except sqlite3.OperationalError as e:
        print(f"Warning: Could not load spatialite extension: {e}")
        print("Make sure mod_spatialite is installed on your system.")
    return conn

# Database initialization logic
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT InitSpatialMetaData(1);")
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS potholes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            taluk TEXT,
            reports_count INTEGER DEFAULT 1,
            image_data TEXT,
            mla TEXT,
            mp TEXT,
            mla_photo_url TEXT,
            mp_photo_url TEXT
        )
    ''')
    
    cursor.execute("SELECT CheckSpatialMetaData();")
    
    try:
        cursor.execute("SELECT AddGeometryColumn('potholes', 'location', 4326, 'POINT', 'XY');")
        cursor.execute("SELECT CreateSpatialIndex('potholes', 'location');")
    except sqlite3.OperationalError:
        pass
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            password_hash TEXT
        )
    ''')
    cursor.execute("SELECT COUNT(*) as count FROM admin")
    if cursor.fetchone()['count'] == 0:
        import hashlib
        default_hash = hashlib.sha256("admin123".encode()).hexdigest()
        cursor.execute("INSERT INTO admin (password_hash) VALUES (?)", (default_hash,))

    conn.commit()
    conn.close()

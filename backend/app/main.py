import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.database import init_db
from app.routers import potholes, admin

app = FastAPI()

# Run initialization
try:
    init_db()
    print("Database initialized successfully.")
except Exception as e:
    print(f"Error during database initialization: {e}")
    # Don't crash here, let the app start so we can see logs

# Include Routers
app.include_router(potholes.router)
app.include_router(admin.router)

# Mount frontend
# Assumes structure:
# backend/app/main.py
# frontend/
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")
os.makedirs(frontend_dir, exist_ok=True)

app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.database import init_db
from app.routers import potholes, admin

app = FastAPI()

# Run initialization
init_db()

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

FROM python:3.11-slim

WORKDIR /app

# Install spatialite and sqlite3
RUN apt-get update && apt-get install -y \
    libsqlite3-mod-spatialite \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Set environment variables
ENV PORT=8080
ENV SPATIALITE_EXTENSION=mod_spatialite
ENV PYTHONPATH=/app/backend

# Expose port
EXPOSE 8080

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

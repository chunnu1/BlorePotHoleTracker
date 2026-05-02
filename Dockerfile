FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (libpq-dev is useful for psycopg2)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Set environment variables
ENV PORT=8080
ENV PYTHONPATH=/app/backend

# Expose port
EXPOSE 8080

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

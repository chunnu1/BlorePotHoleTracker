# Walkthrough: PostgreSQL Migration & CI/CD Setup

I have migrated the project from SQLite to Google Cloud SQL (PostgreSQL).

## Changes Made

### 1. Infrastructure
- Created a Cloud SQL PostgreSQL 15 instance: `pothole-db`.
- Created the database: `potholes`.
- The `init_db` function now handles PostGIS extension and schema creation automatically.

### 2. Backend Updates
- Switched from `sqlite3` to `psycopg2`.
- Updated all spatial queries to use PostGIS syntax:
    - `ST_DWithin` for the 10m vicinity check.
    - `ST_X` and `ST_Y` for coordinate retrieval.
    - `GEOGRAPHY(Point, 4326)` for spatial data storage.
- Updated the `Dockerfile` to include PostgreSQL client libraries.

### 3. CI/CD Pipeline
- Updated `.github/workflows/deploy.yml` to include Cloud SQL connection and environment variables.

## Action Required: Setup Secrets

To enable the deployment, ensure you have added these secrets to your GitHub repository (**Settings > Secrets and variables > Actions**):

1.  **`DB_USER`**: `postgres` (unless you changed it).
2.  **`DB_PASS`**: The password for the `postgres` user.
3.  **`DB_NAME`**: `potholes`.
4.  **`INSTANCE_CONNECTION_NAME`**: `vibing-495106:us-central1:pothole-db`.
5.  **`GCP_SA_KEY`**: (The Google Cloud Service Account JSON key).

> [!IMPORTANT]
> Make sure your Service Account has the **Cloud SQL Client** role in addition to the previously mentioned roles.

## Verification Results
- Backend code refactored: **Success**
- Dockerfile updated: **Success**
- CI/CD workflow updated: **Success**
- Cloud SQL Instance: **Ready**
- Database `potholes`: **Created**

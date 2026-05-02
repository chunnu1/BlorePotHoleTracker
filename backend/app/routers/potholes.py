import json
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from app.database import get_db_connection
from app.models import PotholeReport
from app.middlewares import rate_limiter

router = APIRouter()

@router.get("/api/potholes")
def get_potholes():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, taluk, reports_count, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat, image_data, mla, mp, mla_photo_url, mp_photo_url
        FROM potholes
    ''')
    rows = cursor.fetchall()
    
    potholes = []
    for r in rows:
        images = json.loads(r['image_data']) if r['image_data'] else []
        potholes.append({
            "id": r['id'],
            "taluk": r['taluk'],
            "reports_count": r['reports_count'],
            "lat": r['lat'],
            "lng": r['lng'],
            "image_data": images,
            "mla": r['mla'],
            "mp": r['mp'],
            "mla_photo_url": r['mla_photo_url'],
            "mp_photo_url": r['mp_photo_url']
        })
    conn.close()
    return potholes

@router.post("/api/potholes")
def report_pothole(report: PotholeReport, request: Request):
    client_ip = request.client.host
    user_agent = request.headers.get('user-agent', '')
    
    # Simple rate limiting per IP
    if not rate_limiter(client_ip):
        raise HTTPException(status_code=429, detail="Too many reports from this IP. Please try again later.")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check for existing reports within 10 meters
        # PostGIS ST_DWithin with geography uses meters.
        cursor.execute('''
            SELECT id, image_data, reports_count 
            FROM potholes 
            WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 10)
            LIMIT 1
        ''', (report.lng, report.lat))
        
        existing = cursor.fetchone()
        
        if existing:
            # Merge report
            existing_id = existing['id']
            reports_count = existing['reports_count'] + 1
            
            existing_images = json.loads(existing['image_data']) if existing['image_data'] else []
            if report.image_data:
                existing_images.append(report.image_data)
                
            updated_image_data = json.dumps(existing_images)
            
            cursor.execute('''
                UPDATE potholes 
                SET reports_count = %s, image_data = %s
                WHERE id = %s
            ''', (reports_count, updated_image_data, existing_id))
            conn.commit()
            return {"status": "success", "message": "Merged with existing report", "id": existing_id}
            
        else:
            # Create new report
            images = [report.image_data] if report.image_data else []
            image_data_json = json.dumps(images)
            
            # Temporary static assignment
            mla_name = "Dr. C.N. Ashwath Narayan"
            mp_name = "Tejasvi Surya"
            mla_photo_url = "https://ui-avatars.com/api/?name=Ashwath+Narayan&background=random"
            mp_photo_url = "https://ui-avatars.com/api/?name=Tejasvi+Surya&background=random"
            
            cursor.execute('''
                INSERT INTO potholes (taluk, location, image_data, mla, mp, mla_photo_url, mp_photo_url)
                VALUES ('Bengaluru City', ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s, %s, %s, %s)
                RETURNING id
            ''', (report.lng, report.lat, image_data_json, mla_name, mp_name, mla_photo_url, mp_photo_url))
            new_id = cursor.fetchone()[0]
            conn.commit()
            return {"status": "success", "id": new_id}
            
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/api/potholes/{pothole_id}")
def delete_pothole(pothole_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT reports_count FROM potholes WHERE id = %s", (pothole_id,))
        existing = cursor.fetchone()
        
        if existing:
            if existing['reports_count'] > 1:
                new_count = existing['reports_count'] - 1
                cursor.execute("UPDATE potholes SET reports_count = %s WHERE id = %s", (new_count, pothole_id))
                conn.commit()
                return {"status": "decremented", "id": pothole_id, "reports_count": new_count}
            else:
                cursor.execute("DELETE FROM potholes WHERE id = %s", (pothole_id,))
                conn.commit()
                return {"status": "deleted", "id": pothole_id, "reports_count": 0}
        else:
            raise HTTPException(status_code=404, detail="Pothole not found")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

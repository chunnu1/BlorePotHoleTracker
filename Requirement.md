### 1. The Vibe & Vision
* **Core Concept:** A community-driven pothole tracker for Bengaluru. Citizens mark potholes on an interactive map. If 5 or fewer reports are in a 10-meter vicinity, it shows as **Grey**. Once it hits 6+ reports, it converts to **Red**. Clicking it reveals details like the Taluk, Ward, and the local MLA/Constituency name.
* **The "Vibe":** Minimalist, civic tech, high-contrast, and fast.
* **Intended Use:** A mobile-first, public web tool for immediate field reporting with no login barrier.

---

### 2. Tech Stack & Architecture

#### Frontend Constraints:
* **UI/Framework:** Single-page app using Vanilla JS, Tailwind CSS via CDN, and Leaflet.js.
* **Mapping:** Leaflet.js combined with CartoDB dark matter tiles (to make the color-coded pins stand out) and Leaflet.heat for toggling a density heatmap.
* **Spatial Helper:** **Turf.js** for handling fast, client-side distance math (e.g., measuring the 10m vicinity radius before submitting a report).

#### Backend Constraints:
* **Language & Framework:** Python with **FastAPI** or Node.js with **Express**. Keep the backend simple and self-contained in a single file or clean folder structure.
* **Database:** **PostgreSQL with PostGIS extension** OR **SQLite with SpatiaLite**. 
  * Points must be saved using spatial geography types (`GEOGRAPHY(Point, 4326)` or `POINT`).
  * Vicinity checks (10m radius) must use native spatial queries (`ST_DWithin`).
* **GIS Metadata:** Seed or mock the geospatial lookup so that whenever a latitude and longitude are submitted, the system queries the corresponding Bengaluru **Taluk** and **MLA Name** based on data patterns matching the **Karnataka GIS (K-GIS)** administrative layers.

---

### 3. Rate Limiting & Security (No-Auth Protection)
Since there is no authentication or login requirement, implement the following server-side security measures to prevent spam:
* **Identification:** Combine the incoming **IP Address** and **User-Agent** string to generate a client identifier (fingerprint).
* **Limit:** Maximum of **3 reports per 5 minutes** per unique identifier.
* **Implementation:** Use a simple in-memory cache (like a Python dictionary/Node Map) or Redis if preferred.
* **Response:** If exceeded, return a standard HTTP `429 Too Many Requests` error with a JSON payload: `{"error": "Too many reports. Please try again in a few minutes."}`.

---

### 4. Core Features & Functional Flow

* **Feature 1: Report Submission Flow**
  1. A user clicks/taps on the map.
  2. A clean popup asks: `[Confirm Pothole Location?]`.
  3. Clicking confirm hits the backend POST endpoint. 
  4. The backend evaluates the IP + User Agent rate limit.
  5. If permitted, the backend runs a spatial query:
     * Does this point fall within 10 meters of an existing record?
     * **If YES:** Increment that existing pothole's report counter.
     * **If NO:** Insert a new pothole record with a counter initialized to 1.

* **Feature 2: Dynamic Styling (Pothole Mutation)**
  * **1 to 5 reports:** Returns a status that the frontend renders as a **Grey** pin.
  * **6 or more reports:** Returns a status that the frontend renders as a **Red** pin.

* **Feature 3: Heatmap Overlay**
  * Toggling the "Heatmap" overlay hides individual map pins and renders a continuous density gradient based on the count of nearby reports using Leaflet.heat.

* **Feature 4: Spatial Metadata Drawer**
  * When a user clicks a pin, it returns a bottom drawer (mobile) or side panel displaying:
    * **Status:** "Reported by [N] citizens"
    * **Administrative Info:** Taluk name and current MLA Name matching Bengaluru's K-GIS boundaries.

---

### 5. Execution & Delivery Strategy
* **MVP Scope:** First, build the backend schema (SQL) and spatial queries, then code the rate limiter, and finally construct the single-file Leaflet frontend.
* **Pre-Seeded Data:** Pre-populate the database with 5 to 10 mock potholes around Bengaluru (e.g., Jakkur, Indiranagar, Koramangala) with various report counts to demonstrate both states immediately.
* **Code Delivery:** Provide clean, production-ready code with concise setup steps (e.g., installing PostgreSQL/PostGIS and launching the backend server).

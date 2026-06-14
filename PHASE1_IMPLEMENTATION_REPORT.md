# Blueprint V3 – Phase 1: Implementation Report

This report outlines the implementation details for the **Geographic Map Foundation (Phase 1)** of the Blueprint V3 Travel Atlas Poster.

---

## 1. Files Created & Modified

### A. New Files
* **Backend Map Asset Service:** [map_assets_service.py](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/backend/app/services/map_assets_service.py)
  * Loads state boundary polygons from the local file system.
  * Resolves destination keywords to identify targeted states.
* **Simplified State Boundaries:**
  * [meghalaya.json](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/backend/app/static/geojson/meghalaya.json) ($8.8\text{ KB}$)
  * [rajasthan.json](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/backend/app/static/geojson/rajasthan.json) ($39.1\text{ KB}$)
  * [kerala.json](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/backend/app/static/geojson/kerala.json) ($13.0\text{ KB}$)
  * [sikkim.json](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/backend/app/static/geojson/sikkim.json) ($4.1\text{ KB}$)
* **Client Map Component:** [BlueprintV3.jsx](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/frontend/src/components/BlueprintV3.jsx)
  * Implements D3 geographic path projections, OSRM road paths, and fixed labels.

### B. Modified Files
* **Itinerary Router:** [itinerary.py](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/backend/app/routes/itinerary.py)
  * Exposed the `/api/state-boundary` route to serve boundaries to the client on demand.
* **Planner Main Page:** [PlannerPage.jsx](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/frontend/src/pages/PlannerPage.jsx)
  * Integrated version selection state and user toggle controls to switch between Blueprint V2 and V3.
* **Environment Files:**
  * [frontend/.env](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/frontend/.env) – Added `VITE_USE_BLUEPRINT_V3=true`.
  * [backend/.env](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/backend/.env) – Added `USE_BLUEPRINT_V3=true`.

---

## 2. Technical Map Foundation Settings

### A. State Boundary Data Source
* Boundaries are sourced from the **India States GeoJSON** community database and simplified on download via a custom python script (`get_states.py` in scratch directory) using coordinate skip-sampling to reduce memory footprint by over $70\%$, maintaining smooth rendering speeds inside the browser.

### B. Map Projection Engine
* The component compiles geographical data using the **Conic Conformal Projection** (`d3.geoConicConformal()`).
* The projection is fitted dynamically to the extent of the active state boundary (`projection.fitExtent([[50, 50], [width - 50, height - 50]], stateBoundary)`). If the boundary shape fails to load, it falls back to a conformal envelope fitted to the bounding box enclosing the geocoded attractions.

### C. Route Provider Integration
* Driving geometry path lines are retrieved dynamically from the backend OSRM client endpoint using official OpenStreetMap road networks. Geographic coordinate arrays (`[lat, lon]`) are flipped to conformal mapping dimensions (`[lon, lat]`) and rendered as dashed SVG polylines.

---

## 3. Visual Verification Screenshot

Here is the browser screenshot demonstrating a verified, active rendering of the **Blueprint V3 Atlas** map displaying the state boundary of Meghalaya, OSRM road coordinates, and numbered markers:

![Blueprint V3 Map Screenshot](/C:/Users/Sourav%20Haldar/.gemini/antigravity-ide/brain/67eab75b-29c9-4328-8cbf-95b475aba591/blueprint_v3_atlas_1780721063568.png)

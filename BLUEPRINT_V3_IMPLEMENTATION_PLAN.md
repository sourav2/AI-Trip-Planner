# Blueprint V3: Implementation Roadmap

This document outlines the step-by-step roadmap for migrating the **AI Trip Planner** from Blueprint V2 to the geographic-grade **Blueprint V3 Travel Atlas Poster**.

---

## 1. Migration Strategy

* **Zero Downtime / Zero Regression:** The existing [BlueprintV2.jsx](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/frontend/src/components/BlueprintV2.jsx) component, services, and routing routines will remain fully intact. 
* **Parallel Execution:** A new component [BlueprintV3.jsx](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/frontend/src/components/BlueprintV3.jsx) and associated services will be developed in isolation.
* **Feature Toggle:** Switch to the new engine using a feature toggle in the main dashboard view, allowing instant rollbacks if required.

---

## 2. Phase Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Geographic Assets Pre-processing                              │
│ └─ Download & simplify state boundaries and contour lines (<100KB)      │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Backend API Integration & Payload Assembly                   │
│ └─ Merge OSRM road coordinates, GeoJSON boundaries, and Gemini text   │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Frontend D3 Projection & Layout Setup                         │
│ └─ Implement d3-geo projections and d3-force label alignment           │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Cartographic Aesthetics & Icon Styling                        │
│ └─ Apply paper textures, SVG turbulence filters, and attraction icons  │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: Server-Side PDF Print Engine                                  │
│ └─ Integrate backend Puppeteer container for A3 300 DPI exports        │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 6: E2E Verification & Feature Toggle Activation                 │
│ └─ Activate toggle, verify loading times, and run diagnostic audits    │
└────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Geographic Assets Pre-processing (Backend)
1. Fetch official state boundary outlines (OSM relation IDs) for Meghalaya, Rajasthan, Kerala, and Sikkim.
2. Use map tools (Mapshaper / Douglas-Peucker) to simplify boundaries to under $80\text{KB}$ to ensure fast network loading.
3. Pre-process elevation contour lines for each target state at fixed vertical intervals (200m, 500m, 1000m, 1500m, 2000m).
4. Save simplified geometries as static JSON files in `/backend/static/geojson/`.

### Phase 2: Backend API Integration & Payload Assembly
1. Create a map asset service in the backend (`backend/app/services/map_assets_service.py`) to load the simplified GeoJSON boundaries and contours.
2. Update the `/finalize-itinerary` router endpoint in [itinerary.py](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/backend/app/routes/itinerary.py):
   * Call `route_service.py` to retrieve actual OSRM road coordinates.
   * Call `map_assets_service.py` to load boundaries and contours matching the state.
   * Call `gemini_service.py` to generate structured descriptions, weather summaries, expectations, and food recommendations.
   * Return a single unified JSON payload.

### Phase 3: Frontend D3 Projection & Layout Setup (Client)
1. Add `d3` library dependencies to `frontend/package.json`.
2. Create [BlueprintV3.jsx](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/frontend/src/components/BlueprintV3.jsx) inside the component folder.
3. Define the geographic canvas ($800 \times 460$) and use `d3.geoPath` with a fitted `geoConicConformal` projection to render boundaries and elevation shapes.
4. Draw actual road polyline points mapped via D3 projection.
5. Apply a force-directed `d3-force` simulation to shift text labels away from each other and avoid overlaps.

### Phase 4: Cartographic Aesthetics & Icon Styling (Client)
1. Add custom background textures and gradient overlays.
2. Design and embed inline custom SVG symbols for waterfalls, suspension bridges, caves, valleys, and city bases.
3. Add the SVG turbulence filter overlay to give the OSRM roads a hand-drawn sketch appearance.
4. Integrate Polaroid photo slots with random rotational angles.

### Phase 5: Server-Side PDF Print Engine (Backend & Frontend)
1. Add `pyppeteer` or standard `playwright` to backend requirements.
2. Create an export route `POST /api/blueprint/export` in the backend. When called, launch a headless browser context, load a print-optimized layout of the poster, trigger page printing, and return the PDF file stream.
3. Implement direct SVG download in the frontend by extracting the inline SVG code and embedding Base64 font assets.

### Phase 6: E2E Verification & Feature Toggle Activation
1. Perform load-time testing to ensure page load is under $3$ seconds.
2. Verify visual rendering across multiple resolutions and orientations.
3. Flip the feature toggle inside the main application container to route all users to the Blueprint V3 poster catalog.

---

## 3. Affected Files Directory

```diff
  backend/
+   app/services/map_assets_service.py   [NEW: Boundary and contour resolver]
+   static/geojson/meghalaya.json        [NEW: Simplified state bounds]
+   static/geojson/rajasthan.json        [NEW: Simplified state bounds]
+   static/geojson/kerala.json           [NEW: Simplified state bounds]
+   static/geojson/sikkim.json           [NEW: Simplified state bounds]
    app/routes/itinerary.py              [MODIFY: Finalize payload assembly]
    requirements.txt                     [MODIFY: Add Puppeteer/PDF dependencies]
  
  frontend/
    package.json                         [MODIFY: Add D3.js libraries]
+   src/components/BlueprintV3.jsx       [NEW: Cartographic SVG renderer]
    src/App.jsx                          [MODIFY: Add Feature Toggle routing]
```

---

## 4. Migration Risk & Complexity Matrix

* **Estimated Effort:** 8-10 Days (including QA and print testing).
* **Complexity Level:** **Moderate-High** (requires handling geographic coordinates projection and label collision math).
* **Key Risks:**
  1. *CORS issues* when loading remote Unsplash images inside HTML canvases during exports. *Mitigation:* Proxied backend image download endpoints or pre-fetched Base64 data strings.
  2. *Performance lag* if rendering too many topographic vertices on weak mobile devices. *Mitigation:* Simplify coordinates to under $50\text{KB}$ per contour layer.

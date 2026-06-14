# Blueprint V3: Feasibility & Risk Report

This report evaluates the technical feasibility, engineering risks, performance implications, and development timelines for upgrading the mapping engine to **Blueprint V3**.

---

## 1. Technical Risks & Mitigation Strategies

An upgrade of this scale introduces several rendering, licensing, and network-related challenges. Below is the risk-mitigation grid:

| Technical Risk | Impact | Likelihood | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **CORS Export Failures** <br>*Exporting images (like Unsplash photos) inside SVG/Canvas draws causes security violations.* | High | High | Download and convert the top 3 Polaroid images to Base64 data URIs on the backend during payload assembly. Inline the Base64 strings directly in the JSON payload so the browser loads them locally, completely bypassing CORS constraints. |
| **Render Blocking (Large File Sizes)** <br>*High-resolution boundaries and elevation contours can be massive (10MB+), slowing client render performance.* | Critical | Moderate | Run Douglas-Peucker simplification using map tools on all state boundaries and contours before hosting. Cap maximum combined file sizes at $150\text{KB}$ per state. |
| **Label Collisions** <br>*Dense attraction groupings (e.g., Shillong, Laitlum, and Elephant Falls) cause labels to overwrite each other.* | High | High | Implement a client-side D3.js force-directed collision simulation (`d3.forceCollide()`). Shift labels away from overlapping spots and draw connecting vector lines to their coordinates. |
| **Public Routing API Outages** <br>*Public instances of Project OSRM have no uptime SLA and can throw HTTP 502/504 errors.* | Moderate | Moderate | Maintain the backend fallback routing pipeline. If OSRM is unreachable, calculate straight-line Haversine math multiplied by a winding factor ($1.25$) and render linear paths, ensuring the app remains functional. |
| **Terms of Service Restrictions** <br>*Printing/downloading maps using Google Maps or Mapbox APIs violates their print Terms of Service.* | Critical | High | Avoid proprietary map clients for rendering. Use OpenStreetMap data, D3-Geo projections, and custom SVG styling layers. This guarantees 100% free ownership of the vectors, allowing users to print maps without license violations. |

---

## 2. API & Data Dependency Analysis

* **Gemini API:** Generates structured textual advice.
* **OSRM Driving API:** Translates attraction coordinate arrays into actual road networks.
* **Pre-compiled State Assets (Internal):** Pre-processed simplified GeoJSON boundaries and elevation contour files stored locally on the server.
* **Web Fonts Engine (Google Fonts):** Downloads styling typography (*Playfair Display*, *Outfit*).

---

## 3. Performance Impact Analysis

### A. Backend Processing Latency
* **Asset Retrieval:** Reading simplified local GeoJSON files adds $< 10\text{ms}$.
* **OSRM Call:** Retrieving driving geometry adds $\sim 150 - 300\text{ms}$ depending on network latency.
* **Gemini Narrative:** Synthesizing travel tips and summaries takes $\sim 1.5 - 2.5\text{s}$.
* **Net Performance Impact:** The backend response time for the `/finalize-itinerary` endpoint will increase to $\sim 2.5 - 3\text{s}$. However, since this endpoint is only called once when the user finalizes their itinerary (rather than during interactive drag-and-drop planning), this latency is highly acceptable and can be hidden behind an elegant loading animation.

### B. Client Rendering Overhead
* **D3 Projection Calculations:** Projecting $\sim 500$ boundary vertices takes $< 10\text{ms}$.
* **Collision Solver Simulation:** Running $50$ ticks of a force-directed label layout simulation takes $\sim 20 - 45\text{ms}$.
* **Net Performance Impact:** The client will render the complete high-fidelity poster in under $100\text{ms}$ once the payload is received, maintaining a smooth $60\text{ FPS}$ UI experience.

---

## 4. Development Effort Estimate

The development cycle is estimated at **9 working days** for a single full-stack engineer:

* **Days 1–2:** Pre-processing and simplifying boundaries/contours of the 4 target states (Meghalaya, Rajasthan, Kerala, Sikkim).
* **Days 3–4:** Upgrading the backend payload builder, integrating OSRM geometry, and coding the local GeoJSON loading service.
* **Days 5–6:** Building the client-side D3 projection map canvas and implementing the force-directed label collision solver.
* **Days 7–8:** Implementing print-quality SVG/PDF server-side Puppeteer export streams.
* **Day 9:** End-to-end integration, performance optimization, and quality assurance.

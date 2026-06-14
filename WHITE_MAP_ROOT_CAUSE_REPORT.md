# Root Cause Analysis: White-Map Disappearance Bug

This report documents the exact cause behind the issue where the terrain map base layer disappears and becomes white after zooming, panning, selecting attractions, or recalculating routes.

---

## 1. Exact File Causing the Issue
* **File:** [TravelMap.jsx](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/frontend/src/components/TravelMap.jsx)

---

## 2. Exact Function Causing the Issue
* **Function:** The JSX render output of the `TravelMap` component.

---

## 3. Exact Lines Responsible
* **Lines:** [TravelMap.jsx:L672-676](file:///c:/Users/Sourav%20Haldar/Documents/AI%20Works/AI-Trip-Planner/frontend/src/components/TravelMap.jsx#L672-L676)
  ```javascript
  672:       <div 
  673:         ref={mapContainerRef} 
  674:         className={`w-full h-full z-10 zoom-${zoomLevel}`}
  675:       />
  ```

---

## 4. Why Terrain Disappears (Technical Cause)
1. **Leaflet Initialization:** When the map initializes on mount, Leaflet binds to the DOM node referenced by `mapContainerRef` and dynamically injects several core Leaflet classes (e.g. `.leaflet-container`, `.leaflet-touch`, `.leaflet-retina`, `.leaflet-fade-anim`, `.leaflet-grab`).
2. **React Re-render:** When the user interacts with the application (zooms/pans to trigger `setZoomLevel`, selects attractions to update `selectedPlaces` props, or triggers route recalculations to update `routeGeometry`/`liveRouteGeometry`), the `TravelMap` component re-renders.
3. **Class Attribute Overwrite:** During reconciliation, React checks the JSX Virtual DOM and updates the map container's `class` attribute in the DOM to match the JSX expression: `w-full h-full z-10 zoom-${zoomLevel}`.
4. **Style Collapse:** Because React overwrites the entire `class` attribute of that DOM node, it **strips away** all Leaflet-injected classes. Specifically, losing the `.leaflet-container` class removes critical Leaflet layout styles (like `position: relative`, `overflow: hidden`, and map pane layout anchors).
5. **White Screen:** Without the Leaflet container styling, the nested tile pane (`.leaflet-tile-pane`) collapses and map tiles fail to align or overflow correctly, leaving a blank white background. The SVG vector layers (boundaries, route polylines) and markers (labels) remain in the DOM and partially visible but are misaligned or overlayed on a broken layout.

---

## 5. Nature of the Problem
* **React Re-render + Class Attribute Overwrite:** The issue is a classic React third-party library integration bug. The tile layer is **not** being removed from the map instance, nor is it a layer z-index order or overlay conflict. React is overwriting the Leaflet classes on the map container during component re-renders.

---

## 6. Proposed Fix
To prevent React from overwriting Leaflet's classes, we must isolate the Leaflet map container DOM node from dynamic React attribute updates.

We will move the dynamic `zoom-${zoomLevel}` class to the **outer wrapper div** and keep the **inner map container div** completely static in JSX.

### Proposed Code Diff:
```diff
   return (
-    <div className="relative w-full h-full">
+    <div className={`relative w-full h-full zoom-${zoomLevel}`}>
       <style dangerouslySetInnerHTML={{ __html: `
         ...
       `}} />
       <div 
         ref={mapContainerRef} 
-        className={`w-full h-full z-10 zoom-${zoomLevel}`}
+        className="w-full h-full z-10"
       />
     </div>
   );
```

By keeping the inner `div`'s `className` static as `w-full h-full z-10`, React will never modify its `class` attribute after initial mount, fully preserving Leaflet's internal classes.

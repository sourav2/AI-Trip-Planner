import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { travelApi } from '../services/api';
import { geographyProvider } from '../services/geographyProvider';

// State-specific bounding box presets [minLon, minLat, maxLon, maxLat]
const STATE_BBOXES = {
  meghalaya: [89.8, 25.0, 92.8, 26.2],
  sikkim: [88.0, 27.0, 89.0, 28.2],
  kerala: [74.8, 8.1, 77.5, 12.8],
  rajasthan: [69.5, 23.3, 78.3, 30.2]
};

// Helper to generate premium card popup HTML
function createPopupHTML(name, imageUrl, type, distance, driveTime, description, rating) {
  const ratingHtml = rating
    ? `<div class="popup-rating">
         <span class="star-icon">★</span>
         <span class="rating-value">${Number(rating).toFixed(1)}</span>
       </div>`
    : '';

  const mediaHtml = imageUrl
    ? `<div class="popup-media-container">
         <img src="${imageUrl}" class="popup-media" alt="${name}" />
       </div>`
    : '';

  return `
    <div class="custom-premium-popup-card">
      ${mediaHtml}
      <div class="popup-content-body">
        <div class="popup-title">${name}</div>
        <div class="popup-metadata">
          <span class="meta-tag meta-type">${type}</span>
          <span class="meta-dot">•</span>
          <span class="meta-tag meta-distance">${distance}</span>
          <span class="meta-dot">•</span>
          <span class="meta-tag meta-time">${driveTime}</span>
        </div>
        ${ratingHtml}
        ${description ? `<p class="popup-description">${description}</p>` : ''}
      </div>
    </div>
  `;
}

export default function TravelMap({
  startCoords,
  destCoords,
  startLocation = 'Start',
  destination = 'Destination',
  regions = [],
  nearbyAttractions = [],
  selectedTransport = 'fastest',
  routeGeometry = null,
  selectedPlaces = [],
  allowInternationalTransit = false,
  destinationImageUrl = '',
  isBlueprint = false
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const labelLayerRef = useRef(null);
  const [liveRouteGeometry, setLiveRouteGeometry] = useState(null);
  const [stateBoundary, setStateBoundary] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(7);

  const destLow = (destination || '').toLowerCase();
  const isMeghalaya = destLow.includes("meghalaya") || destLow.includes("shillong");
  const isKerala = destLow.includes("kerala") || destLow.includes("kochi");
  const isRajasthan = destLow.includes("rajasthan") || destLow.includes("jaipur");
  const isSikkim = destLow.includes("sikkim") || destLow.includes("gangtok");

  const stateClass = isMeghalaya ? 'state-meghalaya' : (isKerala ? 'state-kerala' : (isRajasthan ? 'state-rajasthan' : (isSikkim ? 'state-sikkim' : '')));

  // Load state boundary GeoJSON file using geographyProvider
  useEffect(() => {
    if (!destination || destination === 'Destination') return;
    geographyProvider.fetchStateBoundary(destination)
      .then(data => {
        if (data && data.geometry) {
          setStateBoundary(data);
        } else {
          setStateBoundary(null);
        }
      })
      .catch(err => {
        console.error("TravelMap: Failed to fetch boundary:", err);
        setStateBoundary(null);
      });
  }, [destination]);

  // Dynamically update OSRM road geometry when selected places/stops change
  useEffect(() => {
    if (!startCoords || !destCoords) return;

    async function fetchLiveRoute() {
      const stopCoords = selectedPlaces
        .map(p => p.coords || [p.lat, p.lon])
        .filter(c => c && c[0] && c[1]);

      const allCoords = [startCoords, ...stopCoords, destCoords];
      try {
        const routeData = await travelApi.fetchRoute(allCoords, allowInternationalTransit);
        if (routeData && routeData.geometry) {
          setLiveRouteGeometry(routeData.geometry);
        } else {
          setLiveRouteGeometry(null);
        }
      } catch (err) {
        console.error("Live route fetch failed:", err);
        setLiveRouteGeometry(null);
      }
    }
    fetchLiveRoute();
  }, [startCoords, destCoords, selectedPlaces, allowInternationalTransit]);

  // Client-side DOM Bounding-Box Label Collision Detection
  const resolveLabelCollisions = () => {
    if (!mapRef.current) return;
    
    // Select all label wrappers in the DOM
    const labelWrappers = document.querySelectorAll('.custom-map-label-wrapper');
    const acceptedBBoxes = [];
    
    // Sort label elements by hierarchy priority (Major Hubs first, then Minor Stops, then Water/Desert Features)
    const sortedWrappers = Array.from(labelWrappers).sort((a, b) => {
      const aMajor = a.querySelector('.custom-carto-label-major');
      const bMajor = b.querySelector('.custom-carto-label-major');
      if (aMajor && !bMajor) return -1;
      if (!aMajor && bMajor) return 1;
      
      const aMinor = a.querySelector('.custom-carto-label-minor');
      const bMinor = b.querySelector('.custom-carto-label-minor');
      if (aMinor && !bMinor) return -1;
      if (!aMinor && bMinor) return 1;

      return 0;
    });

    sortedWrappers.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        el.style.opacity = '1';
        return;
      }

      let isOverlapping = false;
      const collisionPadding = 6; // px gap between labels

      for (const box of acceptedBBoxes) {
        if (
          rect.left - collisionPadding < box.right &&
          rect.right + collisionPadding > box.left &&
          rect.top - collisionPadding < box.bottom &&
          rect.bottom + collisionPadding > box.top
        ) {
          isOverlapping = true;
          break;
        }
      }

      if (isOverlapping) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      } else {
        el.style.opacity = '0.95';
        el.style.pointerEvents = 'auto';
        acceptedBBoxes.push(rect);
      }
    });
  };

  // Map instance initialization
  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: destCoords || [25.5788, 91.8833],
        zoom: 7,
        zoomControl: true
      });

      // 1. Esri World Terrain Base (Landcover, bathymetry, clean background)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 13,
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA'
      }).addTo(mapRef.current);

      // 2. Create custom visual priority hierarchy panes
      const hillshadePane = mapRef.current.createPane('hillshadePane');
      hillshadePane.style.zIndex = 230; // Above base tile, below overlays
      hillshadePane.style.pointerEvents = 'none';

      const landcoverPane = mapRef.current.createPane('landcoverPane');
      landcoverPane.style.zIndex = 240;
      landcoverPane.style.pointerEvents = 'none';

      const hydrologyPane = mapRef.current.createPane('hydrologyPane');
      hydrologyPane.style.zIndex = 250;
      hydrologyPane.style.pointerEvents = 'none'; // Disable pointer events to prevent blocking marker clicks

      const roadPane = mapRef.current.createPane('roadPane');
      roadPane.style.zIndex = 260;
      roadPane.style.pointerEvents = 'none';

      const routePane = mapRef.current.createPane('routePane');
      routePane.style.zIndex = 270;

      const labelPane = mapRef.current.createPane('labelPane');
      labelPane.style.zIndex = 620;
      labelPane.style.pointerEvents = 'none';

      // 3. Esri World Hillshade (Greyscale shaded relief raster layer)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Hillshade &copy; Esri &mdash; Sources: USGS, NPS',
        pane: 'hillshadePane',
        opacity: 0.7
      }).addTo(mapRef.current);

      // 3.2. Esri World Topo Map (Topographic details, forests, contour lines, blended land cover) on landcoverPane
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        pane: 'landcoverPane',
        maxNativeZoom: 13,
        maxZoom: 18,
        opacity: 0.45,
        attribution: 'Topo &copy; Esri &mdash; Sources: USGS, FAO, NPS'
      }).addTo(mapRef.current);

      // 3.4. Esri World Hydro Reference Overlay (Rivers, streams, lakes, water networks) on hydrologyPane
      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Hydro_Reference_Overlay/MapServer/tile/{z}/{y}/{x}', {
        pane: 'hydrologyPane',
        maxNativeZoom: 13,
        maxZoom: 18,
        opacity: 0.85,
        attribution: 'Hydro &copy; Esri, USGS, EPA'
      }).addTo(mapRef.current);

      // ==========================================
      // FUTURE TERRAIN V6 PLUG-IN ANCHOR
      // To transition to a 3D WebGL elevation mesh viewer in Terrain V6 (e.g. MapLibre GL / Mapbox Terrain-DEM),
      // replace these raster layers with a MapLibre GL container loading RGB DEM tiles.
      // ==========================================

      layerGroupRef.current = L.layerGroup().addTo(mapRef.current);

      // 4. Esri World Transportation (Road networks overlay) on roadPane (Priority 2)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
        pane: 'roadPane',
        maxNativeZoom: 13,
        maxZoom: 18,
        opacity: 0.85
      }).addTo(mapRef.current);

      // 5. Esri World Boundaries and Places (Labels & borders overlay) on labelPane (Priority 5)
      labelLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        pane: 'labelPane',
        maxNativeZoom: 13,
        maxZoom: 18,
        opacity: isBlueprint ? 0.55 : 0.85
      }).addTo(mapRef.current);

      // Listen to zoom ends and sync state for CSS zoom scaling
      mapRef.current.on('zoomend', () => {
        if (mapRef.current) {
          setZoomLevel(mapRef.current.getZoom());
          setTimeout(resolveLabelCollisions, 40);
        }
      });

      // Listen to pans/moves to resolve overlaps dynamically
      mapRef.current.on('moveend', () => {
        setTimeout(resolveLabelCollisions, 40);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map visual layers on data change
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    const localBounds = L.latLngBounds();

    const destKey = isMeghalaya ? 'meghalaya' : (isKerala ? 'kerala' : (isRajasthan ? 'rajasthan' : (isSikkim ? 'sikkim' : '')));

    // Update global reference label overlay opacity dynamically
    if (labelLayerRef.current) {
      labelLayerRef.current.setOpacity(isBlueprint ? 0.55 : 0.85);
    }

    // 1. Draw State Boundary Layer (Priority 1: landcoverPane)
    if (stateBoundary) {
      const boundaryLayer = L.geoJSON(stateBoundary, {
        style: {
          color: "#0F766E", // Teal 700
          weight: 2.2,
          dashArray: "6, 4",
          fillColor: "#0F766E",
          fillOpacity: 0.005,
          pane: 'landcoverPane'
        }
      }).addTo(layerGroupRef.current);

      // If itinerary is empty, zoom into the general state boundaries
      if (selectedPlaces.length === 0) {
        mapRef.current.fitBounds(boundaryLayer.getBounds(), { padding: [30, 30] });
      }
    } else {
      // Fallback state fit
      const bbox = STATE_BBOXES[destKey];
      if (bbox && selectedPlaces.length === 0) {
        mapRef.current.fitBounds([
          [bbox[1], bbox[0]],
          [bbox[3], bbox[2]]
        ], { padding: [30, 30] });
      }
    }

    // 6. Custom Hub Marker (Origin Start Coordinates, Priority 4)
    if (startCoords && startCoords[0] && startCoords[1]) {
      const hubHtml = `
        <div class="custom-carto-hub-marker animated-marker">
          <span class="custom-carto-hub-badge">⚓</span>
        </div>
      `;

      const hubIcon = L.divIcon({
        html: hubHtml,
        className: 'custom-hub-marker-wrapper',
        iconSize: null,
        iconAnchor: [12, 12] // Center anchor for 24px circle
      });
      
      const hubMarker = L.marker(startCoords, { icon: hubIcon, zIndexOffset: 1000 })
        .bindPopup(`<strong>Trip Origin:</strong> ${startLocation}`, {
          className: 'custom-leaflet-popup'
        })
        .addTo(layerGroupRef.current);

      // Hover tooltip for start hub label context
      hubMarker.bindTooltip(`Origin: ${startLocation.split(',')[0]}`, {
        direction: 'top',
        offset: [0, -12],
        className: 'custom-map-tooltip',
        permanent: false
      });

      localBounds.extend(startCoords);
    }

    // 7. Active Selected Stop Badges (Priority 4)
    if (selectedPlaces && selectedPlaces.length > 0) {
      selectedPlaces.forEach((place, idx) => {
        const coords = place.coords || [place.lat, place.lon];
        if (coords && coords[0] && coords[1]) {
          const badgeHtml = `
            <div class="custom-carto-stop-marker animated-marker" style="animation-delay: ${idx * 80}ms">
              <span class="custom-carto-stop-badge">${idx + 1}</span>
            </div>
          `;
          const stopIcon = L.divIcon({
            html: badgeHtml,
            className: 'custom-stop-marker-wrapper',
            iconSize: null,
            iconAnchor: [9, 9] // Center anchor for 18px circle
          });

          const ratingVal = place.rating || (place.quick_facts?.Rating ? parseFloat(place.quick_facts.Rating) : null);
          const stopMarker = L.marker(coords, { icon: stopIcon })
            .bindPopup(createPopupHTML(place.name, place.image_url, place.type || "Cart Stop", place.distance || "Local", place.drive_time || "10-15 mins", place.description || place.summary, ratingVal), {
              maxWidth: 270,
              minWidth: 260,
              className: 'custom-leaflet-popup'
            })
            .addTo(layerGroupRef.current);

          // Name overlay appears ONLY on hover
          stopMarker.bindTooltip(place.name.split(' (')[0], {
            direction: 'top',
            offset: [0, -9],
            className: 'custom-map-tooltip',
            permanent: false
          });

          localBounds.extend(coords);
        }
      });

      // 8. Draw active OSRM transit route geometry (Priority 3: routePane)
      const activeRoute = liveRouteGeometry || routeGeometry;
      if (activeRoute && activeRoute.length > 0) {
        // Thick background corridor track
        L.polyline(activeRoute, {
          color: '#C7D2FE', // Indigo 200 corridor track
          weight: 9,        // Dominant thickness
          opacity: 0.55,
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'routePane'
        }).addTo(layerGroupRef.current);

        // Active animated route line
        let routeColor = '#6366F1'; // Indigo 500
        if (selectedTransport === 'cheapest') {
          routeColor = '#10B981'; // Emerald 500
        } else if (selectedTransport === 'comfortable') {
          routeColor = '#F59E0B'; // Amber 500
        }

        L.polyline(activeRoute, {
          color: routeColor,
          weight: 4.2,      // Dominant route line weight
          opacity: 1.0,
          className: 'animated-route-line',
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'routePane'
        }).addTo(layerGroupRef.current);

        activeRoute.forEach(pt => localBounds.extend(pt));
      }

      // Fit map to selected bounds locally including origin
      if (localBounds.isValid()) {
        mapRef.current.fitBounds(localBounds, {
          padding: [50, 50],
          maxZoom: 11
        });
      }
    }

    // Resolve overlaps and hide colliding labels inside DOM after layout renders
    setTimeout(resolveLabelCollisions, 60);

  }, [startCoords, destCoords, destination, regions, selectedTransport, routeGeometry, selectedPlaces, liveRouteGeometry, stateBoundary, isBlueprint]);

  return (
    <div className={`relative w-full h-full zoom-${zoomLevel} ${stateClass}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Premium National Geographic Retro Atlas Labels */
        .custom-carto-label {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-weight: 900;
          text-transform: uppercase;
          color: #0A1C15; /* Maximally dark emerald/black */
          text-align: center;
          white-space: nowrap;
          letter-spacing: 0.15em;
          text-shadow: 
            -2.5px -2.5px 0 #FAF7F2, 
             2.5px -2.5px 0 #FAF7F2, 
            -2.5px  2.5px 0 #FAF7F2, 
             2.5px  2.5px 0 #FAF7F2,
             0px  0px 4px #FAF7F2,
             0px  0px 8px #FAF7F2;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .custom-carto-label-major {
          font-size: 11px;
          color: #032213;
          letter-spacing: 0.15em;
        }
        .custom-carto-label-minor {
          font-size: 9px;
          color: #1B4D3E; /* readable forest green */
          letter-spacing: 0.08em;
        }
        .custom-carto-label-feature {
          font-family: 'Georgia', serif;
          font-size: 8.5px;
          font-weight: 900;
          color: #0284C7; /* Sky 700 */
          font-style: italic;
          letter-spacing: 0.08em;
          text-shadow: 
            -2px -2px 0 #FAF7F2, 
             2px -2px 0 #FAF7F2, 
            -2px  2px 0 #FAF7F2, 
             2px  2px 0 #FAF7F2,
             0px  0px 4px #FAF7F2;
        }

        /* Make orientation labels subtle and secondary under Blueprint mode */
        .blueprint-leaflet-map .custom-carto-label {
          opacity: 0.55 !important;
          font-weight: 700 !important;
        }

        /* Zoom-dependent rules using state zoom classes */
        .zoom-1 .custom-carto-label-minor, .zoom-2 .custom-carto-label-minor, .zoom-3 .custom-carto-label-minor, 
        .zoom-4 .custom-carto-label-minor, .zoom-5 .custom-carto-label-minor, .zoom-6 .custom-carto-label-minor, 
        .zoom-7 .custom-carto-label-minor, .zoom-8 .custom-carto-label-minor { display: none !important; opacity: 0; }

        .zoom-1 .custom-carto-label-feature, .zoom-2 .custom-carto-label-feature, .zoom-3 .custom-carto-label-feature, 
        .zoom-4 .custom-carto-label-feature, .zoom-5 .custom-carto-label-feature, .zoom-6 .custom-carto-label-feature, 
        .zoom-7 .custom-carto-label-feature, .zoom-8 .custom-carto-label-feature, .zoom-9 .custom-carto-label-feature { display: none !important; opacity: 0; }

        .zoom-9 .custom-carto-label-minor { display: block !important; opacity: 0.85; font-size: 8px; }
        .zoom-10 .custom-carto-label-minor { display: block !important; opacity: 0.95; font-size: 9px; }
        .zoom-10 .custom-carto-label-feature { display: block !important; opacity: 0.85; font-size: 8px; }

        .zoom-1 .custom-carto-label-major, .zoom-2 .custom-carto-label-major, .zoom-3 .custom-carto-label-major, 
        .zoom-4 .custom-carto-label-major, .zoom-5 .custom-carto-label-major, .zoom-6 .custom-carto-label-major, 
        .zoom-7 .custom-carto-label-major { font-size: 8px; }
        .zoom-8 .custom-carto-label-major, .zoom-9 .custom-carto-label-major { font-size: 10px; }
        .zoom-10 .custom-carto-label-major, .zoom-11 .custom-carto-label-major, .zoom-12 .custom-carto-label-major { font-size: 12px; }

        /* Custom Region Labels (floating typography) */
        .custom-region-label {
          font-family: 'Georgia', serif;
          font-size: 13px;
          font-weight: bold;
          color: #78350F; /* warm brown/amber shade */
          letter-spacing: 0.28em;
          text-transform: uppercase;
          text-align: center;
          white-space: nowrap;
          opacity: 0.45;
          text-shadow: 
            -1.5px -1.5px 0 #FAF7F2, 
             1.5px -1.5px 0 #FAF7F2, 
            -1.5px  1.5px 0 #FAF7F2, 
             1.5px  1.5px 0 #FAF7F2;
        }

        /* Stop Markers wrapper */
        .custom-stop-marker-wrapper {
          width: auto !important;
          height: auto !important;
        }

        /* Stop markers - Clean 18px emerald green circles */
        .custom-carto-stop-marker, .custom-blueprint-stop-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: #059669; /* Emerald 600 */
          color: white;
          border: 1.5px solid #FAF7F2;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(6, 78, 59, 0.25);
          opacity: 0;
          transform: scale(0.8);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .animated-marker {
          animation: markerFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes markerFadeIn {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .custom-carto-stop-badge, .custom-blueprint-stop-badge {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 9px;
          font-weight: 900;
          line-height: 1;
        }

        /* Hub Marker (Trip origin start coordinates styling) */
        .custom-hub-marker-wrapper {
          width: auto !important;
          height: auto !important;
        }
        .custom-carto-hub-marker, .custom-blueprint-hub-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: #064E3B; /* Darker green */
          color: white;
          border: 2.0px solid #FAF7F2;
          border-radius: 50%;
          box-shadow: 0 3px 6px rgba(0,0,0,0.3);
          opacity: 0;
          transform: scale(0.8);
        }
        .custom-carto-hub-badge, .custom-blueprint-hub-badge {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 900;
          line-height: 1;
        }

        /* Animated Corridor Lines */
        .animated-route-line {
          stroke-dasharray: 8, 8;
          animation: dashFlow 28s linear infinite;
        }
        @keyframes dashFlow {
          to {
            stroke-dashoffset: -1000;
          }
           /* Global Base Tile Enhancements - Organic paper explorer style */
        .leaflet-tile-pane {
          filter: saturate(1.25) contrast(1.08) brightness(0.96);
        }

        /* State-Specific Topography Enhancements - Organic paper explorer style */
        .state-meghalaya .leaflet-tile-pane {
          filter: saturate(1.42) contrast(1.15) brightness(0.93) hue-rotate(5deg);
        }
        .state-kerala .leaflet-tile-pane {
          filter: saturate(1.38) contrast(1.12) brightness(0.96) hue-rotate(-2deg);
        }
        .state-rajasthan .leaflet-tile-pane {
          filter: saturate(1.18) contrast(1.15) brightness(0.95) hue-rotate(-6deg);
        }
        .state-sikkim .leaflet-tile-pane {
          filter: saturate(1.3) contrast(1.22) brightness(0.9) hue-rotate(3deg);
        }
        .leaflet-tile {
          transition: filter 0.3s ease;
        }

        /* Global Hillshade Blending & Deeper contrast shadows for true 3D relief */
        .leaflet-hillshadePane-pane {
          mix-blend-mode: multiply !important;
          filter: contrast(2.1) brightness(0.88) saturate(1.05);
          opacity: 0.88 !important;
        }

        /* State-Specific Hillshade Blending & Deeper contrast shadows */
        .state-meghalaya .leaflet-hillshadePane-pane {
          mix-blend-mode: multiply !important;
          filter: contrast(2.4) brightness(0.85) saturate(1.1);
          opacity: 0.92 !important;
        }
        .state-kerala .leaflet-hillshadePane-pane {
          mix-blend-mode: multiply !important;
          filter: contrast(2.2) brightness(0.88);
          opacity: 0.9 !important;
        }
        .state-rajasthan .leaflet-hillshadePane-pane {
          mix-blend-mode: multiply !important;
          filter: contrast(2.1) brightness(0.86) saturate(1.1);
          opacity: 0.88 !important;
        }
        .state-sikkim .leaflet-hillshadePane-pane {
          mix-blend-mode: multiply !important;
          filter: contrast(2.6) brightness(0.8);
          opacity: 0.94 !important;
        }

        /* Global Landcover Pane (World Topo Map) - Blends green forest vegetation and contours */
        .leaflet-landcoverPane-pane {
          mix-blend-mode: multiply !important;
          filter: saturate(1.35) contrast(1.1) brightness(0.96);
          opacity: 0.9 !important;
        }

        /* State-Specific Landcover adjustments */
        .state-meghalaya .leaflet-landcoverPane-pane {
          filter: saturate(1.5) contrast(1.15) brightness(0.94) hue-rotate(5deg);
        }
        .state-kerala .leaflet-landcoverPane-pane {
          filter: saturate(1.45) contrast(1.12) brightness(0.96) hue-rotate(-2deg);
        }
        .state-rajasthan .leaflet-landcoverPane-pane {
          filter: saturate(1.1) contrast(1.15) brightness(0.96) hue-rotate(-6deg);
        }
        .state-sikkim .leaflet-landcoverPane-pane {
          filter: saturate(1.4) contrast(1.22) brightness(0.92) hue-rotate(3deg);
        }

        /* Global Hydrology Pane (World Hydro Reference Overlay) - Vivid blue water systems */
        .leaflet-hydrologyPane-pane {
          mix-blend-mode: multiply !important;
          filter: saturate(1.6) contrast(1.15) brightness(0.95);
          opacity: 0.95 !important;
        }

        /* Custom Tooltip style for explorer map look */
        .custom-map-tooltip {
          background-color: #FAF7F2 !important;
          border: 1px solid #064E3B !important;
          color: #064E3B !important;
          font-family: system-ui, -apple-system, sans-serif !important;
          font-size: 9px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          border-radius: 4px !important;
          padding: 2px 6px !important;
          box-shadow: 0 2px 6px rgba(6, 78, 59, 0.15) !important;
        }
        .custom-map-tooltip::before {
          border-top-color: #064E3B !important;
        }

        /* Custom Premium Popup Styles */
        .custom-premium-popup-card {
          background: #FAF7F2;
          border: 1.5px solid #064E3B;
          border-radius: 12px;
          overflow: hidden;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 10px 15px -3px rgba(6, 78, 59, 0.15);
        }
        .popup-media-container {
          width: 100%;
          height: 110px;
          overflow: hidden;
          border-bottom: 1px solid #E2E8F0;
        }
        .popup-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .popup-content-body {
          padding: 10px 12px 12px 12px;
        }
        .popup-title {
          font-family: 'Georgia', serif;
          font-weight: 800;
          font-size: 13px;
          color: #064E3B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
          line-height: 1.3;
        }
        .popup-metadata {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9px;
          color: #0F766E;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }
        .meta-dot {
          color: #94A3B8;
        }
        .popup-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #D97706; /* Amber 600 */
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .star-icon {
          font-size: 11px;
        }
        .popup-description {
          font-size: 10px;
          color: #374151;
          line-height: 1.45;
          margin: 0;
          font-weight: 400;
        }
      `}} />
      <div 
        ref={mapContainerRef} 
        className="w-full h-full z-10"
      />
    </div>
  );
}

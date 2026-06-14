import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Pre-defined base style styles using public raster tile services (no key required)
const BASE_STYLES = {
  topo: {
    id: 'topo',
    name: 'Atlas Topography',
    version: 8,
    sources: {
      'esri-topo': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: 'Base Tiles © Esri &mdash; Sources: USGS, FAO, NPS'
      }
    },
    layers: [
      {
        id: 'base-topo',
        type: 'raster',
        source: 'esri-topo',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite Explorer',
    version: 8,
    sources: {
      'esri-imagery': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: 'Imagery © Esri &mdash; Sources: USGS, USDA'
      }
    },
    layers: [
      {
        id: 'base-satellite',
        type: 'raster',
        source: 'esri-imagery',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  },
  streets: {
    id: 'streets',
    name: 'Standard OSM Streets',
    version: 8,
    sources: {
      'osm-streets': {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'base-streets',
        type: 'raster',
        source: 'osm-streets',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  }
};

export default function TravelMap3D({
  startCoords,
  destCoords,
  startLocation = 'Start',
  destination = 'Destination',
  selectedPlaces = [],
  routeGeometry = null,
  selectedTransport = 'fastest',
  
  // Lifted state props for persistence
  pitch = 55,
  bearing = -15,
  exaggeration = 1.5,
  activeStyle = 'topo',
  onStateChange,

  // Fallback and UI triggers
  onPerformanceFallback,
  showControls = true,
  collapsibleControls = false
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Local state for toggle panel
  const [isExpanded, setIsExpanded] = useState(false);

  // Monitor frame rate for auto performance fallback
  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let lowFpsTicks = 0;
    let frameRequestId;

    const monitorFps = () => {
      const now = performance.now();
      frames++;
      if (now > lastTime + 1000) {
        const currentFps = Math.round((frames * 1000) / (now - lastTime));
        
        // Low performance check (less than 22 FPS)
        if (currentFps < 22) {
          lowFpsTicks++;
          if (lowFpsTicks >= 4) { // 4 consecutive seconds of low performance
            if (onPerformanceFallback) {
              onPerformanceFallback(`Performance fallback: Render rate dropped to ${currentFps} FPS.`);
            }
          }
        } else {
          lowFpsTicks = Math.max(0, lowFpsTicks - 1);
        }
        frames = 0;
        lastTime = now;
      }
      frameRequestId = requestAnimationFrame(monitorFps);
    };

    // 2.5 second grace period to allow initial map layout and styling to render
    const graceTimer = setTimeout(() => {
      frameRequestId = requestAnimationFrame(monitorFps);
    }, 2500);

    return () => {
      clearTimeout(graceTimer);
      if (frameRequestId) {
        cancelAnimationFrame(frameRequestId);
      }
    };
  }, [onPerformanceFallback]);

  // Re-sync camera state with lifted props
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setPitch(pitch);
    }
  }, [pitch]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setBearing(bearing);
    }
  }, [bearing]);

  // Handle terrain height exaggeration shifts
  useEffect(() => {
    if (mapRef.current && mapRef.current.getSource('terrain-dem')) {
      mapRef.current.setTerrain({
        source: 'terrain-dem',
        exaggeration: exaggeration
      });
    }
  }, [exaggeration]);

  // Handle active style switching
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentStyle = BASE_STYLES[activeStyle];
    
    // Clean up existing route layers/sources before swapping styles
    if (map.getLayer('route-line')) map.removeLayer('route-line');
    if (map.getLayer('route-casing')) map.removeLayer('route-casing');
    if (map.getSource('route-source')) map.removeSource('route-source');

    map.setStyle(currentStyle);

    // Re-bind layers after new style loads
    map.once('style.load', () => {
      if (!map.getSource('terrain-dem')) {
        map.addSource('terrain-dem', {
          type: 'raster-dem',
          tiles: [
            'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
          ],
          encoding: 'terrarium',
          tileSize: 256,
          maxzoom: 15
        });
      }
      map.setTerrain({ source: 'terrain-dem', exaggeration: exaggeration });

      map.setFog({
        range: [0.5, 12],
        color: activeStyle === 'satellite' ? '#1e293b' : '#FAF7F2',
        'horizon-blend': 0.45
      });

      drawRoute();
    });

  }, [activeStyle]);

  // Redraw route polyline on terrain mesh
  const drawRoute = () => {
    const map = mapRef.current;
    if (!map || !routeGeometry || routeGeometry.length === 0) return;

    const routeGeoJSON = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: routeGeometry.map(pt => [pt[1], pt[0]])
      }
    };

    if (map.getSource('route-source')) {
      map.getSource('route-source').setData(routeGeoJSON);
    } else {
      map.addSource('route-source', {
        type: 'geojson',
        data: routeGeoJSON
      });

      let routeColor = '#6366F1'; // Indigo 500
      if (selectedTransport === 'cheapest') {
        routeColor = '#10B981'; // Emerald 500
      } else if (selectedTransport === 'comfortable') {
        routeColor = '#F59E0B'; // Amber 500
      }

      // Add route casing halo
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 7,
          'line-opacity': 0.75
        }
      });

      // Add route colored line
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': routeColor,
          'line-width': 3.6,
          'line-opacity': 1.0
        }
      });
    }
  };

  // Re-draw route on geometry updates
  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      drawRoute();
    }
  }, [routeGeometry, selectedTransport]);

  // Draw start hub and stop markers on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();

    // 1. Add Start Origin Hub Marker
    if (startCoords && startCoords[0] && startCoords[1]) {
      const el = document.createElement('div');
      el.className = 'custom-3d-hub-marker';
      el.innerHTML = '<span style="font-size:12px">⚓</span>';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.background = '#064E3B';
      el.style.color = '#fff';
      el.style.border = '2.2px solid #FAF7F2';
      el.style.borderRadius = '50%';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      const popup = new maplibregl.Popup({ offset: 15, className: 'custom-3d-popup' })
        .setHTML(`<div style="padding:4px; font-family:serif; font-weight:bold; color:#064E3B">Trip Origin: ${startLocation}</div>`);

      const marker = new maplibregl.Marker(el)
        .setLngLat([startCoords[1], startCoords[0]])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([startCoords[1], startCoords[0]]);
    }

    // 2. Add Selected Stops
    if (selectedPlaces && selectedPlaces.length > 0) {
      selectedPlaces.forEach((place, idx) => {
        const coords = place.coords || [place.lat, place.lon];
        if (coords && coords[0] && coords[1]) {
          const el = document.createElement('div');
          el.className = 'custom-3d-stop-marker';
          el.innerHTML = `<span style="font-size:9px; font-weight:900; font-family:sans-serif">${idx + 1}</span>`;
          el.style.width = '18px';
          el.style.height = '18px';
          el.style.background = '#059669';
          el.style.color = '#fff';
          el.style.border = '1.5px solid #FAF7F2';
          el.style.borderRadius = '50%';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.25)';
          el.style.cursor = 'pointer';

          const popup = new maplibregl.Popup({ offset: 12, className: 'custom-3d-popup' })
            .setHTML(`<div style="padding:4px; font-family:sans-serif"><strong style="color:#059669; font-weight:800; uppercase text-xs">Stop ${idx + 1}</strong><h4 style="margin:4px 0; font-family:serif; font-weight:bold; text-sm; color:#1E293B">${place.name}</h4><span style="font-size:10px; text-slate-500">${place.distance || 'Local'} • Drive Time: ${place.drive_time || '10-15m'}</span></div>`);

          const marker = new maplibregl.Marker(el)
            .setLngLat([coords[1], coords[0]])
            .setPopup(popup)
            .addTo(map);

          markersRef.current.push(marker);
          bounds.extend([coords[1], coords[0]]);
        }
      });
    }

    if (routeGeometry && routeGeometry.length > 0) {
      routeGeometry.forEach(pt => bounds.extend([pt[1], pt[0]]));
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: 60,
        maxZoom: 10,
        duration: 1200
      });
    }

  }, [startCoords, selectedPlaces, routeGeometry]);

  // Main initialization
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const initialCenter = [destCoords ? destCoords[1] : 91.8833, destCoords ? destCoords[0] : 25.5788];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: BASE_STYLES[activeStyle],
      center: initialCenter,
      zoom: 7,
      pitch: pitch,
      bearing: bearing
    });

    mapRef.current = map;

    map.on('load', () => {
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: [
          'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        ],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15
      });

      map.setTerrain({
        source: 'terrain-dem',
        exaggeration: exaggeration
      });

      map.setFog({
        range: [0.5, 12],
        color: activeStyle === 'satellite' ? '#1e293b' : '#FAF7F2',
        'horizon-blend': 0.45
      });

      drawRoute();
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleStyleChange = (styleKey) => {
    if (onStateChange) {
      onStateChange({ activeStyle: styleKey });
    }
  };

  const handlePitchChange = (newVal) => {
    if (onStateChange) {
      onStateChange({ pitch: newVal });
    }
  };

  const handleBearingChange = (newVal) => {
    if (onStateChange) {
      onStateChange({ bearing: newVal });
    }
  };

  const handleExaggerationChange = (newVal) => {
    if (onStateChange) {
      onStateChange({ exaggeration: newVal });
    }
  };

  // Determine rendering layout of UI controls
  const renderControls = () => {
    if (!showControls) return null;

    if (collapsibleControls && !isExpanded) {
      return (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute top-3 right-3 bg-white/95 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-md z-20 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer select-none"
        >
          <span>⚙️</span>
          <span>Terrain Settings</span>
        </button>
      );
    }

    return (
      <div className="absolute top-3 right-3 bg-white/95 border border-slate-200/80 rounded-2xl p-4 shadow-xl z-20 w-64 backdrop-blur-sm text-left select-none animate-fade-in">
        <div className="flex items-center justify-between mb-2.5 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-600 animate-pulse text-sm">🏔️</span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Terrain V6 Settings</span>
          </div>
          {collapsibleControls && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-extrabold px-1.5 py-0.5 rounded transition cursor-pointer"
              title="Close Settings"
            >
              ✕
            </button>
          )}
        </div>

        {/* 1. Style switch */}
        <div className="space-y-1 mb-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Base Layer Theme</label>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {Object.keys(BASE_STYLES).map((key) => (
              <button
                key={key}
                onClick={() => handleStyleChange(key)}
                className={`py-1 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                  activeStyle === key
                    ? 'bg-white text-slate-800 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Pitch slider */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Camera Pitch (Tilt)</label>
            <span className="text-[9px] font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{pitch}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="80"
            value={pitch}
            onChange={(e) => handlePitchChange(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-100 border border-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>

        {/* 3. Bearing slider */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Camera Bearing (Heading)</label>
            <span className="text-[9px] font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{bearing}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={bearing}
            onChange={(e) => handleBearingChange(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-100 border border-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>

        {/* 4. Exaggeration slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Terrain Exaggeration</label>
            <span className="text-[9px] font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{exaggeration}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={exaggeration}
            onChange={(e) => handleExaggerationChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-100 border border-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>

        <div className="mt-3 text-[9px] text-slate-400 leading-normal border-t border-slate-100 pt-2 bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/10">
          Hold right-click or use drag coordinates to rotate/tilt the view. Settings are preserved across dashboard screens.
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full font-sans overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      {renderControls()}
    </div>
  );
}

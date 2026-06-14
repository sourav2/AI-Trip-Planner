import React, { useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Compass, CloudRain, Sun, Mountain, Trees, MapPin, 
  Briefcase, ShieldAlert, Check, Wallet, Info, Sparkles 
} from 'lucide-react';
import { getCategoryMatchedImage, getDynamicTipsAndPacking } from '../services/blueprintProvider';
import { geographyProvider } from '../services/geographyProvider';
import TravelMap from './TravelMap';

// Bounding box geometries for the four supported states
const STATE_BBOXES = {
  meghalaya: [89.8, 25.0, 92.8, 26.2],
  sikkim: [88.0, 27.0, 89.0, 28.2],
  kerala: [74.8, 8.1, 77.5, 12.8],
  rajasthan: [69.5, 23.3, 78.3, 30.2]
};

// Bounding box extractor from geometry
function getGeometryBBox(geometry) {
  let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
  const recurse = (coords) => {
    if (typeof coords[0] === 'number') {
      const [lon, lat] = coords;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      coords.forEach(recurse);
    }
  };
  recurse(geometry.coordinates);
  return [minLon, minLat, maxLon, maxLat];
}

// Geographic Haversine Distance Formula
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function BlueprintV3({
  activeTrip,
  selectedPlaces = [],
  routeInfo = null,
  startDate = '',
  travelStyle = '',
  transportPreference = ''
}) {
  const [stateBoundary, setStateBoundary] = useState(null);
  const [loadingBoundary, setLoadingBoundary] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [adjustedNodes, setAdjustedNodes] = useState([]);

  const destination = activeTrip?.destination || 'Destination';
  const travelers = activeTrip?.travelers || 2;
  const duration = activeTrip?.total_days || 6;
  const budget = activeTrip?.budget || 25000;
  const comfortLevel = activeTrip?.comfort_level || 'moderate';

  const startLocation = activeTrip?.start_location || activeTrip?.startLocation || 'Transit Port';
  const startHub = startLocation.split(',')[0].trim();
  const baseCityName = destination.toLowerCase().includes('meghalaya') ? 'Shillong' :
                       destination.toLowerCase().includes('kerala') ? 'Kochi' :
                       destination.toLowerCase().includes('rajasthan') ? 'Jaipur' :
                       destination.toLowerCase().includes('sikkim') ? 'Gangtok' : destination;

  // Resolve sync-geography values from geographyProvider
  const geoDetails = useMemo(() => {
    return geographyProvider.getCoordinates(activeTrip, selectedPlaces);
  }, [activeTrip, selectedPlaces]);

  const { startCoords, destCoords, stopsCoords, baseCityCoords } = geoDetails;

  const dynamicTips = getDynamicTipsAndPacking(
    destination,
    startDate,
    travelStyle,
    comfortLevel,
    transportPreference,
    selectedPlaces
  );

  // Load state boundary outline geometry using geographyProvider
  useEffect(() => {
    if (!destination) return;
    setLoadingBoundary(true);
    geographyProvider.fetchStateBoundary(destination)
      .then(data => {
        if (data && data.geometry) {
          setStateBoundary(data);
        } else {
          setStateBoundary(null);
        }
      })
      .catch(err => {
        console.error("Failed to load state boundary:", err);
        setStateBoundary(null);
      })
      .finally(() => {
        setLoadingBoundary(false);
      });
  }, [destination]);

  const isCartEmpty = selectedPlaces.length === 0;

  // Fallback preset places if selectedPlaces cart is empty (Only used for side panels/text display)
  const activePlaces = selectedPlaces.length > 0 ? selectedPlaces : (activeTrip?.nearby_attractions?.slice(0, 5) || [
    { name: "Elephant Falls", type: "Waterfall", summary: "Three-tiered waterfall surrounded by lush trees." },
    { name: "Laitlum Canyons", type: "Viewpoint", summary: "Amphitheater of steep green hills and deep gorges." },
    { name: "Mawsmai Cave", type: "Cave", summary: "Natural limestone formations lit by spotlights." },
    { name: "Dawki River", type: "River", summary: "Famous for crystal clear water and boating." }
  ]);

  // Actual places mapped for Map nodes (Only represents actual selected items)
  const mapPlacesWithCoords = useMemo(() => {
    return selectedPlaces.map((p, idx) => {
      let lat = p.lat || p.coords?.[0];
      let lon = p.lon || p.coords?.[1];
      if (lat === undefined || lon === undefined) {
        const dest = destination.toLowerCase();
        if (dest.includes("meghalaya")) {
          lat = 25.5 - (idx * 0.08);
          lon = 91.8 + (idx * 0.08);
        } else if (dest.includes("kerala")) {
          lat = 10.0 - (idx * 0.15);
          lon = 76.4 + (idx * 0.05);
        } else if (dest.includes("rajasthan")) {
          lat = 26.9 - (idx * 0.25);
          lon = 75.8 - (idx * 0.15);
        } else if (dest.includes("sikkim")) {
          lat = 27.3 + (idx * 0.08);
          lon = 88.5 + (idx * 0.05);
        } else {
          lat = 20.0 + (idx * 0.1);
          lon = 78.0 + (idx * 0.1);
        }
      }
      return { ...p, lat, lon, coords: [lat, lon] };
    });
  }, [selectedPlaces, destination]);

  const width = 800;
  const height = 460;

  const destKey = useMemo(() => {
    const d = destination.toLowerCase();
    if (d.includes('meghalaya')) return 'meghalaya';
    if (d.includes('sikkim')) return 'sikkim';
    if (d.includes('kerala')) return 'kerala';
    if (d.includes('rajasthan')) return 'rajasthan';
    return '';
  }, [destination]);

  const defaultBBox = useMemo(() => {
    return STATE_BBOXES[destKey] || [70, 15, 90, 30];
  }, [destKey]);

  const bbox = useMemo(() => {
    if (stateBoundary && stateBoundary.geometry) {
      return getGeometryBBox(stateBoundary.geometry);
    }
    return defaultBBox;
  }, [stateBoundary, defaultBBox]);

  // Configure dynamic zoom & projection fitting
  const { projection, pathGenerator } = useMemo(() => {
    let proj = d3.geoConicConformal()
      .center([78.9629, 20.5937])
      .scale(1000)
      .translate([width / 2, height / 2]);

    if (isCartEmpty) {
      if (stateBoundary && stateBoundary.geometry) {
        try {
          proj.fitExtent([[195, 45], [605, 415]], stateBoundary);
        } catch (e) {
          console.error("Error fitting full state boundary:", e);
        }
      } else {
        const [minLon, minLat, maxLon, maxLat] = bbox;
        const fallbackFeature = {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [minLon, minLat],
              [maxLon, minLat],
              [maxLon, maxLat],
              [minLon, maxLat],
              [minLon, minLat]
            ]]
          }
        };
        try {
          proj.fitExtent([[195, 45], [605, 415]], fallbackFeature);
        } catch (e) {
          console.error("Error fitting fallback state box:", e);
        }
      }
    } else {
      const lats = mapPlacesWithCoords.map(p => p.lat).filter(Boolean);
      const lons = mapPlacesWithCoords.map(p => p.lon).filter(Boolean);

      if (baseCityCoords) {
        lats.push(baseCityCoords[0]);
        lons.push(baseCityCoords[1]);
      }

      if (lats.length > 0 && lons.length > 0) {
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);

        const latSpan = maxLat - minLat;
        const lonSpan = maxLon - minLon;

        const padLat = Math.max(0.12, latSpan * 0.25);
        const padLon = Math.max(0.12, lonSpan * 0.25);

        const activeBbox = {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [minLon - padLon, minLat - padLat],
              [maxLon + padLon, minLat - padLat],
              [maxLon + padLon, maxLat + padLat],
              [minLon - padLon, maxLat + padLat],
              [minLon - padLon, minLat - padLat]
            ]]
          }
        };

        try {
          proj.fitExtent([[195, 45], [605, 415]], activeBbox);
        } catch (e) {
          console.error("Error fitting dynamic zoom bounding box:", e);
        }
      }
    }

    const pathGen = d3.geoPath().projection(proj);
    return { projection: proj, pathGenerator: pathGen };
  }, [isCartEmpty, stateBoundary, bbox, mapPlacesWithCoords, baseCityCoords]);

  // Resolve projected coordinate points for stops
  const mapNodes = useMemo(() => {
    const list = mapPlacesWithCoords.map((place, idx) => {
      const proj = projection([place.lon, place.lat]);
      if (!proj) return null;
      return {
        id: idx + 1,
        name: place.name.split(' (')[0],
        type: place.type || place.quick_facts?.Type || "Attraction",
        summary: place.summary || place.description || "Scenic exploration spot.",
        x: Math.round(proj[0]),
        y: Math.round(proj[1]),
        lat: place.lat,
        lon: place.lon
      };
    }).filter(Boolean);

    // Prepend primary hub if not present
    const hasHub = list.some(n => {
      const nName = n.name.toLowerCase();
      return nName.includes('shillong') || nName.includes('jaipur') || nName.includes('kochi') || nName.includes('cochin') || nName.includes('gangtok');
    });

    if (!hasHub && baseCityCoords) {
      const proj = projection([baseCityCoords[1], baseCityCoords[0]]);
      if (proj) {
        list.unshift({
          id: 0,
          name: baseCityName,
          type: "Base Hub",
          summary: `Primary entry hub and base city for ${destination}.`,
          x: Math.round(proj[0]),
          y: Math.round(proj[1]),
          lat: baseCityCoords[0],
          lon: baseCityCoords[1],
          isBaseCity: true
        });
      }
    }
    return list;
  }, [mapPlacesWithCoords, projection, baseCityCoords, baseCityName, destination]);

  // Force-directed overlap solver
  useEffect(() => {
    if (mapNodes.length === 0) {
      setAdjustedNodes([]);
      return;
    }

    const simulationNodes = mapNodes.map(node => ({
      ...node,
      x: node.x,
      y: node.y
    }));

    const simulation = d3.forceSimulation(simulationNodes)
      .force("x", d3.forceX(d => d.x).strength(0.6))
      .force("y", d3.forceY(d => d.y).strength(0.6))
      .force("collide", d3.forceCollide(25))
      .stop();

    for (let i = 0; i < 60; i++) {
      simulation.tick();
    }

    setAdjustedNodes(simulationNodes);
  }, [mapNodes]);

  const activeNodes = adjustedNodes.length === mapNodes.length ? adjustedNodes : mapNodes;

  // Stacking Margin Callouts (Label cleanup & Attraction callouts)
  const calloutNodes = useMemo(() => {
    if (isCartEmpty || activeNodes.length <= 1) return [];

    const attractionNodes = activeNodes.filter(n => !n.isBaseCity && n.id !== 0);

    const leftNodes = attractionNodes.filter(n => n.x < 400).sort((a, b) => a.y - b.y);
    const rightNodes = attractionNodes.filter(n => n.x >= 400).sort((a, b) => a.y - b.y);

    const list = [];
    const maxNodesSide = Math.max(leftNodes.length, rightNodes.length);

    let cardHeight = 54;
    let spacing = 64;
    let imgSize = 36;
    let showImage = true;

    if (maxNodesSide > 5) {
      cardHeight = 46;
      spacing = 54;
      imgSize = 28;
    }
    if (maxNodesSide > 8) {
      cardHeight = 36;
      spacing = 42;
      imgSize = 20;
    }

    leftNodes.forEach((node, idx) => {
      const x = 18;
      const totalHeight = leftNodes.length * spacing;
      const startY = Math.max(48, (460 - totalHeight) / 2 + 10);
      const y = startY + idx * spacing;

      list.push({
        ...node,
        isLeft: true,
        cardX: x,
        cardY: y,
        cardW: 160,
        cardH: cardHeight,
        showImage,
        imgSize,
        anchorX: x + 160,
        anchorY: y + cardHeight / 2
      });
    });

    rightNodes.forEach((node, idx) => {
      const x = 622;
      const totalHeight = rightNodes.length * spacing;
      const startY = Math.max(48, (460 - totalHeight) / 2 + 10);
      const y = startY + idx * spacing;

      list.push({
        ...node,
        isLeft: false,
        cardX: x,
        cardY: y,
        cardW: 160,
        cardH: cardHeight,
        showImage,
        imgSize,
        anchorX: x,
        anchorY: y + cardHeight / 2
      });
    });

    return list;
  }, [activeNodes, isCartEmpty]);

  // Project Road Polyline geometry points
  const routePointsString = useMemo(() => {
    if (!routeInfo || !routeInfo.geometry || routeInfo.geometry.length === 0) {
      return null;
    }
    return routeInfo.geometry
      .map(pt => {
        const [lat, lon] = pt;
        const proj = projection([lon, lat]);
        return proj ? `${Math.round(proj[0])},${Math.round(proj[1])}` : null;
      })
      .filter(Boolean)
      .join(" ");
  }, [routeInfo, projection]);

  // Compute Midpoint Route Annotations
  const routeAnnotations = useMemo(() => {
    if (isCartEmpty || mapNodes.length <= 1) return [];

    const list = [];
    const isHilly = destination.toLowerCase().includes("meghalaya") || destination.toLowerCase().includes("sikkim");
    const windingFactor = isHilly ? 1.35 : 1.18;
    const avgSpeed = isHilly ? 35 : 55;

    for (let i = 0; i < mapNodes.length - 1; i++) {
      const p1 = mapNodes[i];
      const p2 = mapNodes[i + 1];
      
      const geoDist = getHaversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
      const driveDist = Math.round(geoDist * windingFactor);
      const driveHours = driveDist / avgSpeed;
      const hrs = Math.floor(driveHours);
      const mins = Math.round((driveHours - hrs) * 60);
      const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

      const midX = Math.round((p1.x + p2.x) / 2);
      const midY = Math.round((p1.y + p2.y) / 2) - 10;

      list.push({
        id: i,
        midX,
        midY,
        distanceText: `${driveDist} km`,
        timeText: timeStr
      });
    }
    return list;
  }, [mapNodes, destination, isCartEmpty]);

  // Get simple water features for decoration (safely passing resolved boundary)
  const waterFeatures = useMemo(() => {
    const list = [];
    const destLow = destination.toLowerCase();
    if (destLow.includes("meghalaya")) {
      list.push({
        type: "Feature",
        properties: { name: "Umngot River", type: "river" },
        geometry: {
          type: "LineString",
          coordinates: [
            [91.88, 25.55],
            [91.90, 25.46],
            [91.94, 25.38],
            [91.98, 25.26],
            [92.02, 25.18]
          ]
        }
      });
    } else if (destLow.includes("sikkim")) {
      list.push({
        type: "Feature",
        properties: { name: "Teesta River", type: "river" },
        geometry: {
          type: "LineString",
          coordinates: [
            [88.62, 27.85],
            [88.58, 27.68],
            [88.56, 27.52],
            [88.50, 27.32],
            [88.44, 27.12]
          ]
        }
      });
    } else if (destLow.includes("kerala")) {
      list.push({
        type: "Feature",
        properties: { name: "Vembanad Lagoon", type: "lake" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [76.32, 9.85],
            [76.36, 9.72],
            [76.38, 9.58],
            [76.43, 9.42],
            [76.38, 9.40],
            [76.32, 9.56],
            [76.28, 9.71],
            [76.32, 9.85]
          ]]
        }
      });
    } else if (destLow.includes("rajasthan")) {
      list.push({
        type: "Feature",
        properties: { name: "Sambhar Salt Lake", type: "lake" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [74.95, 26.90],
            [75.15, 26.95],
            [75.22, 26.90],
            [75.05, 26.83],
            [74.95, 26.90]
          ]]
        }
      });
    }
    return list;
  }, [destination]);

  const weather = useMemo(() => {
    const descLower = destination.toLowerCase();
    if (descLower.includes('meghalaya')) {
      return { temp: "18°C - 24°C", rain: "Peak monsoon mists & clouds", condition: "Windproof rain protection highly active" };
    }
    if (descLower.includes('kerala')) {
      return { temp: "26°C - 32°C", rain: "Humid tropical monsoon breezes", condition: "Breathable linen, light rain gear" };
    }
    if (descLower.includes('rajasthan')) {
      return { temp: "35°C - 42°C", rain: "Arid desert sands, dry sun", condition: "Sun shield, continuous electrolyte hydration" };
    }
    if (descLower.includes('sikkim')) {
      return { temp: "4°C - 12°C", rain: "Alpine chilly freeze, clear snow views", condition: "Heavy thermals & fleece layering mandatory" };
    }
    return { temp: "22°C - 28°C", rain: "Moderate pleasant weather", condition: "Comfortable standard hiking gear" };
  }, [destination]);

  const expectText = useMemo(() => {
    const descLower = destination.toLowerCase();
    if (descLower.includes('meghalaya')) {
      return "Acclimatize to winding mountain roads, wet trails, and double-decker root bridge stairs. Expect breathtaking cliff gorges and dense rain forests that feel alive.";
    }
    if (descLower.includes('kerala')) {
      return "Immerse yourself in gentle tea plantation slopes, tropical palm-fringed coastlines, and tranquil emerald backwaters. Best experienced via relaxed houseboat cruises.";
    }
    if (descLower.includes('rajasthan')) {
      return "Explore massive sandstone forts, royal lake palaces, and shifting sand dunes. Be ready for extreme dry heat and rich heritage bazaar shopping experiences.";
    }
    if (descLower.includes('sikkim')) {
      return "Experience sub-zero alpine lakes, sacred buddhist monasteries, and towering snowy peaks. Heavy terrain climbs require high altitude acclimatization and travel permits.";
    }
    return "A wonderful blend of regional discovery, scenic road transits, authentic local kitchens, and beautiful heritage monuments.";
  }, [destination]);

  const foodItems = useMemo(() => {
    const descLower = destination.toLowerCase();
    if (descLower.includes('meghalaya')) {
      return ["Traditional Jadoh rice", "Dohneiiong sesame pork", "Organic Khasi wild honey tea", "Spiced dhal fry"];
    }
    if (descLower.includes('kerala')) {
      return ["Karimeen Pollichathu fish", "Kerala Sadhya on banana leaf", "Steamed Puttu & Kadala curry", "Fresh coconut toddy"];
    }
    if (descLower.includes('rajasthan')) {
      return ["Dal Baati Churma", "Laal Maas mutton curry", "Local sweet Ghevar", "Spiced buttermilk (Chaas)"];
    }
    if (descLower.includes('sikkim')) {
      return ["Steamed beef momos", "Warm Thukpa noodle soup", "Fermented bamboo shoot curry", "Local millet beer (Tongba)"];
    }
    return ["Regional organic platter", "Local street food specialties", "Traditional masala tea", "Fresh fruit extracts"];
  }, [destination]);

  const safetyInfo = useMemo(() => {
    const descLower = destination.toLowerCase();
    if (descLower.includes('meghalaya')) {
      return {
        connectivity: "UPI/Internet are slow near Dawki border and deep valleys. Carry physical cash.",
        safety: "Avoid late-night mountain transit due to heavy fog and zero visibility."
      };
    }
    if (descLower.includes('kerala')) {
      return {
        connectivity: "Strong network coverage in hotels, light drops on deep backwater streams.",
        safety: "Maintain water safety. Avoid entering river banks during high monsoon tides."
      };
    }
    if (descLower.includes('rajasthan')) {
      return {
        connectivity: "Reliable mobile signal in cities. Slower speeds inside heavy fort walls.",
        safety: "Guard against heatstroke. Avoid outdoor walks during peak sun hours (12 PM - 3 PM)."
      };
    }
    if (descLower.includes('sikkim')) {
      return {
        connectivity: "Limited internet in North valleys (Lachen/Lachung). Carry hard permit copies.",
        safety: "Altitude warning. Keep Diamox handy and avoid rapid high treks on Day 1."
      };
    }
    return {
      connectivity: "Digital payments work in cities. Slower speeds in remote places.",
      safety: "Ensure children wear safety gear during active outdoor sightseeing."
    };
  }, [destination]);

  const daywiseRoute = useMemo(() => {
    const days = [];
    const step = Math.max(1, Math.ceil(activePlaces.length / duration));

    for (let d = 1; d <= duration; d++) {
      const startIndex = (d - 1) * step;
      const dayStops = activePlaces.slice(startIndex, startIndex + step);

      let summaryText = "Scenic exploration and transit between regional hubs.";
      if (d === 1) {
        summaryText = `Arrival at transit port, check-in at ${baseCityName} homestay, and evening bazaar exploration.`;
      } else if (d === duration) {
        summaryText = "Morning souvenir shopping and airport return highway transit.";
      } else if (dayStops.length > 0) {
        summaryText = `Explore ${dayStops.map(p => p.name.split(' (')[0]).join(' & ')} with local sightseeing guide.`;
      }

      days.push({ day: d, summary: summaryText });
    }
    return days;
  }, [activePlaces, duration, baseCityName]);

  const polaroids = useMemo(() => {
    return activePlaces.slice(0, 3).map((place, idx) => {
      const rot = idx === 0 ? -4 : (idx === 1 ? 2 : -2);
      return {
        name: place.name.split(' (')[0],
        imageUrl: place.image_url || getCategoryMatchedImage(place.name, place.quick_facts?.Type || '', ''),
        rot
      };
    });
  }, [activePlaces]);

  const distanceGuides = useMemo(() => {
    const list = [];
    for (let i = 0; i < mapNodes.length - 1; i++) {
      const annot = routeAnnotations[i];
      if (!annot) continue;
      list.push({
        from: mapNodes[i].name,
        to: mapNodes[i + 1].name,
        distance: annot.distanceText,
        time: annot.timeText
      });
    }
    return list;
  }, [mapNodes, routeAnnotations]);

  // Phase 3: Gemini Travel Atlas Model construction
  const blueprintAtlasModel = useMemo(() => {
    return {
      state: destination,
      hubCity: baseCityName,
      selectedAttractions: mapPlacesWithCoords.map(p => p.name),
      routeOrder: mapNodes.map(n => n.name),
      distances: distanceGuides.map(g => `${g.from} to ${g.to}: ${g.distance}`),
      travelDuration: `${duration} Days`,
      weatherSummary: weather,
      travelRecommendations: {
        tips: dynamicTips.tips,
        packing: {
          apparel: dynamicTips.apparel,
          essentials: dynamicTips.essentials
        },
        safety: safetyInfo
      }
    };
  }, [destination, baseCityName, mapPlacesWithCoords, mapNodes, distanceGuides, duration, weather, dynamicTips, safetyInfo]);

  // Export Hook Architecture with atlas model exposure
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__antigravity_blueprint_export = {
        atlasModel: blueprintAtlasModel,
        getTerrainData: () => ({
          gridValues: [],
          gridWidth: 30,
          gridHeight: 30,
          bbox,
          contours: []
        }),
        getRouteData: () => ({
          routeInfo,
          routePointsString
        }),
        getAttractionsData: () => mapPlacesWithCoords,
        getWeatherData: () => weather,
        getItineraryData: () => daywiseRoute
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__antigravity_blueprint_export;
      }
    };
  }, [blueprintAtlasModel, bbox, routeInfo, routePointsString, mapPlacesWithCoords, weather, daywiseRoute]);

  if (!activeTrip) return null;

  return (
    <div 
      id="travel-blueprint-poster-v3" 
      className="bg-[#FAF7F2] border-[14px] border-double border-emerald-950 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-w-4xl mx-auto text-left relative overflow-hidden text-emerald-950 font-serif"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes markerEntrance {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          70% {
            transform: scale(1.15);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-marker {
          animation: markerEntrance 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }
        .atlas-section-title {
          font-family: sans-serif;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          color: #B45309;
          letter-spacing: 0.1em;
          border-bottom: 2px solid rgba(6, 78, 59, 0.15);
          padding-bottom: 3px;
          margin-bottom: 8px;
        }
        /* Custom Cartographic Vintage Sepia/Parchment filters for Leaflet inside Blueprint tab */
        .blueprint-leaflet-map .leaflet-tile-pane {
          filter: sepia(0.35) saturate(1.15) contrast(1.12) brightness(0.96) !important;
        }
        .blueprint-leaflet-map .leaflet-hillshadePane-pane {
          mix-blend-mode: multiply !important;
          filter: contrast(1.35) brightness(0.92) saturate(1.05) sepia(0.35) !important;
          opacity: 0.75 !important;
        }
        .blueprint-leaflet-map.state-meghalaya .leaflet-tile-pane {
          filter: sepia(0.3) saturate(1.35) contrast(1.15) brightness(0.94) hue-rotate(2deg) !important;
        }
        .blueprint-leaflet-map.state-kerala .leaflet-tile-pane {
          filter: sepia(0.28) saturate(1.3) contrast(1.12) brightness(0.96) hue-rotate(-2deg) !important;
        }
        .blueprint-leaflet-map.state-rajasthan .leaflet-tile-pane {
          filter: sepia(0.38) saturate(1.15) contrast(1.16) brightness(0.95) hue-rotate(-8deg) !important;
        }
        .blueprint-leaflet-map.state-sikkim .leaflet-tile-pane {
          filter: sepia(0.3) saturate(1.08) contrast(1.18) brightness(0.92) hue-rotate(2deg) !important;
        }
      ` }} />

      {/* Graticule pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#064e3b_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* SECTION I: GEOGRAPHIC REGION PROFILE */}
      <div className="border-b-4 border-double border-emerald-950 pb-5 text-center space-y-2.5 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B45309] block">Section I &bull; Geographic Region Profile</span>
        <h2 className="text-2xl md:text-3xl font-black tracking-wide text-emerald-950 uppercase">{destination} Travel Atlas</h2>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-700 pt-1.5 font-sans">
          <span className="bg-emerald-50 px-2 py-0.5 border border-emerald-950/10 rounded">⚓ Base City: {baseCityName}</span>
          <span className="bg-emerald-50 px-2 py-0.5 border border-emerald-950/10 rounded">🧭 Start Hub: {startHub}</span>
          <span className="bg-emerald-50 px-2 py-0.5 border border-emerald-950/10 rounded">🗓️ Duration: {duration} Days</span>
          <span className="bg-emerald-50 px-2 py-0.5 border border-emerald-950/10 rounded">👥 Guests: {travelers} Travelers</span>
          <span className="bg-emerald-50 px-2 py-0.5 border border-emerald-950/10 rounded">💰 Budget: ₹{budget.toLocaleString()}</span>
        </div>
      </div>

      {/* SECTION II: GEOGRAPHIC ROUTE CIRCUIT MAP */}
      <div className="space-y-2.5 relative z-10">
        <h3 className="atlas-section-title">Section II &bull; Route Circuit Map</h3>
        <div className="relative border-2 border-emerald-950 rounded-2xl bg-[#F4EFEB] overflow-hidden shadow-inner h-[460px] w-full">
          {/* Real Leaflet Map */}
          <div className={`w-full h-full blueprint-leaflet-map state-${destKey}`}>
            <TravelMap
              startCoords={startCoords || activeTrip?.start_coords}
              destCoords={destCoords || activeTrip?.dest_coords}
              startLocation={startLocation}
              destination={destination}
              regions={activeTrip?.regions || []}
              nearbyAttractions={activeTrip?.nearby_attractions || []}
              selectedTransport={transportPreference || activeTrip?.transport_preference}
              routeGeometry={routeInfo?.geometry || activeTrip?.route_data?.geometry}
              selectedPlaces={selectedPlaces}
              allowInternationalTransit={activeTrip?.allow_international_transit || false}
              destinationImageUrl={activeTrip?.destination_image_url || ''}
              isBlueprint={true}
            />
            {/* Vintage parchment multiply overlay for map integration */}
            <div className="absolute inset-0 bg-[#FAF7F2] mix-blend-multiply pointer-events-none z-[450] opacity-40 border border-emerald-950/20" />
            <div className="absolute inset-0 bg-[radial-gradient(#064e3b_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03] pointer-events-none z-[460]" />
          </div>

          {/* Compass Rose absolute overlay */}
          <div className="absolute top-4 right-4 z-[480] opacity-80 pointer-events-none">
            <svg width="50" height="50" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#064E3B" strokeWidth="1.2" strokeDasharray="3 3"/>
              <path d="M 50 2 L 57 40 L 50 50 L 43 40 Z" fill="#064E3B" />
              <path d="M 50 2 L 50 50 L 57 40 Z" fill="#D97706" />
              <path d="M 50 98 L 57 60 L 50 50 L 43 60 Z" fill="#064E3B" />
              <path d="M 50 98 L 50 50 L 43 60 Z" fill="#D97706" />
              <text x="50" y="4" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#064E3B" fontFamily="sans-serif">N</text>
            </svg>
          </div>

          {/* Map Legend card overlay inside map corner */}
          <div className="absolute bottom-4 left-4 bg-[#FAF7F2]/95 border border-emerald-950 p-2.5 rounded-lg text-left shadow font-sans text-[10px] space-y-1 select-none z-[480]">
            <span className="font-extrabold uppercase text-[#B45309] block border-b border-emerald-950/20 pb-0.5 mb-1">Atlas Legend</span>
            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
              <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" />
              <span>Route Stop Node</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-[#4F46E5]" />
              <span>OSRM Driving Road Path</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
              <span className="h-3 w-3 border border-dashed border-teal-700 bg-teal-50/10" />
              <span>Geographic Boundary</span>
            </div>
          </div>

          {/* Margin Callouts Overlay */}
          {!isCartEmpty && (
            <>
              {/* Left Column Callouts */}
              <div className="absolute left-4 top-4 bottom-4 w-40 flex flex-col justify-around z-[480] pointer-events-none gap-2">
                {calloutNodes.filter(c => c.isLeft).map((c) => {
                  const placeRaw = mapPlacesWithCoords.find(p => p.name === c.name) || mapPlacesWithCoords[c.id - 1];
                  const imgUrl = placeRaw?.image_url || getCategoryMatchedImage(c.name, c.type, '');
                  return (
                    <div 
                      key={`callout-left-${c.id}`} 
                      className="bg-[#FAF5E6] border border-emerald-950/40 p-1.5 rounded-lg shadow-md flex items-center gap-2 pointer-events-auto h-[54px] w-full"
                    >
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-slate-100 border border-emerald-950/10 font-sans">
                        <img src={imgUrl} className="h-full w-full object-cover" alt="" />
                        <span className="absolute -top-1 -left-1 bg-[#B45309] text-white rounded-full h-4 w-4 flex items-center justify-center text-[8px] font-black">{c.id}</span>
                      </div>
                      <div className="text-[10px] leading-tight font-sans text-emerald-950 font-bold truncate">
                        <div className="truncate">{c.name}</div>
                        <span className="text-[8px] text-[#B45309] uppercase block tracking-wider truncate">{c.type.split(',')[0]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column Callouts */}
              <div className="absolute right-4 top-4 bottom-4 w-40 flex flex-col justify-around z-[480] pointer-events-none gap-2">
                {calloutNodes.filter(c => !c.isLeft).map((c) => {
                  const placeRaw = mapPlacesWithCoords.find(p => p.name === c.name) || mapPlacesWithCoords[c.id - 1];
                  const imgUrl = placeRaw?.image_url || getCategoryMatchedImage(c.name, c.type, '');
                  return (
                    <div 
                      key={`callout-right-${c.id}`} 
                      className="bg-[#FAF5E6] border border-emerald-950/40 p-1.5 rounded-lg shadow-md flex items-center gap-2 pointer-events-auto h-[54px] w-full"
                    >
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-slate-100 border border-emerald-950/10 font-sans">
                        <img src={imgUrl} className="h-full w-full object-cover" alt="" />
                        <span className="absolute -top-1 -left-1 bg-[#B45309] text-white rounded-full h-4 w-4 flex items-center justify-center text-[8px] font-black">{c.id}</span>
                      </div>
                      <div className="text-[10px] leading-tight font-sans text-emerald-950 font-bold truncate">
                        <div className="truncate">{c.name}</div>
                        <span className="text-[8px] text-[#B45309] uppercase block tracking-wider truncate">{c.type.split(',')[0]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* SECTION III: DESTINATIONS CATALOG */}
      <div className="space-y-3.5 pt-1 relative z-10">
        <h4 className="atlas-section-title">Section III &bull; Destinations Catalog</h4>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8 pt-2">
          {polaroids.map((p, idx) => (
            <div 
              key={idx}
              className="bg-white border border-slate-200/50 p-3 rounded-md shadow-lg w-40 flex flex-col items-center space-y-2.5 transition duration-300 hover:scale-105"
              style={{ transform: `rotate(${p.rot}deg)` }}
            >
              <div className="h-28 w-34 bg-slate-100 overflow-hidden rounded relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-3.5 bg-yellow-100/50 opacity-80 shadow-sm border border-yellow-250/20" style={{ transform: 'rotate(-2deg)' }} />
                <img 
                  src={p.imageUrl} 
                  alt={p.name} 
                  className="h-full w-full object-cover" 
                />
              </div>
              <span className="text-[10px] font-black tracking-wide text-slate-800 text-center font-serif italic truncate max-w-full">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION IV: DISTANCE & TRANSIT SUMMARY MATRIX */}
      <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 flex gap-3.5 items-start relative z-10">
        <Compass className="h-8 w-8 text-[#B45309] shrink-0 mt-1" />
        <div className="space-y-1 w-full font-sans">
          <h4 className="atlas-section-title">Section IV &bull; Distance & Transit Summary Matrix</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto pr-1 text-[11px] font-semibold text-slate-700">
            {distanceGuides.map((g, idx) => (
              <div key={idx} className="flex justify-between items-center border-b border-emerald-950/5 pb-1">
                <span className="truncate max-w-[150px]">{g.from} &rarr; {g.to}</span>
                <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-950/10 shrink-0 text-[#B45309] font-bold">
                  {g.distance} ({g.time})
                </span>
              </div>
            ))}
            {distanceGuides.length === 0 && (
              <span className="text-[10px] text-slate-400 italic">No distance segments calculated; add attractions to cart.</span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION V: WEATHER OUTLOOK & PACKING INDEX */}
      <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 flex gap-3.5 items-start relative z-10">
        <CloudRain className="h-8 w-8 text-[#B45309] shrink-0 mt-1" />
        <div className="space-y-1 w-full">
          <h4 className="atlas-section-title">Section V &bull; Weather Outlook & Packing Index</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] font-semibold text-slate-800 font-sans">
            <div>
              <span className="block font-bold">🌡️ Target Temperature: {weather.temp}</span>
              <span className="block">🌧️ Precipitation & Climate: {weather.rain}</span>
              <span className="block text-[11px] italic font-normal text-slate-500 mt-1">{weather.condition}</span>
            </div>
            <div className="border-l border-emerald-950/10 pl-4 space-y-1">
              <span className="text-xs font-extrabold text-[#B45309] block uppercase">Recommended Apparel & Gear</span>
              <div className="text-[11px] text-slate-600 flex flex-wrap gap-1">
                {dynamicTips.apparel.slice(0, 3).map((item, idx) => (
                  <span key={idx} className="bg-white px-2 py-0.5 rounded border border-emerald-950/5 font-semibold">🧣 {item.item || item}</span>
                ))}
                {dynamicTips.essentials.slice(0, 3).map((item, idx) => (
                  <span key={idx} className="bg-white px-2 py-0.5 rounded border border-emerald-950/5 font-semibold">🎒 {item.item || item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION VI: TRAVEL NOTES & SAFETY PROTOCOL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* Travel Tips and Cuisine */}
        <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 space-y-2">
          <h4 className="atlas-section-title">Section VI (A) &bull; Regional Cuisine & Guide</h4>
          <div className="space-y-3 font-sans">
            <div className="grid grid-cols-2 gap-2 text-[12px] font-semibold text-slate-700">
              {foodItems.map((item, idx) => (
                <div key={idx} className="flex gap-1.5 items-center">
                  <span>🍛</span>
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-emerald-950/10 pt-2.5">
              {dynamicTips.tips.slice(0, 1).map((t, idx) => (
                <div key={idx} className="text-[12px] leading-relaxed">
                  <span className="font-bold text-emerald-900 block">💡 Expert Tip: {t.title}</span>
                  <span className="text-slate-600 block">{t.content}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connectivity & Safety Notes */}
        <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 space-y-2">
          <h4 className="atlas-section-title">Section VI (B) &bull; Safety Protocols</h4>
          <div className="text-[13px] font-semibold text-slate-800 space-y-2 font-sans">
            <div className="leading-relaxed">
              <span className="font-bold text-red-900 block text-xs">📶 Signal Stability</span>
              <span className="text-slate-600 text-[11px]">{safetyInfo.connectivity}</span>
            </div>
            <div className="leading-relaxed border-t border-emerald-950/10 pt-2">
              <span className="font-bold text-red-900 block text-xs">🚨 Safety Protocols</span>
              <span className="text-slate-600 text-[11px]">{safetyInfo.safety}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Itinerary Summary Scroll */}
      <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 space-y-3 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B45309] block">Atlas Appendix &bull; Daily Itinerary Registry</span>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {daywiseRoute.map((d, idx) => (
            <div key={idx} className="bg-white border border-emerald-950/15 rounded-lg p-3 w-52 shrink-0 space-y-1.5 shadow-sm text-left font-sans">
              <span className="text-[10px] font-extrabold uppercase text-[#B45309] block">Day {d.day}</span>
              <p className="text-[11px] font-semibold text-slate-700 leading-normal line-clamp-3">
                {d.summary}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Retro Footer */}
      <div className="border-t border-emerald-950/20 pt-4 flex justify-between items-center text-[10px] font-bold text-emerald-950/60 uppercase tracking-widest relative z-10 font-sans">
        <span>Cartography division</span>
        <span>© Antigravity Exploration Atlas</span>
        <span>Verified D3 Projections & OSRM</span>
      </div>
    </div>
  );
}

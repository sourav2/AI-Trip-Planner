import React, { useMemo } from 'react';
import { 
  Compass, CloudRain, Sun, Mountain, Trees, MapPin, 
  Briefcase, ShieldAlert, Check, Wallet, Info, Sparkles 
} from 'lucide-react';
import { getCategoryMatchedImage, getDynamicTipsAndPacking } from '../services/blueprintProvider';
import { geographyProvider } from '../services/geographyProvider';
import TravelMap from './TravelMap';

export default function BlueprintV2({
  activeTrip,
  selectedPlaces = [],
  routeInfo = null,
  startDate = '',
  travelStyle = '',
  transportPreference = ''
}) {
  if (!activeTrip) return null;

  const destination = activeTrip.destination || 'Destination';
  const travelers = activeTrip.travelers || 2;
  const duration = activeTrip.total_days || 6;
  const budget = activeTrip.budget || 25000;
  const comfortLevel = activeTrip.comfort_level || 'moderate';

  // Base configurations
  const startLocation = activeTrip.start_location || activeTrip.startLocation || 'Transit Port';
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

  const destKey = useMemo(() => {
    const d = destination.toLowerCase();
    if (d.includes('meghalaya')) return 'meghalaya';
    if (d.includes('sikkim')) return 'sikkim';
    if (d.includes('kerala')) return 'kerala';
    if (d.includes('rajasthan')) return 'rajasthan';
    return '';
  }, [destination]);

  // Resolve dynamic tips and packing list using the service
  const dynamicTips = getDynamicTipsAndPacking(
    destination,
    startDate,
    travelStyle,
    comfortLevel,
    transportPreference,
    selectedPlaces
  );

  // Fallback preset places if selectedPlaces cart is empty
  const activePlaces = selectedPlaces.length > 0 ? selectedPlaces : (activeTrip.nearby_attractions?.slice(0, 5) || [
    { name: "Elephant Falls", type: "Waterfall", summary: "Three-tiered waterfall surrounded by lush trees." },
    { name: "Laitlum Canyons", type: "Viewpoint", summary: "Amphitheater of steep green hills and deep gorges." },
    { name: "Mawsmai Cave", type: "Cave", summary: "Natural limestone formations lit by spotlights." },
    { name: "Dawki River", type: "River", summary: "Famous for crystal clear water and boating." }
  ]);

  // Project coordinates for static SVG map
  const width = 800;
  const height = 460;
  const paddingX = 110;
  const paddingY = 80;

  // Static coordinate projection logic
  const projectCoords = () => {
    let coords = activePlaces.map((p, idx) => {
      let lat = p.lat || p.coords?.[0];
      let lon = p.lon || p.coords?.[1];

      // fallback coordinate offsets if lat/lon are missing
      if (lat === undefined || lon === undefined) {
        lat = 25.5 - (idx * 0.1);
        lon = 91.8 + (idx * 0.12);
      }
      return { name: p.name.split(' (')[0], lat, lon };
    });

    if (coords.length === 0) return [];

    let minLat = Math.min(...coords.map(c => c.lat));
    let maxLat = Math.max(...coords.map(c => c.lat));
    let minLon = Math.min(...coords.map(c => c.lon));
    let maxLon = Math.max(...coords.map(c => c.lon));

    const latSpan = maxLat - minLat || 0.1;
    const lonSpan = maxLon - minLon || 0.1;

    return coords.map((c, idx) => {
      const x = paddingX + ((c.lon - minLon) / lonSpan) * (width - paddingX * 2);
      const y = paddingY + (height - paddingY * 2) - ((c.lat - minLat) / latSpan) * (height - paddingY * 2);
      return {
        id: idx + 1,
        name: c.name,
        x: Math.round(x),
        y: Math.round(y)
      };
    });
  };

  const mapNodes = projectCoords();

  // Generate distance guides
  const generateDistanceGuides = () => {
    const guides = [];
    for (let i = 0; i < mapNodes.length - 1; i++) {
      guides.push({
        from: mapNodes[i].name,
        to: mapNodes[i + 1].name,
        distance: `${Math.round(20 + Math.random() * 45)} km`
      });
    }
    return guides;
  };

  const distanceGuides = generateDistanceGuides();

  // Generate cubic bezier curves for static OSRM routing paths
  const renderBezierPaths = () => {
    const paths = [];
    for (let i = 0; i < mapNodes.length - 1; i++) {
      const p1 = mapNodes[i];
      const p2 = mapNodes[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      // Curved control points for poster aesthetic
      const controlY = midY - 35;
      paths.push(
        <path
          key={`path-${i}`}
          d={`M ${p1.x} ${p1.y} C ${midX} ${controlY}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`}
          fill="none"
          stroke="#B45309"
          strokeWidth="3.5"
          strokeDasharray="8 6"
        />
      );
    }
    return paths;
  };

  // Weather dynamic calculations
  const getWeatherInfo = () => {
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
  };

  const weather = getWeatherInfo();

  // What to Expect Section
  const getWhatToExpect = () => {
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
  };

  // Food recommendations
  const getFoodRecommendations = () => {
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
  };

  const foodItems = getFoodRecommendations();

  // Connectivity & Safety notes
  const getConnectivityAndSafety = () => {
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
  };

  const safetyInfo = getConnectivityAndSafety();

  // Day-wise Itinerary Summaries
  const getDaywiseSummary = () => {
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

      days.push({
        day: d,
        summary: summaryText
      });
    }
    return days;
  };

  const daywiseRoute = getDaywiseSummary();

  // Polaroid Showcase Cards (Top 3 sights)
  const polaroids = activePlaces.slice(0, 3).map((place, idx) => {
    const rot = idx === 0 ? -4 : (idx === 1 ? 2 : -2);
    return {
      name: place.name.split(' (')[0],
      imageUrl: place.image_url || getCategoryMatchedImage(place.name, place.quick_facts?.Type || '', ''),
      rot
    };
  });

  return (
    <div 
      id="travel-blueprint-poster-v2" 
      className="bg-[#FAF7F2] border-[14px] border-double border-emerald-950 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-w-4xl mx-auto text-left relative overflow-hidden text-emerald-950 font-serif"
    >
      <style dangerouslySetInnerHTML={{ __html: `
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

      {/* Graticule gridded map background overlay pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#064e3b_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* 1. HEADER */}
      <div className="border-b-4 border-double border-emerald-950 pb-5 text-center space-y-2.5 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B45309] block">Official Exploration Poster</span>
        <h2 className="text-2xl md:text-3xl font-black tracking-wide text-emerald-950 uppercase">{destination} EXPLO-ATLAS</h2>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-700 pt-1.5 font-sans">
          <span className="bg-emerald-50 px-2 py-0.5 border border-emerald-950/10 rounded">⚓ Start Hub: {startHub}</span>
          <span className="bg-emerald-50 px-2 py-0.5 border border-emerald-950/10 rounded">🧭 Comfort: {comfortLevel}</span>
          <span className="bg-emerald-50 px-2 py-0.5 border border-emerald-950/10 rounded">🗓️ Duration: {duration} Days</span>
          <span className="bg-emerald-50 px-2 py-0.5 border border-emerald-950/10 rounded">👥 Guests: {travelers}</span>
          <span className="bg-emerald-50 px-2 py-0.5 border border-emerald-950/10 rounded">💰 Budget: ₹{budget.toLocaleString()}</span>
        </div>
      </div>

      {/* 2. HERO TRAVEL MAP AREA */}
      <div className="space-y-2.5 relative z-10">
        <h3 className="text-xs font-extrabold uppercase text-[#B45309] tracking-wider font-sans">Explore Route Map Circuit</h3>
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
        </div>
      </div>

      {/* 3 & 4. SIDE PANELS: WEATHER & WHAT TO EXPECT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* Weather Card */}
        <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 flex gap-3.5 items-start">
          <CloudRain className="h-8 w-8 text-[#B45309] shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold uppercase text-[#B45309] tracking-wider font-sans">3. Weather Outlook</h4>
            <div className="text-[13px] font-semibold text-slate-800 space-y-0.5">
              <span className="block font-bold">🌡️ Temp: {weather.temp}</span>
              <span className="block">🌧️ Rain: {weather.rain}</span>
              <span className="block text-[11px] italic font-normal text-slate-500">{weather.condition}</span>
            </div>
          </div>
        </div>

        {/* Expect Card */}
        <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 flex gap-3.5 items-start">
          <Info className="h-8 w-8 text-[#B45309] shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold uppercase text-[#B45309] tracking-wider font-sans">4. What To Expect</h4>
            <p className="text-[13px] font-semibold text-slate-700 leading-relaxed">
              {getWhatToExpect()}
            </p>
          </div>
        </div>
      </div>

      {/* 5 & 10. TIPS & CONNECTIVITY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* Destination-specific Travel Tips */}
        <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 flex gap-3.5 items-start">
          <Briefcase className="h-8 w-8 text-[#B45309] shrink-0 mt-1" />
          <div className="space-y-1 w-full">
            <h4 className="text-xs font-extrabold uppercase text-[#B45309] tracking-wider font-sans">5. Travel Tips</h4>
            <div className="space-y-2">
              {dynamicTips.tips.slice(0, 2).map((t, idx) => (
                <div key={idx} className="text-[13px] leading-relaxed">
                  <span className="font-bold block text-emerald-900">⚡ {t.title}</span>
                  <span className="text-slate-600 block text-[12px]">{t.content}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connectivity & Safety Notes */}
        <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 flex gap-3.5 items-start">
          <ShieldAlert className="h-8 w-8 text-[#B45309] shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold uppercase text-[#B45309] tracking-wider font-sans">10. Connectivity & Safety</h4>
            <div className="text-[13px] font-semibold text-slate-800 space-y-2">
              <div className="leading-relaxed">
                <span className="font-bold text-red-900 block">📶 Signal Stability</span>
                <span className="text-slate-600 text-[12px]">{safetyInfo.connectivity}</span>
              </div>
              <div className="leading-relaxed">
                <span className="font-bold text-red-900 block">🚨 Safety Protocols</span>
                <span className="text-slate-600 text-[12px]">{safetyInfo.safety}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7 & 9. DISTANCE SUMMARY & FOOD RECOMMENDATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* Food Recommendations */}
        <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 flex gap-3.5 items-start">
          <Sparkles className="h-8 w-8 text-[#B45309] shrink-0 mt-1" />
          <div className="space-y-1 w-full">
            <h4 className="text-xs font-extrabold uppercase text-[#B45309] tracking-wider font-sans">9. Cuisine & Diners</h4>
            <div className="grid grid-cols-2 gap-2 text-[12px] font-semibold text-slate-700 pt-1 font-sans">
              {foodItems.map((item, idx) => (
                <div key={idx} className="flex gap-1.5 items-center">
                  <span>🍛</span>
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Distance summary grid */}
        <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 flex gap-3.5 items-start">
          <Compass className="h-8 w-8 text-[#B45309] shrink-0 mt-1" />
          <div className="space-y-1 w-full">
            <h4 className="text-xs font-extrabold uppercase text-[#B45309] tracking-wider font-sans">7. Distance Summary Matrix</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1 text-[11px] font-semibold text-slate-700 font-sans">
              {distanceGuides.map((g, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-emerald-950/5 pb-1">
                  <span className="truncate max-w-[150px]">{g.from} &rarr; {g.to}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-950/10 shrink-0 text-[#B45309] font-bold">{g.distance}</span>
                </div>
              ))}
              {distanceGuides.length === 0 && (
                <span className="text-[10px] text-slate-400 italic">No distances computed; select more places.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. DAY-WISE ROUTE SUMMARY */}
      <div className="border border-emerald-950/20 rounded-xl p-4 bg-[#F4EFEB]/40 space-y-3 relative z-10">
        <h4 className="text-xs font-extrabold uppercase text-[#B45309] tracking-wider font-sans">6. Day-Wise Route Itinerary Summary</h4>
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

      {/* 8. ATTRACTION SHOWCASE CARDS (Polaroids) */}
      <div className="space-y-3.5 pt-1 relative z-10">
        <h4 className="text-xs font-extrabold uppercase text-[#B45309] tracking-wider font-sans">8. Scenic Exploration Showcases</h4>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8 pt-2">
          {polaroids.map((p, idx) => (
            <div 
              key={idx}
              className="bg-white border border-slate-200/50 p-3 rounded-md shadow-lg w-40 flex flex-col items-center space-y-2.5 transition duration-300 hover:scale-105"
              style={{ transform: `rotate(${p.rot}deg)` }}
            >
              <div className="h-28 w-34 bg-slate-100 overflow-hidden rounded relative">
                {/* Polaroid tape ribbon style top overlay */}
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

      {/* Retro Poster stamp signature footer design details */}
      <div className="border-t border-emerald-950/20 pt-4 flex justify-between items-center text-[10px] font-bold text-emerald-950/60 uppercase tracking-widest relative z-10 font-sans">
        <span>Cartography division</span>
        <span>© Antigravity Exploration Atlas</span>
        <span>Verified OSRM lines</span>
      </div>
    </div>
  );
}

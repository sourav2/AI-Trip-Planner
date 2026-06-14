// Provider Abstraction Layer for AI Poster Exploration Blueprint
import { posterBuilder } from './blueprint/posterBuilder';

export const CATEGORY_IMAGES = {
  waterfall: 'https://images.unsplash.com/photo-1432406186267-3473b3398c2a?q=80&w=600&auto=format&fit=crop',
  river: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=600&auto=format&fit=crop',
  lake: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop',
  village: 'https://images.unsplash.com/photo-1508873696983-2df519f0397e?q=80&w=600&auto=format&fit=crop',
  forest: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop',
  national_park: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=600&auto=format&fit=crop',
  mountain: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop',
  bridge: 'https://images.unsplash.com/photo-1522083165195-342750297f46?q=80&w=600&auto=format&fit=crop',
  cave: 'https://images.unsplash.com/photo-1507163879400-419f50e128c9?q=80&w=600&auto=format&fit=crop',
  viewpoint: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop',
  camping: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=600&auto=format&fit=crop',
  trekking: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop',
  general: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop'
};

/**
 * Returns matching Unsplash image URL based on destination type/name keywords.
 */
export function getCategoryMatchedImage(name = '', type = '', description = '') {
  const combined = `${name} ${type} ${description}`.toLowerCase();
  
  if (combined.includes('waterfall') || combined.includes('falls') || combined.includes('fall')) {
    return CATEGORY_IMAGES.waterfall;
  }
  if (combined.includes('lake') || combined.includes('pool') || combined.includes('tarn') || combined.includes('ward lake') || combined.includes('waterfront')) {
    return CATEGORY_IMAGES.lake;
  }
  if (combined.includes('river') || combined.includes('stream') || combined.includes('boating') || combined.includes('umngot') || combined.includes('shnongpdeng')) {
    return CATEGORY_IMAGES.river;
  }
  if (combined.includes('cave') || combined.includes('caves') || combined.includes('cavern') || combined.includes('caving') || combined.includes('mawsmai')) {
    return CATEGORY_IMAGES.cave;
  }
  if (combined.includes('bridge') || combined.includes('root') || combined.includes('living')) {
    return CATEGORY_IMAGES.bridge;
  }
  if (combined.includes('camp') || combined.includes('camping') || combined.includes('tent') || combined.includes('glamping')) {
    return CATEGORY_IMAGES.camping;
  }
  if (combined.includes('trek') || combined.includes('trekking') || combined.includes('hike') || combined.includes('hiking') || combined.includes('trail') || combined.includes('goechala')) {
    return CATEGORY_IMAGES.trekking;
  }
  if (combined.includes('national park') || combined.includes('reserve') || combined.includes('sanctuary') || combined.includes('balpakram')) {
    return CATEGORY_IMAGES.national_park;
  }
  if (combined.includes('viewpoint') || combined.includes('canyon') || combined.includes('valley') || combined.includes('peak') || combined.includes('sunrise') || combined.includes('hill') || combined.includes('scenic') || combined.includes('cliff') || combined.includes('laitlum')) {
    return CATEGORY_IMAGES.viewpoint;
  }
  if (combined.includes('mountain') || combined.includes('snow') || combined.includes('himalaya') || combined.includes('nandi') || combined.includes('ridge') || combined.includes('kufri')) {
    return CATEGORY_IMAGES.mountain;
  }
  if (combined.includes('forest') || combined.includes('wood') || combined.includes('nature') || combined.includes('park') || combined.includes('garden') || combined.includes('tree') || combined.includes('greenery') || combined.includes('mawphlang')) {
    return CATEGORY_IMAGES.forest;
  }

  return CATEGORY_IMAGES.general;
}

/**
 * AI-ready abstraction layer to generate a high-fidelity Travel Exploration Blueprint Poster.
 * Connects with mock data generation for now.
 * 
 * @param {object} tripData - Current state details from activeTrip and selectedPlaces
 * @returns {object} Highly structured poster configuration
 */
export function generateBlueprintPoster(tripData, provider = 'osrm') {
  const destination = tripData.destination || "Destination";
  const startHub = (tripData.start_location || tripData.startLocation || "Guwahati").split(',')[0].trim();
  const duration = parseInt(tripData.total_days || tripData.duration || 4, 10);
  const travelers = parseInt(tripData.travelers || 2, 10);
  const budget = parseFloat(tripData.budget || tripData.budgetInput || 25000);
  const comfortLevel = tripData.comfort_level || tripData.comfortLevel || "moderate";
  
  // Extract stops
  let selectedPlaces = tripData.selectedPlaces || tripData.selected_places || [];
  
  if (selectedPlaces.length === 0 && tripData.regions) {
    const regionPlaceNames = new Set();
    tripData.regions.forEach(r => {
      if (r.places) {
        r.places.forEach(pName => {
          if (pName && typeof pName === 'string') {
            regionPlaceNames.add(pName.toLowerCase().trim());
          }
        });
      }
    });

    const nearby = tripData.nearby_attractions || [];
    const defaultPlaces = [];
    regionPlaceNames.forEach(pName => {
      const match = nearby.find(n => 
        n.name && (
          n.name.toLowerCase().trim() === pName || 
          pName.includes(n.name.toLowerCase().trim()) || 
          n.name.toLowerCase().trim().includes(pName)
        )
      );
      if (match) {
        defaultPlaces.push(match);
      }
    });

    if (defaultPlaces.length > 0) {
      selectedPlaces = defaultPlaces;
    } else if (nearby.length > 0) {
      selectedPlaces = nearby.slice(0, 6);
    }
  }
  
  // Mock data placeholders for base cities recommendations if not defined
  let baseCityName = destination;
  let hotelRecommendation = "Boutique Homestay & Scenic Cottage Stopover";
  let foodRecommendation = "Traditional local cuisines, regional organic platters, and popular marketplace diners.";
  let connectivityNotes = "Mobile data and digital payments are stable in city centers. Carry cash for rural locations and sports.";

  if (destination.toLowerCase().includes("meghalaya")) {
    baseCityName = "Shillong";
    hotelRecommendation = "Boutique Homestay (Shillong) & Scenic Cliffs Cottage (Sohra)";
    foodRecommendation = "Café Shillong platters, traditional Jadoh at Trattoria, and organic dhal-fry.";
    connectivityNotes = "Airtel/Jio coverage is reliable in base hubs. Expect slower UPI/internet near Dawki/caves; carry physical INR.";
  } else if (destination.toLowerCase().includes("kohima") || destination.toLowerCase().includes("nagaland")) {
    baseCityName = "Kohima";
    hotelRecommendation = "Heritage Bungalow in Kohima & Eco-homestay near Kisama Heritage Village";
    foodRecommendation = "Local smoked meats with bamboo shoot, Naga boiled platters, and ginger tea.";
    connectivityNotes = "Airtel/Jio are functional in main towns. Network drops in surrounding valleys; carry cash for entry guides.";
  } else if (destination.toLowerCase().includes("kerala")) {
    baseCityName = "Kochi";
    hotelRecommendation = "Kerala Heritage Houseboat & Backwater Resort Cottage";
    foodRecommendation = "Karimeen Pollichathu, traditional Kerala Sadhya on banana leaf, and fresh coconut water.";
    connectivityNotes = "Wi-Fi is widely available in home resorts. Weak signals on deep backwaters.";
  }

  // Budget calculations
  let baseStay = comfortLevel === 'luxury' ? 3500 : (comfortLevel === 'budget' ? 800 : 1800);
  let baseFood = comfortLevel === 'luxury' ? 1000 : (comfortLevel === 'budget' ? 400 : 600);
  let baseTransport = comfortLevel === 'luxury' ? 800 : (comfortLevel === 'budget' ? 250 : 400);

  const stayCost = baseStay * duration;
  const foodCost = baseFood * duration * travelers;
  
  let activityCost = 0;
  if (selectedPlaces.length > 0) {
    selectedPlaces.forEach(p => {
      activityCost += p.local_cost !== undefined ? p.local_cost : 150;
    });
    activityCost = activityCost * travelers;
  } else {
    activityCost = 150 * 6 * travelers;
  }

  const driveDistance = tripData.routeInfo?.distance || 820;
  const transportCost = (baseTransport * duration * travelers) + (driveDistance * 8);
  const subtotal = stayCost + foodCost + transportCost + activityCost;
  const bufferCost = Math.round(subtotal * 0.03);
  const totalCost = subtotal + bufferCost;

  // Delegate coordinates projection and distance guide generation to posterBuilder
  const selectedProvider = provider || tripData.provider || 'osrm';
  const posterMap = posterBuilder.generateTravelPoster(tripData, selectedProvider);
  const projectedNodes = posterMap.nodes;
  const distanceGuides = posterMap.distanceGuides;

  // Create destination panels details
  const destinationPanels = selectedPlaces.map((place, idx) => {
    let distText = place.distance || "~25 km from Base";
    if (idx === 0) {
      distText = `~15 km from ${baseCityName}`;
    } else {
      const matchDist = distanceGuides.find(dg => dg.to === place.name.split(' (')[0]);
      if (matchDist) distText = `~${matchDist.distance} from ${matchDist.from}`;
    }

    return {
      id: idx + 1,
      name: place.name,
      distance: distText,
      tip: place.tips || `Visit early in the morning to avoid local tourist crowds. Bring proper footwear.`,
      activitySummary: place.nearby_activities ? place.nearby_activities.join(', ') : (place.activities ? place.activities.join(', ') : "Scenic walking, photography, local exploration"),
      imageUrl: place.image_url || getCategoryMatchedImage(place.name, place.quick_facts?.Type || '', place.description || '')
    };
  });

  // Day-wise itinerary
  const daywiseItinerary = [];
  const step = Math.max(1, Math.ceil(selectedPlaces.length / duration));
  
  for (let d = 1; d <= duration; d++) {
    const startIndex = (d - 1) * step;
    const dayStops = selectedPlaces.slice(startIndex, startIndex + step);
    
    let title = "Exploration & Regional Discovery";
    let activities = ["Leisurely breakfast at homestay", "Scenic local road trip route drive", "Local handicraft shopping", "Overnight stay"];
    let travelNotes = "Road conditions are winding. Keep motion sickness kits ready.";
    let overnightStay = `${baseCityName} homestay`;

    if (d === 1) {
      title = `Arrival & Base City check-in`;
      activities = [`Arrival at transit airport/station`, `Drive to ${baseCityName} base hub`, `Explore central markets & local foods`].concat(dayStops.map(p => `Visit ${p.name.split(' (')[0]}`));
      travelNotes = `Verify taxi pricing at pre-paid counters.`;
    } else if (d === duration) {
      title = `Departure Transit`;
      activities = [`Morning souvenir shopping`, `Scenic drive back to airport`, `Check-in for onward journey`];
      travelNotes = `Leave early to accommodate unexpected mountain traffic delays.`;
    } else if (dayStops.length > 0) {
      title = `${dayStops.map(p => p.name.split(' (')[0]).join(' & ')} Explorer Day`;
      activities = dayStops.map(p => `Venture into ${p.name.split(' (')[0]}: ${p.summary || 'exploring sights'}`);
      activities.push("Lunch at local organic dhabas");
      activities.push("Sunset photography session");
      travelNotes = `Wear sturdy rubber-soled shoes for wet trails.`;
      overnightStay = dayStops[0].name.toLowerCase().includes("sohra") || dayStops[0].name.toLowerCase().includes("cherrapunji") ? "Sohra cottage resort" : `${baseCityName} Homestay`;
    }

    daywiseItinerary.push({
      day: d,
      title,
      activities,
      travelNotes,
      overnightStay
    });
  }

  // Travel Tips Compilation
  const dynamicTipsData = getDynamicTipsAndPacking(
    destination,
    tripData.startDate || '',
    tripData.travelStyle || '',
    comfortLevel,
    tripData.transportPreference || '',
    selectedPlaces
  );

  const travelTips = {
    weather: dynamicTipsData.weather,
    packing: dynamicTipsData.packing,
    safety: dynamicTipsData.safety,
    transport: tripData.transportPreference === 'Road Trip' ?
      "Pre-hire local cab drivers who are experienced with mountain terrains rather than driving rented self-drives in fog." :
      "Public transport runs on set timings; check schedules at regional hubs.",
    local: "Support the local community by hiring village guides. Always take permission before photographing locals."
  };

  return {
    header: {
      destination: destination,
      title: `${destination.toUpperCase()} EXPLORATION MAP`,
      subtitle: selectedProvider === 'osrm' ? "All Places We Discussed" : `AI Optimized Route (${selectedProvider.toUpperCase()})`,
      duration: `${duration} Days`,
      travelers: `${travelers} Travelers`,
      budget: `₹${totalCost.toLocaleString()}`,
      startHub: startHub
    },
    baseCity: {
      name: baseCityName,
      stayRecommendations: hotelRecommendation,
      foodRecommendations: foodRecommendation,
      connectivityNotes: connectivityNotes
    },
    mapCanvas: {
      nodes: projectedNodes,
      distanceGuides,
      polaroids: posterMap.polaroids || [],
      theme: posterMap.theme
    },
    destinationPanels,
    daywiseItinerary,
    budgetBreakdown: {
      transport: Math.round(transportCost),
      stay: Math.round(stayCost),
      food: Math.round(foodCost),
      activities: Math.round(activityCost),
      buffer: Math.round(bufferCost),
      total: Math.round(totalCost)
    },
    travelTips
  };
}


/**
 * Projects dynamic coordinates on an 800x500 2D SVG space.
 */
function projectNodesToCanvas(nodes) {
  if (nodes.length === 0) return [];
  
  // Find min/max coordinate spans
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  
  nodes.forEach(n => {
    const [lat, lon] = n.coords;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  });
  
  const latSpan = maxLat - minLat;
  const lonSpan = maxLon - minLon;
  
  const width = 800;
  const height = 500;
  
  const paddingX = 100;
  const paddingY = 80;
  
  const drawW = width - paddingX * 2;
  const drawH = height - paddingY * 2;
  
  return nodes.map(n => {
    const [lat, lon] = n.coords;
    
    // Project geographically: west on left, east on right, north on top
    const x = lonSpan === 0 ? width / 2 : paddingX + ((lon - minLon) / lonSpan) * drawW;
    const y = latSpan === 0 ? height / 2 : paddingY + drawH - ((lat - minLat) / latSpan) * drawH; // flip Y coordinate
    
    return {
      ...n,
      x: Math.round(x),
      y: Math.round(y)
    };
  });
}

export function getDynamicTipsAndPacking(destination = '', startDate = '', travelStyle = '', comfortLevel = '', transportPreference = '', selectedPlaces = []) {
  const dest = destination.toLowerCase();
  
  // Determine Season from startDate
  let month = 6; // default July (Monsoon)
  if (startDate && typeof startDate === 'string') {
    const parts = startDate.split('-');
    if (parts.length >= 2) {
      const parsedMonth = parseInt(parts[1], 10);
      if (!isNaN(parsedMonth)) {
        month = parsedMonth - 1; // 0-indexed
      }
    }
  }
  
  let season = 'monsoon';
  if (month === 11 || month === 0 || month === 1) {
    season = 'winter';
  } else if (month >= 2 && month <= 4) {
    season = 'summer';
  } else if (month >= 5 && month <= 8) {
    season = 'monsoon';
  } else {
    season = 'autumn'; // post-monsoon
  }

  let weather = "";
  let safety = "";
  let tips = [];
  let apparel = [];
  let essentials = [];

  const isMeghalaya = dest.includes('meghalaya') || dest.includes('shillong') || dest.includes('cherrapunji');
  const isKerala = dest.includes('kerala') || dest.includes('kochi') || dest.includes('munnar') || dest.includes('alleppey');
  const isRajasthan = dest.includes('rajasthan') || dest.includes('jaipur') || dest.includes('jaisalmer') || dest.includes('udaipur');
  const isSikkim = dest.includes('sikkim') || dest.includes('gangtok') || dest.includes('lachen') || dest.includes('lachung');

  if (isMeghalaya) {
    if (season === 'monsoon') {
      weather = "Heavy monsoon rain peaks (June-Sept). Gorges, valleys, and waterfalls are extremely active with dense fog.";
      safety = "High risk of slippery rock surfaces at root bridges and flash floods near waterfall pools. Drive slow in fog.";
      tips = [
        { title: "Severe Monsoon Watch", content: "Landslide warnings near Cherrapunji gorges. Trekking trails may close without notice. Drive slow in fog.", type: "warning" },
        { title: "Water Safety Alert", content: "Avoid swimming in rapids or climbing onto wet mossy rocks near Krang Suri or Wei Sawdong waterfalls.", type: "warning" },
        { title: "Cash requirement in Dawki", content: "UPI and mobile networks are extremely slow near border locations. Carry sufficient cash for boating & local meals.", type: "warning" },
        { title: "Respect Khasi Customs", content: "Sacred groves like Mawphlang do not allow taking anything outside (leaves, pebbles). Hire a local Khasi guide.", type: "info" }
      ];
      apparel = [
        { item: "Lightweight quick-dry hiking pants", checked: true },
        { item: "Waterproof windcheater / rain poncho", checked: true },
        { item: "Extra pairs of breathable socks", checked: true },
        { item: "Sturdy rubber-soled trekking shoes with grip", checked: true },
        { item: "Quick-dry synthetic tees (5 count)", checked: false }
      ];
      essentials = [
        { item: "DEET high-strength mosquito repellent", checked: true },
        { item: "Waterproof dry bag / device pouch", checked: true },
        { item: "Salt or spray for forest leeches", checked: true },
        { item: "Compact quick-dry micro-fiber towel", checked: false },
        { item: "Sufficient physical cash (INR)", checked: true }
      ];
    } else if (season === 'winter') {
      weather = "Cool, dry, and clear winter weather (Dec-Feb). Temperatures drop to 8°C. Best time for caving and river activities.";
      safety = "Chilly nights require heavy layering. Safe road transits with clear blue skies, no rain warnings.";
      tips = [
        { title: "Winter Temperature Drops", content: "Nights get very cold in Shillong and Sohra (8°C). Ensure your homestay has room heaters or thick blankets.", type: "info" },
        { title: "Perfect Caving & Trekking", content: "Dry riverbeds make it the safest season to explore Krem Liat Prah or Mawsmai caves and the David Scott trail.", type: "success" },
        { title: "Dawki Crystal River Boating", content: "Umngot River at Dawki achieves maximum crystal transparency during winter. Plan boating between 10 AM and 2 PM.", type: "success" },
        { title: "Warm Layers for Sightseeing", content: "Carry a fleece jacket for daytime sightseeing as high altitude winds in Sohra can be biting.", type: "info" }
      ];
      apparel = [
        { item: "Fleece jacket or light down jacket", checked: true },
        { item: "Thermal innerwear tops & bottoms", checked: true },
        { item: "Sturdy walking shoes", checked: true },
        { item: "Woolen cap & gloves for cold evenings", checked: false },
        { item: "Comfortable cargo trousers", checked: false }
      ];
      essentials = [
        { item: "Cold cream & moisturizing lip balm", checked: true },
        { item: "Flashlight / headlamp for cave tours", checked: true },
        { item: "Thermos flask for warm water", checked: false },
        { item: "UPI works in Shillong, carry cash for Dawki", checked: true },
        { item: "Hydration tablets", checked: false }
      ];
    } else {
      weather = "Mild pleasant spring and summer (March-May / Oct-Nov). Warm sun and cool breeze.";
      safety = "Moderate sun exposure. Safe trekking conditions on double-decker root bridges.";
      tips = [
        { title: "Cherry Blossom Season (Nov)", content: "If visiting in November, plan around the Shillong Cherry Blossom Festival. Pre-book stays months in advance.", type: "success" },
        { title: "Double Decker Trek Prep", content: "Trekking down 3,500 steps to Nongriat requires excellent stamina. Start early at 6 AM to beat the daytime heat.", type: "info" },
        { title: "Sun Protection in Open Valleys", content: "Laitlum Canyons are fully exposed. Wear hats, sunglasses, and high SPF sunscreens to prevent sun burn.", type: "info" },
        { title: "Local Khasi Homestays", content: "Opt for local homestays to experience authentic Khasi hospitality and organic farm-to-table dinners.", type: "info" }
      ];
      apparel = [
        { item: "Breathable cotton t-shirts", checked: true },
        { item: "Light jacket / windbreaker for evenings", checked: true },
        { item: "Comfortable trekking sneakers", checked: true },
        { item: "Sun hat & polarized sunglasses", checked: true },
        { item: "Shorts or light cargo trousers", checked: false }
      ];
      essentials = [
        { item: "Sunscreen lotion (SPF 50+)", checked: true },
        { item: "Insect repellent spray", checked: true },
        { item: "Reusable water bottle", checked: true },
        { item: "Basic first-aid kit", checked: false },
        { item: "Physical cash for entry fees", checked: true }
      ];
    }
  } else if (isKerala) {
    if (season === 'monsoon') {
      weather = "Heavy tropical monsoon (June-Sept). Lush green valleys in Munnar, overflowing rivers.";
      safety = "Avoid high-depth swimming. Backwater boating may face safety restrictions during storm winds.";
      tips = [
        { title: "Monsoon Houseboat Alerts", content: "Expect sudden downpours. Backwater cruises may be halted during high winds. Pre-book houseboats with AC backup.", type: "warning" },
        { title: "Leech Warnings in Tea Estates", content: "Leeches are common in Munnar tea plantation trails during rain. Wear leech socks or carry salt packets.", type: "warning" },
        { title: "Ayurvedic Treatment Season", content: "Monsoon is traditionally considered the best season for authentic Ayurvedic rejuvenation therapies in Kerala.", type: "success" },
        { title: "Umbrella & Rain Gear", content: "Always carry a heavy-duty umbrella. Streets in Alleppey can experience water logging.", type: "info" }
      ];
      apparel = [
        { item: "Quick-dry synthetic apparel", checked: true },
        { item: "Waterproof sandals or strap-on floaters", checked: true },
        { item: "Light raincoat or poncho", checked: true },
        { item: "Linen shirts for humid intervals", checked: false },
        { item: "Temple clothing (dhoti/mundu for men)", checked: true }
      ];
      essentials = [
        { item: "High-strength mosquito repellent", checked: true },
        { item: "Waterproof dry bag for boat transits", checked: true },
        { item: "Salt packets for tea estate treks", checked: false },
        { item: "ORS rehydration salts", checked: true },
        { item: "Sunscreen lotion (SPF 30+)", checked: false }
      ];
    } else {
      weather = "Warm, pleasant tropical climate. Gentle coastal breeze, ideal for beach and backwater cruise.";
      safety = "High sun exposure. Keep hydrated. Always wear life jackets during boating.";
      tips = [
        { title: "Houseboat Pre-booking", content: "Winter (Dec-Feb) is peak season. Houseboat prices can double. Pre-book from verified operators.", type: "info" },
        { title: "Strict Temple Dress Codes", content: "Traditional temples (like Padmanabhaswamy) require men in mundu/dhoti (bare chest) and women in sarees/salwars.", type: "warning" },
        { title: "Periyar Wildlife Reserve Safari", content: "Book wildlife boat safaris online in advance via Kerala Forest site. Earthy colored clothing is recommended.", type: "info" },
        { title: "Sun Hydration in Alleppey", content: "Coastal humidity can be draining. Drink fresh coconut water (elaneer) and carry water bottles.", type: "success" }
      ];
      apparel = [
        { item: "Lightweight loose cotton clothing", checked: true },
        { item: "Sun hat & UV sunglasses", checked: true },
        { item: "Comfortable leather sandals / slip-ons", checked: true },
        { item: "Modest shawl / scarf for temples", checked: true },
        { item: "Swimwear for beach destinations", checked: false }
      ];
      essentials = [
        { item: "Sunscreen lotion (SPF 50+)", checked: true },
        { item: "Mosquito repellent creams", checked: true },
        { item: "Waterproof dry bag for camera gear", checked: false },
        { item: "Electrolyte ORS packets", checked: true },
        { item: "Hand sanitizer & wet wipes", checked: false }
      ];
    }
  } else if (isRajasthan) {
    if (season === 'summer') {
      weather = "Scorching dry summer heat (April-June) with temperatures exceeding 42°C in open sands.";
      safety = "Extremely high risk of heat strokes. Avoid walking in open fort complexes between 12 PM and 3 PM.";
      tips = [
        { title: "Extreme Heat Warning", content: "Daytime temperatures exceed 40°C. Stay indoors during noon; schedule sights for early mornings (8 AM) and sunsets.", type: "warning" },
        { title: "Fort Walking Stamina", content: "Major forts (Amer, Mehrangarh) require uphill walking on stone paths. Wear comfortable socks as shoes must be removed at shrines.", type: "info" },
        { title: "Dehydration & Local Drinks", content: "Drink local buttermilk (chaas), lemon water (shikanji), and carry electrolyte powders. Avoid heavy greasy meals.", type: "warning" },
        { title: "Avoid Desert Safaris at Noon", content: "Desert sand dunes in Jaisalmer are burning hot during the day. Rest in AC tents and venture out only after 5 PM.", type: "warning" }
      ];
      apparel = [
        { item: "Loose, full-sleeve linen/cotton shirts", checked: true },
        { item: "Wide-brimmed sun hat", checked: true },
        { item: "Polarized UV protection sunglasses", checked: true },
        { item: "Breathable open-toe sandals", checked: true },
        { item: "Light colored cotton trousers", checked: false }
      ];
      essentials = [
        { item: "High protection sunscreen (SPF 50+)", checked: true },
        { item: "ORS rehydration salts & glucose powder", checked: true },
        { item: "Soothing aloe vera gel & lip balm", checked: false },
        { item: "Scarf/Bandana to cover face from dust", checked: true },
        { item: "Wet wipes & cooling face mist", checked: false }
      ];
    } else {
      weather = "Pleasant sunny days (22°C) with cold desert nights (dropping to 5°C in Jaisalmer).";
      safety = "Carry warm jackets for desert camp overnight stays. Sunburn protection is still needed during midday.";
      tips = [
        { title: "Chilly Desert Nights", content: "Desert camp nights get freezing cold (5-8°C). Ensure your camp provides heavy blankets or carry thermal wear.", type: "info" },
        { title: "Licensed Guides at Forts", content: "Always hire guides with official Tourism Dept ID cards. Pre-negotiate guide rates before starting the tour.", type: "info" },
        { title: "Cultural Event Bookings", content: "Enjoy dune sunset camel safaris, Rajasthani folk dances (Kalbeliya), and traditional thali dinners in Jaisalmer.", type: "success" },
        { title: "Shopping Bargaining Rules", content: "Bargain politely at local bazaars (Bapu Bazaar, Johri Bazaar). Prices are often marked up by 50% for tourists.", type: "info" }
      ];
      apparel = [
        { item: "Light cotton tees for warm days", checked: true },
        { item: "Heavy jacket / woolen sweater for nights", checked: true },
        { item: "Sturdy walking shoes / sneakers", checked: true },
        { item: "Warm scarf or pashmina shawl", checked: true },
        { item: "Thermal innerwear (if staying in desert camps)", checked: false }
      ];
      essentials = [
        { item: "Sunscreen lotion & moisturizer", checked: true },
        { item: "Cold cream & petroleum jelly for dry skin", checked: true },
        { item: "Hand sanitizer & face masks (city dust)", checked: false },
        { item: "Digital payments work, carry cash for camel rides", checked: true },
        { item: "Basic digestive medicines (Pudin Hara)", checked: false }
      ];
    }
  } else if (isSikkim) {
    if (season === 'winter') {
      weather = "Sub-zero alpine winter (Dec-Feb). Freezing winds, heavy snow blocking high passes (14,000 ft).";
      safety = "High risk of altitude sickness. Roads to Lachen/Nathula are highly slippery due to black ice.";
      tips = [
        { title: "Severe Altitude Sickness Risk", content: "Gurudongmar Lake is at 17,800 ft. Spend a night acclimatizing in Lachen. Carry portable oxygen cylinders.", type: "warning" },
        { title: "Pass Permits Required", content: "Inner Line Permits (ILP) are mandatory for Nathula Pass, Tsomgo Lake, and North Sikkim. Carry 4 copies of ID & photos.", type: "warning" },
        { title: "Black Ice Road Hazards", content: "Mountain curves freeze after 4 PM. Drive only with experienced 4WD drivers. Keep buffer days for snow blockages.", type: "warning" },
        { title: "Plastic Ban Enforcement", content: "Packaged plastic water bottles are strictly banned in North Sikkim. Carry thermal flasks; heavy fines are active.", type: "warning" }
      ];
      apparel = [
        { item: "Heavy down feather winter jacket", checked: true },
        { item: "Thermal inner wear tops & bottoms", checked: true },
        { item: "Woolen gloves, socks, and beanie cap", checked: true },
        { item: "Waterproof hiking shoes with grip", checked: true },
        { item: "Fleece trackpants or cargo trousers", checked: false }
      ];
      essentials = [
        { item: "Altitude sickness pills (Acetazolamide/Diamox)", checked: true },
        { item: "Thermal water flask (keeps hot for 12 hours)", checked: true },
        { item: "Cold cream, body butter, lip balm", checked: false },
        { item: "Photocopies of passport / Aadhaar and passport photos", checked: true },
        { item: "High energy snacks (chocolates, dry fruits)", checked: false }
      ];
    } else {
      weather = "Cool pleasant mountain spring/summer. Blooming rhododendrons, clear views of Kanchenjunga.";
      safety = "Occasional showers. Wear layerable clothing. Keep altitude sickness precautions active.";
      tips = [
        { title: "Valley of Flowers (Lachung)", content: "Yumthang Valley is in full bloom during April-May. Visit early to see colorful rhododendron fields.", type: "success" },
        { title: "Acclimatization is Key", content: "Even in summer, ascending to 14,000 ft can trigger altitude headache. Drink water and avoid fast running.", type: "info" },
        { title: "Permit Requirements Still Active", content: "You still need army permits for protected regions in summer. Organize documents via your local agent a day prior.", type: "warning" },
        { title: "Layered Clothing Needed", content: "Weather changes rapidly in mountains. High altitude sites can get cold even if Gangtok is pleasant.", type: "info" }
      ];
      apparel = [
        { item: "Light fleece jacket or windbreaker", checked: true },
        { item: "Breathable cotton/synthetic tees", checked: true },
        { item: "Comfortable trekking sneakers", checked: true },
        { item: "Woolen cap & light gloves (for high lakes)", checked: false },
        { item: "Trekking pants / athletic trousers", checked: false }
      ];
      essentials = [
        { item: "Altitude care medicines", checked: true },
        { item: "Reusable water bottle / thermal flask", checked: true },
        { item: "Sunscreen lotion (high SPF)", checked: true },
        { item: "Copies of permit documents & photos", checked: true },
        { item: "Wet wipes & sanitizer", checked: false }
      ];
    }
  } else {
    if (season === 'monsoon') {
      weather = "Humid monsoon showers. Moderate rain with local mist. High humidity levels.";
      safety = "Slippery roads and muddy trekking trails. Be cautious near waterfalls.";
      tips = [
        { title: "Severe Monsoon Watch", content: "Rain showers expected. Trails may be muddy. Drive slow in fog and keep headlamps active.", type: "warning" },
        { title: "Cash requirement near remote areas", content: "UPI and mobile networks can be slow. Carry sufficient cash for local transits & food.", type: "warning" }
      ];
      apparel = [
        { item: "Quick dry shirts and shorts", checked: true },
        { item: "Waterproof windcheater / rain slicker", checked: true },
        { item: "Sturdy hiking boots", checked: true },
        { item: "Extra change of socks", checked: false }
      ];
      essentials = [
        { item: "High strength mosquito repellent", checked: true },
        { item: "Waterproof drybag for devices", checked: true },
        { item: "First aid kits & cash", checked: true }
      ];
    } else {
      weather = "Pleasant mild weather conditions. Clear skies and dry weather, perfect for touring.";
      safety = "Standard travel safety. Shield from midday sun and carry hydration.";
      tips = [
        { title: "Acclimatize to local terrains", content: "Plan your day sights with ample rest buffers to avoid transit fatigue.", type: "info" },
        { title: "Carry physical cash", content: "Digital payments might have network delays in rural spots.", type: "info" }
      ];
      apparel = [
        { item: "Breathable cotton shirts", checked: true },
        { item: "Comfortable walking shoes", checked: true },
        { item: "Sunglasses & cap", checked: true }
      ];
      essentials = [
        { item: "Sufficient cash & ID cards", checked: true },
        { item: "Sunscreen cream & lip balm", checked: true },
        { item: "Reusable water bottle", checked: false }
      ];
    }
  }

  // Dynamic overrides based on Travel Style
  if (travelStyle === 'Adventure' || travelStyle === 'Trekking') {
    if (!apparel.some(a => a.item.toLowerCase().includes('trekking shoes') || a.item.toLowerCase().includes('hiking boots'))) {
      apparel.unshift({ item: "Sturdy trekking boots with ankle support", checked: true });
    }
    if (!essentials.some(e => e.item.toLowerCase().includes('backpack'))) {
      essentials.push({ item: "Ergonomic 40L backpack with rain cover", checked: true });
    }
  } else if (travelStyle === 'Relaxed') {
    apparel.push({ item: "Comfortable lounge wear / slip-ons", checked: false });
  }

  // Dynamic overrides based on Selected Attractions
  const hasWaterfalls = selectedPlaces.some(p => p.name?.toLowerCase().includes('waterfall') || p.name?.toLowerCase().includes('falls') || p.name?.toLowerCase().includes('pool'));
  if (hasWaterfalls) {
    if (!essentials.some(e => e.item.toLowerCase().includes('waterproof dry bag'))) {
      essentials.push({ item: "Waterproof drybag for camera & phone", checked: true });
    }
    if (!apparel.some(a => a.item.toLowerCase().includes('change of clothes'))) {
      apparel.push({ item: "Extra change of dry clothes for waterfall dips", checked: false });
    }
  }

  const hasCaves = selectedPlaces.some(p => p.name?.toLowerCase().includes('cave') || p.name?.toLowerCase().includes('caves') || p.name?.toLowerCase().includes('krem'));
  if (hasCaves) {
    if (!essentials.some(e => e.item.toLowerCase().includes('flashlight') || e.item.toLowerCase().includes('headlamp'))) {
      essentials.push({ item: "High-intensity headlamp / flashlight for caves", checked: true });
    }
  }

  return {
    weather,
    packing: `${apparel.length + essentials.length} items compiled for ${travelStyle || 'general'} trip style & local weather.`,
    safety,
    tips,
    apparel,
    essentials
  };
}


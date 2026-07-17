import os
import json
import urllib.request
import urllib.parse
import ssl
import math
import asyncio
from app.utils.logger import get_logger
from app.services.image_service import fetch_travel_image

logger = get_logger("app.services.attractions")

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

PARENT_LOCATION_CACHE = {}
NOMINATIM_BLOCKED = False

async def get_parent_location_details(lat: float, lon: float) -> tuple[str, str]:
    # 1. Local Bounding Box & preset check for India to bypass Nominatim network calls
    if 8.0 <= lat <= 37.6 and 68.7 <= lon <= 97.2:
        state_presets = {
            "Meghalaya": (25.5379432, 91.2999102),
            "Kerala": (10.8505, 76.2711),
            "Rajasthan": (26.9124, 75.7873),
            "Goa": (15.2993, 74.1240),
            "Himachal Pradesh": (31.1048, 77.1734),
            "Nagaland": (26.1584, 94.5624),
            "Sikkim": (27.5330, 88.5122),
            "Delhi": (28.6139, 77.2090),
            "West Bengal": (22.5726, 88.3639),
            "Karnataka": (12.9716, 77.5946),
            "Maharashtra": (19.0760, 72.8777),
        }
        closest_state = ""
        min_dist = 200.0 # max 200km range
        for state, coords in state_presets.items():
            dist = calculate_haversine_distance(lat, lon, coords[0], coords[1])
            if dist < min_dist:
                min_dist = dist
                closest_state = state
        if closest_state:
            logger.info(f"Resolved parent state '{closest_state}' locally via presets for ({lat}, {lon})")
            return "", closest_state

    cache_key = (round(lat, 3), round(lon, 3))
    if cache_key in PARENT_LOCATION_CACHE:
        return PARENT_LOCATION_CACHE[cache_key]
        
    global NOMINATIM_BLOCKED
    if NOMINATIM_BLOCKED:
        return "", ""
        
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&accept-language=en"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "AntigravityTravelPlanner/1.0 (contact: support@antigravity.travel)"}
        )
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        def run_sync():
            with urllib.request.urlopen(req, context=ctx, timeout=3) as response:
                return json.loads(response.read().decode())
                
        data = await asyncio.get_event_loop().run_in_executor(None, run_sync)
        if data and "address" in data:
            addr = data["address"]
            state = addr.get("state") or addr.get("state_district") or ""
            district = addr.get("county") or addr.get("district") or addr.get("city") or addr.get("state_district") or ""
            res = (district, state)
            PARENT_LOCATION_CACHE[cache_key] = res
            return res
    except Exception as e:
        logger.error(f"Failed to reverse-geocode parent details for ({lat}, {lon}): {e}")
        status_code = getattr(e, "code", None)
        if status_code in (401, 403, 429):
            NOMINATIM_BLOCKED = True
            logger.warning(f"OSM Nominatim reverse geocoding blocked with HTTP {status_code}. Enabling circuit breaker to bypass online parent details lookup.")
        PARENT_LOCATION_CACHE[cache_key] = ("", "")
    return "", ""

async def discover_nearby_attractions(dest: str, lat: float = None, lon: float = None, place_types: list[str] = None) -> list[dict]:
    """
    Discovers real-world attractions, landmarks, and food spots around a destination.
    Uses Google Places API if GOOGLE_MAPS_API_KEY is present; otherwise queries OSM Nominatim
    concurrently based on user's selected interests (place_types).
    """
    logger.info(f"Discovering attractions around '{dest}' (lat={lat}, lon={lon}, place_types={place_types})")

    # If coordinates are missing, geocode destination
    if lat is None or lon is None:
        from app.services.geocoding_service import geocode_location
        coords_res = geocode_location(dest)
        if not coords_res:
            logger.warning(f"Geocoding failed for destination '{dest}' during discovery. Returning empty attractions.")
            return []
        lat, lon = coords_res

    # Resolve district and state from geocode coordinates
    try:
        district_dest, state_dest = await get_parent_location_details(lat, lon)
    except Exception:
        district_dest, state_dest = "", ""

    # Extra keyword matching for common states/destinations if parent details are blank
    if not state_dest:
        dest_low = dest.lower()
        if "meghalaya" in dest_low or "shillong" in dest_low or "cherrapunji" in dest_low or "sohra" in dest_low:
            state_dest = "Meghalaya"
        elif "kerala" in dest_low or "kochi" in dest_low or "munnar" in dest_low or "alleppey" in dest_low:
            state_dest = "Kerala"
        elif "rajasthan" in dest_low or "jaipur" in dest_low or "udaipur" in dest_low or "jodhpur" in dest_low:
            state_dest = "Rajasthan"
        elif "himachal" in dest_low or "shimla" in dest_low or "manali" in dest_low:
            state_dest = "Himachal Pradesh"
        elif "goa" in dest_low:
            state_dest = "Goa"
        elif "nagaland" in dest_low or "kohima" in dest_low or "dimapur" in dest_low:
            state_dest = "Nagaland"

    logger.info(f"Resolved destination details: district='{district_dest}', state='{state_dest}'")

    raw_places = []
    google_key = os.getenv("GOOGLE_MAPS_API_KEY")

    vibe_queries = {
        "mountains": ["viewpoint", "mountain", "valley", "trekking", "hill station"],
        "beaches": ["beach", "seafront", "coast", "water sports", "sand"],
        "forests": ["forest", "waterfall", "nature reserve", "national park", "wildlife sanctuary"],
        "shopping": ["market", "bazaar", "shopping street", "mall"],
        "nightlife": ["pub", "bar", "night club", "cafe", "lounge"],
        "adventure": ["adventure camp", "trekking point", "hiking trail", "rafting", "climbing"],
        "spiritual": ["temple", "shrine", "monastery", "church", "cathedral", "mosque"]
    }

    if google_key:
        try:
            logger.info("Using Google Places API for attraction discovery")
            # Build search queries based on vibes
            search_queries = []
            if place_types:
                for pt in place_types:
                    pt_clean = pt.lower().strip()
                    if pt_clean in vibe_queries:
                        search_queries.extend([f"{q} in {dest}" for q in vibe_queries[pt_clean][:2]])
            if not search_queries:
                search_queries = [f"top attractions in {dest}"]
            
            search_queries = list(dict.fromkeys(search_queries))[:3]
            
            # Suffix with state if resolved
            if state_dest:
                search_queries = [f"{q}, {state_dest}" for q in search_queries]
            
            for query in search_queries:
                url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={urllib.parse.quote(query)}&location={lat},{lon}&radius=30000&key={google_key}"
                req = urllib.request.Request(url)
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                
                with urllib.request.urlopen(req, context=ctx, timeout=4) as response:
                    data = json.loads(response.read().decode())
                    if data and data.get("results"):
                        for item in data["results"][:4]:
                            name = item.get("name")
                            formatted_address = item.get("formatted_address", "")
                            
                            # Validate state for Google Places results if state_dest is known
                            if state_dest and state_dest.lower() not in formatted_address.lower():
                                logger.warning(f"Discarding Google place '{name}' outside of state '{state_dest}' (formatted_address: '{formatted_address}')")
                                continue

                            geom = item.get("geometry", {}).get("location", {})
                            photo_ref = None
                            if item.get("photos"):
                                photo_ref = item["photos"][0].get("photo_reference")
                            
                            img_url = None
                            if photo_ref:
                                img_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference={photo_ref}&key={google_key}"
                            
                            types = item.get("types", ["attraction"])

                            GOOD_TYPES = {
                                "tourist_attraction",
                                "museum",
                                "art_gallery",
                                "park",
                                "zoo",
                                "campground",
                                "hindu_temple",
                                "mosque",
                                "church",
                                "synagogue",
                                "place_of_worship",
                                "natural_feature",
                                "amusement_park"
                            }

                            # Keep only tourist-related Google Places
                            if not any(t in GOOD_TYPES for t in types):
                                continue

                            att_type = types[0].replace("_", " ").title() if types else "Attraction"

                            raw_places.append({
                                "name": name,
                                "lat": float(geom.get("lat", lat)),
                                "lon": float(geom.get("lng", lon)),
                                "type": att_type,
                                "rating": item.get("rating", 4.5),
                                "image_url": img_url,
                                "formatted_address": formatted_address
                            })
        except Exception as e:
            logger.error(f"Google Places API fetch failed: {e}")

    # Fallback: Query OSM Nominatim (free, keyless)
    if not raw_places and not NOMINATIM_BLOCKED:
        logger.info("Using OSM Nominatim API for attraction discovery")
        search_queries = []
        if place_types:
            for pt in place_types:
                pt_clean = pt.lower().strip()
                if pt_clean in vibe_queries:
                    search_queries.extend([f"{q} in {dest}" for q in vibe_queries[pt_clean][:2]])
        
        if not search_queries:
            search_queries = [f"attractions in {dest}", f"tourism in {dest}"]
        
        search_queries = list(dict.fromkeys(search_queries))[:4]
        
        # Suffix with state if resolved
        if state_dest:
            search_queries = [f"{q}, {state_dest}" for q in search_queries]
        
        async def fetch_nominatim_query(q_str: str) -> list:
            try:
                url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(q_str)}&format=json&limit=5&addressdetails=1"
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
                )
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                
                def run_sync():
                    with urllib.request.urlopen(req, context=ctx, timeout=4) as response:
                        return json.loads(response.read().decode())
                
                data = await asyncio.get_event_loop().run_in_executor(None, run_sync)
                
                results = []
                if data:
                    for item in data:
                        name = item["display_name"].split(',')[0]
                        if len(name) > 35 or not name:
                            continue
                        
                        addr = item.get("address", {})
                        place_state = addr.get("state", "")
                        display_name = item.get("display_name", "")
                        
                        # Validate state if state_dest is known
                        if state_dest:
                            match = False
                            if place_state and (state_dest.lower() in place_state.lower() or place_state.lower() in state_dest.lower()):
                                match = True
                            elif state_dest.lower() in display_name.lower():
                                match = True
                            
                            if not match:
                                logger.warning(f"Discarding Nominatim place '{name}' outside of state '{state_dest}' (display_name: '{display_name}')")
                                continue

                        raw_type = item.get("type", "attraction").replace("_", " ").title()
                        sub_region = addr.get("suburb") or addr.get("town") or addr.get("village") or addr.get("city_district") or addr.get("neighbourhood") or addr.get("hamlet")
                        
                        results.append({
                            "name": name,
                            "lat": float(item["lat"]),
                            "lon": float(item["lon"]),
                            "type": raw_type,
                            "rating": 4.4,
                            "image_url": None,
                            "formatted_address": item["display_name"],
                            "sub_region": sub_region
                        })
                return results
            except Exception as e:
                logger.error(f"OSM Nominatim query '{q_str}' failed: {e}")
                return []

        # Run queries in parallel
        tasks = [fetch_nominatim_query(q) for q in search_queries]
        results_lists = await asyncio.gather(*tasks)
        for res_list in results_lists:
            raw_places.extend(res_list)

 
    # Add Food Areas / Restaurants
   
    food_places = []

    if (
        not NOMINATIM_BLOCKED
        and "food" in [p.lower() for p in (place_types or [])]
        ):
        
        try:
            q_food = f"restaurants in {dest}"
            if state_dest:
                q_food = f"restaurants in {dest}, {state_dest}"
            url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(q_food)}&format=json&limit=3&addressdetails=1"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
            )
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            def run_sync():
                with urllib.request.urlopen(req, context=ctx, timeout=4) as response:
                    return json.loads(response.read().decode())
                    
            data = await asyncio.get_event_loop().run_in_executor(None, run_sync)
            if data:
                for item in data:
                    name = item["display_name"].split(',')[0]
                    if len(name) > 35 or not name:
                        continue
                    
                    addr = item.get("address", {})
                    place_state = addr.get("state", "")
                    display_name = item.get("display_name", "")
                    
                    # Validate state if state_dest is known
                    if state_dest:
                        match = False
                        if place_state and (state_dest.lower() in place_state.lower() or place_state.lower() in state_dest.lower()):
                            match = True
                        elif state_dest.lower() in display_name.lower():
                            match = True
                        
                        if not match:
                            logger.warning(f"Discarding restaurant '{name}' outside of state '{state_dest}'")
                            continue

                    sub_region = addr.get("suburb") or addr.get("town") or addr.get("village") or addr.get("city_district") or addr.get("neighbourhood") or addr.get("hamlet")
                    
                    food_places.append({
                        "name": name,
                        "lat": float(item["lat"]),
                        "lon": float(item["lon"]),
                        "type": "Restaurant/Café",
                        "rating": 4.5,
                        "image_url": None,
                        "formatted_address": item["display_name"],
                        "sub_region": sub_region
                    })
        except Exception as e:
            logger.error(f"Failed to fetch local restaurants: {e}")


    # Combine lists
    combined = raw_places + food_places

        # Deduplicate by name
    seen = set()
    deduped = []
    for p in combined:
            n_clean = p["name"].lower().strip()
            if n_clean not in seen:
                seen.add(n_clean)
                deduped.append(p)

        # Broaden search if Nominatim/Google returned < 12 spots
    if len(deduped) < 12 and not NOMINATIM_BLOCKED:
            logger.info(f"Fewer than 12 spots found ({len(deduped)}). Checking district and state details.")
            
            expanded_queries = []
            if state_dest:
                expanded_queries.append(f"tourism in {state_dest}")
                expanded_queries.append(f"attractions in {state_dest}")
            if district_dest:
                q_dist1 = f"attractions in {district_dest}"
                q_dist2 = f"sights in {district_dest}"
                if state_dest:
                    q_dist1 += f", {state_dest}"
                    q_dist2 += f", {state_dest}"
                expanded_queries.append(q_dist1)
                expanded_queries.append(q_dist2)
            
            q_dest1 = f"tourism in {dest}"
            q_dest2 = f"attractions in {dest}"
            if state_dest:
                q_dest1 += f", {state_dest}"
                q_dest2 += f", {state_dest}"
            expanded_queries.append(q_dest1)
            expanded_queries.append(q_dest2)
            
            expanded_queries = list(dict.fromkeys(expanded_queries))[:4]
            
            async def fetch_nominatim_query_expanded(q_str: str) -> list:
                try:
                    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(q_str)}&format=json&limit=10&addressdetails=1"
                    req = urllib.request.Request(
                        url,
                        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
                    )
                    ctx = ssl.create_default_context()
                    ctx.check_hostname = False
                    ctx.verify_mode = ssl.CERT_NONE
                    
                    def run_sync():
                        with urllib.request.urlopen(req, context=ctx, timeout=4) as response:
                            return json.loads(response.read().decode())
                    
                    data = await asyncio.get_event_loop().run_in_executor(None, run_sync)
                    
                    results = []
                    if data:
                        for item in data:
                            name = item["display_name"].split(',')[0]
                            if len(name) > 35 or not name:
                                continue
                            
                            addr = item.get("address", {})
                            place_state = addr.get("state", "")
                            display_name = item.get("display_name", "")
                            
                            # Validate state if state_dest is known
                            if state_dest:
                                match = False
                                if place_state and (state_dest.lower() in place_state.lower() or place_state.lower() in state_dest.lower()):
                                    match = True
                                elif state_dest.lower() in display_name.lower():
                                    match = True
                                
                                if not match:
                                    logger.warning(f"Discarding expanded Nominatim place '{name}' outside of state '{state_dest}'")
                                    continue

                            raw_type = item.get("type", "attraction").replace("_", " ").title()
                            sub_region = addr.get("suburb") or addr.get("town") or addr.get("village") or addr.get("city_district") or addr.get("neighbourhood") or addr.get("hamlet")
                            
                            results.append({
                                "name": name,
                                "lat": float(item["lat"]),
                                "lon": float(item["lon"]),
                                "type": raw_type,
                                "rating": 4.4,
                                "image_url": None,
                                "formatted_address": item["display_name"],
                                "sub_region": sub_region
                            })
                    return results
                except Exception as e:
                    logger.error(f"OSM Nominatim expanded query '{q_str}' failed: {e}")
                    return []
                    
            if expanded_queries:
                tasks = [fetch_nominatim_query_expanded(q) for q in expanded_queries]
                results_lists = await asyncio.gather(*tasks)
                for res_list in results_lists:
                    for p in res_list:
                        n_clean = p["name"].lower().strip()
                        if n_clean not in seen:
                            seen.add(n_clean)
                            deduped.append(p)

    # If still fewer than 12, inject curated fallback lists
    if len(deduped) < 12:
            logger.warning(f"Fewer than 12 locations discovered ({len(deduped)}). Utilizing real-world geographic landmarks fallback.")
            
            real_fallbacks = {
                "meghalaya": [
                    {"name": "Nongjrong Valley Viewpoint", "type": "Valley", "lat": 25.4385, "lon": 92.1793},
                    {"name": "Umngot River Boating Point", "type": "River", "lat": 25.1802, "lon": 92.0197},
                    {"name": "Krang Suri Waterfall Trail", "type": "Waterfall", "lat": 25.2678, "lon": 92.5451},
                    {"name": "Shnongpdeng River Camps", "type": "Camping Ground", "lat": 25.2014, "lon": 92.0152},
                    {"name": "Laitlum Canyon View", "type": "Canyon", "lat": 25.4514, "lon": 91.8951},
                    {"name": "Double Decker Root Bridge", "type": "Bridge", "lat": 25.2785, "lon": 91.7336},
                    {"name": "Mawsmai Cave Explorer", "type": "Cave", "lat": 25.2447, "lon": 91.7248},
                    {"name": "Umiam Lake View Point", "type": "Lake", "lat": 25.6548, "lon": 91.8984},
                    {"name": "Mawlynnong Cleanest Village", "type": "Village", "lat": 25.2016, "lon": 91.9038},
                    {"name": "Elephant Falls", "type": "Waterfall", "lat": 25.5392, "lon": 91.8239},
                    {"name": "Balpakram National Park", "type": "National Park", "lat": 25.2497, "lon": 90.8719},
                    {"name": "Mawphlang Sacred Forest", "type": "Forest", "lat": 25.4542, "lon": 91.7589},
                    {"name": "Don Bosco Museum", "type": "Museum", "lat": 25.5925, "lon": 91.8847},
                    {"name": "Shillong Peak Heights", "type": "Viewpoint", "lat": 25.5312, "lon": 91.8624},
                    {"name": "Seven Sisters Falls", "type": "Waterfall", "lat": 25.2472, "lon": 91.7275}
                ],
                "himachal pradesh": [
                    {"name": "Jakhoo Hill Temple", "type": "Temple", "lat": 31.1011, "lon": 77.1852},
                    {"name": "Kufri Fun World", "type": "Adventure Park", "lat": 31.1002, "lon": 77.2662},
                    {"name": "Mall Road Promenade", "type": "Shopping District", "lat": 31.1044, "lon": 77.1741},
                    {"name": "Christ Church Ridge", "type": "Historical Site", "lat": 31.1051, "lon": 77.1752},
                    {"name": "Viceregal Lodge Estate", "type": "Heritage Palace", "lat": 31.1027, "lon": 77.1415},
                    {"name": "Green Valley Clearing", "type": "Nature Valley", "lat": 31.0967, "lon": 77.2284},
                    {"name": "Mashobra Apple Orchards", "type": "Hill Station", "lat": 31.1345, "lon": 77.2212},
                    {"name": "Chail Sanctuary Trek", "type": "Wildlife Reserve", "lat": 30.9664, "lon": 77.1878},
                    {"name": "Solang Valley Adventure", "type": "Adventure Valley", "lat": 32.3168, "lon": 77.1584},
                    {"name": "Rohtang Pass Viewpoint", "type": "Mountain Pass", "lat": 32.3716, "lon": 77.2435},
                    {"name": "Hadimba Temple Manali", "type": "Temple", "lat": 32.2471, "lon": 77.1795},
                    {"name": "Dharamshala Dalai Lama Temple", "type": "Temple", "lat": 32.2356, "lon": 76.3258},
                    {"name": "Kasol Parvati Valley", "type": "River Valley", "lat": 32.0101, "lon": 77.3150},
                    {"name": "Manikaran Hot Springs", "type": "Hot Springs", "lat": 32.0272, "lon": 77.3467},
                    {"name": "Jogini Waterfalls", "type": "Waterfall", "lat": 32.2625, "lon": 77.1950}
                ],
                "shimla": [
                    {"name": "Jakhoo Hill Temple", "type": "Temple", "lat": 31.1011, "lon": 77.1852},
                    {"name": "Kufri Fun World", "type": "Adventure Park", "lat": 31.1002, "lon": 77.2662},
                    {"name": "Mall Road Promenade", "type": "Shopping District", "lat": 31.1044, "lon": 77.1741},
                    {"name": "Christ Church Ridge", "type": "Historical Site", "lat": 31.1051, "lon": 77.1752},
                    {"name": "Viceregal Lodge Estate", "type": "Heritage Palace", "lat": 31.1027, "lon": 77.1415},
                    {"name": "Green Valley Clearing", "type": "Nature Valley", "lat": 31.0967, "lon": 77.2284},
                    {"name": "Mashobra Apple Orchards", "type": "Hill Station", "lat": 31.1345, "lon": 77.2212},
                    {"name": "Chail Sanctuary Trek", "type": "Wildlife Reserve", "lat": 30.9664, "lon": 77.1878},
                    {"name": "Solang Valley Adventure", "type": "Adventure Valley", "lat": 32.3168, "lon": 77.1584},
                    {"name": "Rohtang Pass Viewpoint", "type": "Mountain Pass", "lat": 32.3716, "lon": 77.2435},
                    {"name": "Hadimba Temple Manali", "type": "Temple", "lat": 32.2471, "lon": 77.1795},
                    {"name": "Dharamshala Dalai Lama Temple", "type": "Temple", "lat": 32.2356, "lon": 76.3258},
                    {"name": "Kasol Parvati Valley", "type": "River Valley", "lat": 32.0101, "lon": 77.3150},
                    {"name": "Manikaran Hot Springs", "type": "Hot Springs", "lat": 32.0272, "lon": 77.3467},
                    {"name": "Jogini Waterfalls", "type": "Waterfall", "lat": 32.2625, "lon": 77.1950}
                ],
                "rajasthan": [
                    {"name": "Amber Palace Courtyard", "type": "Royal Palace", "lat": 26.9855, "lon": 75.8513},
                    {"name": "Hawa Mahal Windows View", "type": "Heritage Landmark", "lat": 26.9239, "lon": 75.8267},
                    {"name": "City Palace Udaipur", "type": "Royal Palace", "lat": 24.5764, "lon": 73.6835},
                    {"name": "Lake Pichola Boating", "type": "Lake", "lat": 24.5750, "lon": 73.6780},
                    {"name": "Mehrangarh Fort Jodhpur", "type": "Fortress", "lat": 26.2978, "lon": 73.0185},
                    {"name": "Jaisalmer Sand Dunes", "type": "Desert Dunes", "lat": 26.8972, "lon": 70.9125},
                    {"name": "Pushkar Sacred Lake", "type": "Holy Lake", "lat": 26.4897, "lon": 74.5510},
                    {"name": "Ranthambore Safari Camp", "type": "National Park", "lat": 25.9928, "lon": 76.3985},
                    {"name": "Dilwara Temples Mount Abu", "type": "Temple", "lat": 24.6085, "lon": 72.7215},
                    {"name": "Jantar Mantar Observatory", "type": "Observatory", "lat": 26.9248, "lon": 75.8245},
                    {"name": "Chittorgarh Fort Heritage", "type": "Fortress", "lat": 24.8879, "lon": 74.6451},
                    {"name": "Jal Mahal Lake Palace", "type": "Palace", "lat": 26.9535, "lon": 75.8458},
                    {"name": "Sheesh Mahal Jaipur", "type": "Palace", "lat": 26.9860, "lon": 75.8510},
                    {"name": "Nahargarh Fort Sunset", "type": "Fortress", "lat": 26.9375, "lon": 75.8155},
                    {"name": "Birla Mandir Temple", "type": "Temple", "lat": 26.8922, "lon": 75.8150}
                ],
                "kerala": [
                    {"name": "Munnar Tea Gardens", "type": "Hill Station", "lat": 10.0889, "lon": 77.0595},
                    {"name": "Alleppey Houseboat Backwaters", "type": "Backwaters", "lat": 9.4981, "lon": 76.3388},
                    {"name": "Wayanad Edakkal Caves", "type": "Caves", "lat": 11.6275, "lon": 76.2345},
                    {"name": "Varkala Cliff Beach", "type": "Cliff Beach", "lat": 8.7365, "lon": 76.7067},
                    {"name": "Kovalam Crescent Beach", "type": "Beach", "lat": 8.4020, "lon": 76.9785},
                    {"name": "Periyar Wildlife Sanctuary", "type": "Wildlife Reserve", "lat": 9.5785, "lon": 77.1685},
                    {"name": "Athirappilly Waterfalls", "type": "Waterfall", "lat": 10.2851, "lon": 76.5698},
                    {"name": "Fort Kochi Chinese Net", "type": "Heritage Beach", "lat": 9.9678, "lon": 76.2425},
                    {"name": "Bekal Fort Sea View", "type": "Fortress", "lat": 12.3828, "lon": 75.0315},
                    {"name": "Vagamon Pine Forest", "type": "Forest", "lat": 9.6845, "lon": 76.9042},
                    {"name": "Kumarakom Bird Sanctuary", "type": "Sanctuary", "lat": 9.6272, "lon": 76.4255},
                    {"name": "Silent Valley National Park", "type": "National Park", "lat": 11.1333, "lon": 76.4333},
                    {"name": "Marari Beach Shore", "type": "Beach", "lat": 9.6015, "lon": 76.2995},
                    {"name": "Chembra Peak Trek", "type": "Mountain Peak", "lat": 11.5125, "lon": 76.0872},
                    {"name": "Banasura Sagar Dam", "type": "Dam/Lake", "lat": 11.6705, "lon": 75.9555}
                ],
                "tamil nadu": [
                    {"name": "Ooty Botanical Gardens", "type": "Gardens", "lat": 11.4182, "lon": 76.7118},
                    {"name": "Kodaikanal Star Lake", "type": "Lake", "lat": 10.2335, "lon": 77.4895},
                    {"name": "Meenakshi Amman Temple", "type": "Temple", "lat": 9.9195, "lon": 78.1193},
                    {"name": "Rameshwaram Jyotirlinga", "type": "Temple", "lat": 9.2881, "lon": 79.3174},
                    {"name": "Mahabalipuram Shore Temple", "type": "Heritage Temple", "lat": 12.6162, "lon": 80.1995},
                    {"name": "Brihadeeswarar Temple Tanjore", "type": "Temple", "lat": 10.7828, "lon": 79.1322},
                    {"name": "Kanyakumari Sunrise View", "type": "Sea Coast", "lat": 8.0883, "lon": 77.5385},
                    {"name": "Mudumalai Tiger Reserve", "type": "Wildlife Reserve", "lat": 11.5623, "lon": 76.6212},
                    {"name": "Yercaud Loop Road", "type": "Hill Station", "lat": 11.7752, "lon": 78.2095},
                    {"name": "Marina Beach Chennai", "type": "Beach", "lat": 13.0489, "lon": 80.2825},
                    {"name": "Dhanushkodi Ghost Town", "type": "Beach/Heritage", "lat": 9.1764, "lon": 79.4445},
                    {"name": "Courtallam Waterfalls", "type": "Waterfalls", "lat": 8.9328, "lon": 77.2695},
                    {"name": "Hogenakkal Falls Boating", "type": "Waterfall", "lat": 12.1195, "lon": 77.7801},
                    {"name": "Coaker's Walk Kodaikanal", "type": "Viewpoint", "lat": 10.2325, "lon": 77.4935},
                    {"name": "Nilgiri Mountain Toy Train", "type": "Heritage Railway", "lat": 11.3255, "lon": 76.8250}
                ],
                "goa": [
                    {"name": "Baga Sandy Beach", "type": "Beach", "lat": 15.5553, "lon": 73.7517},
                    {"name": "Fort Aguada Lighthouse", "type": "Historic Fort", "lat": 15.4925, "lon": 73.7736},
                    {"name": "Basilica of Bom Jesus", "type": "Historical Church", "lat": 15.5009, "lon": 73.9116},
                    {"name": "Dudhsagar Waterfall Trek", "type": "Waterfall", "lat": 15.3125, "lon": 74.3142},
                    {"name": "Palolem Beach Shore", "type": "Beach", "lat": 15.0101, "lon": 74.0232},
                    {"name": "Anjuna Flea Market", "type": "Bazaar", "lat": 15.5802, "lon": 73.7432},
                    {"name": "Dona Paula Cliff", "type": "Coastline View", "lat": 15.4539, "lon": 73.8016},
                    {"name": "Mangueshi Temple Complex", "type": "Temple", "lat": 15.4439, "lon": 73.9683}
                ],
                "nagaland": [
                    {"name": "Kohima War Cemetery", "type": "War Memorial", "lat": 25.6685, "lon": 94.1042},
                    {"name": "Dzukou Valley Trek", "type": "Valley", "lat": 25.6025, "lon": 94.0728},
                    {"name": "Kisama Heritage Village", "type": "Heritage Village", "lat": 25.6022, "lon": 94.1135},
                    {"name": "Khonoma Green Village", "type": "Village", "lat": 25.6514, "lon": 94.0201},
                    {"name": "Japfu Peak View", "type": "Mountain Peak", "lat": 25.5991, "lon": 94.0792},
                    {"name": "Intanki National Park", "type": "National Park", "lat": 25.5492, "lon": 93.6392},
                    {"name": "Kohima Cathedral Church", "type": "Church", "lat": 25.6702, "lon": 94.1118},
                    {"name": "Naga Heritage Museum", "type": "Museum", "lat": 25.6015, "lon": 94.1130},
                    {"name": "Dzuleke Eco-Tourism", "type": "Village", "lat": 25.6201, "lon": 93.9922},
                    {"name": "Tuophema Tourist Village", "type": "Village", "lat": 25.8451, "lon": 94.1685},
                    {"name": "Kohima State Museum", "type": "Museum", "lat": 25.6812, "lon": 94.1025},
                    {"name": "Pulie Badze Wildlife Sanctuary", "type": "Wildlife Sanctuary", "lat": 25.6425, "lon": 94.0782},
                    {"name": "Triple Falls Chumukedima", "type": "Waterfall", "lat": 25.8215, "lon": 93.7845},
                    {"name": "Shilloi Lake View", "type": "Lake", "lat": 25.6125, "lon": 94.7892},
                    {"name": "Kachari Ruins Dimapur", "type": "Historical Site", "lat": 25.9082, "lon": 93.7295}
                ],
                "sikkim": [
                    {"name": "Tsomgo Lake", "type": "Lake", "lat": 27.3756, "lon": 88.7619},
                    {"name": "Nathula Pass View", "type": "Mountain Pass", "lat": 27.3865, "lon": 88.8309},
                    {"name": "Gurudongmar Lake", "type": "Lake", "lat": 28.0158, "lon": 88.7099},
                    {"name": "Rumtek Monastery", "type": "Monastery", "lat": 27.2785, "lon": 88.5992},
                    {"name": "Yumthang Valley of Flowers", "type": "Valley", "lat": 27.8264, "lon": 88.6979},
                    {"name": "Pelling Skywalk Point", "type": "Viewpoint", "lat": 27.3025, "lon": 88.2367},
                    {"name": "Teesta River Rafting", "type": "Adventure Spot", "lat": 27.1247, "lon": 88.4842},
                    {"name": "Ravangla Buddha Park", "type": "Historical Site", "lat": 27.3114, "lon": 88.4235},
                    {"name": "Goechala Trek Trail", "type": "Trekking Path", "lat": 27.5951, "lon": 88.1685},
                    {"name": "Gangtok Ropeway Station", "type": "Cable Car", "lat": 27.3292, "lon": 88.6124}
                ]
            }

            dest_low = dest.lower()
            matched_fallback = None
            for key, list_val in real_fallbacks.items():
                if key in dest_low or (state_dest and key in state_dest.lower()):
                    matched_fallback = list_val
                    break

            # If not matched, try mapping common city/destination names to their state/regional fallbacks
            if not matched_fallback:
                regional_mappings = {
                    "shillong": "meghalaya",
                    "cherrapunji": "meghalaya",
                    "jaipur": "rajasthan",
                    "udaipur": "rajasthan",
                    "jodhpur": "rajasthan",
                    "jaisalmer": "rajasthan",
                    "manali": "himachal pradesh",
                    "kullu": "himachal pradesh",
                    "dharamshala": "himachal pradesh",
                    "kasol": "himachal pradesh",
                    "shimla": "shimla",
                    "ooty": "tamil nadu",
                    "kodaikanal": "tamil nadu",
                    "chennai": "tamil nadu",
                    "munnar": "kerala",
                    "alleppey": "kerala",
                    "kochi": "kerala",
                    "panaji": "goa",
                    "baga": "goa",
                    "kohima": "nagaland",
                    "dimapur": "nagaland",
                    "gangtok": "sikkim",
                    "pelling": "sikkim",
                    "sikkim": "sikkim"
                }
                for city_key, fallback_key in regional_mappings.items():
                    if city_key in dest_low:
                        matched_fallback = real_fallbacks.get(fallback_key)
                        break

            if not matched_fallback and state_dest and not NOMINATIM_BLOCKED:
                # Dynamically query OSM Nominatim for "tourism in {state_dest}" to get real locations
                try:
                    logger.info(f"Querying dynamic fallbacks for state: {state_dest}")
                    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote('tourism in ' + state_dest)}&format=json&limit=15&addressdetails=1"
                    req = urllib.request.Request(
                        url,
                        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
                    )
                    ctx = ssl.create_default_context()
                    ctx.check_hostname = False
                    ctx.verify_mode = ssl.CERT_NONE
                    
                    def run_sync_fallback():
                        with urllib.request.urlopen(req, context=ctx, timeout=4) as response:
                            return json.loads(response.read().decode())
                    
                    data = await asyncio.get_event_loop().run_in_executor(None, run_sync_fallback)
                    if data:
                        matched_fallback = []
                        for item in data:
                            name = item["display_name"].split(',')[0]
                            if len(name) > 35 or not name:
                                continue
                            
                            addr = item.get("address", {})
                            place_state = addr.get("state", "")
                            display_name = item.get("display_name", "")
                            
                            # Verify state match
                            match = False
                            if place_state and (state_dest.lower() in place_state.lower() or place_state.lower() in state_dest.lower()):
                                match = True
                            elif state_dest.lower() in display_name.lower():
                                match = True
                            
                            if not match:
                                continue
                                
                            raw_type = item.get("type", "attraction").replace("_", " ").title()
                            matched_fallback.append({
                                "name": name,
                                "type": raw_type,
                                "lat": float(item["lat"]),
                                "lon": float(item["lon"])
                            })
                except Exception as e:
                    logger.error(f"Failed to fetch dynamic fallbacks for {state_dest}: {e}")

            if matched_fallback:
                for p in matched_fallback:
                    n_clean = p["name"].lower().strip()
                    if n_clean not in seen:
                        seen.add(n_clean)
                        deduped.append({
                            "name": p["name"],
                            "lat": p["lat"],
                            "lon": p["lon"],
                            "type": p["type"],
                            "rating": 4.6,
                            "image_url": None,
                            "formatted_address": f"{p['name']}, {dest}, India"
                        })
            else:
                logger.warning(f"No real attractions found and no real fallback database match for '{dest}'. Returning empty list.")

        # Rank and sort attractions based on priority:
        # Priority 1: Real tourist attractions & Preferred sights
        # Priority 2: Natural attractions (rivers, waterfalls, lakes, forests, canyons, beaches, mountains)
        # Priority 3: Landmarks (historical, spiritual, monument, fort, palace, temple, church, mosque)
        # Priority 4: Museums & galleries
        # Priority 5: Restaurants & cafés
        # Priority 6: Utility places / offices / roads / stations
    def get_priority_score(place):
            name = place.get("name", "").lower()
            ptype = place.get("type", "").lower()
            
            preferred_names = [
                "dawki", "umngot", "krang suri", "mawlynnong", "nongriat", 
                "double decker", "root bridge", "shnongpdeng", "elephant falls", 
                "laitlum", "wei sawdong", "nongjrong", "mawsmai", "umiam",
                "seven sisters", "balpakram", "mawphlang", "don bosco", "shillong peak"
            ]
            
            utility_keywords = [
                "office", "police", "hospital", "clinic", "post office", "bank", "atm",
                "school", "college", "university", "road", "street", "highway", "lane",
                "bypass", "station", "bus stand", "taxi stand", "tourism office", "tourist office",
                "information center", "information centre", "society", "association", "committee",
                "terminal", "depot", "market committee", "shop", "store", "repair", "service center",
                "governmental", "municipal", "court", "headquarters", "administrative", "pwd", "postoffice",
                "telecom", "telephone exchange", "electricity board", "power station", "fire station", "gas station",
                "petrol pump", "fuel", "optical", "opticals","travel agency", "travel agencies","tour operator", "tourism company",
                "tours", "travels","commercial", "business","mall", "shopping mall","supermarket", "department store","gift shop", "souvenir shop",
                "electronics", "mobile shop","showroom", "dealer","agency", "office building","resort office", "booking office",
                "ticket counter", "ticket office","parking", "parking lot","warehouse", "factory","industrial", "company",
                "corporate", "enterprise","residential", "apartment","housing", "complex"
            ]
            
            if any(w in name for w in utility_keywords) or any(w in ptype for w in utility_keywords):
                return 6
                
            # Reject businesses, services and non-tourist POIs
            blacklist_keywords = [
                # Shopping & Retail
                "shop", "store", "mart", "mall", "market", "bazaar",
                "supermarket", "department store", "showroom",
                "optical", "opticals", "pharmacy", "chemist",
                "bakery", "grocery", "book store",

                # Food
                "restaurant", "cafe", "coffee", "tea stall",
                "bar", "pub", "fast food", "food court",

                # Business
                "office", "agency", "travel agency",
                "tour operator", "company", "corporate",
                "enterprise", "commercial",

                # Services
                "bank", "atm", "hospital", "clinic",
                "school", "college", "university",
                "petrol pump", "fuel", "garage",
                "repair", "service centre",

                # Transport
                "bus stop", "bus stand", "railway station",
                "metro station", "airport", "parking",

                # Residential
                "apartment", "residency", "residential",
                "housing", "society", "complex"
            ]

            if any(k in name for k in blacklist_keywords):
                return 6

            if any(pref in name for pref in preferred_names):
                return 1
                
            tourist_attraction_keywords = [

            # Water & Nature
            "waterfall", "falls", "cascade",
            "river", "lake", "backwater", "reservoir", "dam",
            "beach", "coast", "shore", "island",
            "valley", "canyon", "gorge",
            "hill", "mountain", "peak", "ridge",
            "forest", "jungle", "wildlife", "sanctuary",
            "national park", "biosphere", "mangrove",
            "cliff", "viewpoint", "view point", "sunrise", "sunset",

            # Trekking & Adventure
            "trek", "trekking", "hike", "trail",
            "camp", "camping", "base camp",
            "rafting", "kayaking", "boating",
            "ski", "snow", "glacier",
            "paragliding", "zipline", "rock climbing",
            "bungee", "cave", "cavern",

            # Meghalaya / Northeast
            "living root", "root bridge",
            "double decker", "boating point",
            "crystal river", "limestone cave",

            # Heritage
            "fort", "palace", "city palace",
            "mahal", "haveli", "castle",
            "citadel", "bastion", "rampart",
            "stepwell", "baori", "vav",
            "gateway", "gate", "tower",
            "clock tower", "watch tower",
            "wall", "ruins", "archaeological",
            "heritage", "heritage site",
            "unesco", "world heritage",

            # Religious
            "temple", "mandir",
            "church", "cathedral",
            "mosque", "masjid",
            "gurudwara",
            "monastery", "gompa",
            "stupa", "shrine",
            "ashram", "ghat",
            "pilgrimage",

            # Museums & Culture
            "museum", "gallery",
            "planetarium", "science center",
            "art centre", "art center",
            "cultural centre", "cultural center",
            "heritage museum",
            "memorial", "statue", "monument",

            # Gardens & Public Attractions
            "garden", "botanical garden",
            "rose garden", "eco park",
            "park", "bird park",
            "zoological", "zoo",
            "aquarium",

            # Markets worth visiting
            "floating market",
            "craft village",
            "artisan village",
            "heritage market",
            "night market",
            "handicraft market",

            # Lakeside / Riverside
            "promenade", "marina",
            "riverfront", "boardwalk",

            # Desert
            "sand dune", "desert",
            "camel safari",

            # Tea / Coffee Tourism
            "tea garden", "tea estate",
            "coffee plantation",
            "spice plantation",

            # Tourism Places
            "tourist attraction",
            "tourist spot",
            "tourism",
            "scenic spot",
            "photo point"
        ]
            if any(w in name or w in ptype for w in tourist_attraction_keywords):
                return 1
                
            natural_keywords = [
                "river", "lake", "forest", "beach", "mountain", "hill", "peak", "valley", 
                "sanctuary", "national park", "nature", "camp", "hiking", "sea", "ocean", 
                "coast", "cliff", "ridge", "point"
            ]
            if any(w in name or w in ptype for w in natural_keywords):
                return 2
                
            landmark_keywords = [
                "temple", "church", "cathedral", "mosque", "monastery", "shrine", "spiritual", 
                "monument", "fort", "palace", "memorial", "landmark", "castle", "historic", 
                "tomb", "stupa", "statue"
            ]
            if any(w in name or w in ptype for w in landmark_keywords):
                return 3
                
            museum_keywords = ["museum", "gallery", "observatory", "exhibition", "science center", "planetarium"]
            if any(w in name or w in ptype for w in museum_keywords):
                return 4
                
            restaurant_keywords = [
                "restaurant", "cafe", "café", "bar", "pub", "lounge", "bistro", "diner", 
                "food", "cuisine", "eatery", "dhaba", "hotel restaurant", "tea stall", "coffee"
            ]
            if any(w in name or w in ptype for w in restaurant_keywords):
                return 5
                
            return 3


    import re

    def is_valid_tourist_name(name):
            if not name:
                return False

            clean = name.strip()

            # Reject names that are too short
            if len(clean) < 3:
                return False

            # Reject names with mostly non-English characters
            latin = len(re.findall(r"[A-Za-z]", clean))
            total = len(clean)

            if latin / max(total, 1) < 0.55:
                return False

            return True
        # Filter out Priority 6 (utility/office/road/station) places completely
    deduped = [
        p for p in deduped
        if get_priority_score(p) != 6
        and is_valid_tourist_name(p["name"])
        ]
    deduped.sort(key=get_priority_score)


    GOOD_CATEGORIES = {
                "attraction",
                "fort",
                "fortress",
                "palace",
                "royal palace",
                "heritage landmark",
                "heritage palace",
                "temple",
                "church",
                "cathedral",
                "mosque",
                "monastery",
                "museum",
                "gallery",
                "observatory",
                "monument",
                "waterfall",
                "lake",
                "holy lake",
                "river",
                "beach",
                "desert dunes",
                "garden",
                "park",
                "national park",
                "wildlife sanctuary",
                "wildlife reserve",
                "forest",
                "viewpoint",
                "valley",
                "canyon",
                "bridge",
                "cave",
                "village",
                "hill station",
                "mountain",
                "peak"
            }
        # Prepare final output structure
    async def fetch_image_async(name, p_type):
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, fetch_travel_image, name, state_dest, p_type)

    image_tasks = []
    for p in deduped[:20]:
            img_url = p.get("image_url")
            if img_url:
                fut = asyncio.Future()
                fut.set_result(img_url)
                image_tasks.append(fut)
            else:
                image_tasks.append(fetch_image_async(p["name"], p["type"]))

    resolved_images = await asyncio.gather(*image_tasks)

    attractions = []
    for idx, p in enumerate(deduped[:20]):
            img_url = resolved_images[idx]

            BAD_KEYWORDS = [
                "restaurant",
                "cafe",
                "hotel",
                "hostel",
                "parking",
                "stair",
                "office",
                "mall",
                "shop",
                "market",
                "townhall",
                "hospital",
                "clinic",
                "guest house",
                "resort",
                "lodge",
                "food",
                "kitchen"
            ]

            name = p.get("name", "").lower()
        

            

            if any(word in name for word in BAD_KEYWORDS):
                logger.info(f"Rejected non-tourist place: {name}")
                continue



            dist = calculate_haversine_distance(lat, lon, p["lat"], p["lon"])
            
            # Estimate drive time (assuming average 30 km/h speed in towns/hills)
            drive_time_mins = round(dist * 2.0)
            if drive_time_mins < 10:
                drive_time_str = "5-10 mins drive"
            elif drive_time_mins < 60:
                drive_time_str = f"{drive_time_mins} mins drive"
            else:
                h_part = drive_time_mins // 60
                m_part = drive_time_mins % 60
                if m_part == 0:
                    drive_time_str = f"{h_part} hr drive"
                else:
                    drive_time_str = f"{h_part} hr {m_part} mins drive"

            # Determine duration & cost estimation dynamically based on place type
            p_type_lower = p["type"].lower()
            duration_str = "2 Hours"
            local_cost = 0.0
            
            if "museum" in p_type_lower or "gallery" in p_type_lower:
                duration_str = "2.5 Hours"
                local_cost = 50.0
            elif "fort" in p_type_lower or "palace" in p_type_lower:
                duration_str = "3 Hours"
                local_cost = 100.0
            elif "trek" in p_type_lower or "hike" in p_type_lower or "peak" in p_type_lower:
                duration_str = "4 Hours"
                local_cost = 0.0
            elif "restaurant" in p_type_lower or "cafe" in p_type_lower:
                duration_str = "1.5 Hours"
                local_cost = 350.0
            elif "lake" in p_type_lower or "boat" in p_type_lower:
                duration_str = "2 Hours"
                local_cost = 150.0

            

            attractions.append({
                "name": p["name"],
                "lat": p["lat"],
                "lon": p["lon"],
                "coords": [p["lat"], p["lon"]],
                "image_url": img_url,
                "summary": f"Scenic spot in {dest}. A popular destination categorized as {p['type']}.",
                "visit_duration": duration_str,
                "local_cost": local_cost,
                "description": f"Enjoy exploring the iconic {p['name']}, a central highlight in {dest} presenting amazing regional vibes and cultural history.",
                "best_time": "October to April (pleasant weather)",
                "tips": "Try to arrive in the morning to capture the best light and avoid queues.",
                "distance": f"{round(dist, 1)} km from center",
                "drive_time": drive_time_str,
                "local_transport": "Auto rickshaw or local cab",
                "highlights": [p["type"], "Sightseeing", "Photography"],
                "quick_facts": {"Type": p["type"], "Rating": f"{p['rating']} / 5.0"},
                "nearby_activities": ["Walking Tour", "Local Shopping", "Landscape Photography"],
                "sub_region": p.get("sub_region")
            })

    return attractions

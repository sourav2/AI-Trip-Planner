import os
import json
import urllib.request
import urllib.parse
import ssl
import math
import asyncio
from app.utils.logger import get_logger

logger = get_logger("app.services.route")

REVERSE_GEOCODE_CACHE = {}
NOMINATIM_BLOCKED = False

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def get_country_code_cached(lat: float, lon: float) -> str:
    """
    Reverse geocodes a coordinate using OSM Nominatim and caches the result.
    Rounds coordinates to 3 decimal places (~110m grid) for better caching behavior.
    """
    # 1. Local Bounding Box check for India to bypass Nominatim network calls
    if 8.0 <= lat <= 37.6 and 68.7 <= lon <= 97.2:
        return "in"

    cache_key = (round(lat, 3), round(lon, 3))
    if cache_key in REVERSE_GEOCODE_CACHE:
        return REVERSE_GEOCODE_CACHE[cache_key]
        
    global NOMINATIM_BLOCKED
    if NOMINATIM_BLOCKED:
        return ""

    try:
        # Respect OpenStreetMap Nominatim request rate limits (1 req/sec)
        await asyncio.sleep(0.5)
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
            cc = data["address"].get("country_code", "").lower().strip()
            REVERSE_GEOCODE_CACHE[cache_key] = cc
            return cc
    except Exception as e:
        logger.error(f"Reverse geocoding failed for ({lat}, {lon}): {e}")
        status_code = getattr(e, "code", None)
        if status_code in (401, 403, 429):
            NOMINATIM_BLOCKED = True
            logger.warning(f"OSM Nominatim reverse geocoding blocked in route service with HTTP {status_code}. Enabling circuit breaker to bypass online country code lookup.")
        REVERSE_GEOCODE_CACHE[cache_key] = ""
    return ""

async def get_route(coords: list[list[float]], allow_international_transit: bool = False) -> dict:
    """
    Fetches route details. Enforces domestic boundary constraints if allow_international_transit is False.
    """
    if not coords or len(coords) < 2:
        return {"distance": 0.0, "duration": 0.0, "geometry": []}

    # If international transit is disabled, try to detour around border crossings
    if not allow_international_transit:
        start_cc = await get_country_code_cached(coords[0][0], coords[0][1])
        end_cc = await get_country_code_cached(coords[-1][0], coords[-1][1])
        
        if start_cc and end_cc and start_cc == end_cc:
            domestic_cc = start_cc
            logger.info(f"Enforcing domestic travel boundaries within country code '{domestic_cc}'")
            
            # Fetch normal route first
            route_data = await _fetch_route_raw(coords)
            geom = route_data.get("geometry", [])
            
            if geom:
                # Sample intermediate points along the route geometry to check for border crossings
                num_samples = min(5, len(geom))
                crosses_border = False
                border_point = None
                
                for idx in range(1, num_samples):
                    sample_idx = (len(geom) * idx) // num_samples
                    sample_pt = geom[sample_idx]
                    sample_cc = await get_country_code_cached(sample_pt[0], sample_pt[1])
                    if sample_cc and sample_cc != domestic_cc:
                        crosses_border = True
                        border_point = sample_pt
                        logger.warning(f"Cross-border route detected! Route enters country '{sample_cc}' at {sample_pt}. Seeking domestic detour within '{domestic_cc}'.")
                        break
                
                if crosses_border and border_point:
                    # Identify the segment in coordinates that crossed boundaries
                    min_sum_dist = float('inf')
                    insert_idx = 1
                    for idx in range(len(coords) - 1):
                        d1 = calculate_haversine_distance(coords[idx][0], coords[idx][1], border_point[0], border_point[1])
                        d2 = calculate_haversine_distance(coords[idx+1][0], coords[idx+1][1], border_point[0], border_point[1])
                        if d1 + d2 < min_sum_dist:
                            min_sum_dist = d1 + d2
                            insert_idx = idx + 1
                    
                    lat_A, lon_A = coords[insert_idx - 1][0], coords[insert_idx - 1][1]
                    lat_B, lon_B = coords[insert_idx][0], coords[insert_idx][1]
                    
                    dx = lat_B - lat_A
                    dy = lon_B - lon_A
                    length = math.sqrt(dx*dx + dy*dy)
                    
                    if length > 0:
                        px = -dy / length
                        py = dx / length
                        
                        best_route = None
                        found_detour = False
                        
                        # Project candidate waypoints perpendicular to border segment
                        for offset in [0.6, 1.2, 1.8, 2.4]:
                            if found_detour:
                                break
                            for direction in [1, -1]:
                                cand_lat = border_point[0] + direction * offset * px
                                cand_lon = border_point[1] + direction * offset * py
                                
                                cand_cc = await get_country_code_cached(cand_lat, cand_lon)
                                if cand_cc == domestic_cc:
                                    test_coords = list(coords)
                                    test_coords.insert(insert_idx, [cand_lat, cand_lon])
                                    test_route = await _fetch_route_raw(test_coords)
                                    
                                    test_geom = test_route.get("geometry", [])
                                    test_crosses = False
                                    if test_geom:
                                        test_samples = min(5, len(test_geom))
                                        for t_idx in range(1, test_samples):
                                            ts_idx = (len(test_geom) * t_idx) // test_samples
                                            ts_pt = test_geom[ts_idx]
                                            ts_cc = await get_country_code_cached(ts_pt[0], ts_pt[1])
                                            if ts_cc and ts_cc != domestic_cc:
                                                test_crosses = True
                                                break
                                    
                                    if not test_crosses:
                                        logger.info(f"Detoured domestic route successfully via waypoint ({cand_lat}, {cand_lon}).")
                                        best_route = test_route
                                        found_detour = True
                                        break
                                        
                        if best_route:
                            return best_route
                        logger.warning("Could not find a domestic detour. Falling back to default route.")
                        
            return route_data

    return await _fetch_route_raw(coords)

async def _fetch_route_raw(coords: list[list[float]]) -> dict:
    """
    Queries OpenRouteService or free Project OSRM to fetch raw routing details.
    """
    # 1. Try OpenRouteService if API key is present
    ors_key = os.getenv("OPENROUTESERVICE_API_KEY")
    if ors_key:
        try:
            logger.info("Using OpenRouteService API for routing")
            ors_coords = [[c[1], c[0]] for c in coords if len(c) >= 2]
            url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
            payload = json.dumps({"coordinates": ors_coords}).encode("utf-8")
            
            req = urllib.request.Request(
                url,
                data=payload,
                headers={
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": ors_key
                },
                method="POST"
            )
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
                data = json.loads(response.read().decode())
                if data and data.get("features"):
                    feature = data["features"][0]
                    properties = feature.get("properties", {}).get("summary", {})
                    distance_km = round(properties.get("distance", 0) / 1000.0, 1)
                    duration_hours = round(properties.get("duration", 0) / 3600.0, 1)
                    geometry = [[pt[1], pt[0]] for pt in feature.get("geometry", {}).get("coordinates", [])]
                    
                    logger.info(f"OpenRouteService routing successful: distance={distance_km}km, duration={duration_hours}hrs")
                    return {
                        "distance": distance_km,
                        "duration": duration_hours,
                        "geometry": geometry
                    }
        except Exception as e:
            logger.error(f"OpenRouteService routing failed: {e}")

    # 2. Try Project OSRM (free, keyless engine)
    try:
        logger.info("Using free Project OSRM API for routing")
        coord_strings = [f"{c[1]},{c[0]}" for c in coords if len(c) >= 2]
        coords_path = ";".join(coord_strings)
        url = f"https://router.project-osrm.org/route/v1/driving/{coords_path}?overview=full&geometries=geojson"
        
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        )
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data and data.get("code") == "Ok" and data.get("routes"):
                route = data["routes"][0]
                distance_km = round(route["distance"] / 1000.0, 1)
                duration_hours = round(route["duration"] / 3600.0, 1)
                geometry = [[pt[1], pt[0]] for pt in route["geometry"]["coordinates"]]
                
                logger.info(f"OSRM routing successful: distance={distance_km}km, duration={duration_hours}hrs")
                return {
                    "distance": distance_km,
                    "duration": duration_hours,
                    "geometry": geometry
                }
    except Exception as e:
        logger.error(f"OSRM routing failed: {e}")

    # 3. Fallback: Straight-line Haversine math with winding factor
    logger.warning("All routing APIs offline. Falling back to straight-line math calculation.")
    total_dist = 0.0
    for i in range(len(coords) - 1):
        total_dist += calculate_haversine_distance(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1])
    
    road_dist = round(total_dist * 1.25, 1)
    duration = round(road_dist / 55.0, 1)
    
    return {
        "distance": road_dist,
        "duration": duration,
        "geometry": coords
    }

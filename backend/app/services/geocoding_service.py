import os
import json
import urllib.request
import urllib.parse
import ssl
import threading
from app.utils.logger import get_logger

logger = get_logger("app.services.geocoding")

GEOCODE_CACHE = {}
GEOCODE_CACHE_LOCK = threading.Lock()

def geocode_location(query: str) -> tuple[float, float] | None:
    """
    Wrapper for geocode_location that adds global in-memory thread-safe caching and preset matching.
    """
    q_clean = query.strip()
    if not q_clean:
        return None
    cache_key = q_clean.lower()
    with GEOCODE_CACHE_LOCK:
        if cache_key in GEOCODE_CACHE:
            logger.info(f"Geocoding cache hit for '{q_clean}': {GEOCODE_CACHE[cache_key]}")
            return GEOCODE_CACHE[cache_key]

    local_presets = {
        "delhi": (28.6139, 77.2090),
        "new delhi": (28.6139, 77.2090),
        "kolkata": (22.5726, 88.3639),
        "mumbai": (19.0760, 72.8777),
        "bangalore": (12.9716, 77.5946),
        "bengaluru": (12.9716, 77.5946),
        "jaipur": (26.9124, 75.7873),
        "udaipur": (24.5854, 73.7125),
        "goa": (15.2993, 74.1240),
        "panaji": (15.4909, 73.8278),
        "shillong": (25.5788, 91.8831),
        "cherrapunji": (25.2702, 91.7323),
        "munnar": (10.0889, 77.0595),
        "alleppey": (9.4981, 76.3388),
        "guwahati": (26.1445, 91.7362),
        "agra": (27.1767, 78.0081),
        "dehradun": (30.3165, 78.0322),
        "darjeeling": (27.0410, 88.2627),
        "kerala": (10.8505, 76.2711),
        "manali": (32.2396, 77.1887),
        "shimla": (31.1048, 77.1734),
        "tamil nadu": (11.1271, 78.6569),
        "meghalaya": (25.5379432, 91.2999102),
        "jaisalmer": (26.9157, 70.9083),
        "jodhpur": (26.2389, 73.0243),
        "bikaner": (28.0229, 73.3119),
        "ajmer": (26.4499, 74.6399),
        "pushkar": (26.4894, 74.5511),
        "mount abu": (24.5926, 72.7156),
        "chittorgarh": (24.8887, 74.6269),
        "ranthambore": (26.0173, 76.5026),
    }

    q_lower = q_clean.lower()
    for key, coords in local_presets.items():
        if key == q_lower:
            logger.info(f"Found exact match in local presets for '{q_clean}': {coords}")
            with GEOCODE_CACHE_LOCK:
                GEOCODE_CACHE[cache_key] = coords
            return coords

    for key, coords in local_presets.items():
        if key in q_lower:
            logger.info(f"Found partial match in local presets for '{q_clean}': {coords}")
            with GEOCODE_CACHE_LOCK:
                GEOCODE_CACHE[cache_key] = coords
            return coords

    coords = _geocode_location_raw(q_clean)
    if coords:
        with GEOCODE_CACHE_LOCK:
            GEOCODE_CACHE[cache_key] = coords
    return coords

def _geocode_location_raw(query: str) -> tuple[float, float] | None:
    q_clean = query.strip()
    if not q_clean:
        return None

    # 1. Try Google Maps Geocoding if key is present
    google_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if google_key:
        try:
            logger.info(f"Querying Google Maps Geocoding API for '{q_clean}'")
            url = f"https://maps.googleapis.com/maps/api/geocode/json?address={urllib.parse.quote(q_clean)}&key={google_key}"
            req = urllib.request.Request(url)
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, context=ctx, timeout=4) as response:
                data = json.loads(response.read().decode())
                if data and data.get("status") == "OK" and data.get("results"):
                    loc = data["results"][0]["geometry"]["location"]
                    coords = (float(loc["lat"]), float(loc["lng"]))
                    logger.info(f"Google geocoding successful for '{q_clean}': {coords}")
                    return coords
        except Exception as e:
            logger.error(f"Google Geocoding failed: {e}")

    # 2. Try Mapbox Geocoding if key is present
    mapbox_key = os.getenv("MAPBOX_API_KEY")
    if mapbox_key:
        try:
            logger.info(f"Querying Mapbox Geocoding API for '{q_clean}'")
            url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{urllib.parse.quote(q_clean)}.json?access_token={mapbox_key}&limit=1"
            req = urllib.request.Request(url)
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, context=ctx, timeout=4) as response:
                data = json.loads(response.read().decode())
                if data and data.get("features"):
                    center = data["features"][0]["center"] # [lon, lat]
                    coords = (float(center[1]), float(center[0]))
                    logger.info(f"Mapbox geocoding successful for '{q_clean}': {coords}")
                    return coords
        except Exception as e:
            logger.error(f"Mapbox Geocoding failed: {e}")

    # 3. Try OSM Nominatim (free, keyless)
    try:
        logger.info(f"Querying OSM Nominatim for '{q_clean}'")
        url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(q_clean)}&format=json&limit=1"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "AntigravityTravelPlanner/1.0 (contact: support@antigravity.travel)"}
        )
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, context=ctx, timeout=4) as response:
            data = json.loads(response.read().decode())
            if data:
                coords = (float(data[0]["lat"]), float(data[0]["lon"]))
                logger.info(f"Nominatim geocoding successful for '{q_clean}': {coords}")
                return coords
    except Exception as e:
        logger.error(f"OSM Nominatim Geocoding failed: {e}")

    # Local presets fallback for main destinations to ensure offline/low-network usability
    local_presets = {
        "delhi": (28.6139, 77.2090),
        "new delhi": (28.6139, 77.2090),
        "kolkata": (22.5726, 88.3639),
        "mumbai": (19.0760, 72.8777),
        "bangalore": (12.9716, 77.5946),
        "bengaluru": (12.9716, 77.5946),
        "jaipur": (26.9124, 75.7873),
        "udaipur": (24.5854, 73.7125),
        "goa": (15.2993, 74.1240),
        "panaji": (15.4909, 73.8278),
        "shillong": (25.5788, 91.8831),
        "cherrapunji": (25.2702, 91.7323),
        "munnar": (10.0889, 77.0595),
        "alleppey": (9.4981, 76.3388),
        "guwahati": (26.1445, 91.7362),
        "agra": (27.1767, 78.0081),
        "dehradun": (30.3165, 78.0322),
        "darjeeling": (27.0410, 88.2627),
        "kerala": (10.8505, 76.2711),
        "manali": (32.2396, 77.1887),
        "shimla": (31.1048, 77.1734),
        "tamil nadu": (11.1271, 78.6569),
        "rajasthan": (26.9124, 75.7873),
    }

    q_lower = q_clean.lower()
    for key, coords in local_presets.items():
        if key in q_lower or q_lower in key:
            logger.info(f"Found match in local presets for '{q_clean}': {coords}")
            return coords

    logger.warning(f"All geocoding APIs and presets failed to resolve '{q_clean}'. Returning None.")
    return None

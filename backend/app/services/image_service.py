import os
import json
import urllib.request
import urllib.parse
import urllib.error
import ssl
import threading
from app.utils.logger import get_logger

logger = get_logger("app.services.image")

UNSPLASH_ONLINE = True

USED_IMAGES = set()
USED_IMAGES_LOCK = threading.Lock()

IMAGE_CACHE = {}
IMAGE_CACHE_LOCK = threading.Lock()

UNSPLASH_BLOCKED = False
UNSPLASH_BLOCKED_LOCK = threading.Lock()

CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "image_cache.json")


ATTRACTION_QUERY_MAPPINGS = {
    # ---------- Meghalaya ----------
    "nongriat": "Living Root Bridge Nongriat",
    "umngot": "Umngot River Dawki crystal clear river boating",
    "dawki": "Umngot River Dawki crystal clear river boating",
    "krang suri": "Krang Suri Waterfall Jowai",
    "laitlum": "Laitlum Canyon Shillong",
    "wei sawdong": "Wei Sawdong Waterfall Cherrapunji",
    "mawsmai": "Mawsmai Cave Cherrapunji",
    "shnongpdeng": "Umngot River Shnongpdeng camping",
    "nongjrong": "Nongjrong Viewpoint Meghalaya",
    "umiam": "Umiam Lake Shillong",
    "mawlynnong": "Mawlynnong cleanest village",
    "phe phe": "Phe Phe Falls Meghalaya",
    "elephant falls": "Elephant Falls Shillong",
    "seven sisters": "Seven Sisters Falls Meghalaya",
    "balpakram": "Balpakram National Park",
    "mawphlang": "Mawphlang Sacred Forest",
    "don bosco": "Don Bosco Museum Shillong",
    "shillong peak": "Shillong Peak",

    # ---------- Rajasthan ----------
    "tanot mata": "Tanot Mata Temple Rajasthan border shrine",
    "hawa mahal": "Hawa Mahal Jaipur pink sandstone palace facade",
    "city palace": "City Palace Jaipur Rajasthan royal palace",
    "city palace udaipur": "City Palace Udaipur lake palace Rajasthan",
    "nahargarh": "Nahargarh Fort Jaipur hill fort",
    "nahargarh fort": "Nahargarh Fort Jaipur hill fort",
    "mehrangarh": "Mehrangarh Fort Jodhpur blue city fort",
    "mehrangarh fort": "Mehrangarh Fort Jodhpur blue city fort",
    "jaisalmer fort": "Jaisalmer Fort golden fort Rajasthan",
    "chittorgarh": "Chittorgarh Fort Rajasthan UNESCO fort",
    "birla mandir": "Birla Mandir Jaipur white marble temple",
    "jantar mantar": "Jantar Mantar Jaipur astronomical observatory",
    "jal mahal": "Jal Mahal Jaipur palace in lake",
    "sheesh mahal": "Sheesh Mahal Amber Fort Jaipur mirror palace",
    "amber": "Amber Fort Jaipur Rajasthan",
    "amer": "Amber Fort Jaipur Rajasthan",
    "dilwara": "Dilwara Jain Temples Mount Abu marble carvings",
    "pushkar": "Pushkar Lake Rajasthan ghats",
    "lake pichola": "Lake Pichola Udaipur boat lake",
    "ranthambore": "Ranthambore National Park tiger safari",
    "sam sand dunes": "Sam Sand Dunes Jaisalmer camel desert",
    "jaisalmer sand dunes": "Sam Sand Dunes Jaisalmer camel desert",

    # ---------- Kerala ----------
    "munnar": "Munnar tea gardens",
    "alleppey": "Alleppey backwaters houseboat",
    "varkala": "Varkala cliff beach",
    "wayanad": "Wayanad hills forest",
    "periyar": "Periyar National Park",
    "fort kochi": "Fort Kochi Chinese fishing nets",

    # ---------- Himachal ----------
    "jakhoo": "Jakhoo Temple Shimla",
    "kufri": "Kufri Shimla",
    "viceregal": "Viceregal Lodge Shimla",
    "solang": "Solang Valley Manali",
    "rohtang": "Rohtang Pass Manali",
    "hadimba": "Hadimba Temple Manali",

    # ---------- Sikkim ----------
    "tsomgo": "Tsomgo Lake Sikkim",
    "nathula": "Nathula Pass",
    "gurudongmar": "Gurudongmar Lake",
    "rumtek": "Rumtek Monastery",
    "yumthang": "Yumthang Valley",
    "pelling": "Pelling Skywalk",
    "goechala": "Goechala Trek",
    "teesta": "Teesta River Sikkim",

    # ---------- Nagaland ----------
    "dzukou": "Dzukou Valley",
    "kisama": "Kisama Heritage Village",
    "khonoma": "Khonoma Village",

    # ---------- India Famous ----------
    "taj mahal": "Taj Mahal Agra",
    "agra fort": "Agra Fort",
    "fatehpur sikri": "Fatehpur Sikri",
    "qutub": "Qutub Minar Delhi",
    "red fort": "Red Fort Delhi",
    "india gate": "India Gate Delhi",
    "lotus temple": "Lotus Temple Delhi",
    "gateway of india": "Gateway of India Mumbai",
    "marine drive": "Marine Drive Mumbai",
    "victoria memorial": "Victoria Memorial Kolkata",
    "howrah bridge": "Howrah Bridge Kolkata",
    "konark": "Konark Sun Temple",
    "jagannath": "Jagannath Temple Puri",
    "charminar": "Charminar Hyderabad",
    "golconda": "Golconda Fort Hyderabad",
    "mysore palace": "Mysore Palace",
    "hampi": "Hampi ruins",
    "brihadeeswara": "Brihadeeswara Temple",
    "meenakshi": "Meenakshi Temple Madurai",
    "golden temple": "Golden Temple Amritsar",
    "ajanta": "Ajanta Caves",
    "ellora": "Ellora Caves",
    "sun temple": "Konark Sun Temple"
}
def sanitize_image_url(url: str) -> str:
    if not url:
        return ""
    url = url.strip()
    if "images.unsplash.com" in url:
        base_url = url.split("?")[0]
        return f"{base_url}?q=80&w=600&auto=format&fit=crop"
    return url

def load_cache():
    global IMAGE_CACHE
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                sanitized_data = {}
                for k, v in data.items():
                    sanitized_data[k] = sanitize_image_url(v)
                with IMAGE_CACHE_LOCK:
                    IMAGE_CACHE.update(sanitized_data)
            logger.info(f"Loaded {len(IMAGE_CACHE)} cached image URLs from {CACHE_FILE}")
            # Persist sanitized cache immediately
            save_cache()
    except Exception as e:
        logger.error(f"Failed to load image cache: {e}")

def save_cache():
    try:
        with IMAGE_CACHE_LOCK:
            data_to_save = dict(IMAGE_CACHE)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data_to_save, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved image cache to {CACHE_FILE}")
    except Exception as e:
        logger.error(f"Failed to save image cache: {e}")

# Load the cache persistently on startup
load_cache()

def normalize_attraction_name(name: str) -> str:
    import re
    # Lowercase and strip
    n = name.lower().strip()
    # Remove common suffixes/words
    suffixes = [
        "waterfall", "falls", "fall", "lake", "river", "cave", "caves", "bridge",
        "viewpoint", "view point", "view", "canyon", "valley", "park", "national park",
        "reserve", "sanctuary", "forest", "temple", "church", "cathedral", "mosque",
        "monastery", "fort", "palace", "monument", "historic site", "heritage landmark",
        "museum", "gardens", "garden", "hills", "hill", "peak", "cliffs", "cliff",
        "boating point", "camping ground", "camps", "camp", "trail", "trek", "trekking",
        "safari", "tourism", "tourist", "village", "town"
    ]
    for s in suffixes:
        n = re.sub(rf'\b{s}\b', '', n)
    # Clean up whitespace
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def clear_used_images():
    global USED_IMAGES
    with USED_IMAGES_LOCK:
        USED_IMAGES.clear()
        logger.info("Cleared USED_IMAGES set for a new request session.")


def extract_photo_details(photo_data: dict, source: str) -> tuple[str, str, str, str]:
    """
    Extracts (image_url, description, alt, tags) from a photo object,
    accounting for whether it comes from Unsplash or Pexels.
    """
    if source == "unsplash":
        url = photo_data.get("urls", {}).get("regular") or photo_data.get("urls", {}).get("small") or ""
        url = sanitize_image_url(url)
        desc = photo_data.get("description") or ""
        alt = photo_data.get("alt_description") or ""
        tags = " ".join([t.get("title", "") for t in photo_data.get("tags", []) if t.get("title")]).lower()
        return url, desc, alt, tags
    elif source == "pexels":
        url = photo_data.get("src", {}).get("large2x") or photo_data.get("src", {}).get("large") or photo_data.get("src", {}).get("original") or ""
        url = sanitize_image_url(url)
        desc = photo_data.get("alt") or ""
        alt = photo_data.get("alt") or ""
        raw_url = photo_data.get("url") or ""
        slug = raw_url.split("/photo/")[-1].split("/")[0].replace("-", " ") if "/photo/" in raw_url else ""
        return url, desc, alt, slug
    return "", "", "", ""

def validate_photo(photo_data: dict, query: str, category: str = "") -> bool:
    """
    Validates if a photo is a high-confidence match for travel/scenery.
    Rejects low-confidence stock/interior images.
    """
    desc = (photo_data.get("description") or "").lower()
    alt = (photo_data.get("alt_description") or "").lower()
    tags_list = []
    if "tags" in photo_data:
        tags_list.extend([t.get("title", "") for t in photo_data.get("tags", []) if t.get("title")])
    tags_str = " ".join(tags_list).lower()
    full_text = f"{desc} {alt} {tags_str}"
    logger.info(f"PHOTO CHECK | query={query} | category={category} | text={full_text[:300]}")
    
    # Reject interior/stock/office images unless searching for room/hotel/palace
    interior_keywords = {
        "office", "offices", "meeting", "business", "workspace", "workplace", "furniture", "desktop", 
        "laptop", "laptops", "interior decoration", "living room", "bedroom", "inside room", 
        "kitchen", "library", "libraries", "desk", "desk space", "office space", "corporate", 
        "commercial", "classroom", "computer", "paperwork", "document", "office interior",
        "interior room", "lobby", "sofa", "chair", "table", "studio", "screen", "keyboard",
        "room", "rooms", "interior", "interiors", "indoor", "indoors", "inside"
    }
    
    query_clean = query.lower().replace(",", " ").replace("-", " ")
    indoor_search = any(w in query_clean or (category and w in category.lower()) for w in ["hotel", "resort", "stay", "room", "palace", "restaurant", "cafe", "bar", "museum", "temple", "church", "cathedral"])
    
    if not indoor_search:
        if any(w in full_text for w in interior_keywords):
            logger.warning(
    f"PHOTO REJECTED INTERIOR | query={query} | category={category} | text={full_text[:300]}"
)
            return False
        
        # Strict architecture rejection for nature spots
        nature_terms = ["waterfall", "falls", "river", "lake", "cave", "forest", "mountain", "valley", "canyon", "viewpoint", "trail", "trek"]
        is_nature_query = any(term in query_clean or (category and term in category.lower()) for term in nature_terms)
        if is_nature_query:
            irrelevant_architecture_keywords = {
                "building", "buildings", "architecture", "skyscraper", "skyscrapers", "cityscape", 
                "apartment", "apartments", "construction", "concrete", "urban", "downtown", "office building"
            }
            if any(w in full_text for w in irrelevant_architecture_keywords):
                logger.warning(f"Photo rejected: Contains modern/irrelevant architecture keywords for nature query '{query}'")
                return False
            
    # Category-specific strict validation checks
    cat_lower = (category or "").lower()
    NEGATIVE_TAGS = {
        "fort": [
            "beach", "ocean", "sea", "snow", "ice",
            "hotel", "bedroom", "room", "food",
            "restaurant", "kitchen"
        ],

        "palace": [
            "beach", "ocean", "snow",
            "food", "restaurant", "bedroom"
        ],

        "temple": [
            "beach", "ocean", "snow",
            "food", "restaurant", "hotel"
        ],

        "lake": [
            "bedroom", "hotel", "food",
            "restaurant", "kitchen"
        ],

        "waterfall": [
            "bedroom", "hotel", "restaurant",
            "office", "kitchen"
        ],

        "river": [
            "bedroom", "hotel", "restaurant"
        ],

        "bridge": [
            "beach", "hotel", "bedroom"
        ]
    }
    for key, bad_words in NEGATIVE_TAGS.items():

        if key in cat_lower:

            for bad in bad_words:

                if bad in full_text:

                    logger.warning(
                        f"PHOTO REJECTED ({category}) because '{bad}' was detected."
                    )

                    return False

            break

    if "waterfall" in cat_lower or "falls" in cat_lower or "fall" in cat_lower or "cascade" in query.lower():
        waterfall_keywords = {"waterfall", "falls", "fall", "cascade", "stream", "flow", "water" }
        if not any(w in full_text for w in waterfall_keywords):
            logger.warning(
    f"PHOTO REJECTED WATERFALL | query={query} | category={category} | text={full_text[:300]}"
)
            return False
            
    elif (
    "river" in cat_lower
    or "lake" in cat_lower
    or "pool" in cat_lower
    or "stream" in cat_lower
    or "boating" in cat_lower
    or "boat" in cat_lower
):
        water_keywords = {
        "river", "lake", "water", "boating", "boat",
        "stream", "pool", "kayak", "canoe", "rafting",
        "sea", "ocean", "nature", "landscape"
    }

        if not any(w in full_text for w in water_keywords):
            logger.warning(
            f"PHOTO REJECTED RIVER | query={query} | category={category} | text={full_text[:300]}"
            )
            return False
            
    elif "cave" in cat_lower or "cavern" in cat_lower or "caving" in cat_lower or "krem" in query.lower():
        cave_keywords = {"cave", "cavern", "rock", "stone", "underground", "dark", "formation", "geology", "inside"}
        if not any(w in full_text for w in cave_keywords):
            logger.warning(f"Photo rejected for cave category: no cave keywords for query '{query}'")
            return False
            
    elif "village" in cat_lower or "town" in cat_lower:
        village_keywords = {"village", "town", "street", "house", "homestay", "garden", "greenery", "tree", "plant", "nature", "scenic", "rural", "people"}
        if not any(w in full_text for w in village_keywords):
            logger.warning(f"Photo rejected for village category: no village keywords for query '{query}'")
            return False
            
    elif "bridge" in cat_lower:
        bridge_keywords = {"bridge", "root", "crossing", "trek", "jungle", "nature", "river", "stream", "path"}
        if not any(w in full_text for w in bridge_keywords):
            logger.warning(f"Photo rejected for bridge category: no bridge keywords for query '{query}'")
            return False

    elif any(k in cat_lower for k in ["canyon", "valley", "viewpoint", "gorge", "ridge", "cliff"]):
        canyon_keywords = {"canyon", "valley", "viewpoint", "view", "gorge", "ridge", "cliff", "mountain", "rock", "hill", "nature", "landscape", "scenery", "scenic"}
        if not any(w in full_text for w in canyon_keywords):
            logger.warning(f"Photo rejected for canyon/valley/viewpoint category: no canyon/valley keywords for query '{query}'")
            return False

    # Clean query words check
    query_words = set(w for w in query_clean.split() if len(w) > 2)
    if category:
        query_words.update(set(w.lower() for w in category.lower().split() if len(w) > 2))
        
    if query_words:
        overlap = sum(1 for w in query_words if w in full_text)
        if overlap == 0:
            travel_scenery_keywords = {
                "nature", "landscape", "scenery", "travel", "outdoor", "adventure", 
                "view", "vista", "scenic", "tourism", "destination", "mountain", 
                "waterfall", "river", "lake", "forest", "valley", "canyon", "cave", 
                "sky", "clouds", "tree", "water", "hill", "trek", "hike", "bridge"
            }
            has_scenery = any(w in full_text for w in travel_scenery_keywords)
            if not has_scenery:
                logger.warning(f"Photo rejected: No keyword overlap and no general scenery keywords for query '{query}' in tags/description")
                return False
                
    return True

def search_unsplash_only(q_search: str, category: str = "") -> str | None:
    """
    Queries official Unsplash API or keyless NAPI, returning first valid image URL.
    """
    global USED_IMAGES
    global USED_IMAGES_LOCK
    global UNSPLASH_BLOCKED
    
    with UNSPLASH_BLOCKED_LOCK:
        if UNSPLASH_BLOCKED:
            return None
            
    unsplash_key = os.getenv("UNSPLASH_API_KEY")
    if unsplash_key:
        try:
            logger.info(f"Querying official Unsplash API for '{q_search}'")
            url = f"https://api.unsplash.com/search/photos?query={urllib.parse.quote(q_search)}&per_page=8"
            req = urllib.request.Request(
                url,
                headers={"Authorization": f"Client-ID {unsplash_key}"}
            )
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, context=ctx, timeout=4) as response:
                data = json.loads(response.read().decode())
                if data and data.get("results"):
                    for photo in data["results"]:
                        img_url, desc, alt, tags = extract_photo_details(photo, "unsplash")
                        if img_url:
                            with USED_IMAGES_LOCK:
                                if img_url not in USED_IMAGES:
                                    photo_data = {"description": desc, "alt_description": alt, "tags": [{"title": t} for t in tags.split()]}
                                    if validate_photo(photo_data, q_search, category):
                                        USED_IMAGES.add(img_url)
                                        return img_url
        except Exception as e:
            logger.error(f"Official Unsplash API search failed: {e}")
            
    try:
        logger.info(f"Querying Unsplash NAPI for '{q_search}'")
        url = f"https://unsplash.com/napi/search/photos?query={urllib.parse.quote(q_search)}&per_page=8"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "*/*"
            }
        )
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, context=ctx, timeout=4) as response:
            data = json.loads(response.read().decode())
            if data and data.get("results"):
                for photo in data["results"]:
                    img_url, desc, alt, tags = extract_photo_details(photo, "unsplash")
                    if img_url:
                        with USED_IMAGES_LOCK:
                            if img_url not in USED_IMAGES:
                                photo_data = {"description": desc, "alt_description": alt, "tags": [{"title": t} for t in tags.split()]}
                                if validate_photo(photo_data, q_search, category):
                                    USED_IMAGES.add(img_url)
                                    return img_url
    except urllib.error.HTTPError as e:
        logger.error(f"Unsplash NAPI search failed: {e}")
        if e.code in (401, 403):
            with UNSPLASH_BLOCKED_LOCK:
                UNSPLASH_BLOCKED = True
    except Exception as e:
        logger.error(f"Unsplash NAPI search failed: {e}")
        
    return None

def fetch_travel_image(query: str, state: str = "", category: str = "", city: str = "", destination: str = "") -> str:
    """
    Fetches a travel image URL from Unsplash/Pexels using API keys or keyless NAPI.
    Caches results locally by clean query name to guarantee image consistency.
    """
    q_clean = query.strip()
    if not q_clean:
        return "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop"
        
    cache_key = q_clean.lower()
    q_norm = normalize_attraction_name(q_clean)
    
    with IMAGE_CACHE_LOCK:
        if cache_key in IMAGE_CACHE:
            logger.info(f"Image cache hit (exact) for '{q_clean}': {IMAGE_CACHE[cache_key]}")
            url = IMAGE_CACHE[cache_key]
            with USED_IMAGES_LOCK:
                USED_IMAGES.add(url)
            return url
            
        # Try normalized match fallback
        for k, url in IMAGE_CACHE.items():
            if normalize_attraction_name(k) == q_norm and q_norm != "":
                logger.info(f"Image cache hit (normalized) for '{q_clean}' matched with '{k}': {url}")
                IMAGE_CACHE[cache_key] = url
                save_cache()
                with USED_IMAGES_LOCK:
                    USED_IMAGES.add(url)
                return url
            
    img_url = _fetch_travel_image_raw(query, state, category, city, destination)
    
    with IMAGE_CACHE_LOCK:
        IMAGE_CACHE[cache_key] = img_url
    save_cache()
    return img_url

def _fetch_travel_image_raw(query: str, state: str = "", category: str = "", city: str = "", destination: str = "") -> str:
    logger.info("=" * 80)
    logger.info(f"IMAGE ORIGINAL QUERY : {query}")
    logger.info(f"STATE               : {state}")
    logger.info(f"CATEGORY            : {category}")
    logger.info(f"CITY                : {city}")
    logger.info(f"DESTINATION         : {destination}")
    global USED_IMAGES
    q_clean = query.strip()
    if not q_clean:
        return "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop"

    target_state = state or destination or ""
    q_lower = q_clean.lower()
    cat_clean = (category or "").strip().lower()
    
    # Classify category dynamically if it is generic, empty, or placeholder
    if not cat_clean or cat_clean in ["attraction", "sight", "place", "point", "destination", "location", "landmark"]:
        if any(k in q_lower for k in ["waterfall", "falls", "wei sawdong", "krang suri", "elephant falls"]):
            cat_clean = "waterfall"
        elif any(k in q_lower for k in ["cave", "mawsmai", "krem"]):
            cat_clean = "cave"
        elif any(k in q_lower for k in ["lake", "umiam", "ward lake"]):
            cat_clean = "lake"
        elif any(k in q_lower for k in ["river", "boating", "boat", "umngot", "shnongpdeng"]):
            cat_clean = "river"
        elif any(k in q_lower for k in ["village", "cleanest village", "mawlynnong", "khonoma", "town"]):
            cat_clean = "village"
        elif any(k in q_lower for k in ["bridge", "double decker", "root bridge"]):
            cat_clean = "bridge"
        elif any(k in q_lower for k in ["camping", "camp", "tent"]):
            cat_clean = "camping"
        elif any(k in q_lower for k in ["trekking", "trek", "hike", "hiking", "trail"]):
            cat_clean = "trekking"
        elif any(k in q_lower for k in ["national park", "reserve", "sanctuary", "balpakram"]):
            cat_clean = "national park"
        elif any(k in q_lower for k in ["viewpoint", "canyon", "valley", "sunrise", "laitlum"]):
            cat_clean = "canyon"
        elif any(k in q_lower for k in ["mountain", "hill", "peak", "snow", "himalaya", "ridge"]):
            cat_clean = "mountain"
        elif any(k in q_lower for k in ["forest", "wood", "nature", "park", "garden", "wildlife", "safari"]):
            cat_clean = "forest"
        else:
            cat_clean = "travel landmark"

    category_search_keywords = {
        "waterfall": "waterfall cascade falls",
        "river": "river crystal river boating",
        "lake": "lake mountain lake",
        "village": "village traditional village",
        "cave": "cave limestone cave",
        "bridge": "root bridge suspension bridge",
        "viewpoint": "mountain viewpoint",
        "canyon": "canyon gorge valley",
        "mountain": "mountain hill peak",
        "forest": "forest woods nature",
        "camping": "camping camp tent",
        "trekking": "trekking hike trail",
        "national park": "national park reserve sanctuary"
    }

    LANDMARK_IMAGE_QUERY = {

    # ======================
    # Rajasthan
    # ======================

    "hawa mahal": "Hawa Mahal Jaipur Rajasthan  pink sandstone palace",
    "amber fort": "Amber Fort Jaipur",
    "amer fort": "Amber Fort Jaipur Rajasthan UNESCO fort",
    "nahargarh fort": "Nahargarh Fort Jaipur Rajasthan fort",
    "jaigarh fort": "Jaigarh Fort Jaipur Rajasthan fort",
    "jal mahal": "Jal Mahal Jaipur lake palace",
    "city palace jaipur": "City Palace Jaipur",
    "city palace udaipur": "City Palace Udaipur",
    "mehrangarh fort": "Mehrangarh Fort Jodhpur",
    "umaid bhawan": "Umaid Bhawan Palace Jodhpur",
    "jaisalmer fort": "Jaisalmer Fort Rajasthan",
    "patwon ki haveli": "Patwon Ki Haveli Jaisalmer",
    "gadisar lake": "Gadisar Lake Jaisalmer",
    "sam sand dunes": "Sam Sand Dunes Jaisalmer camel desert",
    "thar desert": "Thar Desert Rajasthan dunes",
    "jantar mantar": "Jantar Mantar Jaipur",
    "chittorgarh fort": "Chittorgarh Fort Rajasthan UNESCO",
    "kumbhalgarh fort":"Kumbhalgarh Fort Rajasthan",
    "dilwara temple":"Dilwara Jain Temple Mount Abu marble",
    "dilwara temples": "Dilwara Jain Temple Mount Abu marble",
    "mount abu": "Mount Abu Rajasthan",
    "nakki lake": "Nakki Lake Mount Abu",
    "pushkar lake": "Pushkar Lake Rajasthan",
    "brahma temple": "Brahma Temple Pushkar",
    
    "ranthambore": "Ranthambore National Park",
    "keoladeo": "Keoladeo National Park Bharatpur",

    # ======================
    # Meghalaya
    # ======================

    "dawki": "Dawki Umngot River Meghalaya",
    "umngot": "Umngot River Dawki",
    "shnongpdeng": "Shnongpdeng Meghalaya",
    "krang suri": "Krang Suri Waterfall Meghalaya",
    "nohkalikai": "Nohkalikai Falls Meghalaya",
    "seven sisters": "Seven Sisters Waterfall Meghalaya",
    "elephant falls": "Elephant Falls Shillong",
    "mawlynnong": "Mawlynnong Village Meghalaya",
    "living root bridge": "Living Root Bridge Meghalaya",
    "double decker": "Double Decker Living Root Bridge",
    "wei sawdong": "Wei Sawdong Waterfall Meghalaya",
    "laitlum": "Laitlum Canyon Meghalaya",
    "mawsmai": "Mawsmai Cave Meghalaya",
    "arwah": "Arwah Cave Meghalaya",
    "umiam": "Umiam Lake Shillong",
    "ward lake": "Ward's Lake Shillong",
    "don bosco": "Don Bosco Museum Shillong",
    "shillong peak": "Shillong Peak",

    # ======================
    # Kerala
    # ======================

    "munnar": "Munnar Tea Gardens Kerala",
    "alleppey": "Alleppey Backwaters Kerala",
    "alappuzha": "Alappuzha Houseboat Kerala",
    "varkala": "Varkala Cliff Kerala",
    "kovalam": "Kovalam Beach Kerala",
    "athirapally": "Athirapally Waterfall Kerala",
    "thekkady": "Periyar National Park Kerala",
    "periyar": "Periyar Tiger Reserve",
    "wayanad": "Wayanad Kerala",
    "edakkal": "Edakkal Caves Kerala",
    "bekal": "Bekal Fort Kerala",
    "fort kochi": "Fort Kochi Kerala",

    # ======================
    # Goa
    # ======================

    "baga": "Baga Beach Goa",
    "calangute": "Calangute Beach Goa",
    "palolem": "Palolem Beach Goa",
    "dudhsagar": "Dudhsagar Waterfall Goa",
    "aguada": "Fort Aguada Goa",
    "chapora": "Chapora Fort Goa",

    # ======================
    # Uttarakhand
    # ======================

    "nainital": "Naini Lake Nainital",
    "naini lake": "Naini Lake Uttarakhand",
    "auli": "Auli Uttarakhand",
    "valley of flowers": "Valley of Flowers Uttarakhand",
    "kedarnath": "Kedarnath Temple",
    "badrinath": "Badrinath Temple",
    "rishikesh": "Lakshman Jhula Rishikesh",
    "haridwar": "Har Ki Pauri Haridwar",

    # ======================
    # Himachal
    # ======================

    "shimla": "Shimla Ridge",
    "manali": "Manali Himachal Pradesh",
    "spiti": "Spiti Valley",
    "kasol": "Kasol Himachal Pradesh",
    "triund": "Triund Trek Dharamshala",

    # ======================
    # Ladakh
    # ======================

    "pangong": "Pangong Lake Ladakh",
    "nubra": "Nubra Valley Ladakh",
    "khardung": "Khardung La Pass",
    "tsomoriri": "Tso Moriri Lake",

    # ======================
    # Kashmir
    # ======================

    "dal lake": "Dal Lake Srinagar",
    "gulmarg": "Gulmarg Kashmir",
    "sonamarg": "Sonamarg Kashmir",
    "pahalgam": "Pahalgam Kashmir",

    # ======================
    # Sikkim
    # ======================

    "tsomgo": "Tsomgo Lake Sikkim",
    "gurudongmar": "Gurudongmar Lake",
    "yumthang": "Yumthang Valley",
    "nathula": "Nathula Pass",

    # ======================
    # Tamil Nadu
    # ======================

    "meenakshi": "Meenakshi Temple Madurai",
    "brihadeeswarar": "Brihadeeswarar Temple",
    "ooty": "Ooty Botanical Garden",
    "kodaikanal": "Kodaikanal Lake",
    "mahabalipuram": "Shore Temple Mahabalipuram",

    # ======================
    # Karnataka
    # ======================

    "mysore palace": "Mysore Palace",
    "hampi": "Hampi Karnataka",
    "coorg": "Coorg Coffee Plantation",
    "jog falls": "Jog Falls Karnataka",
    "badami": "Badami Cave Temples",

    # ======================
    # Maharashtra
    # ======================

    "gateway of india": "Gateway of India Mumbai",
    "ajanta": "Ajanta Caves",
    "ellora": "Ellora Caves",
    "marine drive": "Marine Drive Mumbai",
    "raigad": "Raigad Fort",

    # ======================
    # Delhi
    # ======================

    "red fort": "Red Fort Delhi",
    "qutub minar": "Qutub Minar Delhi",
    "india gate": "India Gate Delhi",
    "lotus temple": "Lotus Temple Delhi",
    "humayun": "Humayun's Tomb",

    # ======================
    # Odisha
    # ======================

    "konark": "Konark Sun Temple",
    "jagannath": "Jagannath Temple Puri",
    "chilika": "Chilika Lake",
    "dhauli": "Dhauli Shanti Stupa",

    # ======================
    # Gujarat
    # ======================

    "statue of unity": "Statue of Unity Gujarat",
    "gir": "Gir National Park",
    "rann of kutch": "White Rann Kutch",
    "somnath": "Somnath Temple",

    # ======================
    # Assam
    # ======================

    "kaziranga": "Kaziranga National Park",
    "kamakhya": "Kamakhya Temple Guwahati",
    "majuli": "Majuli Island Assam",

    # ======================
    # Arunachal Pradesh
    # ======================

    "tawang": "Tawang Monastery",
    "ziro": "Ziro Valley",
    "sela": "Sela Pass",
    }

    # Map raw attraction query using specialized search terms
    q_mapped = q_clean
    # Use exact landmark mapping first
    for landmark, landmark_query in LANDMARK_IMAGE_QUERY.items():
        if landmark in q_lower:
            q_mapped = landmark_query
            cat_clean = "landmark"
            break

        # Normalize landmark names before dictionary lookup
    LANDMARK_ALIASES = {
        "hawa mahal": "Hawa Mahal Jaipur",
        "city palace": "City Palace Rajasthan",
        "jal mahal": "Jal Mahal Jaipur",
        "nahargarh": "Nahargarh Fort Jaipur",
        "amber fort": "Amber Fort Jaipur",
        "amer fort": "Amber Fort Jaipur",
        "mehrangarh": "Mehrangarh Fort Jodhpur",
        "jaswant thada": "Jaswant Thada Jodhpur",
        "umaid bhawan": "Umaid Bhawan Palace Jodhpur",
        "lake pichola": "Lake Pichola Udaipur",
        "jag mandir": "Jag Mandir Udaipur",
        "pushkar lake": "Pushkar Lake Rajasthan",
        "jantar mantar": "Jantar Mantar Jaipur",
        "city palace udaipur": "City Palace Udaipur",
        "city palace jaipur": "City Palace Jaipur",
        "sam sand dunes": "Sam Sand Dunes Jaisalmer",
        "jaisalmer fort": "Jaisalmer Fort Rajasthan",
        "patwon": "Patwon Ki Haveli Jaisalmer",
        "nathmal": "Nathmal Ki Haveli Jaisalmer",
        "salim singh": "Salim Singh Ki Haveli Jaisalmer",
        "chittorgarh": "Chittorgarh Fort Rajasthan",
        "kumbhalgarh": "Kumbhalgarh Fort Rajasthan",
        "dilwara": "Dilwara Temples Mount Abu",
        "ranthambore": "Ranthambore National Park",
    }
    for alias, landmark in LANDMARK_ALIASES.items():
        if alias in q_lower:
            q_mapped = landmark
            cat_clean = "landmark"
            logger.info(f"LANDMARK ALIAS MATCH -> {alias} -> {landmark}")
            break

    for key, val in ATTRACTION_QUERY_MAPPINGS.items():
        if key in q_lower:
            q_mapped = val
            break
    logger.info(f"IMAGE ORIGINAL QUERY = {q_clean}")
    logger.info(f"IMAGE CATEGORY = {cat_clean}")
    logger.info(f"IMAGE MAPPED QUERY = {q_mapped}")


    SEARCH_SUFFIX = {
        "waterfall": "waterfall cascade nature",
        "river": "river boating nature",
        "lake": "lake boating scenic",
        "cave": "limestone cave interior",
        "bridge": "living root bridge forest",
        "village": "traditional village rural",
        "fort": "fort heritage architecture",
        "palace": "palace royal architecture",
        "temple": "temple architecture heritage",
        "museum": "museum heritage",
        "observatory": "observatory astronomy",
        "market": "heritage market",
        "national park": "wildlife national park",
        "forest": "forest nature",
        "desert": "desert dunes landscape",
        "viewpoint": "viewpoint scenic landscape",
        "canyon": "canyon valley landscape",
        "trekking": "trek hiking trail",
        "camping": "camping nature"
        }
    # Define steps for Unsplash Search Strategy

    
   
    
    # ==========================================================
    # SMART SEARCH STRATEGY v2
    # ==========================================================

    city_clean = (city or "").strip()
    state_clean = (state or target_state or "").strip()

    steps = []

    # Highest confidence - exact attraction
    steps.append((f"{q_mapped} {city_clean} {state_clean} India".strip(), cat_clean))

    steps.append((f"{q_mapped} {state_clean} India".strip(), cat_clean))

    steps.append((q_mapped.strip(), cat_clean))

    # Attraction type in region
    if cat_clean:
        steps.append((f"{city_clean} {cat_clean}".strip(), cat_clean))
        steps.append((f"{state_clean} {cat_clean}".strip(), cat_clean))

    # Region searches
    if city_clean:
        steps.append((city_clean.strip(), cat_clean))

    if state_clean:
        steps.append((state_clean.strip(), cat_clean))

    # Only now use category keywords
    cat_keywords = category_search_keywords.get(cat_clean, cat_clean)

    steps.append((f"{cat_keywords} {state_clean}".strip(), cat_clean))
    steps.append((cat_keywords.strip(), cat_clean))

    # Remove duplicates
    seen = set()
    filtered_steps = []

    for q, c in steps:
        q = " ".join(q.split())
        if q.lower() not in seen:
            seen.add(q.lower())
            filtered_steps.append((q, c))

    steps = filtered_steps

    logger.info("=" * 80)
    logger.info("SMART IMAGE SEARCH PIPELINE")

    for i, (q, c) in enumerate(steps, 1):
        logger.info(f"{i}. {q}")

    logger.info("=" * 80)
    # 1. Try all steps on Unsplash first (Unsplash is the primary image source)
    for q_search, cat in steps:
        img_url = search_unsplash_only(q_search, cat)
        if img_url:
            return img_url
            
    # 2. If Unsplash fails, fallback to Pexels search
    pexels_key = os.getenv("PEXELS_API_KEY")
    if pexels_key:
        for q_search, cat in steps:
            try:
                logger.info(f"Querying Pexels API for '{q_search}' as fallback")
                url = f"https://api.pexels.com/v1/search?query={urllib.parse.quote(q_search)}&per_page=8"
                req = urllib.request.Request(
                    url,
                    headers={"Authorization": pexels_key}
                )
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                with urllib.request.urlopen(req, context=ctx, timeout=4) as response:
                    data = json.loads(response.read().decode())
                    if data and data.get("photos"):
                        for photo in data["photos"]:
                            img_url, desc, alt, tags = extract_photo_details(photo, "pexels")
                            if img_url:
                                with USED_IMAGES_LOCK:
                                    if img_url not in USED_IMAGES:
                                        photo_data = {"description": desc, "alt_description": alt, "tags": [{"title": t} for t in tags.split()]}
                                        if validate_photo(photo_data, q_search, cat):
                                            USED_IMAGES.add(img_url)
                                            return img_url
            except Exception as e:
                logger.error(f"Pexels API search failed: {e}")
                
    # 3. Local curated travel assets map fallback
    curated = {
        "delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=600&auto=format&fit=crop",
        "new delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=600&auto=format&fit=crop",
        "india gate": "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=600&auto=format&fit=crop",
        "qutub minar": "https://images.unsplash.com/photo-1610123598197-e67c80775a40?q=80&w=600&auto=format&fit=crop",
        "red fort": "https://images.unsplash.com/photo-1585135497273-1a86b09fe70e?q=80&w=600&auto=format&fit=crop",
        "lotus temple": "https://images.unsplash.com/photo-1595841696660-ab08cf472905?q=80&w=600&auto=format&fit=crop",
        "kolkata": "https://images.unsplash.com/photo-1558431382-27e303142255?q=80&w=600&auto=format&fit=crop",
        "victoria memorial": "https://images.unsplash.com/photo-1565293627083-d5d4d3a6d2f3?q=80&w=600&auto=format&fit=crop",
        "howrah bridge": "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=600&auto=format&fit=crop",
        "goa": "https://images.unsplash.com/photo-1512400329929-f4104ecd552d?q=80&w=600&auto=format&fit=crop",
        "baga beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
        "palolem beach": "https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=600&auto=format&fit=crop",
        "shillong": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?q=80&w=600&auto=format&fit=crop",
        "cherrapunji": "https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=600&auto=format&fit=crop",
        "munnar": "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?q=80&w=600&auto=format&fit=crop",
        "alleppey": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=600&auto=format&fit=crop",
        "darjeeling": "https://images.unsplash.com/photo-1559139413-869fe2c7e1b4?q=80&w=600&auto=format&fit=crop",
        "jaipur": "https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?q=80&w=600&auto=format&fit=crop",
        "udaipur": "https://images.unsplash.com/photo-1585128719715-46776b56a0d1?q=80&w=600&auto=format&fit=crop",
        "nature": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
        "beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
        "waterfall": "https://images.unsplash.com/photo-1432406186267-3473b3398c2a?q=80&w=600&auto=format&fit=crop",
        "monument": "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=600&auto=format&fit=crop",
        "temple": "https://images.unsplash.com/photo-1561361513-2d000a50f0db?q=80&w=600&auto=format&fit=crop",
        "dawki": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=600&auto=format&fit=crop",
        "shnongpdeng": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=600&auto=format&fit=crop",
        "krang suri": "https://images.unsplash.com/photo-1433832597046-4f10e10ac764?q=80&w=600&auto=format&fit=crop",
        "nongjrong": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
        "mawsmai": "https://images.unsplash.com/photo-1507163879400-419f50e128c9?q=80&w=600&auto=format&fit=crop",
        "cave": "https://images.unsplash.com/photo-1507163879400-419f50e128c9?q=80&w=600&auto=format&fit=crop",
        "laitlum": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
        "canyon": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
        "nongriat": "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop",
        "wei sawdong": "https://images.unsplash.com/photo-1433832597046-4f10e10ac764?q=80&w=600&auto=format&fit=crop",
        "mawlynnong": "https://images.unsplash.com/photo-1508873696983-2df519f0397e?q=80&w=600&auto=format&fit=crop",
        "umiam": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop"
    }

    q_lower = q_clean.lower()
    with USED_IMAGES_LOCK:
        for key, val in curated.items():
            if key in q_lower and val not in USED_IMAGES:
                USED_IMAGES.add(val)
                return val

    # 4. Categorized fallback collections for Level 3 - Category Matching (12 Travel Categories)
    categories = {
        "waterfall": [
            "https://images.unsplash.com/photo-1432406186267-3473b3398c2a?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1475113548554-5a36f1f523d6?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1508873696983-2df519f0397e?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1461882449521-c89479ed27ba?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=600&auto=format&fit=crop"
        ],
        "river": [
            "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1433832597046-4f10e10ac764?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop"
        ],
        "lake": [
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1518098268026-4e43a1a009de?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop"
        ],
        "village": [
            "https://images.unsplash.com/photo-1508873696983-2df519f0397e?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop"
        ],
        "forest": [
            "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=600&auto=format&fit=crop"
        ],
        "national_park": [
            "https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop"
        ],
        "mountain": [
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1486916856992-e4db22c8df33?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1461882449521-c89479ed27ba?q=80&w=600&auto=format&fit=crop"
        ],
        "bridge": [
            "https://images.unsplash.com/photo-1522083165195-342750297f46?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop"
        ],
        "cave": [
            "https://images.unsplash.com/photo-1507163879400-419f50e128c9?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=600&auto=format&fit=crop"
        ],
        "viewpoint": [
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop"
        ],
        "camping": [
            "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop"
        ],
        "trekking": [
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop"
        ],
        "general": [
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop"
        ]
    }

    # Classify query into one of the categories
    category_to_use = "general"
    if any(k in q_lower for k in ["waterfall", "falls", "wei sawdong", "krang suri", "elephant falls"]):
        category_to_use = "waterfall"
    elif any(k in q_lower for k in ["cave", "mawsmai", "krem"]):
        category_to_use = "cave"
    elif any(k in q_lower for k in ["lake", "umiam", "ward lake"]):
        category_to_use = "lake"
    elif any(k in q_lower for k in ["river", "boating", "boat", "umngot", "shnongpdeng"]):
        category_to_use = "river"
    elif any(k in q_lower for k in ["village", "cleanest village", "mawlynnong", "khonoma", "town"]):
        category_to_use = "village"
    elif any(k in q_lower for k in ["bridge", "double decker", "root bridge"]):
        category_to_use = "bridge"
    elif any(k in q_lower for k in ["camping", "camp", "tent"]):
        category_to_use = "camping"
    elif any(k in q_lower for k in ["trekking", "trek", "hike", "hiking", "trail"]):
        category_to_use = "trekking"
    elif any(k in q_lower for k in ["national park", "reserve", "sanctuary", "balpakram"]):
        category_to_use = "national_park"
    elif any(k in q_lower for k in ["viewpoint", "canyon", "valley", "sunrise", "laitlum"]):
        category_to_use = "viewpoint"
    elif any(k in q_lower for k in ["mountain", "hill", "peak", "snow", "himalaya", "ridge", "kufri"]):
        category_to_use = "mountain"
    elif any(k in q_lower for k in ["forest", "wood", "nature", "park", "garden", "wildlife", "safari"]):
        category_to_use = "forest"

    img_list = categories[category_to_use]
    
    # Custom deterministic hash function for consistent fallbacks
    h = 0
    for char in q_clean:
        h = (h * 31 + ord(char)) & 0xFFFFFFFF
    
    with USED_IMAGES_LOCK:
        for offset in range(len(img_list)):
            idx = (h + offset) % len(img_list)
            fallback_url = img_list[idx]
            if fallback_url not in USED_IMAGES:
                USED_IMAGES.add(fallback_url)
                return fallback_url
                
        return img_list[h % len(img_list)]

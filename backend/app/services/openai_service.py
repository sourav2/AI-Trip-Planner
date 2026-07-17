import os
import json
import ssl
import urllib.request
import urllib.parse
import asyncio
from functools import partial
from openai import OpenAI
from app.prompts.travel_prompts import SYSTEM_PROMPT_CHAT, SYSTEM_PROMPT_ITINERARY
from app.utils.logger import get_logger

# Import dynamic service layers
from app.services.geocoding_service import geocode_location
from app.services.image_service import fetch_travel_image
from app.services.attraction_service import discover_nearby_attractions, calculate_haversine_distance, get_parent_location_details
from app.services.route_service import get_route
from app.services.recommendation_engine import RecommendationEngine

logger = get_logger("app.services.openai_service")

DESTINATION_SUB_REGIONS = {
    "shimla": ["Mall Road & Ridge District", "Kufri Valley", "Mashobra & Craignano", "Chail Wilderness", "Naldehra Hills", "Jakhoo Temple Ridge"],
    "meghalaya": ["Shillong Hills District", "Cherrapunji (Sohra) Valley", "Dawki Clean River Area", "Mawlynnong Living Root Bridges", "Jowai Hills", "Umiam Lake Coastline"],
    "shillong": ["Police Bazar & Mall Road", "Laitlum Canyons", "Umiam Lake Coastline", "Elephant Falls Area", "Shillong Peak Heights"],
    "goa": ["Panaji & Old Goa Heritage", "Calangute & Baga Beaches", "Anjuna & Vagator Cliffs", "Colva & Palolem Shores", "Dudhsagar Waterfalls Forest"],
    "darjeeling": ["Tiger Hill Viewpoints", "Ghum Monasteries", "Mirik Lake Coast", "Happy Valley Tea Estate", "Batasia Loop District"],
    "udaipur": ["Lake Pichola Palace Coast", "Fateh Sagar Lake Road", "Sajjangarh Monsoon Palace", "City Palace Plaza", "Jagdish Temple Hub"],
    "jaipur": ["Amber Fort Valley", "Pink City & Hawa Mahal Plaza", "Nahargarh & Jaigarh Hills", "Galta Ji Temple Ravine", "Jal Mahal Lake Coast"],
    "munnar": ["Eravikulam National Park", "Mattupetty Lake Coast", "Marayoor Sandalwood Forests", "Anamudi Peak Ridge", "Devikulam Tea Hills"],
    "mumbai": ["Colaba & Gateway Plaza", "Marine Drive & Chowpatty Coast", "Bandra Fort West Coast", "Juhu Beach District", "Elephanta Caves Island"],
    "delhi": ["Connaught Place Hub", "Old Delhi & Red Fort Area", "South Delhi Heritage Hub", "Qutub Minar District", "India Gate Central Plaza"],
    "kolkata": ["Victoria Memorial Gardens", "Howrah Bridge & Hooghly Coast", "Park Street Food Hub", "Salt Lake Township", "Dakshineswar Temple Plaza"],
    "bangalore": ["Cubbon Park Botanical", "Indiranagar Cafe District", "Nandi Hills Ridge", "Lalbagh Flower Gardens", "Bannerghatta Wildlife Safari"]
}

class OpenAIService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if self.api_key:
            logger.info("Initializing OpenAI client with configured API key.")
            try:
                self.client = OpenAI(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}", exc_info=True)
                self.client = None
        else:
            logger.warning("No OPENAI_API_KEY environment variable found. OpenAI client set to None (using fallback mock travel engine).")
            self.client = None

    def geocode_place(self, query: str) -> tuple[float, float]:
        """Geocodes place forwarding to geocoding service."""
        return geocode_location(query)

    def calculate_haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        return calculate_haversine_distance(lat1, lon1, lat2, lon2)

    async def get_chat_response(self, messages: list) -> str:
        """
        Sends the message history to OpenAI, or runs a mock conversational reply if API key is missing.
        """
        logger.info(f"Received chat request with {len(messages)} messages.")
        if self.client:
            try:
                system_message = {"role": "system", "content": SYSTEM_PROMPT_CHAT}
                api_messages = [system_message] + [m for m in messages if m.get("role") != "system"]
                
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=api_messages,
                    temperature=0.7,
                    max_tokens=1000
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.error(f"Error connecting to OpenAI API: {e}")
                return f"Error connecting to OpenAI API: {str(e)}. Please check your backend configuration."
        
        last_message = messages[-1]["content"] if messages else ""
        return self._generate_mock_chat_response(last_message, messages)

    async def get_autocomplete_suggestions(self, query: str) -> list:
        if not query:
            return []
        q_lower = query.strip().lower()
        
        # Query OSM Nominatim search for autocomplete
        suggestions = []
        try:
            url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&limit=5&addressdetails=1"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "AntigravityTravelPlanner/1.0 (contact: support@antigravity.travel)"}
            )
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, context=ctx, timeout=3) as response:
                data = json.loads(response.read().decode())
                for item in data:
                    display_name = item["display_name"]
                    lat = float(item["lat"])
                    lon = float(item["lon"])
                    suggestions.append({
                        "name": display_name,
                        "lat": lat,
                        "lon": lon
                    })
        except Exception as e:
            logger.error(f"Nominatim autocomplete query failed: {e}")

        # If Nominatim has low results, inject common Indian hubs matching query
        local_db = [
            {"name": "Delhi, India", "lat": 28.6139, "lon": 77.2090},
            {"name": "Dehradun, Uttarakhand, India", "lat": 30.3165, "lon": 78.0322},
            {"name": "Candolim, Goa, India", "lat": 15.5164, "lon": 73.7632},
            {"name": "Kolkata, West Bengal, India", "lat": 22.5726, "lon": 88.3639},
            {"name": "Guwahati, Assam, India", "lat": 26.1445, "lon": 91.7362},
            {"name": "Shillong, Meghalaya, India", "lat": 25.5788, "lon": 91.8831},
            {"name": "Munnar, Kerala, India", "lat": 10.0889, "lon": 77.0595},
            {"name": "Mumbai, Maharashtra, India", "lat": 19.0760, "lon": 72.8777},
            {"name": "Bangalore, Karnataka, India", "lat": 12.9716, "lon": 77.5946},
            {"name": "Jaipur, Rajasthan, India", "lat": 26.9124, "lon": 75.7873},
            {"name": "Udaipur, Rajasthan, India", "lat": 24.5854, "lon": 73.7125},
            {"name": "Darjeeling, West Bengal, India", "lat": 27.0410, "lon": 88.2627}
        ]
        
        for item in local_db:
            if q_lower in item["name"].lower() and len(suggestions) < 5:
                if not any(s["name"].split(',')[0].strip() == item["name"].split(',')[0].strip() for s in suggestions):
                    suggestions.append(item)
                    
        return suggestions[:5]

    async def get_nearby_attractions(self, dest: str, lat: float = None, lon: float = None, place_types: list = None) -> list:
        logger.info(f"DESTINATION RECEIVED = {dest}")
        logger.info(f"LAT = {lat}, LON = {lon}")
        """Discovers attractions forwarding to attractions service."""
        return await discover_nearby_attractions(dest, lat, lon, place_types)

    async def get_osrm_route(self, coords: list[list[float]], allow_international_transit: bool = False) -> dict:
        """Queries routing service."""
        return await get_route(coords, allow_international_transit)
    
    async def generate_itinerary(self, preferences: dict) -> dict:
        logger.info(f"DESTINATION RECEIVED: {preferences.get('destination')}")
        """
        Generates structured JSON itinerary based on user preferences.
        Calls OpenAI if key exists, otherwise falls back to a clean mock engine.
        """
        dest = preferences.get("destination", "Meghalaya")
        

        start_location = preferences.get("start_location", "Guwahati")
        days = int(preferences.get("total_days", 4))
        travelers = int(preferences.get("travelers", 2))
        budget = float(preferences.get("budget", 20000))
        comfort = preferences.get("comfort_level", "moderate")
        transport = preferences.get("transport_preference", "fastest")
        place_types = preferences.get("place_types", ["nature"])
        engine = RecommendationEngine()
        recommended_places = engine.get_top_attractions(
            destination=dest.lower(),
            travel_style=place_types[0] if place_types else "nature"
        )
        logger.info(f"Generating itinerary for destination: '{dest}'")

        itinerary = None
        real_places = []

        for rec in recommended_places[:3]:
            logger.info(f"Discovering attractions around: {rec['name']}")

            places = await self.get_nearby_attractions(
                rec["name"],
                place_types=place_types
            )

            real_places.extend(places)
            
            seen = set()
            deduped = []

            for p in real_places:
                name = p.get("name", "").lower().strip()

                if name not in seen:
                    seen.add(name)
                    deduped.append(p)

            real_places = deduped

        logger.info(
            f"Collected {len(real_places)} attractions from recommendation hubs"
        )

        logger.info("===== DISCOVERY HUBS USED =====")
        logger.info([r["name"] for r in recommended_places[:3]])
        
        logger.info("=====  DISCOVERED REAL PLACES =====")
        logger.info([p["name"] for p in real_places])

        recommendation_context = "\n".join([
            f"- {p['name']}: {', '.join(p['reasons'])}"
            for p in recommended_places
        ])

        if self.client:
            try:
                # Discovered real attractions to inject into OpenAI prompt context
                logger.info("===== TOP RECOMMENDATIONS =====")
                logger.info([p["name"] for p in recommended_places[:5]])

                logger.info("===== GOOGLE/MAPS PLACES =====")
                logger.info([p.get("name") for p in real_places])

                logger.info("===== FILTERED REAL PLACES =====")
                logger.info([p.get("name") for p in real_places])

                places_context = "\n".join([f"- Name: {p['name']}. Summary: {p['summary']}" for p in real_places[:6]])
                
                user_content = f"""
                Generate a {days}-day itinerary for {dest}

                Number of travelers: {travelers}
                Budget: {budget}

                Interests:
                {", ".join(place_types)}

                PRIORITIZED ATTRACTIONS
                (selected by recommendation engine):

                {recommendation_context}

                OTHER DISCOVERED ATTRACTIONS:

                {places_context}

                You MUST build the itinerary around the attractions listed
                under PRIORITIZED ATTRACTIONS.

                At least 80% of all sightseeing activities must come from
                that list.

                Only use OTHER DISCOVERED ATTRACTIONS if additional places
                are required.
                """
                logger.info("===== RECOMMENDATION ENGINE OUTPUT =====")
                logger.info(recommendation_context)

                logger.info("===== FINAL PROMPT =====")
                logger.info(user_content)
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT_ITINERARY},
                        {"role": "user", "content": user_content}
                    ],
                    temperature=0.5,
                    response_format={"type": "json_object"}
                )
                itinerary = json.loads(response.choices[0].message.content)
            except Exception as e:
                logger.error(f"OpenAI generation failed: {e}. Falling back to Gemini.")

        allow_transit = preferences.get("allow_international_transit", False)
        logger.info(f"ITINERARY AFTER OPENAI = {type(itinerary)}")
        logger.info(f"ITINERARY CONTENT = {itinerary}")
        if not itinerary:
            gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
            if gemini_key:
                try:
                    logger.info("Using Gemini Service as OpenAI fallback...")
                    from app.services.gemini_service import GeminiService
                    gs = GeminiService()
                    itinerary = await gs.generate_itinerary(
                        dest, days, budget, comfort, transport, place_types, real_places
                    )
                except Exception as e:
                    logger.error(f"Gemini generation failed: {e}. Falling back to mock engine.")
                    itinerary = None

        if not itinerary:
            itinerary = await self._generate_mock_itinerary(start_location, dest, days, travelers, budget, comfort, transport, place_types, allow_transit)
        else:
            # Post-process OpenAI itinerary to inject geocodings and Unsplash images
            itinerary["start_location"] = start_location
            start_c = self.geocode_place(start_location)
            itinerary["start_coords"] = list(start_c) if start_c else [26.1445, 91.7362]
            dest_c = self.geocode_place(dest)
            if not dest_c:
                logger.error(f"Failed to geocode destination: {dest}")
                return itinerary

            itinerary["dest_coords"] = list(dest_c)
            itinerary["allow_international_transit"] = allow_transit
            
            # Merge OpenAI returned attractions and all discovered real_places
            openai_atts = itinerary.get("nearby_attractions", [])
            logger.info(f"[PIPELINE LOG] Fetch: Discovered {len(real_places)} places from APIs. OpenAI returned {len(openai_atts)} attractions.")
            
            # Exclude only region names
            region_names_lower = {r.get("region_name", "").lower().strip() for r in itinerary.get("regions", [])}
                    
            seen_names = {a.get("name", "").lower().strip() for a in openai_atts if a.get("name")}
            merged_atts = list(openai_atts)
            
            # Add other real-world attractions not in regions
            EXCLUDED_TYPES = {
            "restaurant",
            "restaurant/cafe",
            "restaurant/café",
            "cafe",
            "café",
            "food",
            "hotel",
            "resort",
            "lodging",
            "guest house",
            "homestay",
            "bar",
            "bakery"
            }

            for p in real_places:
                place_type = p.get("type", "").lower().strip()

                if place_type in EXCLUDED_TYPES:
                    continue

                p_name_clean = p["name"].lower().strip()

                if p_name_clean not in seen_names and p_name_clean not in region_names_lower:
                    seen_names.add(p_name_clean)
                    merged_atts.append(p)
                
            logger.info(f"[PIPELINE LOG] Filtering: Merged total of {len(merged_atts)} attractions after deduplication and region filtering.")
            
            # 1. Resolve destination state
            dest_lat, dest_lon = itinerary["dest_coords"]
            try:
                _, state_dest = await get_parent_location_details(dest_lat, dest_lon)
            except Exception:
                state_dest = ""
                
            if not state_dest:
                dest_low = dest.lower()
                if "nagaland" in dest_low or "kohima" in dest_low:
                    state_dest = "Nagaland"
                elif "meghalaya" in dest_low or "shillong" in dest_low or "cherrapunji" in dest_low:
                    state_dest = "Meghalaya"
                elif "kerala" in dest_low or "kochi" in dest_low or "munnar" in dest_low:
                    state_dest = "Kerala"
                elif "rajasthan" in dest_low or "jaipur" in dest_low or "udaipur" in dest_low:
                    state_dest = "Rajasthan"
                elif "goa" in dest_low:
                    state_dest = "Goa"
                elif "himachal" in dest_low or "shimla" in dest_low or "manali" in dest_low:
                    state_dest = "Himachal Pradesh"

            # 2. Populate and validate attractions concurrently
            async def process_single_attraction(att):
                loop = asyncio.get_event_loop()
                logger.info(f"[START] {att.get('name')}")
                if "coords" not in att or not att["coords"]:
                    att_name = att.get("name", "")
                    coords_res = itinerary["dest_coords"]
                    if not coords_res:
                        logger.warning(f"Geocoding failed for attraction '{att_name}'. Skipping attraction.")
                        return None
                    att["coords"] = list(coords_res)
                    att["image_url"] = ""
                    dist = self.calculate_haversine_distance(
                        itinerary["dest_coords"][0], itinerary["dest_coords"][1],
                        att["coords"][0], att["coords"][1]
                    )
                    att["distance"] = f"{round(dist, 1)} km from center"
                    
                    # Estimate drive time
                    drive_time_mins = round(dist * 2.0)
                    if drive_time_mins < 10:
                        drive_time_str = "5-10 mins drive"
                    elif drive_time_mins < 60:
                        drive_time_str = f"{drive_time_mins} mins drive"
                    else:
                        h_part = drive_time_mins // 60
                        m_part = drive_time_mins % 60
                        drive_time_str = f"{h_part} hr drive" if m_part == 0 else f"{h_part} hr {m_part} mins drive"
                    att["drive_time"] = drive_time_str

                    att["visit_duration"] = att.get("visit_duration", "2 Hours")
                    att["local_cost"] = att.get("local_cost", 0.0)
                    att["highlights"] = att.get("highlights", ["Sightseeing"])
                    att["quick_facts"] = att.get("quick_facts", {"Type": "Attraction", "Rating": "4.5 / 5.0"})
                    att["nearby_activities"] = att.get("nearby_activities", ["Walking Tour"])
                else:
                    if not att["coords"] or len(att["coords"]) < 2:
                        logger.warning(f"Invalid coordinates for attraction '{att.get('name')}'. Skipping attraction.")
                        return None
                    dist = self.calculate_haversine_distance(
                        itinerary["dest_coords"][0], itinerary["dest_coords"][1],
                        att["coords"][0], att["coords"][1]
                    )
                    city_name = (
                        att.get("city")
                        or att.get("district")
                        or att.get("region")
                        or ""
                    )
                    if "image_url" not in att or not att["image_url"]:

                        city_name = (
                            att.get("city")
                            or att.get("district")
                            or att.get("region")
                            or ""
                        )

                        fetch_fn = partial(
                            fetch_travel_image,
                            query=att.get("name", ""),
                            state=state_dest,
                            category=att.get("type", ""),
                            city=city_name,
                            destination=dest,
                        )

                        att["image_url"] = await loop.run_in_executor(
                            None,
                            fetch_fn
                        )
                    
                    # Estimate drive time
                    drive_time_mins = round(dist * 2.0)
                    if drive_time_mins < 10:
                        drive_time_str = "5-10 mins drive"
                    elif drive_time_mins < 60:
                        drive_time_str = f"{drive_time_mins} mins drive"
                    else:
                        h_part = drive_time_mins // 60
                        m_part = drive_time_mins % 60
                        drive_time_str = f"{h_part} hr drive" if m_part == 0 else f"{h_part} hr {m_part} mins drive"
                    att["drive_time"] = drive_time_str

                # Validate State and Distance
                is_valid = True
                if dist > 250.0:
                    is_valid = False
                elif state_dest and dist > 50.0:
                    try:
                        _, state_att = await get_parent_location_details(att["coords"][0], att["coords"][1])
                        if state_att and state_dest.lower() not in state_att.lower() and state_att.lower() not in state_dest.lower():
                            is_valid = False
                    except Exception:
                        pass
                
                if is_valid:
                    logger.info(f"[DONE] {att.get('name')}")
                    return att
                else:
                    logger.warning(f"Discarding attraction '{att.get('name')}' outside of state '{state_dest}' (dist={dist} km)")
                    logger.info(f"[DONE] {att.get('name')}")
                    return None
            
            if real_places:
                logger.info(real_places[0])
            else:
                logger.warning("No real places discovered")
            logger.info("START attraction processing")
            tasks = [process_single_attraction(att) for att in merged_atts]
            try:
                results = await asyncio.wait_for(
                    asyncio.gather(*tasks),
                    timeout=30
                )
            except asyncio.TimeoutError:
                logger.error("Attraction enrichment timed out after 30 seconds")
                results = []
            logger.info("FINISHED attraction processing")
            validated_atts = [r for r in results if r is not None]

            # If fewer than 12 validated, backfill with verified real_places
            if len(validated_atts) < 12:
                for rp in real_places:
                    if len(validated_atts) >= 15:
                        break
                    if not any(v["name"].lower().strip() == rp["name"].lower().strip() for v in validated_atts):
                        rp["coords"] = [rp["lat"], rp["lon"]]
                        dist = self.calculate_haversine_distance(
                            itinerary["dest_coords"][0], itinerary["dest_coords"][1],
                            rp["lat"], rp["lon"]
                        )
                        rp["distance"] = f"{round(dist, 1)} km from center"
                        
                        # Estimate drive time
                        drive_time_mins = round(dist * 2.0)
                        if drive_time_mins < 10:
                            drive_time_str = "5-10 mins drive"
                        elif drive_time_mins < 60:
                            drive_time_str = f"{drive_time_mins} mins drive"
                        else:
                            h_part = drive_time_mins // 60
                            m_part = drive_time_mins % 60
                            drive_time_str = f"{h_part} hr drive" if m_part == 0 else f"{h_part} hr {m_part} mins drive"
                        rp["drive_time"] = drive_time_str

                        city_name = (
                            rp.get("city")
                            or rp.get("district")
                            or rp.get("region")
                            or ""
                        )

                        rp["image_url"] = await asyncio.get_event_loop().run_in_executor(
                            None,
                            lambda: fetch_travel_image(
                                query=rp.get("name", ""),
                                state=state_dest,
                                category=rp.get("type", ""),
                                city=city_name,
                                destination=dest,
                            )
                        )
                        validated_atts.append(rp)

            final_atts = validated_atts[:20]
            logger.info(f"[PIPELINE LOG] Final sent: Sending {len(final_atts)} nearby attractions to frontend.")
            itinerary["nearby_attractions"] = final_atts
            
            # Geocode and validate regions concurrently
            async def process_single_region(region):
                loop = asyncio.get_event_loop()
                reg_name = region.get("region_name", "")
                coords_res = await loop.run_in_executor(None, self.geocode_place, f"{reg_name}, {dest}")
                if not coords_res:
                    logger.warning(f"Geocoding failed for region '{reg_name}'. Skipping region.")
                    logger.info(f"[DONE] {reg_name}")
                    return None
                reg_coords = list(coords_res)
                region["region_coords"] = reg_coords
                region["image_url"] = ""
                dist = self.calculate_haversine_distance(
                    itinerary["dest_coords"][0], itinerary["dest_coords"][1],
                    reg_coords[0], reg_coords[1]
                )
                
                is_valid = True
                if dist > 250.0:
                    is_valid = False
                elif state_dest and dist > 50.0:
                    try:
                        _, state_reg = await get_parent_location_details(reg_coords[0], reg_coords[1])
                        if state_reg and state_dest.lower() not in state_reg.lower() and state_reg.lower() not in state_dest.lower():
                            is_valid = False
                    except Exception:
                        pass
                
                if is_valid:
                    logger.info(f"[DONE] {reg_name}")
                    return region
                else:
                    logger.warning(f"Discarding region '{reg_name}' outside of state '{state_dest}' (dist={dist} km)")
                    logger.info(f"[DONE] {reg_name}")
                    return None

            region_tasks = [process_single_region(r) for r in itinerary.get("regions", [])]
            region_results = await asyncio.gather(*region_tasks)
            validated_regions = [r for r in region_results if r is not None]
            
            if not validated_regions:
                # Use base destination as fallback region
                validated_regions = [
                    {
                        "region_name": dest,
                        "region_coords": itinerary["dest_coords"],
                        "quick_summary": f"Scenic sights in and around {dest}.",
                        "hotel_type": "Boutique Homestay",
                        "transport": "Local rental cab",
                        "estimated_cost": 5000.0,
                        "places": [a["name"] for a in final_atts[:3]],
                        "timeline": []
                    }
                ]
            itinerary["regions"] = validated_regions

            # Get actual road route geometry
            route_coords = [itinerary["start_coords"]]
            for region in itinerary.get("regions", []):
                coords = region.get("region_coords")
                if coords and len(coords) >= 2:
                    route_coords.append(coords)
            route_coords.append(itinerary["dest_coords"])
            
            route_info = await get_route(route_coords, allow_transit)
            route_dist = route_info["distance"]
            itinerary["route_data"] = route_info
            
            itinerary["transport_options"] = self.generate_dynamic_transport_options(
                start_location, dest,
                itinerary["start_coords"], itinerary["dest_coords"],
                route_dist, travelers, budget, comfort, days,
                itinerary.get("regions", []), itinerary.get("nearby_attractions", []),
                allow_international_transit=allow_transit
            )
            
            first_key = list(itinerary["transport_options"].keys())[0]
            active_opt = itinerary["transport_options"].get(transport, itinerary["transport_options"][first_key])
            itinerary["transport_preference"] = active_opt.get("opt_id", first_key)
            itinerary["budget_utilization"] = active_opt["budget_utilization"]
            itinerary["regions"] = active_opt["regions"]
            itinerary["nearby_attractions"] = active_opt["nearby_attractions"]

        # Resolve destination state for the root destination image URL
        dest_coords = itinerary.get("dest_coords")
        state_dest = ""
        if dest_coords and len(dest_coords) >= 2:
            # Resolve destination state without reverse geocoding if possible
            dest_low = dest.lower()

        KNOWN_STATES = {
            "jaipur": "Rajasthan",
            "udaipur": "Rajasthan",
            "jodhpur": "Rajasthan",
            "jaisalmer": "Rajasthan",
            "pushkar": "Rajasthan",
            "ajmer": "Rajasthan",
            "bikaner": "Rajasthan",
            "chittorgarh": "Rajasthan",
            "mount abu": "Rajasthan",
            "ranthambore": "Rajasthan",

            "munnar": "Kerala",
            "kochi": "Kerala",
            "alleppey": "Kerala",
            "wayanad": "Kerala",

            "shillong": "Meghalaya",
            "cherrapunji": "Meghalaya",
            "sohra": "Meghalaya",
            "dawki": "Meghalaya",

            "gangtok": "Sikkim",
            "pelling": "Sikkim",
            "lachung": "Sikkim",

            "manali": "Himachal Pradesh",
            "shimla": "Himachal Pradesh",
        }

        state_dest = None

        for city, state in KNOWN_STATES.items():
            if city in dest_low:
                state_dest = state
                logger.info(f"Using local state mapping: {dest} -> {state}")
                break

        if state_dest is None:
            try:
                _, state_dest = await get_parent_location_details(
                    dest_coords[0],
                    dest_coords[1]
                )
            except Exception:
                state_dest = None
        if not state_dest:
            dest_low = dest.lower()
            if "nagaland" in dest_low or "kohima" in dest_low:
                state_dest = "Nagaland"
            elif "meghalaya" in dest_low or "shillong" in dest_low or "cherrapunji" in dest_low:
                state_dest = "Meghalaya"
            elif "kerala" in dest_low or "kochi" in dest_low or "munnar" in dest_low:
                state_dest = "Kerala"
            elif "rajasthan" in dest_low or "jaipur" in dest_low or "udaipur" in dest_low:
                state_dest = "Rajasthan"
            elif "goa" in dest_low:
                state_dest = "Goa"
            elif "himachal" in dest_low or "shimla" in dest_low or "manali" in dest_low:
                state_dest = "Himachal Pradesh"

        itinerary["destination_image_url"] = fetch_travel_image(dest, state_dest)
        return itinerary

    async def finalize_itinerary_from_cart(self, preferences: dict) -> dict:
        """
        Organizes selected attractions sequentially using a greedy path finder,
        segments stops into regions, and builds final route geometry and budget details.
        """
        dest = preferences.get("destination", "Meghalaya")
        logger.info("=" * 60)
        logger.info(f"Destination from preferences: {dest}")
        logger.info(f"Full preferences: {preferences}")
        logger.info("=" * 60)
        start_location = preferences.get("start_location", "Guwahati")
        days = int(preferences.get("total_days", 4))
        travelers = int(preferences.get("travelers", 2))
        budget = float(preferences.get("budget", 20000))
        comfort = preferences.get("comfort_level", "moderate")
        transport = preferences.get("transport_preference", "fastest")
        selected_places = preferences.get("selected_places", [])

        start_c = self.geocode_place(start_location)
        start_coords = list(start_c) if start_c else [26.1445, 91.7362]
        dest_c = self.geocode_place(dest)
        print("DEST =", dest)
        print("DEST_C =", dest_c)
        if not dest_c:
            logger.error(
                f"Failed to geocode destination {dest}"
            )
            return []
        dest_coords = list(dest_c)
        place_types = preferences.get("place_types", [])
        if not selected_places:
            selected_places = await self.get_nearby_attractions(dest, dest_coords[0], dest_coords[1], place_types=place_types)
            
        valid_places = []
        for place in selected_places:
            if "coords" not in place or not place["coords"]:
                coords_res = self.geocode_place(place.get("name", dest))
                if not coords_res:
                    logger.warning(f"Geocoding failed for place '{place.get('name')}'. Skipping.")
                    continue
                place["coords"] = list(coords_res)
            if "lat" not in place:
                place["lat"] = place["coords"][0]
            if "lon" not in place:
                place["lon"] = place["coords"][1]
            valid_places.append(place)
        selected_places = valid_places
                
        # Sequence optimization: greedy nearest neighbor path finding
        current_coord = start_coords
        unvisited = list(selected_places)
        ordered_places = []
        while unvisited:
            next_place = min(unvisited, key=lambda p: self.calculate_haversine_distance(current_coord[0], current_coord[1], p["lat"], p["lon"]))
            ordered_places.append(next_place)
            current_coord = [next_place["lat"], next_place["lon"]]
            unvisited.remove(next_place)
            
        # Get dynamic route geometry information
        allow_transit = preferences.get("allow_international_transit", False)
        coords_for_route = [start_coords] + [[p["lat"], p["lon"]] for p in ordered_places] + [dest_coords]
        route_info = await get_route(coords_for_route, allow_transit)
        route_dist = route_info["distance"]

        # Fetch remaining attractions as suggestions (exclude selected ones)
        logger.info("=" * 80)
        logger.info(f"FINAL DEST = {dest}")
        logger.info(f"PREFERENCES DEST = {preferences.get('destination')}")
        logger.info("=" * 80)
        all_nearby = await self.get_nearby_attractions(dest, dest_coords[0], dest_coords[1], place_types=place_types)
        selected_names = {p["name"].lower().strip() for p in ordered_places}
        remaining_nearby = [att for att in all_nearby if att["name"].lower().strip() not in selected_names]

        # Generate regional clusters from sub_regions
        num_regions = min(3, max(1, days // 2))
        dest_clean = dest.lower().strip()
        region_pool = []
        for att in ordered_places:
            sub = att.get("sub_region")
            if sub and sub.lower() not in dest_clean:
                sub_cap = " ".join([w.capitalize() for w in sub.split()])
                if sub_cap not in region_pool:
                    region_pool.append(sub_cap)
                    
        # Fallback to address parts if not enough sub_regions
        if len(region_pool) < num_regions:
            for att in ordered_places:
                addr = att.get("formatted_address", "")
                parts = [p.strip() for p in addr.split(",") if p.strip()]
                if len(parts) > 0:
                    sub = parts[0]
                    sub_clean = " ".join([w.capitalize() for w in sub.split() if w.lower() not in [dest_clean, "near", "district", "state"]])
                    if sub_clean and len(sub_clean) < 25 and sub_clean not in region_pool:
                        region_pool.append(sub_clean)
                        
        # Fallback to attraction names if still not enough
        if len(region_pool) < num_regions:
            for att in ordered_places:
                name = att["name"]
                name_clean = " ".join([w.capitalize() for w in name.split() if w.lower() not in [dest_clean]])
                if name_clean and name_clean not in region_pool:
                    region_pool.append(name_clean)
                    
        while len(region_pool) < 3:
            region_pool.append(f"Scenic {dest} District")
            
        region_names = region_pool[:3]
        days_per_region = max(1, days // num_regions)
        attractions_per_day = 2
        
        att_idx = 0
        regions = []
        for r_idx in range(num_regions):
            reg_name = region_names[r_idx]
            reg_lat = dest_coords[0] + (r_idx * 0.02)
            reg_lon = dest_coords[1] + (r_idx * 0.02)
            
            places_in_reg = []
            activities_in_reg = []
            food_in_reg = []
            
            # Map place types to theme-based activities & food suggestions
            for pt in place_types:
                pt_clean = pt.lower().strip()
                if pt_clean == "spiritual":
                    activities_in_reg.extend(["Temple tours", "Spiritual meditation", "Heritage walk"])
                    food_in_reg.extend(["Traditional vegetarian feast", "Temple prasad / local sweets"])
                elif pt_clean == "mountains" or pt_clean == "adventure":
                    activities_in_reg.extend(["Mountain trekking", "Sunrise viewpoints", "Paragliding", "Zip lining"])
                    food_in_reg.extend(["Hot soup at altitude", "Local tea stalls", "Hearty mountain cuisine"])
                elif pt_clean == "beaches":
                    activities_in_reg.extend(["Beach walk", "Sunset cruise", "Water sports", "Scuba diving"])
                    food_in_reg.extend(["Fresh seafood platter", "Beach shack diner", "Coconut water"])
                elif pt_clean == "forests":
                    activities_in_reg.extend(["Forest hiking", "Waterfall bathing", "Bird watching", "Nature safari"])
                    food_in_reg.extend(["Wild berry snacks", "Eco-resort dining", "Organic local herbal tea"])
                elif pt_clean == "shopping":
                    activities_in_reg.extend(["Bazaar shopping", "Souvenir hunting", "Street photography"])
                    food_in_reg.extend(["Popular street food tour", "Local market snacks"])
                elif pt_clean == "nightlife":
                    activities_in_reg.extend(["Pub crawl", "Live music show", "Stargazing tour", "Night walk"])
                    food_in_reg.extend(["Craft beer & platters", "Cocktails at local lounge", "Late night diner"])

            if not activities_in_reg:
                activities_in_reg = ["Scenic sightseeing tours", "Local history exploration", "Photography walkthroughs"]
            if not food_in_reg:
                food_in_reg = ["Highly-rated local diner", f"Popular regional café in {reg_name}", "Authentic street food eats"]
            
            timeline = []
            reg_days = days_per_region if r_idx < num_regions - 1 else (days - r_idx * days_per_region)
            
            for d in range(reg_days):
                day_num = r_idx * days_per_region + d + 1
                day_title = f"Exploring {reg_name}"
                day_activities = []
                
                day_activities.append({
                    "time": "09:00 AM",
                    "activity": "Morning breakfast at the hotel, prepare for local sightseeing.",
                    "cost": 0.0
                })
                
                for _ in range(attractions_per_day):
                    if att_idx < len(ordered_places):
                        att = ordered_places[att_idx]
                        places_in_reg.append(att["name"])
                        activities_in_reg.extend(att.get("nearby_activities", ["Sightseeing", "Walking Tour"]))
                        
                        day_activities.append({
                            "time": "11:00 AM" if len(day_activities) == 1 else "03:00 PM",
                            "activity": f"Visit {att['name']}. {att.get('summary', 'Scenic spot.')}",
                            "cost": att.get("local_cost", 0.0)
                        })
                        att_idx += 1
                        
                day_activities.append({
                    "time": "07:00 PM",
                    "activity": "Relaxing evening, try authentic regional cuisine for dinner.",
                    "cost": 300.0 if comfort == "budget" else (800.0 if comfort == "luxury" else 500.0)
                })
                
                timeline.append({
                    "day": day_num,
                    "title": day_title,
                    "activities": day_activities
                })
                
            if not places_in_reg:
                places_in_reg = [f"Scenic sights in {dest}"]
            if not activities_in_reg:
                activities_in_reg = ["Walking tours", "Landscape photography"]

            regions.append({
                "region_name": reg_name,
                "region_coords": [reg_lat, reg_lon],
                "region_image_query": f"{dest} tourism scenery",
                "image_url": fetch_travel_image(
                        query=reg_name,
                        state=state_dest,
                        category="region",
                        city=reg_name,
                        destination=dest,
                    ),
                "quick_summary": f"Discover the rich cultural sights and landmarks of {reg_name}.",
                "transport": "Local rental cab" if comfort != "budget" else "Shared auto/bus",
                "hotel_type": "Boutique hotel" if comfort == "moderate" else ("Luxury villa" if comfort == "luxury" else "Homestay hostel"),
                "estimated_cost": 0.0,
                "places": list(set(places_in_reg))[:4],
                "food_recommendations": food_in_reg,
                "activities": list(set(activities_in_reg))[:3],
                "timeline": timeline
            })

        # Append remaining landmarks to the final day timeline
        while att_idx < len(ordered_places):
            att = ordered_places[att_idx]
            last_region = regions[-1]
            last_day = last_region["timeline"][-1]
            insert_idx = max(0, len(last_day["activities"]) - 1)
            last_day["activities"].insert(insert_idx, {
                "time": "04:30 PM",
                "activity": f"Visit {att['name']}. {att.get('summary', 'Scenic spot.')}",
                "cost": att.get("local_cost", 0.0)
            })
            last_region["places"].append(att["name"])
            last_region["activities"].extend(att.get("nearby_activities", ["Sightseeing", "Photography"]))
            att_idx += 1

        transport_options = self.generate_dynamic_transport_options(
            start_location, dest,
            start_coords, dest_coords,
            route_dist, travelers, budget, comfort, days,
            regions, remaining_nearby,
            selected_places=ordered_places,
            allow_international_transit=allow_transit
        )
        
        first_key = list(transport_options.keys())[0]
        active_opt = transport_options.get(transport, transport_options[first_key])

        # Resolve destination state for the root destination image URL
        state_dest = ""
        if dest_coords and len(dest_coords) >= 2:
            try:
                _, state_dest = await get_parent_location_details(dest_coords[0], dest_coords[1])
            except Exception:
                pass
        if not state_dest:
            dest_low = dest.lower()
            if "nagaland" in dest_low or "kohima" in dest_low:
                state_dest = "Nagaland"
            elif "meghalaya" in dest_low or "shillong" in dest_low or "cherrapunji" in dest_low:
                state_dest = "Meghalaya"
            elif "kerala" in dest_low or "kochi" in dest_low or "munnar" in dest_low:
                state_dest = "Kerala"
            elif "rajasthan" in dest_low or "jaipur" in dest_low or "udaipur" in dest_low:
                state_dest = "Rajasthan"
            elif "goa" in dest_low:
                state_dest = "Goa"
            elif "himachal" in dest_low or "shimla" in dest_low or "manali" in dest_low:
                state_dest = "Himachal Pradesh"

        dest_img_url = fetch_travel_image(
            query=dest,
            state=state_dest,
            category="destination",
            city=dest,
            destination=dest,
        )
        
        return {
            "travelers": travelers,
            "budget": budget,
            "destination": dest,
            "currency": "INR",
            "total_days": days,
            "comfort_level": comfort,
            "transport_preference": transport,
            "start_location": start_location,
            "start_coords": start_coords,
            "dest_coords": dest_coords,
            "allow_international_transit": allow_transit,
            "budget_utilization": active_opt["budget_utilization"],
            "regions": active_opt["regions"],
            "nearby_attractions": active_opt["nearby_attractions"],
            "transport_options": transport_options,
            "route_data": route_info,
            "destination_image_url": dest_img_url
        }

    async def _generate_mock_itinerary(self, start_location: str, dest: str, days: int, travelers: int, budget: float, comfort: str, transport: str, place_types: list, allow_international_transit: bool = False) -> dict:
        """
        Mock engine creating fully dynamic regional lists, day timelines, and
        curated transport objects on the fly without OpenAI services.
        """
        logger.info(f"Generating mock itinerary for '{dest}' from '{start_location}'.")
        start_c = self.geocode_place(start_location)
        start_coords = list(start_c) if start_c else [26.1445, 91.7362]
        dest_c = self.geocode_place(dest)

        if not dest_c:
            logger.error(f"Failed to geocode destination: {dest}")
            return {}

        dest_coords = list(dest_c)
        
        # Load nearby attractions using Nominatim or Google Places
        nearby_attractions = await self.get_nearby_attractions(dest, dest_coords[0], dest_coords[1], place_types=place_types)
        
        # Ensure attractions have valid coordinates
        nearby_attractions = [
            att for att in nearby_attractions
            if att.get("lat") is not None and att.get("lon") is not None
        ]
        
        # Sequenced stops optimization (nearest neighbor greedy route)
        current_coord = start_coords
        unvisited = list(nearby_attractions)
        ordered_places = []
        while unvisited:
            next_place = min(unvisited, key=lambda p: self.calculate_haversine_distance(current_coord[0], current_coord[1], p["lat"], p["lon"]))
            ordered_places.append(next_place)
            current_coord = [next_place["lat"], next_place["lon"]]
            unvisited.remove(next_place)

        # Distribute stops into regions dynamically from sub_regions
        num_regions = min(3, max(1, days // 2))
        dest_clean = dest.lower().strip()
        region_pool = []
        for att in ordered_places:
            sub = att.get("sub_region")
            if sub and sub.lower() not in dest_clean:
                sub_cap = " ".join([w.capitalize() for w in sub.split()])
                if sub_cap not in region_pool:
                    region_pool.append(sub_cap)
                    
        # Fallback to address parts if not enough sub_regions
        if len(region_pool) < num_regions:
            for att in ordered_places:
                addr = att.get("formatted_address", "")
                parts = [p.strip() for p in addr.split(",") if p.strip()]
                if len(parts) > 0:
                    sub = parts[0]
                    sub_clean = " ".join([w.capitalize() for w in sub.split() if w.lower() not in [dest_clean, "near", "district", "state"]])
                    if sub_clean and len(sub_clean) < 25 and sub_clean not in region_pool:
                        region_pool.append(sub_clean)
                        
        # Fallback to attraction names if still not enough
        if len(region_pool) < num_regions:
            for att in ordered_places:
                name = att["name"]
                name_clean = " ".join([w.capitalize() for w in name.split() if w.lower() not in [dest_clean]])
                if name_clean and name_clean not in region_pool:
                    region_pool.append(name_clean)
                    
        while len(region_pool) < 3:
            region_pool.append(f"Scenic {dest} District")
            
        region_names = region_pool[:3]
        days_per_region = max(1, days // num_regions)
        attractions_per_day = 2
        
        att_idx = 0
        regions = []
        for r_idx in range(num_regions):
            reg_name = region_names[r_idx]
            reg_lat = dest_coords[0] + (r_idx * 0.02)
            reg_lon = dest_coords[1] + (r_idx * 0.02)
            
            places_in_reg = []
            activities_in_reg = []
            food_in_reg = []
            
            # Map place types to theme-based activities & food suggestions
            for pt in place_types:
                pt_clean = pt.lower().strip()
                if pt_clean == "spiritual":
                    activities_in_reg.extend(["Temple tours", "Spiritual meditation", "Heritage walk"])
                    food_in_reg.extend(["Traditional vegetarian feast", "Temple prasad / local sweets"])
                elif pt_clean == "mountains" or pt_clean == "adventure":
                    activities_in_reg.extend(["Mountain trekking", "Sunrise viewpoints", "Paragliding", "Zip lining"])
                    food_in_reg.extend(["Hot soup at altitude", "Local tea stalls", "Hearty mountain cuisine"])
                elif pt_clean == "beaches":
                    activities_in_reg.extend(["Beach walk", "Sunset cruise", "Water sports", "Scuba diving"])
                    food_in_reg.extend(["Fresh seafood platter", "Beach shack diner", "Coconut water"])
                elif pt_clean == "forests":
                    activities_in_reg.extend(["Forest hiking", "Waterfall bathing", "Bird watching", "Nature safari"])
                    food_in_reg.extend(["Wild berry snacks", "Eco-resort dining", "Organic local herbal tea"])
                elif pt_clean == "shopping":
                    activities_in_reg.extend(["Bazaar shopping", "Souvenir hunting", "Street photography"])
                    food_in_reg.extend(["Popular street food tour", "Local market snacks"])
                elif pt_clean == "nightlife":
                    activities_in_reg.extend(["Pub crawl", "Live music show", "Stargazing tour", "Night walk"])
                    food_in_reg.extend(["Craft beer & platters", "Cocktails at local lounge", "Late night diner"])

            if not activities_in_reg:
                activities_in_reg = ["Scenic sightseeing tours", "Local history exploration", "Photography walkthroughs"]
            if not food_in_reg:
                food_in_reg = ["Highly-rated local diner", f"Popular regional café in {reg_name}", "Authentic street food eats"]
            
            timeline = []
            reg_days = days_per_region if r_idx < num_regions - 1 else (days - r_idx * days_per_region)
            
            for d in range(reg_days):
                day_num = r_idx * days_per_region + d + 1
                day_title = f"Exploring {reg_name}"
                day_activities = []
                
                day_activities.append({
                    "time": "09:00 AM",
                    "activity": "Morning breakfast at the hotel, prepare for local sightseeing.",
                    "cost": 0.0
                })
                
                for _ in range(attractions_per_day):
                    if att_idx < len(ordered_places):
                        att = ordered_places[att_idx]
                        places_in_reg.append(att["name"])
                        activities_in_reg.extend(att.get("nearby_activities", ["Sightseeing", "Walking Tour"]))
                        
                        day_activities.append({
                            "time": "11:00 AM" if len(day_activities) == 1 else "03:00 PM",
                            "activity": f"Visit {att['name']}. {att.get('summary', 'Scenic spot.')}",
                            "cost": att.get("local_cost", 0.0)
                        })
                        att_idx += 1
                        
                day_activities.append({
                    "time": "07:00 PM",
                    "activity": "Relaxing evening, try authentic regional cuisine for dinner.",
                    "cost": 300.0 if comfort == "budget" else (800.0 if comfort == "luxury" else 500.0)
                })
                
                timeline.append({
                    "day": day_num,
                    "title": day_title,
                    "activities": day_activities
                })
                
            if not places_in_reg:
                places_in_reg = [f"Scenic sights in {dest}"]
            if not activities_in_reg:
                activities_in_reg = ["Walking tours", "Landscape photography"]

            regions.append({
                "region_name": reg_name,
                "region_coords": [reg_lat, reg_lon],
                "region_image_query": f"{dest} tourism scenery",
                "image_url": fetch_travel_image(reg_name),
                "quick_summary": f"Discover the rich cultural sights and landmarks of {reg_name}.",
                "transport": "Local rental cab" if comfort != "budget" else "Shared auto/bus",
                "hotel_type": "Boutique hotel" if comfort == "moderate" else ("Luxury villa" if comfort == "luxury" else "Homestay hostel"),
                "estimated_cost": 0.0,
                "places": list(set(places_in_reg))[:4],
                "food_recommendations": food_in_reg,
                "activities": list(set(activities_in_reg))[:3],
                "timeline": timeline
            })
            
        while att_idx < len(ordered_places):
            att = ordered_places[att_idx]
            last_region = regions[-1]
            last_day = last_region["timeline"][-1]
            insert_idx = max(0, len(last_day["activities"]) - 1)
            last_day["activities"].insert(insert_idx, {
                "time": "04:30 PM",
                "activity": f"Visit {att['name']}. {att.get('summary', 'Scenic spot.')}",
                "cost": att.get("local_cost", 0.0)
            })
            last_region["places"].append(att["name"])
            last_region["activities"].extend(att.get("nearby_activities", ["Sightseeing", "Photography"]))
            att_idx += 1

        # Get actual road route geometry
        route_coords = [start_coords]
        for region in regions:
            coords = region.get("region_coords")
            if coords and len(coords) >= 2:
                route_coords.append(coords)
        route_coords.append(dest_coords)
        
        route_info = await get_route(route_coords, allow_international_transit)
        route_dist = route_info["distance"]
        
        # Exclude only region names
        region_names = {r["region_name"].lower().strip() for r in regions}
                
        remaining_nearby = [att for att in nearby_attractions if att["name"].lower().strip() not in region_names]
        
        logger.info(f"[PIPELINE LOG] Fetch: Discovered {len(nearby_attractions)} places in mock discovery.")
        logger.info(f"[PIPELINE LOG] Filtering: Remaining {len(remaining_nearby)} attractions after region stop deduplication.")
        
        final_atts = remaining_nearby[:20]
        logger.info(f"[PIPELINE LOG] Final sent: Sending {len(final_atts)} attractions in mock output.")

        transport_options = self.generate_dynamic_transport_options(
            start_location, dest,
            start_coords, dest_coords,
            route_dist, travelers, budget, comfort, days,
            regions, final_atts,
            allow_international_transit=allow_international_transit
        )
        
        first_key = list(transport_options.keys())[0]
        active_opt = transport_options.get(transport, transport_options[first_key])
        
        return {
            "travelers": travelers,
            "budget": budget,
            "destination": dest,
            "currency": "INR",
            "total_days": days,
            "comfort_level": comfort,
            "transport_preference": transport,
            "start_location": start_location,
            "start_coords": start_coords,
            "dest_coords": dest_coords,
            "allow_international_transit": allow_international_transit,
            "budget_utilization": active_opt["budget_utilization"],
            "regions": active_opt["regions"],
            "nearby_attractions": active_opt["nearby_attractions"],
            "transport_options": transport_options,
            "route_data": route_info
        }

    def _generate_mock_chat_response(self, last_message: str, history: list) -> str:
        """Simulates conversational consultant flow."""
        msg = last_message.lower()
        provided = []
        missing = []
        history_text = " ".join([m["content"].lower() for m in history])
        
        if "traveler" in history_text or "people" in history_text or any(char.isdigit() for char in history_text):
            provided.append("group size")
        else:
            missing.append("How many travelers will be going?")
            
        if "budget" in history_text or "cost" in history_text or "rs" in history_text or "$" in history_text:
            provided.append("budget")
        else:
            missing.append("What is your approximate total budget (e.g. 30,000 INR)?")
            
        if "from" in history_text or "start" in history_text or "departure" in history_text:
            provided.append("starting city")
        else:
            missing.append("What is your starting city/location?")
            
        if "day" in history_text or "night" in history_text:
            provided.append("trip duration")
        else:
            missing.append("How many days is this trip planned for?")
            
        if any(v in history_text for v in ["mountain", "beach", "temple", "shrine", "forest", "history", "nightlife", "food", "shop", "spiritual", "adventure"]):
            provided.append("travel vibes/interests")
        else:
            missing.append("What type of places do you enjoy most? (e.g., mountains, beaches, temples, food exploration)")
            
        if "comfort" in history_text or "luxury" in history_text or "budget" in history_text or "moderate" in history_text:
            provided.append("comfort preference")
        else:
            missing.append("What is your preferred comfort level? (budget, moderate, or luxury)")
 
        if not missing:
            return "Perfect! I have captured your preferences. I'm ready to curate your dream itinerary. Click the **Generate Detailed Itinerary** button on the panel to compile the complete multi-region breakdown with budget maps!"
        
        next_question = "\n* ".join(missing[:3])
        return f"Thanks for sharing! To customize your travel route and budget breakdown accurately, could you tell me:\n\n* {next_question}"

    def check_connectivity_local(self, dest: str) -> tuple[bool, bool]:
        dest_lower = dest.lower().strip()
        
        # Predefined popular destinations
        if "meghalaya" in dest_lower or "shillong" in dest_lower or "cherrapunji" in dest_lower or "dawki" in dest_lower:
            return True, False
        if "munnar" in dest_lower or "kerala hills" in dest_lower:
            return False, False  # Road only
        if "goa" in dest_lower or "panaji" in dest_lower or "calangute" in dest_lower or "baga" in dest_lower:
            return True, True  # Goa has both airport & railway stations
        if "shimla" in dest_lower or "kufri" in dest_lower or "chail" in dest_lower:
            return True, True  # SLN / Kalka railway station
        if "darjeeling" in dest_lower:
            return True, True  # Bagdogra / NJP
        if "udaipur" in dest_lower or "jaipur" in dest_lower or "delhi" in dest_lower or "mumbai" in dest_lower or "kolkata" in dest_lower or "bangalore" in dest_lower:
            return True, True  # Major hubs have both
            
        # Default fallback
        return True, True

    def generate_dynamic_transport_options(self, start_loc, dest_loc, start_coords, dest_coords, route_dist, travelers, budget, comfort, days, base_regions, base_attractions, selected_places=None, allow_international_transit: bool = False) -> dict:
        has_airport, has_railway = self.check_connectivity_local(dest_loc)
        
        available = {}
        
        # 1. Flight option (if has_airport)
        if has_airport:
            available["flight"] = {
                "name": "Flight + Cab Transfer",
                "icon": "plane",
                "tag": "Fastest Route",
                "duration": f"{round(route_dist / 400 + 2, 1)} Hours",
                "comfortRating": "★★★★★",
                "estCost": round(travelers * (3500 + route_dist * 0.8) + 2500, 2)
            }
            
        # 2. Train option (if has_railway)
        if has_railway:
            available["train"] = {
                "name": "Express Train + Bus Link",
                "icon": "train",
                "tag": "Most Economic",
                "duration": f"{max(4, int(route_dist / 60 + 2))} Hours",
                "comfortRating": "★★★☆☆",
                "estCost": round(travelers * (450 + route_dist * 0.5) + 300, 2)
            }
            
        # 3. Private Cab (always available)
        available["cab"] = {
            "name": "Private Intercity Cab",
            "icon": "car",
            "tag": "Best Flexibility",
            "duration": f"{max(1.5, round(route_dist / 65, 1))} Hours",
            "comfortRating": "★★★★☆",
            "estCost": round(3000 + route_dist * 12, 2)
        }
        
        # 4. Shared Taxi (always available)
        available["shared_taxi"] = {
            "name": "Shared Regional Taxi",
            "icon": "shared_taxi",
            "tag": "Popular Local Route",
            "duration": f"{max(2, round(route_dist / 55, 1))} Hours",
            "comfortRating": "★★☆☆☆",
            "estCost": round(travelers * (250 + route_dist * 1.0), 2)
        }
        
        # 5. Express Bus (always available)
        available["bus"] = {
            "name": "Express Coach Bus",
            "icon": "bus",
            "tag": "Budget Road Option",
            "duration": f"{max(2.5, round(route_dist / 50, 1))} Hours",
            "comfortRating": "★★☆☆☆",
            "estCost": round(travelers * (120 + route_dist * 0.7), 2)
        }
        
        # 6. Rental Vehicle (always available)
        available["rental"] = {
            "name": "Self-Drive Rental",
            "icon": "rental",
            "tag": "Independent Drive",
            "duration": f"{max(1.5, round(route_dist / 65, 1))} Hours",
            "comfortRating": "★★★★☆",
            "estCost": round(1500 * days + route_dist * 7, 2)
        }
        
        # Filter: If only road transport exists
        if not has_airport and not has_railway:
            available = {k: available[k] for k in ["cab", "shared_taxi", "bus", "rental"] if k in available}
            
        def estimate_place_costs_py(place_name: str, comfort_level: str) -> dict:
            name_lower = place_name.lower()
            food = 400.0 if comfort_level == "budget" else (1000.0 if comfort_level == "luxury" else 600.0)
            stay = 800.0 if comfort_level == "budget" else (3500.0 if comfort_level == "luxury" else 1800.0)
            transport = 250.0 if comfort_level == "budget" else (800.0 if comfort_level == "luxury" else 400.0)
            activity = 150.0
            
            if any(k in name_lower for k in ["dawki", "shnongpdeng", "umngot"]):
                activity = 500.0
            elif "nongjrong" in name_lower:
                activity = 300.0
                transport += 200.0
            elif any(k in name_lower for k in ["cherrapunji", "sohra"]):
                activity = 200.0
            elif "laitlum" in name_lower:
                activity = 150.0
            elif "krang suri" in name_lower or "waterfall" in name_lower:
                activity = 150.0
                
            return {
                "food": food,
                "stay": stay,
                "transport": transport,
                "activity": activity,
                "total": food + stay + transport + activity
            }

        # Complete full option details (budget, regions, timeline updates) for each option
        options_final = {}
        for opt_id, mode_info in available.items():
            est_cost = mode_info["estCost"]
            
            # Calculate dynamic place costs
            total_stay = 0.0
            total_food = 0.0
            total_transport = 0.0
            total_activity = 0.0
            
            places_to_calc = selected_places if selected_places else []
            if not places_to_calc:
                for r in base_regions:
                    for p_name in r.get("places", []):
                        places_to_calc.append({"name": p_name})
                        
            if not places_to_calc:
                places_to_calc = [{"name": dest_loc}]
                
            for p in places_to_calc:
                p_costs = estimate_place_costs_py(p.get("name", ""), comfort)
                total_stay += p_costs["stay"] * travelers
                total_food += p_costs["food"] * travelers
                total_transport += p_costs["transport"] * travelers
                total_activity += p_costs["activity"] * travelers
                
            # Dynamic Total Trip Cost
            total_trip_cost = est_cost + total_stay + total_food + total_transport + total_activity
            
            # Build budget utilization breakdown
            trans_total = est_cost + total_transport
            if total_trip_cost > 0:
                trans_pct = round(trans_total / total_trip_cost * 100, 1)
                stay_pct = round(total_stay / total_trip_cost * 100, 1)
                food_pct = round(total_food / total_trip_cost * 100, 1)
                act_pct = round(total_activity / total_trip_cost * 100, 1)
                savings_pct = 5.0
                
                sum_pct = trans_pct + stay_pct + food_pct + act_pct + savings_pct
                if sum_pct != 100:
                    stay_pct = round(stay_pct + (100.0 - sum_pct), 1)
            else:
                trans_pct = stay_pct = food_pct = act_pct = savings_pct = 0.0
                
            budget_util = {
                "transport": {
                    "percentage": trans_pct,
                    "amount": trans_total,
                    "description": "Main transit & local shuttles"
                },
                "accommodation": {
                    "percentage": stay_pct,
                    "amount": total_stay,
                    "description": f"Stays for {travelers} guests"
                },
                "food": {
                    "percentage": food_pct,
                    "amount": total_food,
                    "description": "Dining & street foods"
                },
                "activities": {
                    "percentage": act_pct,
                    "amount": total_activity,
                    "description": "Entry fees & active guides"
                },
                "savings": {
                    "percentage": savings_pct,
                    "amount": round(total_trip_cost * 0.05, 2),
                    "description": "Buffer savings margin"
                }
            }
            
            # Deep copy regions to set estimated costs per region
            regions_copy = []
            for reg_idx, reg in enumerate(base_regions):
                reg_copy = json.loads(json.dumps(reg))
                reg_copy["estimated_cost"] = round((total_stay + total_activity + total_food) / len(base_regions) + (est_cost / len(base_regions) if reg_idx == 0 else 0), 2)
                
                if len(reg_copy.get("timeline", [])) > 0:
                    first_day = reg_copy["timeline"][0]
                    last_day = reg_copy["timeline"][-1]
                    
                    if reg_idx == 0 and len(first_day.get("activities", [])) > 0:
                        act = first_day["activities"][0]
                        act["time"] = "08:00 AM" if opt_id != "bus" else "06:00 AM"
                        if opt_id == "flight":
                            act["activity"] = f"Fly to nearest airport and taxi ride to {dest_loc}."
                        elif opt_id == "train":
                            act["activity"] = f"Take train from {start_loc} to nearest link railway station."
                        elif opt_id == "cab":
                            act["activity"] = f"Start road journey to {dest_loc} in your private intercity cab."
                        elif opt_id == "shared_taxi":
                            act["activity"] = f"Board a shared regional taxi heading to {dest_loc}."
                        elif opt_id == "bus":
                            act["activity"] = f"Board return tourist coach bus to {dest_loc}."
                        else:
                            act["activity"] = f"Pick up self-drive vehicle and head out to {dest_loc}."
                        act["cost"] = round(est_cost / travelers, 2)
                        
                    if reg_idx == len(base_regions) - 1 and len(last_day.get("activities", [])) > 0:
                        act = last_day["activities"][-1]
                        act["time"] = "06:00 PM"
                        if opt_id == "flight":
                            act["activity"] = f"Board returning flight back to {start_loc}."
                        elif opt_id == "train":
                            act["activity"] = f"Board return express train to {start_loc}."
                        elif opt_id == "cab":
                            act["activity"] = f"Drive back to {start_loc} in the private cab."
                        elif opt_id == "shared_taxi":
                            act["activity"] = f"Shared taxi transfer back to {start_loc} hub."
                        elif opt_id == "bus":
                            act["activity"] = f"Overnight return bus link to {start_loc}."
                        else:
                            act["activity"] = f"Return self-drive rental vehicle at {start_loc} office."
                        act["cost"] = 0.0
                        
                regions_copy.append(reg_copy)
                
            options_final[opt_id] = {
                "name": mode_info["name"],
                "icon": mode_info["icon"],
                "tag": mode_info["tag"],
                "duration": mode_info["duration"],
                "comfortRating": mode_info["comfortRating"],
                "estCost": est_cost,
                "total_trip_cost": round(total_trip_cost, 2),
                "per_person_cost": round(total_trip_cost / travelers, 2),
                "budget_utilization": budget_util,
                "regions": regions_copy,
                "nearby_attractions": base_attractions
            }
            
        return options_final

    async def get_place_details(self, place: str) -> dict:
        logger.info("STEP 1")
        """
        Dynamically fetches coordinates, images, galleries, nearby attractions,
        and POI travel information for a specific place/stop to build a mini-guide.
        """
        coords = self.geocode_place(place)
        logger.info(f"PLACE NAME = {place}")
        logger.info(f"GEOCODE RESULT = {coords}")
        logger.info("STEP 2")
        if coords:
            lat, lon = coords
        else:
            lat, lon = None, None
       
        hero_image = fetch_travel_image(place)
        
        gallery = [hero_image]
        gallery = list(dict.fromkeys([g for g in gallery if g]))
        logger.info("STEP 3")
        if len(gallery) < 3:
            gallery.extend([
                "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=600&auto=format&fit=crop"
            ])
            gallery = list(dict.fromkeys(gallery))[:4]
            
        if lat is None or lon is None:
            all_attractions = []
        else:
            logger.info("STEP 4")
            all_attractions = await self.get_nearby_attractions(place, lat, lon)
            logger.info("STEP 5")
        
        attractions = []
        food = []
        activities = []
        
        for att in all_attractions:
            is_food = att.get("type", "").lower() in ["restaurant", "cafe", "café", "diner", "food"]
            if is_food and len(food) < 3:
                food.append(att["name"])
            elif not is_food and len(attractions) < 4:
                attractions.append({
                    "name": att["name"],
                    "summary": att["summary"],
                    "type": att.get("type", "Attraction"),
                    "image_url": att.get("image_url"),
                    "distance": att.get("distance", "")
                })
            
            if att.get("nearby_activities"):
                activities.extend(att["nearby_activities"])
                
        food = list(dict.fromkeys(food))
        if not food:
            food = [f"Popular local cafe in {place}", f"Traditional diner near {place}", "Highly rated regional food market"]
            
        activities = list(dict.fromkeys(activities))[:4]
        if not activities:
            activities = ["Scenic hiking", "Viewpoint photography", "Heritage walking tour", "Local bazaar shopping"]
            
        overview = f"Discover the captivating landmarks and natural beauty of {place}. This region features highly-rated scenic viewpoints, rich heritage, and authentic local food culture, offering visitors a memorable travel experience."
        
        best_time = "October to May, when the weather remains pleasant and ideal for scenic sightseeing tours."
        tips = [
            f"Arrive early at {place} key spots to capture the best morning views and light.",
            "Bring comfortable shoes for local walking tours and trail exploration.",
            "Try authentic regional specialties at nearby food joints recommended in this guide."
        ]
        
        related = []
        dest_clean = place.lower().strip()
        for k, v in DESTINATION_SUB_REGIONS.items():
            if k in dest_clean or dest_clean in k:
                related = [r for r in v if r.lower().strip() != dest_clean][:3]
                break
        if not related:
            related = [att["name"] for att in all_attractions if att["name"].lower().strip() != dest_clean][:3]
        logger.info("GET_PLACE_DETAILS FINISHED") 
        logger.info("STEP 6")  
        return {
            "name": place,
            "coords": [lat, lon] if lat is not None else None,
            "hero_image": hero_image,
            "gallery": gallery,
            "overview": overview,
            "best_time": best_time,
            "tips": tips,
            "attractions": attractions,
            "food_recommendations": food,
            "activities": activities,
            "related_places": related
        }

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.openai_service import OpenAIService
from app.services.image_service import clear_used_images
from app.utils.logger import get_logger

logger = get_logger("app.routes.itinerary")
router = APIRouter()

class ItineraryRequest(BaseModel):
    destination: str = Field(default="Meghalaya")
    start_location: Optional[str] = Field(default="Guwahati")
    total_days: int = Field(default=4, ge=1, le=30)
    travelers: int = Field(default=2, ge=1)
    budget: float = Field(default=20000.0, ge=1000)
    comfort_level: str = Field(default="moderate")  # budget, moderate, luxury
    transport_preference: str = Field(default="fastest")  # cheapest, fastest, most comfortable
    place_types: List[str] = Field(default_factory=list)
    allow_international_transit: bool = Field(default=False)

class FinalizeItineraryRequest(BaseModel):
    destination: str
    start_location: str
    total_days: int = Field(default=4, ge=1, le=30)
    travelers: int = Field(default=2, ge=1)
    budget: float = Field(default=20000.0, ge=1000)
    comfort_level: str = Field(default="moderate")
    transport_preference: str = Field(default="fastest")
    selected_places: List[dict] = Field(default_factory=list)
    allow_international_transit: bool = Field(default=False)

class RouteRequest(BaseModel):
    coords: List[List[float]]  # List of [lat, lon]
    allow_international_transit: bool = Field(default=False)

# Dependency injection for OpenAI Service
def get_openai_service():
    return OpenAIService()

@router.post("/generate-itinerary")
async def generate_itinerary_endpoint(request: ItineraryRequest, service: OpenAIService = Depends(get_openai_service)):
    clear_used_images()
    logger.info("POST /api/generate-itinerary endpoint called.")
    try:
        preferences = request.model_dump()
        itinerary = await service.generate_itinerary(preferences)
        return itinerary
    except Exception as e:
        logger.error(f"Failed to generate itinerary for payload: {request.model_dump()}. Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate itinerary: {str(e)}")

@router.get("/autocomplete")
async def autocomplete_endpoint(q: str, service: OpenAIService = Depends(get_openai_service)):
    logger.info(f"GET /api/autocomplete endpoint called with query: '{q}'")
    try:
        suggestions = await service.get_autocomplete_suggestions(q)
        return suggestions
    except Exception as e:
        logger.error(f"Autocomplete failed for query '{q}': {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Autocomplete failed: {str(e)}")

@router.get("/nearby-attractions")
async def nearby_attractions_endpoint(dest: str, lat: Optional[float] = None, lon: Optional[float] = None, place_types: Optional[str] = None, service: OpenAIService = Depends(get_openai_service)):
    clear_used_images()
    logger.info(f"GET /api/nearby-attractions endpoint called for destination: '{dest}' (lat={lat}, lon={lon}, place_types={place_types})")
    try:
        pt_list = []
        if place_types:
            try:
                import json
                pt_list = json.loads(place_types)
            except Exception:
                pt_list = [x.strip() for x in place_types.split(",") if x.strip()]
        attractions = await service.get_nearby_attractions(dest, lat, lon, place_types=pt_list)
        return attractions
    except Exception as e:
        logger.error(f"Failed to fetch nearby attractions for '{dest}': {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch nearby attractions: {str(e)}")

@router.post("/finalize-itinerary")
async def finalize_itinerary_endpoint(request: FinalizeItineraryRequest, service: OpenAIService = Depends(get_openai_service)):
    clear_used_images()
    logger.info("POST /api/finalize-itinerary endpoint called.")
    try:
        preferences = request.model_dump()
        itinerary = await service.finalize_itinerary_from_cart(preferences)
        return itinerary
    except Exception as e:
        logger.error(f"Failed to finalize itinerary for payload: {request.model_dump()}. Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to finalize itinerary: {str(e)}")

@router.post("/route")
async def route_endpoint(request: RouteRequest, service: OpenAIService = Depends(get_openai_service)):
    logger.info(f"POST /api/route endpoint called with {len(request.coords)} coordinates.")
    try:
        route_data = await service.get_osrm_route(request.coords, request.allow_international_transit)
        return route_data
    except Exception as e:
        logger.error(f"Failed to fetch route geometry: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch route: {str(e)}")

@router.get("/state-boundary")
async def state_boundary_endpoint(destination: str):
    logger.info(f"GET /api/state-boundary endpoint called for: '{destination}'")
    try:
        from app.services.map_assets_service import MapAssetsService
        boundary = MapAssetsService.get_state_boundary(destination)
        return boundary
    except Exception as e:
        logger.error(f"Failed to fetch state boundary for '{destination}': {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch state boundary: {str(e)}")

@router.get("/place-details")
async def place_details_endpoint(place: str, service: OpenAIService = Depends(get_openai_service)):
    logger.info(f"GET /api/place-details endpoint called for place: '{place}'")
    try:
        details = await service.get_place_details(place)
        return details
    except Exception as e:
        logger.error(f"Failed to fetch place details for '{place}': {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch details: {str(e)}")

@router.get("/place-image")
async def place_image_endpoint(q: str, state: Optional[str] = "", category: Optional[str] = "", city: Optional[str] = "", destination: Optional[str] = ""):
    logger.info(f"GET /api/place-image endpoint called for query: '{q}'")
    try:
        from app.services.image_service import fetch_travel_image
        image_url = fetch_travel_image(q, state=state, category=category, city=city, destination=destination)
        return {"image_url": image_url}
    except Exception as e:
        logger.error(f"Failed to fetch image for '{q}': {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch image: {str(e)}")

@router.get("/diagnostics/unsplash")
async def unsplash_diagnostics_endpoint():
    logger.info("GET /api/diagnostics/unsplash endpoint called")
    import os
    import urllib.request
    import urllib.parse
    import json
    import ssl
    
    key = os.getenv("UNSPLASH_API_KEY")
    key_loaded = bool(key)
    
    status = {
        "key_loaded": key_loaded,
        "unsplash_reachable": False,
        "test_image_url": None,
        "error": None
    }
    
    if not key_loaded:
        status["error"] = "UNSPLASH_API_KEY is not set in environment variables."
        return status
        
    try:
        q_search = "paris"
        url = f"https://api.unsplash.com/search/photos?query={urllib.parse.quote(q_search)}&per_page=1"
        req = urllib.request.Request(
            url,
            headers={"Authorization": f"Client-ID {key}"}
        )
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            if response.status == 200:
                status["unsplash_reachable"] = True
                data = json.loads(response.read().decode())
                results = data.get("results", [])
                if results:
                    photo = results[0]
                    img_url = photo.get("urls", {}).get("regular") or photo.get("urls", {}).get("small")
                    status["test_image_url"] = img_url
                else:
                    status["error"] = "Unsplash API request succeeded, but no results were found for 'paris'."
            else:
                status["error"] = f"Unsplash API returned HTTP status {response.status}."
    except Exception as e:
        status["error"] = f"Unsplash connectivity check failed: {str(e)}"
        
    return status

@router.get("/stays")
async def stays_endpoint(destination: str, budget: float = 20000.0):
    logger.info(f"GET /api/stays endpoint called for destination: '{destination}', budget: {budget}")
    try:
        from app.services.stay_service import StayService
        service = StayService()
        grouped_stays = service.get_stay_recommendations(destination, budget)
        return grouped_stays
    except Exception as e:
        logger.error(f"Failed to fetch stay recommendations for '{destination}': {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch stays: {str(e)}")

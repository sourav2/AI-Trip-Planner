import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.utils.logger import get_logger

logger = get_logger("app.main")

# Load environment variables dynamically from backend/.env relative to main.py's directory
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(base_dir, '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    logger.info(f"Successfully loaded environment variables from {dotenv_path}")
else:
    load_dotenv()
    logger.warning("No backend/.env file detected. Falling back to default system/Cwd environment variables.")

# Validate essential backend environment variables
def validate_backend_env():
    warnings = []
    if not os.getenv("GEMINI_API_KEY"):
        warnings.append("GEMINI_API_KEY is missing. Gemini AI features will use high-fidelity mock fallbacks.")
    if not os.getenv("OSRM_BASE_URL"):
        warnings.append("OSRM_BASE_URL is missing. Defaulting to https://router.project-osrm.org")
        os.environ["OSRM_BASE_URL"] = "https://router.project-osrm.org"
    if not os.getenv("NOMINATIM_BASE_URL"):
        warnings.append("NOMINATIM_BASE_URL is missing. Defaulting to https://nominatim.openstreetmap.org")
        os.environ["NOMINATIM_BASE_URL"] = "https://nominatim.openstreetmap.org"
    if not os.getenv("PEXELS_API_KEY"):
        warnings.append("PEXELS_API_KEY is missing. Pexels image search will be disabled or fallback to mock images.")
    if not os.getenv("UNSPLASH_API_KEY"):
        warnings.append("UNSPLASH_API_KEY is missing. Unsplash image search will be disabled or fallback to mock images.")
        
    if warnings:
        for w in warnings:
            logger.warning(f"[ENV VALIDATION] {w}")
    else:
        logger.info("[ENV VALIDATION] All required environment variables are set.")

validate_backend_env()

# Import routers
from app.routes import chat, itinerary, budget

app = FastAPI(
    title="Antigravity Travel Planner API",
    description="Premium AI-Powered Travel Planning Assistant Backend",
    version="1.0.0"
)

# Configure CORS with specific origins to allow credentials verification without violating browser standards
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api prefix
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(itinerary.router, prefix="/api", tags=["Itinerary"])
app.include_router(budget.router, prefix="/api", tags=["Budget"])

@app.get("/api/health")
def health_check():
    """
    Detailed Service health check endpoint validating OpenAI config, Maps API, and environment.
    """
    # Environment loading check
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dotenv_path = os.path.join(base_dir, '.env')
    env_loaded = os.path.exists(dotenv_path)

    # OpenAI configuration check
    openai_key = os.getenv("OPENAI_API_KEY")
    openai_configured = bool(openai_key)
    openai_integration = "active" if openai_configured else "fallback_mock_active"
    
    # Maps API configuration check
    maps_configured = bool(
        os.getenv("GOOGLE_MAPS_API_KEY") or 
        os.getenv("MAPBOX_API_KEY") or 
        os.getenv("OPENROUTESERVICE_API_KEY")
    )
    maps_api = "active" if maps_configured else "inactive"

    logger.info("Health check endpoint accessed.")
    return {
        "status": "healthy",
        "openai_integration": openai_integration,
        "maps_api": maps_api,
        "environment_loaded": env_loaded
    }

@app.get("/")
def root():
    return {"message": "Welcome to the Antigravity Travel Planner API. Visit /docs for documentation."}

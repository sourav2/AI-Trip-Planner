import sys
import os
import importlib.util

def check_virtual_env() -> bool:
    """Checks if python is running inside the project virtual environment."""
    executable = sys.executable.lower()
    in_venv = "venv" in executable
    
    print("+----------------------------------------------------------+")
    print("|             VIRTUAL ENVIRONMENT CHECKS                   |")
    print("+----------------------------------------------------------+")
    print(f"Current Python Interpreter: {sys.executable}")
    if in_venv:
        print("[OK] Correct Interpreter: Python virtual environment detected.")
        return True
    else:
        print("[WARN] WARNING: Not running in the local './venv/' virtual environment!")
        print("  Please start the backend using: .\\venv\\Scripts\\python.exe backend/run.py")
        return False

def check_dependencies() -> bool:
    """Verifies that all required packages can be imported."""
    required = ["fastapi", "uvicorn", "dotenv", "openai", "requests", "pydantic"]
    missing = []
    
    print("\n+----------------------------------------------------------+")
    print("|                 DEPENDENCY CHECKER                       |")
    print("+----------------------------------------------------------+")
    for package in required:
        try:
            importlib.import_module(package)
            print(f"[OK] {package:15} : Installed")
        except ImportError:
            print(f"[FAIL] {package:15} : MISSING!")
            missing.append(package)
            
    if missing:
        print(f"\n[FAIL] CRITICAL ERROR: Missing dependencies: {', '.join(missing)}")
        print("  Run: .\\venv\\Scripts\\pip install -r backend/requirements.txt")
        return False
    return True

def check_env_file() -> bool:
    """Validates env variables loading."""
    # Find base folder (which is backend/)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dotenv_path = os.path.join(base_dir, '.env')
    
    print("\n+----------------------------------------------------------+")
    print("|               ENVIRONMENT CONFIGURATION                  |")
    print("+----------------------------------------------------------+")
    print(f"Expected env file path: {dotenv_path}")
    if os.path.exists(dotenv_path):
        print("[OK] .env file exists.")
        from dotenv import load_dotenv
        load_dotenv(dotenv_path)
        return True
    else:
        print("[WARN] WARNING: backend/.env file not found!")
        print("  Please create backend/.env file using backend/.env.example as a template.")
        return False

def check_api_keys() -> None:
    """Inspects loaded API keys and logs warning/status boxes."""
    openai_key = os.getenv("OPENAI_API_KEY")
    google_maps_key = os.getenv("GOOGLE_MAPS_API_KEY")
    mapbox_key = os.getenv("MAPBOX_API_KEY")
    openroute_key = os.getenv("OPENROUTESERVICE_API_KEY")
    
    print("\n+----------------------------------------------------------+")
    print("|                     API KEYS STATUS                      |")
    print("+----------------------------------------------------------+")
    
    if openai_key:
        masked = openai_key[:8] + "..." + openai_key[-4:] if len(openai_key) > 12 else "***"
        print(f"[OK] OpenAI API Key        : LOADED ({masked})")
    else:
        print("[WARN] OpenAI API Key        : MISSING (Fallback mock travel engine active)")
        
    if google_maps_key:
        print("[OK] Google Maps API Key   : LOADED")
    else:
        print("[WARN] Google Maps API Key   : NOT CONFIGURED")
        
    if mapbox_key:
        print("[OK] Mapbox API Key        : LOADED")
    else:
        print("[WARN] Mapbox API Key        : NOT CONFIGURED")
        
    if openroute_key:
        print("[OK] OpenRouteService Key  : LOADED")
    else:
        print("[WARN] OpenRouteService Key  : NOT CONFIGURED")

def check_backend_routes() -> bool:
    """Verifies that the FastAPI application can import and registers endpoints correctly."""
    print("\n+----------------------------------------------------------+")
    print("|                  ROUTE VALIDATION                        |")
    print("+----------------------------------------------------------+")
    try:
        sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app'))
        from app.main import app
        
        routes = [r.path for r in app.routes]
        print(f"[OK] Successfully loaded FastAPI app: '{app.title}'")
        print(f"[OK] Registered {len(routes)} routes:")
        for path in sorted(set(routes)):
            print(f"  - {path}")
        return True
    except Exception as e:
        print(f"[FAIL] CRITICAL ERROR importing main application: {e}")
        import traceback
        traceback.print_exc()
        return False

def run_startup_validation() -> bool:
    """Runs all checks. Returns True if server is ready to launch, False otherwise."""
    print("============================================================")
    print("          AI TRAVEL PLANNER - STARTUP VALIDATION            ")
    print("============================================================\n")
    
    check_virtual_env()
    deps_ok = check_dependencies()
    env_ok = check_env_file()
    check_api_keys()
    routes_ok = check_backend_routes()
    
    print("\n============================================================")
    if deps_ok and routes_ok:
        print("         [OK] PRE-FLIGHT CHECKS PASSED: READY TO LAUNCH         ")
        print("============================================================\n")
        return True
    else:
        print("         [FAIL] PRE-FLIGHT CHECKS FAILED: LAUNCH ABORTED         ")
        print("============================================================\n")
        return False

if __name__ == "__main__":
    success = run_startup_validation()
    sys.exit(0 if success else 1)

import uvicorn
import os
import sys
from dotenv import load_dotenv

if __name__ == "__main__":
    # Ensure current directory and app directory are in the Python search path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(current_dir)
    sys.path.append(os.path.join(current_dir, 'app'))

    # Load environment variables early so the port can be resolved correctly
    dotenv_path = os.path.join(current_dir, '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)

    # Run startup pre-flight validation checks
    from validate_startup import run_startup_validation
    validation_passed = run_startup_validation()
    if not validation_passed:
        print("✘ CRITICAL: Pre-flight validation failed. Exiting server startup.")
        sys.exit(1)

    port = int(os.getenv("PORT", 8000))
    print(f"[START] Starting FastAPI backend server on http://localhost:{port} (reload=True)...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)

import os
import json
from app.utils.logger import get_logger

logger = get_logger("app.services.map_assets")

class MapAssetsService:
    @staticmethod
    def resolve_state(destination: str) -> str:
        dest_lower = destination.lower()
        if "meghalaya" in dest_lower or "shillong" in dest_lower or "cherrapunji" in dest_lower:
            return "meghalaya"
        elif "rajasthan" in dest_lower or "jaipur" in dest_lower or "jodhpur" in dest_lower or "udaipur" in dest_lower or "jaisalmer" in dest_lower:
            return "rajasthan"
        elif "kerala" in dest_lower or "kochi" in dest_lower or "munnar" in dest_lower or "alleppey" in dest_lower:
            return "kerala"
        elif "sikkim" in dest_lower or "gangtok" in dest_lower or "lachen" in dest_lower or "lachung" in dest_lower:
            return "sikkim"
        return ""

    @classmethod
    def get_state_boundary(cls, destination: str) -> dict:
        state = cls.resolve_state(destination)
        if not state:
            logger.warning(f"No boundary asset resolved for destination: {destination}")
            return {}
        
        # Load from static assets
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        filepath = os.path.join(base_dir, "static", "geojson", f"{state}.json")
        
        if not os.path.exists(filepath):
            logger.error(f"GeoJSON file not found: {filepath}")
            return {}
            
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load GeoJSON from {filepath}: {e}")
            return {}

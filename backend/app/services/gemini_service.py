import os
import json
import ssl
import urllib.request
import urllib.parse
from app.prompts.travel_prompts import SYSTEM_PROMPT_ITINERARY
from app.utils.logger import get_logger

logger = get_logger("app.services.gemini_service")

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            # Try VITE_GEMINI_API_KEY as fallback
            self.api_key = os.getenv("VITE_GEMINI_API_KEY")
        
        self.url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
    async def generate_itinerary(
        self, 
        dest: str, 
        days: int, 
        budget: float, 
        comfort: str, 
        transport: str, 
        place_types: list,
        real_places: list = None
    ) -> dict | None:
        """
        Generates structured JSON itinerary based on user preferences using Gemini 1.5 Flash.
        """
        if not self.api_key:
            logger.warning("Gemini Service initialized without an API key. Skipping Gemini generation.")
            return None

        logger.info(f"Gemini Service: Generating itinerary for destination: '{dest}'")
        
        places_context = ""
        if real_places:
            places_context = "\n".join([f"- Name: {p['name']}. Summary: {p['summary']}" for p in real_places[:6]])
        else:
            places_context = "No nearby places context available."

        user_content = f"""
        Generate a {days}-day itinerary for {dest}.
        Number of travelers: 2
        Total Budget: {budget}
        Comfort Level: {comfort}
        Transport Preference: {transport}
        Interests: {", ".join(place_types)}
        
        Here are the REAL-WORLD attractions in/near {dest} that you MUST include and cluster:
        {places_context}
        
        Do not invent other cities or geographic locations outside {dest} and its surroundings.
        """

        # Construct payload for Gemini API
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": user_content
                        }
                    ]
                }
            ],
            "systemInstruction": {
                "parts": [
                    {
                        "text": SYSTEM_PROMPT_ITINERARY
                    }
                ]
            },
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.url,
                data=req_data,
                headers={
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            
            # Disable SSL verification for development environments (following local patterns)
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            logger.info("Sending request to Gemini API...")
            with urllib.request.urlopen(req, context=ctx, timeout=45) as response:
                resp_data = json.loads(response.read().decode("utf-8"))
                
                # Extract text from response
                candidates = resp_data.get("candidates", [])
                if not candidates:
                    logger.error(f"Gemini API returned no candidates: {resp_data}")
                    return None
                
                text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if not text_content:
                    logger.error(f"Gemini API returned empty text: {resp_data}")
                    return None
                
                # Clean potential markdown wrapping
                cleaned_text = text_content.strip()
                if cleaned_text.startswith("```json"):
                    cleaned_text = cleaned_text[7:]
                elif cleaned_text.startswith("```"):
                    cleaned_text = cleaned_text[3:]
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text[:-3]
                cleaned_text = cleaned_text.strip()
                
                itinerary_data = json.loads(cleaned_text)
                logger.info("Successfully received and parsed Gemini API itinerary response.")
                return itinerary_data
                
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}", exc_info=True)
            return None

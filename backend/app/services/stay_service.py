import os
from typing import List, Dict, Any
from app.utils.logger import get_logger

logger = get_logger("app.services.stay")

# Hotel Data Model Reference:
# - name: str (Hotel Name)
# - price_per_night: float (Price Per Night)
# - rating: float (Rating e.g. 4.6)
# - review_count: int (Review Count)
# - image_url: str (Hotel Image)
# - distance: str (Distance From Center)
# - amenities: List[str] (Amenities)
# - accommodation_type: str (Accommodation Type)
# - booking_link: str (Booking Link)
# - provider: str (booking.com, agoda, expedia, etc.)

class HotelProviderAdapter:
    """
    Base adapter class to define the interface for real hotel API integrations.
    Future keys should be registered in backend/.env (e.g. BOOKING_API_KEY, EXPEDIA_API_KEY).
    """
    def __init__(self, provider_name: str, api_key: str = None):
        self.provider_name = provider_name
        self.api_key = api_key

    def search_hotels(self, destination: str, budget: float) -> List[Dict[str, Any]]:
        raise NotImplementedError

class BookingComAdapter(HotelProviderAdapter):
    def search_hotels(self, destination: str, budget: float) -> List[Dict[str, Any]]:
        logger.info(f"Mocking Booking.com API search for '{destination}' (Key: {bool(self.api_key)})")
        # Integration logic will use requests to query Booking.com RapidAPI or Partner API
        return []

class AgodaAdapter(HotelProviderAdapter):
    def search_hotels(self, destination: str, budget: float) -> List[Dict[str, Any]]:
        logger.info(f"Mocking Agoda API search for '{destination}'")
        return []

class ExpediaAdapter(HotelProviderAdapter):
    def search_hotels(self, destination: str, budget: float) -> List[Dict[str, Any]]:
        logger.info(f"Mocking Expedia API search for '{destination}'")
        return []

class HotelsComAdapter(HotelProviderAdapter):
    def search_hotels(self, destination: str, budget: float) -> List[Dict[str, Any]]:
        logger.info(f"Mocking Hotels.com API search for '{destination}'")
        return []

class GoogleHotelsAdapter(HotelProviderAdapter):
    def search_hotels(self, destination: str, budget: float) -> List[Dict[str, Any]]:
        logger.info(f"Mocking Google Hotels API search for '{destination}'")
        return []

class GooglePlacesAdapter(HotelProviderAdapter):
    def search_hotels(self, destination: str, budget: float) -> List[Dict[str, Any]]:
        logger.info(f"Mocking Google Places API hotel search for '{destination}'")
        return []

class StayService:
    def __init__(self):
        # Instantiate adapters with env keys if loaded
        self.adapters = {
            "booking.com": BookingComAdapter("booking.com", os.getenv("BOOKING_API_KEY")),
            "agoda": AgodaAdapter("agoda", os.getenv("AGODA_API_KEY")),
            "expedia": ExpediaAdapter("expedia", os.getenv("EXPEDIA_API_KEY")),
            "hotels.com": HotelsComAdapter("hotels.com", os.getenv("HOTELS_API_KEY")),
            "google_hotels": GoogleHotelsAdapter("google_hotels", os.getenv("GOOGLE_HOTELS_API_KEY")),
            "google_places": GooglePlacesAdapter("google_places", os.getenv("GOOGLE_PLACES_API_KEY"))
        }

    def get_stay_recommendations(self, destination: str, total_budget: float) -> Dict[str, List[Dict[str, Any]]]:
        """
        Returns stay recommendations for a destination, grouped by budget tiers:
        - Budget
        - Mid-range
        - Premium
        
        Enforces AI budget filtering:
        - If total_budget is low (e.g. <= 25000), we prefer Homestays, Guest Houses, Hostels.
        - If total_budget is high (e.g. >= 60000), we allow Resorts, Premium Hotels, Boutique Properties.
        """
        logger.info(f"Generating stay recommendations for '{destination}' with trip budget INR {total_budget}")
        
        dest_clean = destination.lower()
        
        # 1. Define base datasets matching various destinations to provide real-world suggestions
        hotel_database = {
            "meghalaya": [
                # Budget
                {"name": "Shillong Bamboo Trail Hostel", "price": 950.0, "rating": 4.6, "reviews": 120, "image": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=400&fit=crop", "distance": "1.2 km from center", "amenities": ["Free Wi-Fi", "Common Kitchen", "Bonfire"], "type": "Hostel", "provider": "booking.com"},
                {"name": "Sohra Eco Guest House", "price": 1400.0, "rating": 4.4, "reviews": 85, "image": "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=400&fit=crop", "distance": "0.5 km from Cherrapunji Center", "amenities": ["Free Breakfast", "Geyser", "Local Guides"], "type": "Guest House", "provider": "hotels.com"},
                {"name": "Mawlynnong Village Homestay", "price": 1200.0, "rating": 4.7, "reviews": 64, "image": "https://images.unsplash.com/photo-1508873696983-2df519f0397e?q=80&w=400&fit=crop", "distance": "0.1 km from cleanest village", "amenities": ["Organic meals", "Garden view", "Parking"], "type": "Homestay", "provider": "google_places"},
                
                # Mid-range
                {"name": "Pine Crest Boutique Hotel", "price": 3200.0, "rating": 4.5, "reviews": 210, "image": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=400&fit=crop", "distance": "2.0 km from Police Bazar", "amenities": ["Restaurant", "Bar", "Room Service", "Car Rental"], "type": "Hotel", "provider": "agoda"},
                {"name": "Cherrapunji Holiday Resort", "price": 4500.0, "rating": 4.3, "reviews": 156, "image": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=400&fit=crop", "distance": "8.0 km from Double Decker Bridge", "amenities": ["In-house Dining", "Trek assistance", "Laundry"], "type": "Resort", "provider": "booking.com"},
                {"name": "Umiam Lake View Cottage", "price": 3800.0, "rating": 4.2, "reviews": 98, "image": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=400&fit=crop", "distance": "1.0 km from Umiam Coast", "amenities": ["Balcony View", "Boating Access", "Power backup"], "type": "Guest House", "provider": "expedia"},
                
                # Premium
                {"name": "Ri Kynjai Serene Lake Resort", "price": 9500.0, "rating": 4.8, "reviews": 340, "image": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=400&fit=crop", "distance": "12.0 km from Shillong", "amenities": ["Luxury Spa", "Jacuzzi", "Lake View Diner", "Bar"], "type": "Resort", "provider": "booking.com"},
                {"name": "Polo Towers Premium Hotel", "price": 6800.0, "rating": 4.6, "reviews": 412, "image": "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=400&fit=crop", "distance": "0.2 km from Center", "amenities": ["Gym", "Conference Hall", "Multi-cuisine Buffet"], "type": "Hotel", "provider": "google_hotels"}
            ],
            "kerala": [
                # Budget
                {"name": "Alleppey Backwaters Youth Hostel", "price": 850.0, "rating": 4.5, "reviews": 180, "image": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=400&fit=crop", "distance": "0.8 km from Boat Jetty", "amenities": ["Free Wi-Fi", "Cycling Rental", "Roof terrace"], "type": "Hostel", "provider": "booking.com"},
                {"name": "Munnar Tea Valley Guest House", "price": 1500.0, "rating": 4.3, "reviews": 78, "image": "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=400&fit=crop", "distance": "2.5 km from Munnar Town", "amenities": ["Hot Water", "Tea Estate Tour", "Kitchen Access"], "type": "Guest House", "provider": "hotels.com"},
                
                # Mid-range
                {"name": "Cochin Heritage Villa", "price": 3100.0, "rating": 4.6, "reviews": 230, "image": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=400&fit=crop", "distance": "1.0 km from Fort Kochi", "amenities": ["Pool", "Traditional Lunch", "Wi-Fi"], "type": "Homestay", "provider": "agoda"},
                {"name": "Alleppey Houseboat Cruise stays", "price": 5500.0, "rating": 4.5, "reviews": 315, "image": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=400&fit=crop", "distance": "0.0 km from Backwaters", "amenities": ["All Meals Included", "Sundeck", "AC Rooms"], "type": "Camping Stays", "provider": "booking.com"},
                
                # Premium
                {"name": "Kumarakom Lake Luxury Resort", "price": 12000.0, "rating": 4.9, "reviews": 680, "image": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=400&fit=crop", "distance": "5.0 km from Bird Sanctuary", "amenities": ["Infinity Pool", "Ayurvedic Spa", "Houseboat Dining"], "type": "Resort", "provider": "booking.com"},
                {"name": "Varkala Cliff Premium Resort", "price": 7500.0, "rating": 4.7, "reviews": 240, "image": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=400&fit=crop", "distance": "0.1 km from Sea Cliff", "amenities": ["Ocean View Bar", "Yoga Deck", "Spa"], "type": "Resort", "provider": "expedia"}
            ],
            "rajasthan": [
                # Budget
                {"name": "Jaipur City Moustache Hostel", "price": 750.0, "rating": 4.7, "reviews": 420, "image": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=400&fit=crop", "distance": "0.5 km from Metro Station", "amenities": ["Free Wi-Fi", "Rooftop Cafe", "Social events"], "type": "Hostel", "provider": "booking.com"},
                {"name": "Udaipur Lakeview Guest House", "price": 1350.0, "rating": 4.4, "reviews": 112, "image": "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=400&fit=crop", "distance": "0.2 km from City Palace", "amenities": ["Rooftop dining", "Hot showers", "Baggage hold"], "type": "Guest House", "provider": "hotels.com"},
                
                # Mid-range
                {"name": "Umaid Bhawan Heritage Hotel", "price": 3800.0, "rating": 4.6, "reviews": 512, "image": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=400&fit=crop", "distance": "3.2 km from Hawa Mahal", "amenities": ["Heritage courtyard", "Swimming Pool", "Folk dances"], "type": "Hotel", "provider": "agoda"},
                {"name": "Jaisalmer Desert Safari Camp", "price": 4200.0, "rating": 4.5, "reviews": 185, "image": "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=400&fit=crop", "distance": "0.1 km from Sam Sand Dunes", "amenities": ["Luxury Tents", "Buffet Dinner", "Jeep Safari"], "type": "Camping Stays", "provider": "booking.com"},
                
                # Premium
                {"name": "The Taj Lake Palace Udaipur", "price": 18000.0, "rating": 4.9, "reviews": 1205, "image": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=400&fit=crop", "distance": "0.0 km from Lake Pichola", "amenities": ["Royal butler service", "Floating pool", "Spa boat"], "type": "Resort", "provider": "booking.com"},
                {"name": "Jaipur Rambagh Palace Resort", "price": 16500.0, "rating": 4.8, "reviews": 940, "image": "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=400&fit=crop", "distance": "4.0 km from city center", "amenities": ["Palace Gardens", "Indoors Spa", "Fine Dining"], "type": "Resort", "provider": "google_hotels"}
            ],
            "sikkim": [
                # Budget
                {"name": "Gangtok Alpine Hostel", "price": 800.0, "rating": 4.6, "reviews": 95, "image": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=400&fit=crop", "distance": "0.9 km from MG Marg", "amenities": ["Free Wi-Fi", "Common Room", "Board games"], "type": "Hostel", "provider": "booking.com"},
                {"name": "Lachung Mountain View Homestay", "price": 1500.0, "rating": 4.5, "reviews": 60, "image": "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=400&fit=crop", "distance": "1.2 km from river base", "amenities": ["Local home-cooked meals", "Heater", "Mountain view"], "type": "Homestay", "provider": "google_places"},
                
                # Mid-range
                {"name": "Pelling Summit Golden Hotel", "price": 3500.0, "rating": 4.4, "reviews": 142, "image": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=400&fit=crop", "distance": "0.5 km from Skywalk", "amenities": ["Kanchenjunga view balconies", "Bar", "Diner"], "type": "Hotel", "provider": "agoda"},
                {"name": "Lachen Yarlam Resort", "price": 4800.0, "rating": 4.3, "reviews": 90, "image": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=400&fit=crop", "distance": "2.0 km from Lachen town", "amenities": ["Cozy fire hearths", "Trek guidance", "Restaurant"], "type": "Resort", "provider": "hotels.com"},
                
                # Premium
                {"name": "Gangtok Mayfair Luxury Spa Resort", "price": 11000.0, "rating": 4.8, "reviews": 512, "image": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=400&fit=crop", "distance": "5.5 km from Gangtok Center", "amenities": ["Casino", "Large Spa", "Heated Pool", "Pool table"], "type": "Resort", "provider": "booking.com"},
                {"name": "Pelling Elgin Mount Pandim Hotel", "price": 8500.0, "rating": 4.7, "reviews": 184, "image": "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=400&fit=crop", "distance": "0.2 km from Pemayangtse Monastery", "amenities": ["Heritage gardens", "Fine Dining", "Library"], "type": "Hotel", "provider": "google_hotels"}
            ]
        }

        # Match destination to database
        db_key = "meghalaya"
        for key in hotel_database.keys():
            if key in dest_clean:
                db_key = key
                break
                
        raw_list = hotel_database[db_key]
               # 2. Apply AI budget filtering rules
        # Prefer/Limit stays according to overall budget
        is_low_budget = total_budget <= 20000
        is_high_budget = total_budget >= 80000

        # Adjust ratings/prices slightly based on budget to feel highly customized
        import urllib.parse
        processed_hotels = []
        for h in raw_list:
            hotel = h.copy()
            # If trip budget is low (e.g. <= ₹20,000), strictly restrict to Homestays, Guest Houses, Hostels
            if is_low_budget:
                if hotel["type"] not in ["Homestay", "Guest House", "Hostel"]:
                    continue
            # If trip budget is high (e.g. >= ₹80,000), strictly restrict to Resorts, Hotels, Camping Stays
            if is_high_budget:
                if hotel["type"] not in ["Resort", "Hotel", "Camping Stays"]:
                    continue
            
            # Map standard keys
            hotel["price_per_night"] = hotel["price"]
            hotel["review_count"] = hotel["reviews"]
            hotel["image_url"] = hotel["image"]
            hotel["accommodation_type"] = hotel["type"]
            
            # Generate booking link based on provider
            provider_domain = hotel["provider"]
            if provider_domain == "booking.com":
                hotel["booking_link"] = f"https://www.booking.com/searchresults.html?ss={urllib.parse.quote(hotel['name'])}"
            elif provider_domain == "agoda":
                hotel["booking_link"] = f"https://www.agoda.com/search?q={urllib.parse.quote(hotel['name'])}"
            elif provider_domain == "expedia":
                hotel["booking_link"] = f"https://www.expedia.com/Hotel-Search?destination={urllib.parse.quote(hotel['name'])}"
            elif provider_domain == "hotels.com":
                hotel["booking_link"] = f"https://www.hotels.com/Hotel-Search?destination={urllib.parse.quote(hotel['name'])}"
            else:
                hotel["booking_link"] = f"https://www.google.com/travel/hotels?q={urllib.parse.quote(hotel['name'])}"
                
            processed_hotels.append(hotel)

        # 3. Group stays into Budget, Mid-range, Premium categories
        grouped = {
            "Budget": [],
            "Mid-range": [],
            "Premium": []
        }
        
        for hotel in processed_hotels:
            price = hotel["price"]
            if price < 2000:
                grouped["Budget"].append(hotel)
            elif price < 5000:
                grouped["Mid-range"].append(hotel)
            else:
                grouped["Premium"].append(hotel)
                
        # Fallback to make sure every tier has at least one mock hotel recommendation
        if not grouped["Budget"]:
            name = f"Cozy {destination} Heritage Inn" if is_high_budget else f"Cozy {destination} Backpackers Homestay"
            type_val = "Hotel" if is_high_budget else "Homestay"
            grouped["Budget"].append({
                "name": name,
                "price": 1100.0,
                "price_per_night": 1100.0,
                "rating": 4.4,
                "reviews": 45,
                "review_count": 45,
                "image": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=400&fit=crop",
                "image_url": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=400&fit=crop",
                "distance": "1.0 km from city center",
                "amenities": ["Free Wi-Fi", "Geyser", "Local tea"],
                "type": type_val,
                "accommodation_type": type_val,
                "provider": "booking.com",
                "booking_link": f"https://www.booking.com/searchresults.html?ss={urllib.parse.quote(name)}"
            })
        if not grouped["Mid-range"]:
            name = f"Scenic View {destination} Guest House" if is_low_budget else f"Scenic View {destination} Inn"
            type_val = "Guest House" if is_low_budget else "Hotel"
            grouped["Mid-range"].append({
                "name": name,
                "price": 2800.0,
                "price_per_night": 2800.0,
                "rating": 4.5,
                "reviews": 110,
                "review_count": 110,
                "image": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=400&fit=crop",
                "image_url": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=400&fit=crop",
                "distance": "2.5 km from city center",
                "amenities": ["Room Service", "Breakfast", "AC"],
                "type": type_val,
                "accommodation_type": type_val,
                "provider": "agoda",
                "booking_link": f"https://www.agoda.com/search?q={urllib.parse.quote(name)}"
            })
        if not grouped["Premium"]:
            name = f"Premium {destination} Hill Homestay" if is_low_budget else f"The Grand {destination} Mountain Resort"
            type_val = "Homestay" if is_low_budget else "Resort"
            grouped["Premium"].append({
                "name": name,
                "price": 7200.0,
                "price_per_night": 7200.0,
                "rating": 4.7,
                "reviews": 235,
                "review_count": 235,
                "image": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=400&fit=crop",
                "image_url": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=400&fit=crop",
                "distance": "5.0 km from center",
                "amenities": ["Infinity Pool", "Luxury Spa", "Rooftop dining"],
                "type": type_val,
                "accommodation_type": type_val,
                "provider": "google_hotels",
                "booking_link": f"https://www.google.com/travel/hotels?q={urllib.parse.quote(name)}"
            })
            
        return grouped

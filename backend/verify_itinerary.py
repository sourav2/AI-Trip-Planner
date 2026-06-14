import urllib.request
import json
import urllib.parse
import sys

def test_destination(dest, budget):
    print(f"\n--- Testing Destination: {dest} (Budget: Rs.{budget}) ---")
    
    # 1. Test Itinerary Generation
    url_itinerary = "http://localhost:8000/api/generate-itinerary"
    payload = {
        "destination": dest,
        "start_location": "Guwahati" if dest in ["Meghalaya", "Sikkim"] else ("Kochi" if dest == "Kerala" else "Jaipur"),
        "total_days": 4,
        "travelers": 2,
        "budget": float(budget),
        "comfort_level": "luxury" if budget >= 60000 else "budget",
        "transport_preference": "fastest",
        "place_types": ["nature", "waterfalls", "adventure"],
        "allow_international_transit": False
    }
    
    req = urllib.request.Request(
        url_itinerary,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            itinerary = json.loads(response.read().decode())
            print(f"[OK] Itinerary generated successfully.")
            
            # Check for image repetition and details
            attractions = itinerary.get("nearby_attractions", [])
            regions = itinerary.get("regions", [])
            
            print(f"Number of nearby attractions: {len(attractions)}")
            print(f"Number of regions: {len(regions)}")
            
            image_urls = []
            attraction_images = {}
            
            for att in attractions:
                img = att.get("image_url")
                name = att.get("name")
                if img:
                    image_urls.append(img)
                    attraction_images[name] = img
                    
            for reg in regions:
                img = reg.get("image_url")
                name = reg.get("region_name")
                if img:
                    image_urls.append(img)
                    
            unique_images = set(image_urls)
            print(f"Total image URLs found: {len(image_urls)}")
            print(f"Unique image URLs: {len(unique_images)}")
            
            if len(image_urls) != len(unique_images):
                print(f"[WARN] Image duplication detected! Repeated images: {len(image_urls) - len(unique_images)}")
                # Show repeated images
                from collections import Counter
                counts = Counter(image_urls)
                for img, c in counts.items():
                    if c > 1:
                        print(f"  Repeated ({c} times): {img}")
            else:
                print(f"[OK] NO image duplication detected. All resolved images are unique!")
                
            # Verify attractions have reasonable images
            print("Attraction Resolved Images:")
            for name, img in list(attraction_images.items())[:5]:
                print(f"  - {name}: {img}")
                
    except Exception as e:
        print(f"[ERROR] Failed to generate itinerary: {e}")
        
    # 2. Test Stays Recommendations
    url_stays = f"http://localhost:8000/api/stays?destination={urllib.parse.quote(dest)}&budget={budget}"
    req_stays = urllib.request.Request(url_stays)
    try:
        with urllib.request.urlopen(req_stays, timeout=30) as response:
            stays = json.loads(response.read().decode())
            print(f"[OK] Stays fetched successfully.")
            print("Stays Categories:")
            for tier, list_stays in stays.items():
                print(f"  - {tier}: {len(list_stays)} stays")
                for s in list_stays[:1]:
                    print(f"    Example stay: {s['name']} | Price: Rs.{s['price_per_night']} | Type: {s['accommodation_type']} | Link: {s.get('booking_link')}")
                    # Validate amenities & provider
                    print(f"    Amenities: {s.get('amenities')} | Provider: {s.get('provider')}")
    except Exception as e:
        print(f"[ERROR] Failed to fetch stays: {e}")

if __name__ == "__main__":
    test_destination("Meghalaya", 20000)
    test_destination("Meghalaya", 80000)
    test_destination("Kerala", 20000)
    test_destination("Sikkim", 20000)
    test_destination("Rajasthan", 20000)

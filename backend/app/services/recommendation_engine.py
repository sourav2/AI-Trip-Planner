import json
from pathlib import Path


class RecommendationEngine:

    def __init__(self):
        data_path = Path(__file__).parent.parent.parent / "data"

        with open(data_path / "attractions.json", "r", encoding="utf-8") as f:
            self.attractions = json.load(f)

        with open(data_path / "destinations.json", "r", encoding="utf-8") as f:
            self.destinations = json.load(f)

    def get_top_attractions(
    self,
    destination,
    travel_style="nature",
    pace="balanced",
    limit=6
    ):
            
        results = self.recommend(
        destination=destination,
        travel_style=travel_style,
        pace=pace
        )

        return results[:limit]


    def get_destination_attractions(self, destination_id):
        return [
            attraction
            for attraction in self.attractions
            if attraction["destinationId"] == destination_id
        ]

    def calculate_score(self,
    attraction,
    travel_style,
    pace,
    traveler_type="couple",
    crowd_preference="any",
    photography_interest=False):

        style_match = 100 if travel_style in attraction.get("categories", []) else 20

        pace_match = (
            100
            if pace in attraction.get("recommendedPace", [])
            else 50
        )

        score = (
            style_match * 0.40
            + attraction.get("heroScore", 0) * 0.20
            + attraction.get("uniquenessScore", 0) * 0.15
            + attraction.get("popularityScore", 0) * 0.10
            + attraction.get("photographyScore", 0) * 0.10
            + pace_match * 0.05
        )
        # Traveler type bonus

        if traveler_type == "couple":
            if attraction.get("coupleFriendly", False):
                score += 5

        if traveler_type == "family":
            if attraction.get("familyFriendly", False):
                score += 5

        if traveler_type == "senior":
            if attraction.get("seniorFriendly", False):
                score += 5


        # Crowd preference

        if crowd_preference == "offbeat":
            if attraction.get("crowdLevel") == "low":
                score += 5

        if crowd_preference == "popular":
            if attraction.get("crowdLevel") == "high":
                score += 5


        # Photography bonus

        if photography_interest:
            score += attraction.get("photographyScore", 0) * 0.05


        return round(score, 2)


    def recommend( self,
    destination,
    travel_style,
    pace,
    traveler_type="couple",
    crowd_preference="any",
    photography_interest=False):
        print("DESTINATION RECEIVED:", destination)
        attractions = self.get_destination_attractions(destination)

        results = []

        for attraction in attractions:

            score = self.calculate_score(
                attraction,
            travel_style,
            pace,
            traveler_type,
            crowd_preference,
            photography_interest
            )

            results.append({
                "id": attraction["id"],
                "name": attraction["name"],
                "score": score,
                "hero": attraction.get("isHeroExperience", False),
                 "reasons": attraction.get("recommendationReasons", [])
            })

        results.sort(
            key=lambda x: x["score"],
            reverse=True
        )

        return results


if __name__ == "__main__":

    engine = RecommendationEngine()

    tests = [
        {
            "destination": "kerala",
            "travel_style": "nature",
            "pace": "relaxed"
        },
        {
            "destination": "meghalaya",
            "travel_style": "nature",
            "pace": "balanced"
        },
        {
            "destination": "rajasthan",
            "travel_style": "culture",
            "pace": "balanced"
        },
        {
            "destination": "sikkim",
            "travel_style": "photography",
            "pace": "relaxed"
        }
    ]

    top_attractions = engine.get_top_attractions(
            destination="kerala"
        )

    print("\nTOP ATTRACTIONS TEST\n")

    for attraction in top_attractions:
            print(attraction)
            
    for test in tests:

        print("\n" + "=" * 50)
        print(
            f"{test['destination'].upper()} | "
            f"{test['travel_style']} | "
            f"{test['pace']}"
        )
        print("=" * 50)

        results = engine.recommend(
            destination=test["destination"],
            travel_style=test["travel_style"],
            pace=test["pace"]
        )
            
        for item in results:
            print(item)
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()

class BudgetRequest(BaseModel):
    total_budget: float
    travelers: int
    comfort_level: str
    destination: str

@router.post("/budget-breakdown")
async def calculate_budget_breakdown(request: BudgetRequest):
    budget = request.total_budget
    travelers = request.travelers
    comfort = request.comfort_level
    dest = request.destination

    # Proportional breakdowns
    if comfort == "budget":
        transport_pct = 0.25
        stay_pct = 0.35
        activities_pct = 0.15
        food_pct = 0.20
        tips = [
            "Opt for shared local cabs and public buses (saves up to 60% compared to private rental cabs).",
            f"Book budget homestays or hostels in {dest} rather than business hotels.",
            "Try street food spots and local village thalis - they are fresh, delicious, and extremely cost-effective.",
            "Focus on free or low-cost scenic spots (viewpoints, waterfalls, and local hikes)."
        ]
    elif comfort == "luxury":
        transport_pct = 0.35
        stay_pct = 0.40
        activities_pct = 0.13
        food_pct = 0.10
        tips = [
            f"Pre-book premium local guides in {dest} for private offbeat trails.",
            "Hire a dedicated private SUV driver for the entire duration of the trip for peak flexibility.",
            "Look for luxury boutique wellness retreats with built-in spa credits.",
            "Pre-reserve tables at high-end regional fine-dining bistros."
        ]
    else:  # moderate
        transport_pct = 0.30
        stay_pct = 0.38
        activities_pct = 0.15
        food_pct = 0.15
        tips = [
            "Combine public transport/trains for long legs and hire local autos/cabs for sightseeing.",
            "Look for 3-star rated boutique guest houses with high customer reviews.",
            "Alternate between mid-tier cafes and authentic local eateries for meal times.",
            "Book combo activity tickets online to secure discounts."
        ]

    # Adjust remaining as savings
    total_alloc = transport_pct + stay_pct + activities_pct + food_pct
    savings_pct = round(1.0 - total_alloc, 2)

    breakdown = {
        "transport": {
            "percentage": int(transport_pct * 100),
            "amount": round(budget * transport_pct, 2),
            "description": "Flights, trains, car rentals, and fuel costs"
        },
        "accommodation": {
            "percentage": int(stay_pct * 100),
            "amount": round(budget * stay_pct, 2),
            "description": "Hotels, home rentals, or resort stays"
        },
        "activities": {
            "percentage": int(activities_pct * 100),
            "amount": round(budget * activities_pct, 2),
            "description": "Entry tickets, tour guides, and event passes"
        },
        "food": {
            "percentage": int(food_pct * 100),
            "amount": round(budget * food_pct, 2),
            "description": "Daily meals, drinks, and cafe visits"
        },
        "savings": {
            "percentage": int(savings_pct * 100),
            "amount": round(budget * savings_pct, 2),
            "description": "Buffer for emergencies and souvenirs"
        }
    }

    per_person = round(budget / travelers, 2) if travelers > 0 else budget

    return {
        "destination": dest,
        "total_budget": budget,
        "travelers": travelers,
        "per_person_cost": per_person,
        "breakdown": breakdown,
        "tips": tips
    }

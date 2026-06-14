# Recommendation Engine V1

## Purpose

The Recommendation Engine is responsible for transforming traveler inputs into a structured, explainable itinerary.

The engine prioritizes meaningful experiences, route efficiency, pace balance, and budget compliance.

---

# Input Parameters

The engine receives:

* Destination
* Duration
* Budget
* Traveler Count
* Travel Style
* Trip Pace
* Transport Preference

Example:

```text
Destination: Kerala
Duration: 6 Days
Budget: ₹30,000
Travelers: 2
Style: Nature + Relaxed
Pace: Balanced
```

---

# Attraction Scoring Formula

Each attraction receives a weighted score.

## Score Weights

| Factor             | Weight |
| ------------------ | ------ |
| Travel Style Match | 35%    |
| Hero Score         | 20%    |
| Uniqueness Score   | 15%    |
| Pace Compatibility | 15%    |
| Popularity Score   | 10%    |
| Season Match       | 5%     |

## Formula

```text
Final Score =
(Style Match × 0.35)
+
(Hero Score × 0.20)
+
(Uniqueness × 0.15)
+
(Pace Match × 0.15)
+
(Popularity × 0.10)
+
(Season Match × 0.05)
```

Higher scoring attractions are prioritized during itinerary generation.

---

# Hero Experience Rules

Hero Experiences are the core memories of the trip.

These are selected before any supporting attractions.

## Short Trips (1-4 Days)

Rule:

```text
1 Hero Experience per day
```

Examples:

* Dawki
* Munnar
* Gurudongmar Lake

---

## Medium Trips (5-8 Days)

Rule:

```text
3-4 Hero Experiences per trip
```

Examples:

Day 1 → Hero
Day 3 → Hero
Day 5 → Hero
Day 7 → Hero

---

## Long Trips (9+ Days)

Rule:

```text
4-5 Hero Experiences per trip
```

Additional days should focus on support and recovery experiences rather than increasing hero density.

---

# Hero Selection Criteria

An attraction qualifies as a Hero Experience when:

```text
Hero Score ≥ 90
```

AND

```text
Uniqueness Score ≥ 85
```

Examples:

✓ Dawki

✓ Living Root Bridge

✓ Munnar

✓ Alleppey

✓ Gurudongmar Lake

---

# Supporting Experience Rules

Supporting Experiences enhance the journey around Hero Experiences.

Examples:

* Tea Estate Visit
* Local Market
* Cafe Exploration
* Photography Stops
* Heritage Walks

Rule:

```text
2-3 Supporting Experiences
per Hero Experience
```

Supporting Experiences should be geographically nearby whenever possible.

---

# Recovery Experience Rules

Recovery Experiences prevent itinerary fatigue.

Examples:

* Lake Visit
* Scenic Drive
* Cafe Time
* Houseboat Cruise
* Village Walk

Rule:

```text
No more than 2 high-energy days
in a row
```

When detected:

```text
High Energy
+
High Energy
+
High Energy
```

The engine should insert a recovery experience automatically.

---

# Pace Management Rules

## Relaxed Pace

Daily Activities:

```text
2-3 Experiences
```

Daily Driving:

```text
Maximum 3 Hours
```

---

## Balanced Pace

Daily Activities:

```text
3-5 Experiences
```

Daily Driving:

```text
Maximum 5 Hours
```

---

## Packed Pace

Daily Activities:

```text
5-7 Experiences
```

Daily Driving:

```text
Maximum 7 Hours
```

---

# Budget Compliance Rules

Budget is treated as a hard constraint.

The engine should attempt to remain within:

```text
±10%
```

of target budget.

When exceeded:

Generate warning:

```text
Trip exceeds budget by ₹X.
```

And propose:

* Budget hotels
* Route reduction
* Experience removal

---

# Route Efficiency Rules

The engine should minimize:

* Backtracking
* Repeated highways
* Unnecessary city returns

Priority:

```text
Experience Quality
+
Route Efficiency
```

instead of

```text
Maximum Attraction Count
```

---

# Trade-Off Engine

Every itinerary change must be explainable.

Examples:

## Add Attraction

```text
Adding Gurudongmar Lake

Impact:
+ ₹3,500
+ 6 Hours Travel
+ High Energy Day
```

---

## Remove Attraction

```text
Removing Dawki

Impact:
- Unique River Experience
- Hero Experience Count Reduced
```

No silent modifications are allowed.

---

# Explanation Engine

Every recommendation should include reasoning.

Example:

Why Munnar?

✓ Matches Nature preference

✓ High Hero Score

✓ Excellent Photography Opportunity

✓ Fits Balanced Pace

✓ Efficient Route Placement

The engine must always explain major recommendations.

---

# Success Criteria

A successful itinerary:

✓ Matches traveler intent

✓ Includes Hero Experiences

✓ Maintains pace balance

✓ Stays within budget

✓ Minimizes unnecessary travel

✓ Provides explanation for recommendations

✓ Creates memorable journeys rather than attraction lists

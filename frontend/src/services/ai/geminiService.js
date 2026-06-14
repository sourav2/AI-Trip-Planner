import { envConfig } from '../envConfig';
import { parser } from './parser';
import {
  SYSTEM_PROMPT_CHAT,
  SYSTEM_PROMPT_ITINERARY,
  SYSTEM_PROMPT_ATTRACTIONS,
  SYSTEM_PROMPT_TRAVEL_TIPS,
  SYSTEM_PROMPT_BLUEPRINT,
  getItineraryUserPrompt,
  getAttractionsUserPrompt,
  getTravelTipsUserPrompt,
  getBlueprintUserPrompt
} from './prompts';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const geminiService = {
  /**
   * Helper to query Gemini API via fetch
   */
  async _callGemini(systemInstruction, prompt) {
    const key = envConfig.GEMINI_API_KEY;
    if (!key) {
      throw new Error("Missing Gemini API Key");
    }

    const url = `${GEMINI_API_URL}?key=${key}`;
    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      throw new Error("No text content returned from Gemini API");
    }

    return textContent;
  },

  /**
   * Generates a complete trip itinerary plan.
   */
  async generateTripPlan(destination, duration = 4, budget = 20000, preferences = {}) {
    console.log(`[geminiService] Generating trip plan for ${destination} (${duration} days, Budget: ${budget})`);
    
    if (!envConfig.GEMINI_API_KEY) {
      console.warn("[geminiService] No Gemini API key configuration found. Serving high-fidelity mock trip plan.");
      return this._getMockTripPlan(destination, duration, budget, preferences);
    }

    try {
      const prompt = getItineraryUserPrompt(destination, duration, budget, preferences);
      const rawResponse = await this._callGemini(SYSTEM_PROMPT_ITINERARY, prompt);
      const parsed = parser.parseJSON(rawResponse);
      if (!parsed) {
        throw new Error("Parsed JSON is null");
      }
      return parsed;
    } catch (error) {
      console.error("[geminiService] generateTripPlan failed, falling back to mock:", error);
      return this._getMockTripPlan(destination, duration, budget, preferences);
    }
  },

  /**
   * Generates 5 nearby attractions.
   */
  async generateAttractions(destination) {
    console.log(`[geminiService] Generating attractions for ${destination}`);

    if (!envConfig.GEMINI_API_KEY) {
      console.warn("[geminiService] No Gemini API key. Serving mock attractions.");
      return this._getMockAttractions(destination);
    }

    try {
      const prompt = getAttractionsUserPrompt(destination);
      const rawResponse = await this._callGemini(SYSTEM_PROMPT_ATTRACTIONS, prompt);
      const parsed = parser.parseJSON(rawResponse);
      if (!parsed) {
        throw new Error("Parsed attractions array is null");
      }
      return parsed;
    } catch (error) {
      console.error("[geminiService] generateAttractions failed, falling back to mock:", error);
      return this._getMockAttractions(destination);
    }
  },

  /**
   * Generates localized travel tips.
   */
  async generateTravelTips(destination) {
    console.log(`[geminiService] Generating travel tips for ${destination}`);

    if (!envConfig.GEMINI_API_KEY) {
      console.warn("[geminiService] No Gemini API key. Serving mock travel tips.");
      return this._getMockTravelTips(destination);
    }

    try {
      const prompt = getTravelTipsUserPrompt(destination);
      const rawResponse = await this._callGemini(SYSTEM_PROMPT_TRAVEL_TIPS, prompt);
      const parsed = parser.parseJSON(rawResponse);
      if (!parsed) {
        throw new Error("Parsed travel tips is null");
      }
      return parsed;
    } catch (error) {
      console.error("[geminiService] generateTravelTips failed, falling back to mock:", error);
      return this._getMockTravelTips(destination);
    }
  },

  /**
   * Generates detailed blueprint text.
   */
  async generateBlueprintContent(destination, tripPlan) {
    console.log(`[geminiService] Generating blueprint for ${destination}`);

    if (!envConfig.GEMINI_API_KEY) {
      console.warn("[geminiService] No Gemini API key. Serving mock blueprint.");
      return this._getMockBlueprint(destination, tripPlan);
    }

    try {
      const prompt = getBlueprintUserPrompt(destination, tripPlan);
      const rawResponse = await this._callGemini(SYSTEM_PROMPT_BLUEPRINT, prompt);
      const parsed = parser.parseJSON(rawResponse);
      if (!parsed) {
        throw new Error("Parsed blueprint is null");
      }
      return parsed;
    } catch (error) {
      console.error("[geminiService] generateBlueprintContent failed, falling back to mock:", error);
      return this._getMockBlueprint(destination, tripPlan);
    }
  },

  /**
   * Chat bot assistant response generation.
   */
  async generateChatResponse(messageHistory, context = {}) {
    console.log("[geminiService] Generating chat response");

    if (!envConfig.GEMINI_API_KEY) {
      console.warn("[geminiService] No Gemini API key. Serving mock chat response.");
      return this._getMockChatResponse(messageHistory, context);
    }

    try {
      const key = envConfig.GEMINI_API_KEY;
      const url = `${GEMINI_API_URL}?key=${key}`;
      
      // Structure message history for Gemini API
      // Translate 'user'/'assistant' roles to 'user'/'model' expected by Gemini
      const contents = messageHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // Append trip context to system instruction
      const contextualSystemInstruction = `${SYSTEM_PROMPT_CHAT}\n\nCURRENT TRIP CONTEXT:\n${JSON.stringify(context, null, 2)}`;

      const requestBody = {
        contents,
        systemInstruction: {
          parts: [{ text: contextualSystemInstruction }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Gemini Chat API returned status ${response.status}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble thinking of a response. Please try again.";
      return {
        role: "assistant",
        content: reply
      };
    } catch (error) {
      console.error("[geminiService] generateChatResponse failed, falling back to mock:", error);
      return this._getMockChatResponse(messageHistory, context);
    }
  },

  // ==========================================
  // HIGH FIDELITY MOCK GENERATORS
  // ==========================================

  _getMockTripPlan(dest, duration, budget, preferences) {
    const travelers = preferences.travelers || 2;
    const comfort = preferences.comfortLevel || 'moderate';
    
    // Dynamic costs calculations
    const transport_cost = Math.round(budget * 0.25);
    const accommodation_cost = Math.round(budget * 0.35);
    const activities_cost = Math.round(budget * 0.20);
    const food_cost = Math.round(budget * 0.15);
    const remaining_savings = Math.round(budget * 0.05);

    return {
      travelers: parseInt(travelers),
      budget: parseFloat(budget),
      destination: dest,
      currency: "INR",
      total_days: parseInt(duration),
      comfort_level: comfort,
      transport_preference: preferences.transportPreference || 'fastest',
      budget_utilization: {
        transport_cost,
        accommodation_cost,
        activities_cost,
        food_cost,
        remaining_savings
      },
      regions: [
        {
          region_name: `${dest} Valley`,
          region_image_query: `${dest} nature landscape`,
          quick_summary: `Explore the vibrant heart and scenic natural corridors of ${dest}.`,
          transport: "private cab",
          hotel_type: comfort === 'budget' ? 'Cozy Homestay' : comfort === 'moderate' ? 'Premium Cottage' : 'Luxury Resort',
          estimated_cost: Math.round(budget * 0.6),
          places: [`${dest} Overlook`, `${dest} Historic Market`, `${dest} Nature Reserve`],
          food_recommendations: [`Traditional ${dest} Platter`, "Highland Brew Cafe"],
          activities: ["Scenic Photography", "Local Market Walks"],
          timeline: Array.from({ length: duration }).map((_, i) => ({
            day: i + 1,
            title: `Day ${i + 1}: Discovering ${dest} Highlights`,
            activities: [
              {
                time: "09:00 AM",
                activity: `Scenic drive to ${dest} central landmarks and valleys.`,
                cost: 800
              },
              {
                time: "01:00 PM",
                activity: "Lunch and tasting at local traditional food hub.",
                cost: 400
              },
              {
                time: "03:30 PM",
                activity: `Hike and nature walk across ${dest} trails.`,
                cost: 200
              }
            ]
          }))
        }
      ],
      nearby_attractions: this._getMockAttractions(dest)
    };
  },

  _getMockAttractions(dest) {
    return [
      {
        name: `${dest} Scenic Falls`,
        summary: "Breathtaking multi-tiered waterfall nestled in green forests.",
        visit_duration: "2 Hours",
        local_cost: 150.0,
        description: `The highest and most famous waterfall in ${dest}, offering stunning viewpoints, trekking trails, and local handicraft stalls.`,
        best_time: "October to April",
        tips: "Visit in the early morning to capture photos with the fog clearing.",
        distance: "8 km from center",
        local_transport: "Local Taxi",
        highlights: ["Three-tier view", "Trekking stairs", "Local tea stalls"],
        quick_facts: {
          "Type": "Waterfall",
          "Rating": "4.8 / 5.0"
        },
        nearby_activities: ["Photography", "Fringe Hiking"]
      },
      {
        name: `${dest} Heritage Village`,
        summary: "Experience authentic traditions and clean green living.",
        visit_duration: "3 Hours",
        local_cost: 50.0,
        description: "A beautifully preserved heritage village showcasing clean eco-friendly lifestyles, traditional architecture, and delicious home-cooked tribal meals.",
        best_time: "All year round",
        tips: "Hire a local guide to learn the deep folklore and stories.",
        distance: "15 km from center",
        local_transport: "Shared Cab",
        highlights: ["Eco-friendly homes", "Living architecture", "Traditional crafts"],
        quick_facts: {
          "Type": "Cultural Site",
          "Rating": "4.7 / 5.0"
        },
        nearby_activities: ["Village Tour", "Traditional Lunch"]
      },
      {
        name: `${dest} Clouds Valley`,
        summary: "A spectacular viewpoint suspended over sea of clouds.",
        visit_duration: "1.5 Hours",
        local_cost: 0.0,
        description: "Witness the magical early morning mist rising from deep valley corridors, surrounding you in white clouds.",
        best_time: "Monsoon and Winter",
        tips: "Reach by 5:00 AM for the spectacular sunrise display.",
        distance: "22 km from center",
        local_transport: "Private Car",
        highlights: ["Cloud ocean views", "Sunrise panorama", "Mountain range"],
        quick_facts: {
          "Type": "Viewpoint",
          "Rating": "4.9 / 5.0"
        },
        nearby_activities: ["Sunrise Watch", "Landscape Photography"]
      },
      {
        name: `${dest} Crystal River`,
        summary: "Boating on perfectly clear water.",
        visit_duration: "2.5 Hours",
        local_cost: 500.0,
        description: "Famous for its mirror-like transparent water where boats look like they are floating in mid-air. Perfect for boating, camping, and kayaking.",
        best_time: "November to March",
        tips: "Boating is best on sunny days for maximum transparency.",
        distance: "30 km from center",
        local_transport: "Prepaid Cab",
        highlights: ["Crystal clear water", "Boating tour", "Suspension bridge"],
        quick_facts: {
          "Type": "River / Adventure",
          "Rating": "4.8 / 5.0"
        },
        nearby_activities: ["Kayaking", "River Camping", "Boating"]
      },
      {
        name: `${dest} Sacred Forest`,
        summary: "An ancient forest preserved by traditional laws.",
        visit_duration: "2 Hours",
        local_cost: 100.0,
        description: "A mysterious and dense forest where not even a leaf or twig is allowed to be taken out. Rich in ancient monoliths and exotic orchids.",
        best_time: "October to May",
        tips: "Respect local beliefs: do not carry anything out from the forest.",
        distance: "12 km from center",
        local_transport: "Taxi",
        highlights: ["Ancient monoliths", "Rare orchids", "Centuries old trees"],
        quick_facts: {
          "Type": "Nature / Sacred Grove",
          "Rating": "4.6 / 5.0"
        },
        nearby_activities: ["Guided walk", "Flora spotting"]
      }
    ];
  },

  _getMockTravelTips(dest) {
    return {
      logistics: {
        best_time: "October to April is ideal with pleasant temperatures.",
        packing_essentials: ["Comfortable hiking shoes", "Windbreaker jacket", "Umbrella (weather is unpredictable)", "Refillable water bottle"],
        connectivity: "Jio and Airtel offer good 4G network coverage in main hubs. Valley signals can be intermittent.",
        local_commute: "Private taxi packages are the most comfortable and reliable options."
      },
      cultural_norms: {
        dress_code: "Modest casual clothing. Cover knees and shoulders when visiting community shrines or holy sites.",
        social_etiquettes: ["Always ask permission before photographing locals", "Keep the environment clean (littering is strictly frowned upon)"],
        photography_rules: "Permitted everywhere except inside sacred inner shrines."
      },
      safety: {
        emergency_contacts: {
          police: "112 / 100",
          tourist_helpline: "+91-888-TRIP-HELP"
        },
        health_guidelines: "Carry motion sickness pills for winding mountain roads. Drink bottled or filtered water.",
        scam_alerts: "Agree on taxi fares before boarding. Avoid unlicensed guides near main viewpoints."
      }
    };
  },

  _getMockBlueprint(dest, tripPlan) {
    return {
      title: `The Ultimate ${dest} Explorer Guide`,
      subtitle: `A curated Blueprint for a ${tripPlan?.total_days || 4}-Day trip`,
      packing_list: [
        "Robust walking shoes for slopes",
        "Rain protection / Umbrella",
        "Motion sickness meds",
        "Layered clothing / Light jacket"
      ],
      route_highlights: [
        `Traverse beautiful regions of ${dest} valley`,
        "Explore majestic local waterfalls and viewpoints",
        "Discover historic tribal villages and pristine environments"
      ],
      must_try_dishes: [
        `Traditional local ${dest} stew`,
        "Smoked bamboo shoot curry",
        "Signature organic ginger tea"
      ],
      local_words: [
        { word: "Thank you", translation: "Khublei / Dhanyavaad", pronunciation: "Koob-lay / Dan-ya-vaad" },
        { word: "How much?", translation: "Katno? / Kitna?", pronunciation: "Kat-no / Kit-na" },
        { word: "Hello", translation: "Kumno / Namaste", pronunciation: "Koom-no / Na-mas-tay" }
      ],
      emergency_contacts: [
        "Local Tourist Office: +91-XXX-XXXX",
        "National Emergency Helpline: 112"
      ],
      checklist: [
        "Double check weather forecasts",
        "Pre-book local taxi transport option",
        "Download offline maps of the valley",
        "Confirm homestay check-in timings"
      ]
    };
  },

  _getMockChatResponse(history, context) {
    const lastMsg = history[history.length - 1]?.content?.toLowerCase() || '';
    let response = "I'm here to help you coordinate your Antigravity travel plans! Let me know if you need help with destinations, budget adjustments, or generating your itinerary.";

    if (lastMsg.includes("budget")) {
      response = `For a trip to ${context.destination || "your destination"}, we can optimize your expenses. Would you like to reduce the current budget or find cheaper homestays?`;
    } else if (lastMsg.includes("waterfall") || lastMsg.includes("attraction")) {
      response = `I highly recommend checking out some scenic local waterfalls and historic villages in ${context.destination || "your destination"}. You can add them to your travel cart!`;
    } else if (lastMsg.includes("how") || lastMsg.includes("help") || lastMsg.includes("guide")) {
      response = "To create a trip, enter your destination and budget in the form on the left, select your interests, then click 'Generate Plan'. You can customize stops or download your Blueprint Guide anytime!";
    }

    return {
      role: "assistant",
      content: response
    };
  }
};

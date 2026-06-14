const API_BASE = '/api';

export const travelApi = {
  /**
   * Send chat messages to the travel AI consultant.
   * @param {Array<{role: string, content: string}>} messages
   */
  async chat(messages) {
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error in chat service:", error);
      return {
        role: "assistant",
        content: "I'm having trouble connecting to my backend travel consultants. Please check if the FastAPI server is running."
      };
    }
  },

  /**
   * Generate a structured travel itinerary.
   * @param {object} preferences
   */
  async generateItinerary(preferences) {
    try {
      const response = await fetch(`${API_BASE}/generate-itinerary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: preferences.destination || "Meghalaya",
          start_location: preferences.startLocation || preferences.start_location || "Guwahati",
          total_days: parseInt(preferences.totalDays || preferences.total_days || 4),
          travelers: parseInt(preferences.travelers || 2),
          budget: parseFloat(preferences.budget || 20000),
          comfort_level: preferences.comfortLevel || preferences.comfort_level || "moderate",
          transport_preference: preferences.transportPreference || preferences.transport_preference || "fastest",
          place_types: preferences.placeTypes || preferences.place_types || ["nature"],
          allow_international_transit: !!(preferences.allowInternationalTransit || preferences.allow_international_transit)
        }),
      });

      if (!response.ok) {
        throw new Error(`Itinerary API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error generating itinerary:", error);
      throw error;
    }
  },

  /**
   * Get a detailed budget breakdown analysis.
   * @param {object} budgetParams
   */
  async getBudgetBreakdown(budgetParams) {
    try {
      const response = await fetch(`${API_BASE}/budget-breakdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          total_budget: parseFloat(budgetParams.budget || budgetParams.total_budget || 20000),
          travelers: parseInt(budgetParams.travelers || 2),
          comfort_level: budgetParams.comfortLevel || budgetParams.comfort_level || "moderate",
          destination: budgetParams.destination || "Meghalaya"
        }),
      });

      if (!response.ok) {
        throw new Error(`Budget API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error retrieving budget breakdown:", error);
      throw error;
    }
  },

  /**
   * Search for locations matching the search query.
   * @param {string} query
   */
  async autocomplete(query) {
    try {
      const response = await fetch(`${API_BASE}/autocomplete?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Autocomplete API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error in autocomplete service:", error);
      return [];
    }
  },

  /**
   * Fetch nearby attractions for a destination and coordinates.
   */
  async fetchNearbyAttractions(dest, lat = null, lon = null, placeTypes = []) {
    try {
      let url = `${API_BASE}/nearby-attractions?dest=${encodeURIComponent(dest)}`;
      if (lat !== null && lon !== null) {
        url += `&lat=${lat}&lon=${lon}`;
      }
      if (placeTypes && placeTypes.length > 0) {
        url += `&place_types=${encodeURIComponent(JSON.stringify(placeTypes))}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Nearby attractions API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching nearby attractions:", error);
      return [];
    }
  },

  /**
   * Finalize the itinerary based on the selected places cart.
   */
  async finalizeItinerary(preferences) {
    try {
      const response = await fetch(`${API_BASE}/finalize-itinerary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: preferences.destination,
          start_location: preferences.startLocation || preferences.start_location,
          total_days: parseInt(preferences.totalDays || preferences.total_days || 4),
          travelers: parseInt(preferences.travelers || 2),
          budget: parseFloat(preferences.budget || 20000),
          comfort_level: preferences.comfortLevel || preferences.comfort_level || "moderate",
          transport_preference: preferences.transportPreference || preferences.transport_preference || "fastest",
          selected_places: preferences.selectedPlaces || [],
          allow_international_transit: !!(preferences.allowInternationalTransit || preferences.allow_international_transit)
        }),
      });

      if (!response.ok) {
        throw new Error(`Finalize Itinerary API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error finalizing itinerary:", error);
      throw error;
    }
  },

  /**
   * Fetch custom OSRM route for given sequence of [lat, lon] coordinates.
   */
  async fetchRoute(coords, allowInternationalTransit = false) {
    try {
      const response = await fetch(`${API_BASE}/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coords,
          allow_international_transit: !!allowInternationalTransit
        }),
      });

      if (!response.ok) {
        throw new Error(`Route API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching route:", error);
      return null;
    }
  },

  /**
   * Fetch place details guide for the given place name.
   */
  async fetchPlaceDetails(place) {
    try {
      const response = await fetch(`${API_BASE}/place-details?place=${encodeURIComponent(place)}`);
      if (!response.ok) {
        throw new Error(`Place Details API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching place details:", error);
      throw error;
    }
  },

  /**
   * Fetch a validated destination or attraction image.
   */
  async fetchPlaceImage(query, state = "", category = "", city = "", destination = "") {
    try {
      let url = `${API_BASE}/place-image?q=${encodeURIComponent(query)}`;
      if (state) url += `&state=${encodeURIComponent(state)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      if (destination) url += `&destination=${encodeURIComponent(destination)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Place Image API error: ${response.statusText}`);
      }
      const data = await response.json();
      return data.image_url;
    } catch (error) {
      console.error("Error fetching place image:", error);
      return null;
    }
  },

  /**
   * Fetch stay recommendations for a destination based on budget.
   */
  async fetchStays(destination, budget) {
    try {
      const response = await fetch(`${API_BASE}/stays?destination=${encodeURIComponent(destination)}&budget=${budget}`);
      if (!response.ok) {
        throw new Error(`Stays API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching stays:", error);
      return { Budget: [], "Mid-range": [], Premium: [] };
    }
  }
};

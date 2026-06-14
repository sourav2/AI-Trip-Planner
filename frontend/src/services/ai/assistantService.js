/**
 * AI Assistant Infrastructure and Context Coordinator
 */

import { geminiService } from './geminiService';

export const assistantService = {
  /**
   * Retrieves conversation history for a specific trip or session from localStorage
   * @param {string} tripId 
   */
  getConversationHistory(tripId = 'default') {
    try {
      const stored = localStorage.getItem(`chat_history_${tripId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("[assistantService] Failed to load chat history:", e);
      return [];
    }
  },

  /**
   * Saves conversation history for a specific trip or session
   * @param {string} tripId 
   * @param {Array} messages 
   */
  saveConversationHistory(tripId = 'default', messages = []) {
    try {
      localStorage.setItem(`chat_history_${tripId}`, JSON.stringify(messages));
      return true;
    } catch (e) {
      console.error("[assistantService] Failed to save chat history:", e);
      return false;
    }
  },

  /**
   * Clears conversation history for a specific trip
   * @param {string} tripId 
   */
  clearConversationHistory(tripId = 'default') {
    try {
      localStorage.removeItem(`chat_history_${tripId}`);
      return true;
    } catch (e) {
      console.error("[assistantService] Failed to clear chat history:", e);
      return false;
    }
  },

  /**
   * Builds a rich context string for the AI using active trip details and cart items
   * @param {object} tripData 
   * @param {Array} selectedPlaces 
   */
  buildTripContext(tripData, selectedPlaces = []) {
    if (!tripData) {
      return {
        message: "No active trip generated yet. Suggesting destination options."
      };
    }

    const {
      destination = "",
      total_days = 4,
      budget = 20000,
      travelers = 2,
      comfort_level = "moderate",
      transport_preference = "fastest",
      regions = []
    } = tripData;

    return {
      destination,
      durationDays: total_days,
      budgetLimit: budget,
      travelersCount: travelers,
      comfort: comfort_level,
      transport: transport_preference,
      currentStops: selectedPlaces.map(p => p.name),
      routeRegions: regions.map(r => r.region_name),
      budgetUtilization: tripData.budget_utilization || null
    };
  },

  /**
   * Generates a context-aware chat response using geminiService
   * @param {Array} messages 
   * @param {object} tripData 
   * @param {Array} selectedPlaces 
   */
  async getChatReply(messages, tripData = null, selectedPlaces = []) {
    const context = this.buildTripContext(tripData, selectedPlaces);
    
    // We delegate directly to our frontend Gemini Service API
    return await geminiService.generateChatResponse(messages, context);
  },

  /**
   * Custom action: Explain this itinerary breakdown
   */
  async explainItinerary(tripData) {
    if (!tripData) return "Please generate a trip first before asking for an explanation.";
    const context = this.buildTripContext(tripData);
    const messages = [
      { 
        role: 'user', 
        content: `Explain the flow and logic behind the generated itinerary for ${context.destination} for ${context.durationDays} days. Detail why these region choices make sense for a ${context.comfort} comfort level.` 
      }
    ];
    return await this.getChatReply(messages, tripData);
  },

  /**
   * Custom action: Suggest budget reduction strategies
   */
  async optimizeBudget(tripData) {
    if (!tripData) return "Please generate a trip first to optimize its budget.";
    const context = this.buildTripContext(tripData);
    const messages = [
      { 
        role: 'user', 
        content: `Analyze our budget of ₹${context.budgetLimit} for ${context.travelersCount} travelers in ${context.destination}. Suggest 3 concrete ways to reduce expenses by 15% without sacrificing safety.` 
      }
    ];
    return await this.getChatReply(messages, tripData);
  },

  /**
   * Custom action: Suggest additional local sights matching a vibe / type
   */
  async suggestAttractionsByType(tripData, vibe = "waterfalls") {
    if (!tripData) return `Please generate a trip first to suggest extra ${vibe}.`;
    const context = this.buildTripContext(tripData);
    const messages = [
      { 
        role: 'user', 
        content: `Suggest 3 extra offbeat ${vibe} or local points of interest inside the destination state of ${context.destination}. Explain why they fit our profile.` 
      }
    ];
    return await this.getChatReply(messages, tripData);
  }
};

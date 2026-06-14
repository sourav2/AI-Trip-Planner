/**
 * Centralized Error Manager for Antigravity Travel Planner
 * Intercepts external service issues, maps them to friendly messages, and prevents application crashes.
 */

export const ERROR_TYPES = {
  MISSING_KEYS: 'MISSING_KEYS',
  GEMINI_FAILURE: 'GEMINI_FAILURE',
  ROUTING_FAILURE: 'ROUTING_FAILURE',
  IMAGE_FAILURE: 'IMAGE_FAILURE',
  NETWORK_FAILURE: 'NETWORK_FAILURE',
  GEOLOCATION_FAILURE: 'GEOLOCATION_FAILURE'
};

export const errorManager = {
  /**
   * Translates a raw technical error into a user-friendly message and logs diagnostics
   * @param {string} type - One of ERROR_TYPES
   * @param {Error|string} rawError - Technical error details
   * @param {object} context - Additional context info
   * @returns {object} { title, description, severity, actionText }
   */
  handleError(type, rawError, context = {}) {
    console.error(`🔴 [ErrorManager] Captured Error [${type}]:`, rawError, "\nContext:", context);

    const baseResponse = {
      title: "An unexpected condition occurred",
      description: "We encountered an issue but resolved it internally. Your planning experience remains active.",
      severity: "warning",
      actionText: "Dismiss"
    };

    switch (type) {
      case ERROR_TYPES.MISSING_KEYS:
        return {
          title: "API Keys Offline",
          description: "One or more external service API keys are missing. We have safely activated high-fidelity local mock engines so you can continue exploring.",
          severity: "info",
          actionText: "Configure Keys"
        };
      
      case ERROR_TYPES.GEMINI_FAILURE:
        return {
          title: "AI Service Interrupted",
          description: "Our Gemini AI travel engine timed out or returned an invalid response. We have loaded fallback curated itineraries and travel suggestions.",
          severity: "warning",
          actionText: "Retry AI Plan"
        };

      case ERROR_TYPES.ROUTING_FAILURE:
        return {
          title: "OSRM Route Offline",
          description: `Unable to calculate driving route details for the coordinates. We have automatically fallback to straight-line geographical projections.`,
          severity: "warning",
          actionText: "Use Fallback Math"
        };

      case ERROR_TYPES.IMAGE_FAILURE:
        return {
          title: "Image Assets Offline",
          description: `Failed to fetch dynamic pictures of "${context.query || 'destination'}". Loading local curated travel matching photos.`,
          severity: "info",
          actionText: "Use Presets"
        };

      case ERROR_TYPES.NETWORK_FAILURE:
        return {
          title: "Connection Issue",
          description: "We are having trouble communicating with our backend FastAPI server. Please check if uvicorn is running locally.",
          severity: "danger",
          actionText: "Reconnect"
        };

      case ERROR_TYPES.GEOLOCATION_FAILURE:
        return {
          title: "Map Coordinate Error",
          description: `Could not geocode "${context.query || 'location'}". Defaulting to standard region coordinates to draw your itinerary maps.`,
          severity: "info",
          actionText: "Accept Fallback"
        };

      default:
        return baseResponse;
    }
  }
};

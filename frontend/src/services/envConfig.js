/**
 * Frontend Environment Configuration and Validation
 */

export const envConfig = {
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  OPENROUTESERVICE_API_KEY: import.meta.env.VITE_OPENROUTESERVICE_API_KEY || '',
  UNSPLASH_API_KEY: import.meta.env.VITE_UNSPLASH_API_KEY || '',
  PEXELS_API_KEY: import.meta.env.VITE_PEXELS_API_KEY || '',
  MAPBOX_API_KEY: import.meta.env.VITE_MAPBOX_API_KEY || '',
  MAP_PROVIDER: import.meta.env.VITE_MAP_PROVIDER || 'osm',
  
  // Validation status helper
  validate() {
    const warnings = [];
    const loaded = [];
    
    // Check key presence
    if (this.GEMINI_API_KEY) loaded.push("GEMINI_API_KEY");
    else warnings.push("VITE_GEMINI_API_KEY is missing. Gemini API features will be disabled.");
    
    if (this.OPENAI_API_KEY) loaded.push("OPENAI_API_KEY");
    else warnings.push("VITE_OPENAI_API_KEY is missing. OpenAI planner features will fall back to local mock engine.");

    if (this.GOOGLE_MAPS_API_KEY) loaded.push("GOOGLE_MAPS_API_KEY");
    else warnings.push("VITE_GOOGLE_MAPS_API_KEY is missing. Places discovery will fall back to OpenStreetMap Nominatim.");

    if (this.OPENROUTESERVICE_API_KEY) loaded.push("OPENROUTESERVICE_API_KEY");
    else warnings.push("VITE_OPENROUTESERVICE_API_KEY is missing. Routing will use public OSRM fallback.");

    if (this.UNSPLASH_API_KEY) loaded.push("UNSPLASH_API_KEY");
    else warnings.push("VITE_UNSPLASH_API_KEY is missing. Unsplash image fetch will fall back to public napi endpoint.");

    if (this.PEXELS_API_KEY) loaded.push("PEXELS_API_KEY");
    else warnings.push("VITE_PEXELS_API_KEY is missing. Pexels fallback search is disabled.");

    if (this.MAPBOX_API_KEY) loaded.push("MAPBOX_API_KEY");
    else warnings.push("VITE_MAPBOX_API_KEY is missing. Mapbox rendering/geocoding features will be disabled.");

    if (!this.MAP_PROVIDER) {
      warnings.push("VITE_MAP_PROVIDER is missing. Defaulting to 'osm' (OpenStreetMap).");
    } else {
      loaded.push(`MAP_PROVIDER (${this.MAP_PROVIDER})`);
    }

    if (warnings.length > 0) {
      console.warn("⚠️ [Antigravity Travel Environment Configuration Warning]:\n" + warnings.join("\n"));
    }
    console.log("✅ [Antigravity Travel Environment Configuration Status]: Loaded: " + (loaded.join(", ") || "None"));
    
    return {
      isValid: warnings.length === 0,
      warnings,
      loadedKeys: loaded,
      geminiConnected: !!this.GEMINI_API_KEY,
      openaiConnected: !!this.OPENAI_API_KEY,
      mapProvider: this.MAP_PROVIDER
    };
  }
};

// Auto-run validation check on import
envConfig.validate();

/**
 * Unsplash Image Provider
 */

const UNSPLASH_API_ROOT = 'https://api.unsplash.com';

export const unsplashProvider = {
  /**
   * Search for images matching a query
   * @param {string} query 
   * @returns {Promise<Array<string>>} List of regular image URLs
   */
  async search(query) {
    const apiKey = import.meta.env.VITE_UNSPLASH_API_KEY || '';
    
    if (apiKey) {
      try {
        console.log(`[unsplashProvider] Querying Unsplash API for: "${query}"`);
        const url = `${UNSPLASH_API_ROOT}/search/photos?query=${encodeURIComponent(query)}&per_page=5`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Client-ID ${apiKey}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.results && data.results.length > 0) {
            return data.results.map(img => img.urls.regular);
          }
        }
      } catch (error) {
        console.error("[unsplashProvider] API search failed:", error);
      }
    }

    // Try keyless search (NAPI)
    try {
      console.log(`[unsplashProvider] Attempting keyless NAPI search for: "${query}"`);
      const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=5`;
      const response = await fetch(url, {
        headers: {
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.results && data.results.length > 0) {
          return data.results.map(img => img.urls.regular);
        }
      }
    } catch (error) {
      console.warn("[unsplashProvider] Keyless NAPI search failed:", error);
    }

    return [];
  }
};

/**
 * Pexels Image Provider
 */

const PEXELS_API_ROOT = 'https://api.pexels.com/v1';

export const pexelsProvider = {
  /**
   * Search for images matching a query on Pexels
   * @param {string} query 
   * @returns {Promise<Array<string>>} List of image URLs
   */
  async search(query) {
    const apiKey = import.meta.env.VITE_PEXELS_API_KEY || '';
    if (!apiKey) {
      return [];
    }

    try {
      console.log(`[pexelsProvider] Querying Pexels API for: "${query}"`);
      const url = `${PEXELS_API_ROOT}/search?query=${encodeURIComponent(query)}&per_page=5`;
      const response = await fetch(url, {
        headers: {
          'Authorization': apiKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.photos && data.photos.length > 0) {
          // Return medium or large sized images
          return data.photos.map(photo => photo.src.large || photo.src.medium);
        }
      }
    } catch (error) {
      console.error("[pexelsProvider] API search failed:", error);
    }

    return [];
  }
};

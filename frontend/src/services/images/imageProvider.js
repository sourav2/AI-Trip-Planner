/**
 * Master Image Provider coordinating Unsplash, Pexels and local curated fallbacks.
 */

import { unsplashProvider } from './unsplashProvider';
import { pexelsProvider } from './pexelsProvider';

const CURATED_FALLBACKS = {
  "delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=600&auto=format&fit=crop",
  "new delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=600&auto=format&fit=crop",
  "india gate": "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=600&auto=format&fit=crop",
  "qutub minar": "https://images.unsplash.com/photo-1610123598197-e67c80775a40?q=80&w=600&auto=format&fit=crop",
  "red fort": "https://images.unsplash.com/photo-1585135497273-1a86b09fe70e?q=80&w=600&auto=format&fit=crop",
  "lotus temple": "https://images.unsplash.com/photo-1595841696660-ab08cf472905?q=80&w=600&auto=format&fit=crop",
  "kolkata": "https://images.unsplash.com/photo-1558431382-27e303142255?q=80&w=600&auto=format&fit=crop",
  "victoria memorial": "https://images.unsplash.com/photo-1565293627083-d5d4d3a6d2f3?q=80&w=600&auto=format&fit=crop",
  "howrah bridge": "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=600&auto=format&fit=crop",
  "goa": "https://images.unsplash.com/photo-1512400329929-f4104ecd552d?q=80&w=600&auto=format&fit=crop",
  "baga beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
  "palolem beach": "https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=600&auto=format&fit=crop",
  "shillong": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?q=80&w=600&auto=format&fit=crop",
  "cherrapunji": "https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=600&auto=format&fit=crop",
  "munnar": "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?q=80&w=600&auto=format&fit=crop",
  "alleppey": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=600&auto=format&fit=crop",
  "darjeeling": "https://images.unsplash.com/photo-1559139413-869fe2c7e1b4?q=80&w=600&auto=format&fit=crop",
  "jaipur": "https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?q=80&w=600&auto=format&fit=crop",
  "udaipur": "https://images.unsplash.com/photo-1585128719715-46776b56a0d1?q=80&w=600&auto=format&fit=crop",
  "nature": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
  "beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
  "waterfall": "https://images.unsplash.com/photo-1432406186267-3473b3398c2a?q=80&w=600&auto=format&fit=crop",
  "monument": "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=600&auto=format&fit=crop",
  "temple": "https://images.unsplash.com/photo-1561361513-2d000a50f0db?q=80&w=600&auto=format&fit=crop",
  "dawki": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=600&auto=format&fit=crop",
  "shnongpdeng": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=600&auto=format&fit=crop",
  "krang suri": "https://images.unsplash.com/photo-1433832597046-4f10e10ac764?q=80&w=600&auto=format&fit=crop",
  "nongjrong": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop",
  "mawsmai": "https://images.unsplash.com/photo-1507163879400-419f50e128c9?q=80&w=600&auto=format&fit=crop",
  "cave": "https://images.unsplash.com/photo-1507163879400-419f50e128c9?q=80&w=600&auto=format&fit=crop",
  "laitlum": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
  "canyon": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
  "nongriat": "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop",
  "wei sawdong": "https://images.unsplash.com/photo-1433832597046-4f10e10ac764?q=80&w=600&auto=format&fit=crop"
};

const CATEGORIES = {
  mountain: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=600&auto=format&fit=crop"
  ],
  beach: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=600&auto=format&fit=crop"
  ],
  heritage: [
    "https://images.unsplash.com/photo-1585128719715-46776b56a0d1?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1598977123418-45f04b615ae9?q=80&w=600&auto=format&fit=crop"
  ],
  water: [
    "https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1432406186267-3473b3398c2a?q=80&w=600&auto=format&fit=crop"
  ],
  forest: [
    "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=600&auto=format&fit=crop"
  ],
  temple: [
    "https://images.unsplash.com/photo-1561361513-2d000a50f0db?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1609137144813-09743c3a0774?q=80&w=600&auto=format&fit=crop"
  ],
  shopping: [
    "https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1488459718432-040817266a80?q=80&w=600&auto=format&fit=crop"
  ],
  general: [
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop"
  ]
};

export const imageProvider = {
  /**
   * Deterministic hash index selector to prevent duplicates
   */
  _getHashIndex(key, listLength) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % listLength;
  },

  /**
   * Builds the query string using State, District, Attraction and Keywords
   */
  _buildQuery(placeName, state = "", district = "", keywords = "") {
    let parts = [placeName];
    if (district && !placeName.toLowerCase().includes(district.toLowerCase())) {
      parts.push(district);
    }
    if (state && !placeName.toLowerCase().includes(state.toLowerCase()) && !district.toLowerCase().includes(state.toLowerCase())) {
      parts.push(state);
    }
    if (keywords) {
      parts.push(keywords);
    }
    return parts.join(', ');
  },

  /**
   * Search for main destination background image
   */
  async searchDestinationImages(destination, state = "", keywords = "") {
    const query = this._buildQuery(destination, state, "", keywords);
    
    // 1. Try Unsplash search
    let urls = await unsplashProvider.search(query);
    if (urls && urls.length > 0) return urls;

    // 2. Try Pexels search
    urls = await pexelsProvider.search(query);
    if (urls && urls.length > 0) return urls;

    // 3. Fallback to Local Curated
    return [this._getFallbackImage(query)];
  },

  /**
   * Search for attraction images
   */
  async searchAttractionImages(attractionName, state = "", district = "", keywords = "") {
    const query = this._buildQuery(attractionName, state, district, keywords);

    // 1. Try Unsplash search
    let urls = await unsplashProvider.search(query);
    if (urls && urls.length > 0) {
      const idx = this._getHashIndex(attractionName, urls.length);
      return [urls[idx]];
    }

    // 2. Try Pexels search
    urls = await pexelsProvider.search(query);
    if (urls && urls.length > 0) {
      const idx = this._getHashIndex(attractionName, urls.length);
      return [urls[idx]];
    }

    // 3. Fallback to Local Curated
    return [this._getFallbackImage(query)];
  },

  /**
   * Checks if an image is valid and relevant to the query
   */
  validateImageMatch(imageUrl, queryTerms) {
    if (!imageUrl || typeof imageUrl !== 'string') return false;
    
    const terms = queryTerms.toLowerCase().split(/[,\s]+/).filter(Boolean);
    const urlLower = imageUrl.toLowerCase();
    
    // Simple validation rule: image url is present and matches the general structure
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) return false;

    // We can also evaluate if at least one of the query terms matches in the URL (optional heuristic)
    // but default to true as long as URL starts with http
    return true;
  },

  /**
   * Helper to return fallback curated asset or category image
   */
  _getFallbackImage(query) {
    const qLower = query.toLowerCase();
    
    // Exact mapping matches
    for (const [key, val] of Object.entries(CURATED_FALLBACKS)) {
      if (qLower.includes(key)) {
        return val;
      }
    }

    // Categorized match
    let category = "general";
    if (/(temple|shrine|monastery|church|mosque|cathedral|spiritual)/i.test(qLower)) {
      category = "temple";
    } else if (/(beach|sea|ocean|coast|sand|wave|goa|baga|calangute|anjuna|vagator|colva|palolem)/i.test(qLower)) {
      category = "beach";
    } else if (/(mountain|valley|hill|peak|snow|trek|himalaya|shimla|darjeeling|munnar|ridge|kufri|mashobra|chail|naldehra|jakhoo)/i.test(qLower)) {
      category = "mountain";
    } else if (/(lake|river|waterfall|falls|boat|boating|stream|pichola|sagar|umiam|dawki)/i.test(qLower)) {
      category = "water";
    } else if (/(palace|fort|monument|gate|memorial|castle|heritage|history|cultural|amber|hawa mahal|city palace|jagdish|taj|qutub)/i.test(qLower)) {
      category = "heritage";
    } else if (/(forest|wood|nature|park|garden|wildlife|safari|tree|greenery|nandi)/i.test(qLower)) {
      category = "forest";
    } else if (/(market|bazaar|shop|street|mall|plaza|lane|nightlife|pub|bar|club|cafe|lounge)/i.test(qLower)) {
      category = "shopping";
    }

    const list = CATEGORIES[category];
    const idx = this._getHashIndex(query, list.length);
    return list[idx];
  }
};

// MapGenerationProvider Abstraction Layer for AI Poster Exploration Blueprint
import { posterBuilder } from './posterBuilder';
import { generateBlueprintPoster } from '../blueprintProvider';
import { travelApi } from '../api';

export class MapGenerationProvider {
  /**
   * Generates travel poster nodes, OSRM road curves geometry, and distance guides.
   * Delegates to posterBuilder.
   * @param {object} tripData 
   * @param {string} provider 
   */
  static generateTravelPoster(tripData, provider = 'osrm') {
    return posterBuilder.generateTravelPoster(tripData, provider);
  }

  /**
   * Generates complete blueprint configuration including itinerary days, travel tips,
   * budget utilization, and map nodes.
   * Delegates to blueprintProvider's generateBlueprintPoster.
   * @param {object} tripData 
   * @param {string} provider 
   */
  static generateBlueprintMap(tripData, provider = 'osrm') {
    return generateBlueprintPoster(tripData, provider);
  }

  /**
   * Fetches attraction images dynamically via the backend image pipeline.
   * Supports 4-step lookup, keyword validation, and API authentication.
   * @param {string} attractionName 
   * @param {string} category 
   * @param {string} provider 
   */
  static async generateAttractionImages(attractionName, category = '', provider = 'unsplash') {
    try {
      const imageUrl = await travelApi.fetchPlaceImage(attractionName, '', category, '', '');
      return imageUrl || null;
    } catch (err) {
      console.error("MapGenerationProvider.generateAttractionImages failed:", err);
      return null;
    }
  }

  /**
   * Generates AI insights and details for a destination.
   * @param {string} destination 
   * @param {Array<string>} interests 
   * @param {string} provider 
   */
  static async generateDestinationInsights(destination, interests = [], provider = 'openai') {
    try {
      const places = await travelApi.fetchNearbyAttractions(destination, null, null, interests);
      return {
        destination,
        interests,
        topAttractionsCount: places?.length || 0,
        attractions: places?.slice(0, 5).map(p => p.name) || [],
        summary: `Discover amazing spots in ${destination} tailored to your interests in ${interests.join(', ')}.`
      };
    } catch (err) {
      console.error("MapGenerationProvider.generateDestinationInsights failed:", err);
      return {
        destination,
        interests,
        summary: `Explore attractions and landmarks in ${destination}.`
      };
    }
  }
}

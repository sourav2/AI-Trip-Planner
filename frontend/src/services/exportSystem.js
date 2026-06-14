/**
 * Export System coordinator with asynchronous rendering checks
 */

import { exportManager } from './blueprint/exportManager';

export const exportSystem = {
  /**
   * Helper to verify if all images inside a target container are fully loaded in the DOM
   */
  async _waitForImages(element) {
    const images = Array.from(element.querySelectorAll('img'));
    console.log(`[exportSystem] Verifying load state of ${images.length} images...`);
    
    const loadPromises = images.map((img) => {
      if (img.complete) return Promise.resolve(true);
      return new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false); // resolve false instead of rejecting to let export proceed
      });
    });
    
    await Promise.all(loadPromises);
    console.log("[exportSystem] All blueprint images verified loaded.");
  },

  /**
   * Helper to verify if Leaflet map tiles are fully loaded and rendered
   */
  async _waitForMapRender() {
    console.log("[exportSystem] Verifying map container render status...");
    return new Promise((resolve) => {
      // Check for leaflet tile pane or general leaflet-map containers in the DOM
      const checkInterval = setInterval(() => {
        const leafletTileContainer = document.querySelector('.leaflet-tile-container');
        const leafletMapElement = document.querySelector('.leaflet-container');
        
        // If map doesn't exist, we skip waiting to prevent freeze
        if (!leafletMapElement) {
          console.warn("[exportSystem] No map component detected in DOM. Proceeding.");
          clearInterval(checkInterval);
          resolve(true);
          return;
        }

        // Wait until tile container has loaded children tiles
        if (leafletTileContainer && leafletTileContainer.children.length > 0) {
          console.log("[exportSystem] Leaflet map canvas rendering verified.");
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 200);

      // Max timeout of 3 seconds to avoid blocking the user indefinitely
      setTimeout(() => {
        console.warn("[exportSystem] Map render wait timed out. Proceeding anyway.");
        clearInterval(checkInterval);
        resolve(true);
      }, 3000);
    });
  },

  /**
   * Helper to verify if the blueprint container is present and rendered
   */
  async _waitForBlueprintRender(elementId) {
    console.log(`[exportSystem] Verifying element #${elementId} is present...`);
    return new Promise((resolve) => {
      const element = document.getElementById(elementId);
      if (element) {
        resolve(element);
        return;
      }

      const checkInterval = setInterval(() => {
        const el = document.getElementById(elementId);
        if (el) {
          clearInterval(checkInterval);
          resolve(el);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(document.getElementById(elementId) || null);
      }, 2000);
    });
  },

  /**
   * Wait for all dependencies to render, then export to PNG
   */
  async exportToPNG(elementId, fileName = 'trip-blueprint.png') {
    console.log("[exportSystem] Initiating exportToPNG process...");
    
    // 1. Wait for container element
    const element = await this._waitForBlueprintRender(elementId);
    if (!element) {
      throw new Error(`Export failed: Element #${elementId} not found in DOM.`);
    }

    // 2. Wait for image assets to load
    await this._waitForImages(element);

    // 3. Wait for Leaflet maps to render
    await this._waitForMapRender();

    console.log("[exportSystem] Rendering ready. Calling export manager...");
    return await exportManager.generatePNG(elementId, fileName);
  },

  /**
   * Wait for all dependencies to render, then export to JPG
   */
  async exportToJPG(elementId, fileName = 'trip-blueprint.jpg') {
    console.log("[exportSystem] Initiating exportToJPG process...");
    
    const element = await this._waitForBlueprintRender(elementId);
    if (!element) {
      throw new Error(`Export failed: Element #${elementId} not found in DOM.`);
    }

    await this._waitForImages(element);
    await this._waitForMapRender();

    console.log("[exportSystem] Rendering ready. Calling export manager...");
    return await exportManager.generateJPG(elementId, fileName);
  },

  /**
   * Wait for all dependencies to render, then export to PDF
   */
  async exportToPDF(elementId, fileName = 'trip-blueprint.pdf') {
    console.log("[exportSystem] Initiating exportToPDF process...");
    
    const element = await this._waitForBlueprintRender(elementId);
    if (!element) {
      throw new Error(`Export failed: Element #${elementId} not found in DOM.`);
    }

    await this._waitForImages(element);
    await this._waitForMapRender();

    console.log("[exportSystem] Rendering ready. Calling export manager...");
    return await exportManager.generatePDF(elementId, fileName);
  }
};

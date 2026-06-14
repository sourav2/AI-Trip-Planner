/**
 * Poster Builder Service
 * Handles configuring high-fidelity visual layout projections and styling themes for travel posters.
 * Generates stylized travel poster coordinates and polaroids instead of developer routing maps.
 */

export const posterBuilder = {
  /**
   * Generates structural metadata, route projections, and custom styling themes for a travel poster
   * @param {object} tripData - Contains destination, selectedPlaces, routeInfo, and coordinates
   * @param {string} provider - 'osrm', 'gemini', or 'openai'
   * @returns {object} Map canvas coordinates and styling metadata
   */
  generateTravelPoster(tripData, provider = 'osrm') {
    console.log(`[posterBuilder] Redesign: Generating Art Travel Poster for:`, tripData?.destination);

    const destination = tripData.destination || "Destination";
    let selectedPlaces = tripData.selectedPlaces || tripData.selected_places || [];

    // Fallback stops parsing from regions if selectedPlaces is empty
    if (selectedPlaces.length === 0 && tripData.regions) {
      const regionPlaceNames = new Set();
      tripData.regions.forEach(r => {
        if (r.places) {
          r.places.forEach(pName => {
            if (pName && typeof pName === 'string') {
              regionPlaceNames.add(pName.toLowerCase().trim());
            }
          });
        }
      });

      const nearby = tripData.nearby_attractions || [];
      const defaultPlaces = [];
      regionPlaceNames.forEach(pName => {
        const match = nearby.find(n => 
          n.name && (
            n.name.toLowerCase().trim() === pName || 
            pName.includes(n.name.toLowerCase().trim()) || 
            n.name.toLowerCase().trim().includes(pName)
          )
        );
        if (match) {
          defaultPlaces.push(match);
        }
      });

      if (defaultPlaces.length > 0) {
        selectedPlaces = defaultPlaces;
      } else if (nearby.length > 0) {
        selectedPlaces = nearby.slice(0, 6);
      }
    }

    // Resolve base city name
    let baseCityName = destination;
    if (destination.toLowerCase().includes("meghalaya")) {
      baseCityName = "Shillong";
    } else if (destination.toLowerCase().includes("kohima") || destination.toLowerCase().includes("nagaland")) {
      baseCityName = "Kohima";
    } else if (destination.toLowerCase().includes("kerala")) {
      baseCityName = "Kochi";
    } else if (destination.toLowerCase().includes("sikkim") || destination.toLowerCase().includes("gangtok")) {
      baseCityName = "Gangtok";
    } else if (destination.toLowerCase().includes("rajasthan") || destination.toLowerCase().includes("jaipur")) {
      baseCityName = "Jaipur";
    }

    // Preset beautiful winding path coordinates for local itinerary nodes
    const presetCoords = [
      { x: 180, y: 250 }, // Base City (Center-Left)
      { x: 260, y: 130 }, // Stop 1 (Top-Left)
      { x: 420, y: 110 }, // Stop 2 (Top-Center)
      { x: 550, y: 150 }, // Stop 3 (Top-Right)
      { x: 590, y: 260 }, // Stop 4 (Center-Right)
      { x: 510, y: 370 }, // Stop 5 (Bottom-Right)
      { x: 350, y: 380 }, // Stop 6 (Bottom-Center)
      { x: 230, y: 330 }  // Stop 7 (Bottom-Left)
    ];

    const mapNodes = [];
    // Node 0: Base City
    mapNodes.push({
      id: 0,
      name: baseCityName,
      isBaseCity: true,
      label: `Base: ${baseCityName}`,
      x: presetCoords[0].x,
      y: presetCoords[0].y
    });

    // Nodes for places
    selectedPlaces.forEach((place, idx) => {
      const coordIndex = (idx + 1) % presetCoords.length;
      mapNodes.push({
        id: idx + 1,
        name: place.name.split(' (')[0],
        isBaseCity: false,
        label: `${idx + 1}. ${place.name.split(' (')[0]}`,
        x: presetCoords[coordIndex].x,
        y: presetCoords[coordIndex].y
      });
    });

    // Winding Route Path
    const projectedRoute = mapNodes.map(n => ({ x: n.x, y: n.y }));

    // Build Distance Guide listings
    const distanceGuides = [];
    for (let i = 1; i < mapNodes.length; i++) {
      const prevNode = mapNodes[i - 1];
      const currNode = mapNodes[i];

      // Generate a dynamic aesthetic distance based on place index
      let distVal = 18 + (i * 12) + (i % 2 === 0 ? 5 : 0);

      distanceGuides.push({
        from: prevNode.name,
        to: currNode.name,
        distance: `${distVal} km`
      });
    }

    // Build Polaroid photo cards (up to 3)
    const polaroids = [];
    const polaroidPositions = [
      { x: 645, y: 15, rot: 5 },    // Top-Right area
      { x: 650, y: 320, rot: -4 },  // Bottom-Right area
      { x: 30, y: 320, rot: 4 }      // Bottom-Left area
    ];

    const attractionsForPhotos = selectedPlaces.slice(0, 3);
    attractionsForPhotos.forEach((place, idx) => {
      const pos = polaroidPositions[idx];
      polaroids.push({
        name: place.name.split(' (')[0],
        imageUrl: place.image_url || '',
        x: pos.x,
        y: pos.y,
        rot: pos.rot
      });
    });

    // Theme configurations
    let theme;
    if (provider === 'gemini') {
      theme = {
        style: "gemini-neon-cyber",
        primaryColor: "#0EA5E9", // Sky blue
        secondaryColor: "#10B981", // Emerald green
        accentColor: "#F59E0B", // Amber
        gridOpacity: 0.15
      };
    } else if (provider === 'openai') {
      theme = {
        style: "openai-ink-minimalist",
        primaryColor: "#6366F1", // Indigo
        secondaryColor: "#EC4899", // Pink
        accentColor: "#F43F5E", // Rose
        gridOpacity: 0.12
      };
    } else {
      theme = {
        style: "classic-cartographic",
        primaryColor: "#78350F", // Amber/Brown
        secondaryColor: "#B45309",
        accentColor: "#D97706",
        gridOpacity: 0.08
      };
    }

    return {
      provider,
      nodes: mapNodes,
      projectedRoute,
      distanceGuides,
      polaroids,
      theme
    };
  }
};

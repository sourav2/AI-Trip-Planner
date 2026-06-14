import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Sparkles, MessageSquare, Trash2, Calendar, Users, MapPin,
  AlertCircle, Plus, Check, Wallet, Map, CloudRain, Briefcase,
  ShieldAlert, ArrowRight, Shuffle, AlertTriangle, Menu, ChevronRight, X,
  Minus, Download, Printer, Loader2, Star, Clock, ExternalLink,
  Plane, Sun, Mountain, Trees
} from 'lucide-react';
import TravelMap from '../components/TravelMap';
import TravelMap3D from '../components/TravelMap3D';
import html2canvas from 'html2canvas';
import BudgetSummary from '../components/BudgetSummary';
import TransportCard from '../components/TransportCard';
import SkeletonLoader from '../components/SkeletonLoader';
import ChatInterface from '../components/ChatInterface';
import { travelApi } from '../services/api';
import { getCategoryMatchedImage, generateBlueprintPoster, getDynamicTipsAndPacking } from '../services/blueprintProvider';
import { exportSystem } from '../services/exportSystem';
import BlueprintV2 from '../components/BlueprintV2';
import BlueprintV3 from '../components/BlueprintV3';

export default function PlannerPage({
  activeTrip,
  setActiveTrip,
  onSaveTrip,
  savedTrips,
  onDeleteTrip,
  chatMessages,
  onSendChatMessage,
  chatLoading,
  itineraryLoading,
  itineraryError,
  lastFormData,
  onGenerateFromForm,
  selectedPlaces = [],
  setSelectedPlaces,
  onAddPlace,
  onRemovePlace,
  onReorderPlaces,
  onFinalize,
  isFinalizing,
  onResetLoading,
  onNavigateToPlace,
  toggleSidebar,

  // Lifted state props
  startLocation,
  setStartLocation,
  startCoords,
  setStartCoords,
  destination,
  setDestination,
  destCoords,
  setDestCoords,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  duration,
  setDuration,
  travelers,
  setTravelers,
  budgetInput,
  setBudgetInput,
  travelStyle,
  setTravelStyle,
  transportPreference,
  setTransportPreference,
  interests,
  setInterests,
  additionalPrefs,
  setAdditionalPrefs,

  // Lifted state props
  activeTab,
  setActiveTab,
  downloadTrigger
}) {
  const isSaved = activeTrip && savedTrips?.some(t => t.id === activeTrip.id);

  // Terrain V6 3D Map Feature Flags & Persistent Settings State
  const USE_3D_MAP = true;
  const [map3DState, setMap3DState] = useState({
    pitch: 55,
    bearing: -15,
    exaggeration: 1.5,
    activeStyle: 'topo'
  });
  const [perfFallbackActive, setPerfFallbackActive] = useState(false);
  const canRender3D = USE_3D_MAP && !perfFallbackActive;

  // Handle download trigger from chatbot
  useEffect(() => {
    if (downloadTrigger > 0) {
      handleDownloadPNG();
    }
  }, [downloadTrigger]);

  const [mapProvider, setMapProvider] = useState('osrm');
  const [useBlueprintV3, setUseBlueprintV3] = useState(import.meta.env.VITE_USE_BLUEPRINT_V3 === 'true');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const [userTypingStart, setUserTypingStart] = useState(false);
  const [userTypingDest, setUserTypingDest] = useState(false);

  const startAutocompleteRef = useRef(null);
  const destAutocompleteRef = useRef(null);

  const [staysData, setStaysData] = useState({ Budget: [], "Mid-range": [], Premium: [] });
  const [staysLoading, setStaysLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [explorePlace, setExplorePlace] = useState(null);

  const [comfortLevel, setComfortLevel] = useState('moderate');

  // Sync comfortLevel when activeTrip changes
  useEffect(() => {
    if (activeTrip && activeTrip.comfort_level) {
      setComfortLevel(activeTrip.comfort_level);
    }
  }, [activeTrip]);

  const handleTravelModeChange = (mode) => {
    setComfortLevel(mode);

    let budgetVal = 30000;
    let daysVal = 6;
    let transportPref = 'Mixed';

    if (mode === 'budget') {
      budgetVal = 15000;
      daysVal = 5;
      transportPref = 'Public Transport';
    } else if (mode === 'luxury') {
      budgetVal = 60000;
      daysVal = 7;
      transportPref = 'Road Trip';
    }

    setBudgetInput(budgetVal);
    setDuration(daysVal);
    setTransportPreference(transportPref);

    // Update startDate and endDate to match new duration
    const sDate = new Date(startDate || '2026-07-12');
    if (!isNaN(sDate)) {
      const eDate = new Date(sDate);
      eDate.setDate(sDate.getDate() + daysVal - 1);

      const pad = (n) => String(n).padStart(2, '0');
      setEndDate(`${eDate.getFullYear()}-${pad(eDate.getMonth() + 1)}-${pad(eDate.getDate())}`);
    }

    if (activeTrip) {
      setActiveTrip(prev => ({
        ...prev,
        comfort_level: mode,
        transport_preference: transportPref,
        total_days: daysVal,
        budget: budgetVal
      }));
    }
  };

  const getDestinationTips = (dest = '') => {
    const data = getDynamicTipsAndPacking(dest, startDate, travelStyle, comfortLevel, transportPreference, selectedPlaces);
    return data.tips;
  };

  const getDestinationPackingList = (dest = '') => {
    const data = getDynamicTipsAndPacking(dest, startDate, travelStyle, comfortLevel, transportPreference, selectedPlaces);
    return {
      apparel: data.apparel,
      essentials: data.essentials
    };
  };

  const getDestinationOverviewInfo = (dest = '') => {
    const data = getDynamicTipsAndPacking(dest, startDate, travelStyle, comfortLevel, transportPreference, selectedPlaces);
    return {
      weather: data.weather,
      packing: data.packing,
      safety: data.safety
    };
  };

  useEffect(() => {
    if (!destination) {
      setStaysData({ Budget: [], "Mid-range": [], Premium: [] });
      return;
    }
    const loadStays = async () => {
      setStaysLoading(true);
      try {
        const data = await travelApi.fetchStays(destination, budgetInput);
        if (data) {
          setStaysData(data);
        }
      } catch (err) {
        console.error("Failed to load stays:", err);
      } finally {
        setStaysLoading(false);
      }
    };
    loadStays();
  }, [destination, budgetInput, activeTrip]);

  // Click outside to close autocomplete dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (startAutocompleteRef.current && !startAutocompleteRef.current.contains(event.target)) {
        setShowStartDropdown(false);
      }
      if (destAutocompleteRef.current && !destAutocompleteRef.current.contains(event.target)) {
        setShowDestDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useEffect(() => {
    let timer;
    if (itineraryLoading || isFinalizing) {
      timer = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, 10000); // 10 seconds timeout
    } else {
      setShowTimeoutWarning(false);
    }
    return () => clearTimeout(timer);
  }, [itineraryLoading, isFinalizing]);

  const [routeInfo, setRouteInfo] = useState({ geometry: null, distance: 820, duration: 18 });

  const posterData = React.useMemo(() => {
    if (!activeTrip) return null;
    return generateBlueprintPoster({
      destination,
      start_location: startLocation,
      total_days: duration,
      travelers,
      budget: budgetInput,
      comfort_level: activeTrip.comfort_level || 'moderate',
      selectedPlaces,
      routeInfo,
      dest_coords: destCoords || activeTrip.dest_coords || activeTrip.destCoords,
      regions: activeTrip.regions || [],
      travelStyle: travelStyle,
      transportPreference: transportPreference,
      startDate: startDate,
      endDate: endDate
    }, mapProvider);
  }, [activeTrip, destination, startLocation, duration, travelers, budgetInput, selectedPlaces, routeInfo, destCoords, mapProvider, travelStyle, transportPreference, startDate, endDate]);

  // Lift OSRM route fetch and state into PlannerPage.jsx to synchronize map and costs (Item 15)
  useEffect(() => {
    if (!startCoords || !destCoords) return;

    if (selectedPlaces.length === 0 && activeTrip && activeTrip.route_data) {
      setRouteInfo({
        geometry: activeTrip.route_data.geometry || null,
        distance: activeTrip.route_data.distance !== undefined ? activeTrip.route_data.distance : 820,
        duration: activeTrip.route_data.duration !== undefined ? activeTrip.route_data.duration : 18
      });
      return;
    }

    const fetchRoute = async () => {
      const stopCoords = selectedPlaces
        .map(p => p.coords || [p.lat, p.lon])
        .filter(c => c && c[0] && c[1]);

      const allCoords = [startCoords, ...stopCoords, destCoords];
      try {
        const routeData = await travelApi.fetchRoute(allCoords, false);
        if (routeData) {
          setRouteInfo({
            geometry: routeData.geometry || null,
            distance: routeData.distance !== undefined ? routeData.distance : 820,
            duration: routeData.duration !== undefined ? routeData.duration : 18
          });
        }
      } catch (err) {
        console.error("Failed to fetch dynamic route:", err);
      }
    };

    fetchRoute();
  }, [startCoords, destCoords, selectedPlaces, activeTrip]);

  const [hoveredDiscoveryIdx, setHoveredDiscoveryIdx] = useState(null);

  const getDestinationImage = (item) => {
    if (!item) return '';
    return item.image_url || getCategoryMatchedImage(item.name || '', item.quick_facts?.Type || item.type || '', item.description || item.summary || '');
  };

  const handlePrint = async () => {
    try {
      await exportSystem.exportToPDF('travel-blueprint-card', `${destination.toLowerCase()}-exploration-blueprint.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  const handleDownloadPNG = async () => {
    try {
      await exportSystem.exportToPNG('travel-blueprint-card', `${destination.toLowerCase()}-exploration-blueprint.png`);
    } catch (err) {
      console.error('Error generating PNG:', err);
    }
  };

  const handleDownloadJPG = async () => {
    try {
      await exportSystem.exportToJPG('travel-blueprint-card', `${destination.toLowerCase()}-exploration-blueprint.jpg`);
    } catch (err) {
      console.error('Error generating JPG:', err);
    }
  };

  const renderPosterSvg = () => {
    if (!posterData) return null;
    const { nodes, theme, projectedRoute, polaroids } = posterData.mapCanvas;
    const primaryColor = theme?.primaryColor || '#78350F';
    const secondaryColor = theme?.secondaryColor || '#B45309';
    const accentColor = theme?.accentColor || '#D97706';
    const gridOpacity = theme?.gridOpacity !== undefined ? theme?.gridOpacity : 0.08;

    const destLow = (destination || '').toLowerCase();
    let statePath = "";
    if (destLow.includes("meghalaya")) {
      statePath = "M 120 220 C 180 110, 320 120, 480 140 C 640 160, 720 200, 680 280 C 640 360, 400 370, 280 340 C 160 310, 80 330, 120 220 Z";
    } else if (destLow.includes("kerala")) {
      statePath = "M 220 80 C 280 150, 360 220, 420 310 C 480 400, 520 450, 480 470 C 440 490, 360 410, 280 320 C 200 230, 160 150, 220 80 Z";
    } else if (destLow.includes("sikkim")) {
      statePath = "M 380 70 C 450 120, 480 200, 460 320 C 440 440, 380 460, 300 420 C 220 380, 240 200, 300 120 C 340 70, 360 50, 380 70 Z";
    } else if (destLow.includes("rajasthan")) {
      statePath = "M 320 80 L 580 130 L 520 390 L 220 340 L 180 200 Z";
    } else {
      statePath = "M 150 250 C 200 120, 400 110, 600 130 C 700 250, 650 380, 400 390 C 200 380, 100 310, 150 250 Z";
    }

    const hasDeparture = startLocation && startLocation.trim().length > 0;
    const startHub = posterData.header.startHub || "Transit Port";
    const baseCityName = posterData.baseCity.name || destination;

    const renderFloatingIcons = () => {
      if (destLow.includes("meghalaya")) {
        return (
          <>
            <g transform="translate(300, 60)" className="text-emerald-800/35"><CloudRain className="h-7 w-7" /></g>
            <g transform="translate(480, 50)" className="text-emerald-800/35"><CloudRain className="h-7 w-7" /></g>
            <g transform="translate(120, 390)" className="text-emerald-800/35"><Trees className="h-7 w-7" /></g>
          </>
        );
      }
      if (destLow.includes("kerala")) {
        return (
          <>
            <g transform="translate(310, 50)" className="text-emerald-800/35"><Sun className="h-8 w-8" /></g>
            <g transform="translate(100, 160)" className="text-emerald-800/35"><Trees className="h-7 w-7" /></g>
            <g transform="translate(480, 380)" className="text-emerald-800/35"><Trees className="h-7 w-7" /></g>
          </>
        );
      }
      if (destLow.includes("sikkim")) {
        return (
          <>
            <g transform="translate(380, 55)" className="text-emerald-800/35"><Mountain className="h-8 w-8" /></g>
            <g transform="translate(480, 50)" className="text-emerald-800/35"><Mountain className="h-8 w-8" /></g>
            <g transform="translate(110, 380)" className="text-emerald-800/35"><Trees className="h-7 w-7" /></g>
          </>
        );
      }
      if (destLow.includes("rajasthan")) {
        return (
          <>
            <g transform="translate(450, 50)" className="text-emerald-800/35"><Sun className="h-8 w-8" /></g>
            <g transform="translate(100, 150)" className="text-emerald-800/35"><Sun className="h-6 w-6" /></g>
          </>
        );
      }
      return (
        <>
          <g transform="translate(450, 50)" className="text-emerald-800/35"><Compass className="h-7 w-7" /></g>
        </>
      );
    };

    return (
      <svg viewBox="0 0 800 500" className="w-full rounded-2xl border-4 shadow-premium" style={{ background: '#FAF7F2', borderColor: `${primaryColor}20` }}>
        {/* Shadow & Blur Defs */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={primaryColor} strokeWidth="0.5" strokeOpacity={gridOpacity} />
          </pattern>
          <marker id="arrow-poster" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={secondaryColor} />
          </marker>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Graticule Grid & Borders */}
        <rect width="800" height="500" fill="url(#grid)" />
        <rect width="784" height="484" x="8" y="8" fill="none" stroke={primaryColor} strokeWidth="1" strokeOpacity="0.3" />
        <rect width="772" height="472" x="14" y="14" fill="none" stroke={primaryColor} strokeWidth="2.5" strokeOpacity="0.75" />

        {/* Stylized State Map Outline */}
        <g>
          <path d={statePath} fill={`${primaryColor}03`} stroke={`${primaryColor}15`} strokeWidth="3.5" strokeDasharray="12 8" />
        </g>

        {/* Floating Icons */}
        {renderFloatingIcons()}

        {/* Draw Route Paths */}
        {projectedRoute && projectedRoute.length > 0 && (
          <polyline
            points={projectedRoute.map(pt => `${pt.x},${pt.y}`).join(' ')}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="4"
            strokeDasharray="8 6"
            markerEnd="url(#arrow-poster)"
          />
        )}

        {/* Distance Label Badges */}
        {nodes.map((node, idx) => {
          if (idx === 0) return null;
          const prevNode = nodes[idx - 1];
          const distGuide = posterData.mapCanvas.distanceGuides[idx - 1];
          const midX = (prevNode.x + node.x) / 2;
          const midY = (prevNode.y + node.y) / 2;

          return (
            <g key={`dist-badge-${idx}`} transform={`translate(${midX}, ${midY})`}>
              <rect
                x="-22"
                y="-9"
                width="44"
                height="16"
                fill="#FFF"
                stroke={primaryColor}
                strokeWidth="1.2"
                rx="4"
                className="shadow-xs"
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="black"
                fill={primaryColor}
              >
                {distGuide?.distance || '15 km'}
              </text>
            </g>
          );
        })}

        {/* Departure Hub Box (Transit Port) */}
        {hasDeparture && (
          <g transform="translate(30, 215)" filter="url(#shadow)">
            <rect width="125" height="52" fill="#FAF5E6" stroke={primaryColor} strokeWidth="1.5" rx="6" />
            <text x="10" y="16" fontWeight="extrabold" fontSize="8" fill={primaryColor} letterSpacing="0.5">TRANSIT PORT</text>
            <text x="10" y="29" fontSize="10.5" fontWeight="black" fill={secondaryColor} className="truncate max-w-[105px]">{startHub}</text>
            <text x="10" y="42" fontSize="7.5" fontWeight="semibold" fill="#6B7280">Fly/Train to {baseCityName}</text>

            {/* Plane Icon inside Transit Box */}
            <g transform="translate(100, 8)" className="text-[#6B7280]"><Plane className="h-4.5 w-4.5" /></g>

            {/* Departure Link curve to base city */}
            <path
              d="M 125 26 C 145 20, 160 120, 180 250"
              fill="none"
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              strokeOpacity="0.6"
            />
          </g>
        )}

        {/* Compass Rose */}
        <g transform="translate(710, 95) scale(0.65)" opacity="0.85">
          <circle cx="0" cy="0" r="45" fill="none" stroke={primaryColor} strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 0 -50 L 8 -10 L 0 0 L -8 -10 Z" fill={primaryColor} />
          <path d="M 0 -50 L 0 0 L 8 -10 Z" fill={accentColor} />
          <path d="M 0 50 L 8 10 L 0 0 L -8 10 Z" fill={primaryColor} />
          <path d="M 0 50 L 0 0 L -8 10 Z" fill={accentColor} />
          <path d="M 50 0 L 10 8 L 0 0 L 10 -8 Z" fill={primaryColor} />
          <path d="M 50 0 L 0 0 L 10 8 Z" fill={accentColor} />
          <path d="M -50 0 L -10 8 L 0 0 L -10 -8 Z" fill={primaryColor} />
          <path d="M -50 0 L 0 0 L -10 -8 Z" fill={accentColor} />
          <text x="0" y="-55" textAnchor="middle" fontSize="14" fontWeight="black" fill={primaryColor} fontFamily="serif">N</text>
          <text x="0" y="65" textAnchor="middle" fontSize="12" fontWeight="bold" fill={primaryColor} fontFamily="serif">S</text>
        </g>

        {/* Map Legend */}
        <g transform="translate(30, 395)" fontSize="9.5" fontFamily="sans-serif" fill={primaryColor} opacity="0.95">
          <rect width="180" height="72" fill="#FAF5E6" stroke={accentColor} strokeWidth="1.5" rx="6" />
          <text x="15" y="18" fontWeight="black" fontSize="10" fill={primaryColor} letterSpacing="0.5">MAP LEGEND</text>

          <polygon points="17,33 25,33 21,25" fill="#15803D" stroke="#fff" strokeWidth="1" />
          <text x="35" y="34" fontSize="9.5" fontWeight="bold" fill={primaryColor}>Base Hub City</text>

          <circle cx="21" cy="50" r="6" fill={secondaryColor} stroke="#fff" strokeWidth="1" />
          <text x="35" y="53" fontSize="9.5" fontWeight="bold" fill={primaryColor}>Stops (Sequence)</text>
        </g>

        {/* Draw Nodes */}
        {nodes.map((node) => {
          const isBase = node.isBaseCity;

          return (
            <g key={`node-${node.id}`}>
              {isBase ? (
                // Star/Triangle for Base City
                <g transform={`translate(${node.x}, ${node.y})`}>
                  <polygon
                    points="0,-13 13,9 -13,9"
                    fill="#15803D"
                    stroke="#FFF"
                    strokeWidth="2.5"
                    className="cursor-pointer filter drop-shadow-md"
                  />
                  <polygon
                    points="0,-9 8,6 -8,6"
                    fill="#10B981"
                  />
                </g>
              ) : (
                // Numbered Circle for Stops
                <g transform={`translate(${node.x}, ${node.y})`}>
                  <circle
                    cx="0"
                    cy="0"
                    r="14"
                    fill="#FFF"
                    stroke={accentColor}
                    strokeWidth="3.5"
                    className="filter drop-shadow-md"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="10"
                    fill={secondaryColor}
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill="#FFF"
                    fontSize="9.5"
                    fontWeight="black"
                  >
                    {node.id}
                  </text>
                </g>
              )}
              {/* Text label underneath */}
              <text
                x={node.x}
                y={node.y + 26}
                textAnchor="middle"
                fontSize="11"
                fontWeight="black"
                fill={primaryColor}
                fontFamily="sans-serif"
                className="filter drop-shadow-xs"
              >
                {node.name}
              </text>
            </g>
          );
        })}

        {/* Draw Polaroid Cards */}
        {polaroids && polaroids.map((p, pIdx) => {
          const pImgUrl = p.imageUrl || getCategoryMatchedImage(p.name, '', '');
          return (
            <g
              key={`polaroid-${pIdx}`}
              transform={`translate(${p.x}, ${p.y}) rotate(${p.rot})`}
              filter="url(#shadow)"
              className="cursor-pointer transition-transform duration-300 hover:scale-105"
            >
              {/* Card frame */}
              <rect x="0" y="0" width="120" height="135" fill="#FFF" stroke={`${primaryColor}20`} strokeWidth="1" rx="4" />
              {/* Inner photo wrapper */}
              <rect x="5" y="5" width="110" height="92" fill="#E5E7EB" rx="2" />
              <image
                href={pImgUrl}
                x="5"
                y="5"
                width="110"
                height="92"
                preserveAspectRatio="xMidYMid slice"
              />

              {/* Tape Effect */}
              <rect x="35" y="-10" width="50" height="14" fill="#FEF08A" fillOpacity="0.6" transform="rotate(-3)" />

              {/* Caption */}
              <text
                x="60" y="117"
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="black"
                fill={primaryColor}
                fontFamily="serif"
                className="italic"
              >
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const renderVisualRouteSvg = () => {
    const stops = [startLocation, ...selectedPlaces.map(p => p.name), destination];
    const cleanStops = stops.filter(s => s && s.trim().length > 0).map(s => s.split(' (')[0].split(',')[0]);
    if (cleanStops.length === 0) return null;

    return (
      <div className="overflow-x-auto py-6 my-4 border border-dashed border-emerald-250 bg-emerald-50/30 rounded-xl p-4">
        <svg viewBox={`0 0 ${Math.max(800, cleanStops.length * 150)} 120`} className="h-28 mx-auto" style={{ minWidth: `${Math.max(600, cleanStops.length * 120)}px` }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 2 L 8 5 L 0 8 z" fill="#16A34A" />
            </marker>
          </defs>

          <path
            d={`M 50 60 H ${cleanStops.length * 150 - 100}`}
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            strokeDasharray="6 4"
          />

          {cleanStops.map((stop, idx) => {
            const x = 50 + idx * 150;
            return (
              <g key={idx}>
                {idx < cleanStops.length - 1 && (
                  <path
                    d={`M ${x + 20} 60 H ${x + 130}`}
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                  />
                )}

                <circle
                  cx={x}
                  cy="60"
                  r="16"
                  fill="#ffffff"
                  stroke="#16A34A"
                  strokeWidth="3.5"
                />

                <text
                  x={x}
                  y="64"
                  textAnchor="middle"
                  fill="#15803D"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {idx + 1}
                </text>

                <text
                  x={x}
                  y="95"
                  textAnchor="middle"
                  fill="#1E293B"
                  fontSize="11"
                  fontWeight="semibold"
                >
                  {stop}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Debounce Autocomplete for Start Location
  useEffect(() => {
    if (!userTypingStart || !startLocation || startLocation.trim().length < 1) {
      setStartSuggestions([]);
      setShowStartDropdown(false);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const suggestions = await travelApi.autocomplete(startLocation);
        const uniqueSuggestions = [];
        const seen = new Set();
        suggestions.forEach(item => {
          const key = item.name.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSuggestions.push(item);
          }
        });
        setStartSuggestions(uniqueSuggestions);
        setShowStartDropdown(true);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [startLocation, userTypingStart]);

  // Debounce Autocomplete for Destination
  useEffect(() => {
    if (!userTypingDest || !destination || destination.trim().length < 1) {
      setDestSuggestions([]);
      setShowDestDropdown(false);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const suggestions = await travelApi.autocomplete(destination);
        const uniqueSuggestions = [];
        const seen = new Set();
        suggestions.forEach(item => {
          const key = item.name.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSuggestions.push(item);
          }
        });
        setDestSuggestions(uniqueSuggestions);
        setShowDestDropdown(true);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [destination, userTypingDest]);

  // Sync date range with duration
  useEffect(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (!isNaN(s) && !isNaN(e) && e >= s) {
      const diffTime = Math.abs(e - s);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setDuration(diffDays);
    }
  }, [startDate, endDate]);

  const toggleInterest = (interest) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleRegenerateSubmit = (e) => {
    e.preventDefault();
    if (!destination || !startLocation) return;
    onGenerateFromForm({
      destination,
      startLocation,
      totalDays: duration,
      travelers,
      budget: budgetInput || 20000,
      comfortLevel: activeTrip?.comfort_level || 'moderate',
      transportPreference: transportPreference === 'Road Trip' ? 'fastest' : (transportPreference === 'Public Transport' ? 'cheapest' : 'most comfortable'),
      placeTypes: interests.map(i => i.toLowerCase())
    });
  };

  const handleSaveDraft = () => {
    if (destination) {
      const draftTrip = {
        id: activeTrip?.id || Math.random().toString(36).substr(2, 9),
        destination,
        start_location: startLocation,
        total_days: duration,
        travelers,
        budget: budgetInput,
        transport_preference: transportPreference,
        currency: 'INR'
      };
      setActiveTrip(draftTrip);
    }
  };

  // Dynamic Cost Calculator based on cart content & selected duration/travelers
  const calculateCosts = () => {
    const stopsCount = selectedPlaces.length || 8;
    const comfort = activeTrip?.comfort_level || 'moderate';

    let baseStay = comfort === 'luxury' ? 3500 : (comfort === 'budget' ? 800 : 1800);
    let baseFood = comfort === 'luxury' ? 1000 : (comfort === 'budget' ? 400 : 600);
    let baseTransport = comfort === 'luxury' ? 800 : (comfort === 'budget' ? 250 : 400);

    if (transportPreference === 'Public Transport') {
      baseTransport = baseTransport * 0.5;
    } else if (transportPreference === 'Mixed') {
      baseTransport = baseTransport * 0.8;
    } else {
      baseTransport = baseTransport * 1.2;
    }

    const totalStay = baseStay * duration;
    const totalFood = baseFood * duration * travelers;

    let totalActivity = 0;
    if (selectedPlaces.length > 0) {
      selectedPlaces.forEach(p => {
        totalActivity += p.local_cost !== undefined ? p.local_cost : 150;
      });
      totalActivity = totalActivity * travelers;
    } else {
      totalActivity = 150 * stopsCount * travelers;
    }

    const driveDistance = routeInfo?.distance || 820;
    const totalTransport = (baseTransport * duration * travelers) + (driveDistance * 8);
    const subtotal = totalStay + totalFood + totalTransport + totalActivity;
    const misc = Math.round(subtotal * 0.03); // 3% miscellaneous
    const grandTotal = subtotal + misc;

    return {
      stay: Math.round(totalStay),
      food: Math.round(totalFood),
      transport: Math.round(totalTransport),
      activities: Math.round(totalActivity),
      misc: Math.round(misc),
      total: Math.round(grandTotal)
    };
  };

  const estimatedCosts = calculateCosts();

  const calculateHealthMetrics = () => {
    const totalCost = estimatedCosts.total;
    const budget = parseFloat(budgetInput) || 25000;

    let budgetFit = 100;
    if (totalCost > budget) {
      budgetFit = Math.max(40, Math.round((budget / totalCost) * 100));
    } else {
      budgetFit = Math.min(100, Math.round(100 - ((budget - totalCost) / budget) * 15));
    }

    const stopsCount = selectedPlaces.length;
    const ratio = stopsCount / duration;
    let fatigue = "Low";
    if (ratio > 1.8) fatigue = "High";
    else if (ratio > 1.0) fatigue = "Medium";

    let efficiency = "High";
    if (transportPreference === 'Public Transport') efficiency = "Medium";
    if (stopsCount > 10) efficiency = "Medium";

    let crowd = "Low";
    const hasPeakSpots = selectedPlaces.some(p =>
      ['shillong', 'dawki', 'cherrapunji'].includes(p.name?.toLowerCase().trim())
    );
    if (hasPeakSpots) crowd = "Medium";
    if (selectedPlaces.length > 8) crowd = "High";

    let weatherRisk = "Low";
    if (startDate && (startDate.includes('-07-') || startDate.includes('-08-') || startDate.includes('-06-'))) {
      weatherRisk = "Medium";
    }

    let villagesCount = 0;
    selectedPlaces.forEach(p => {
      const name = p.name?.toLowerCase() || '';
      if (name.includes('nongriat') || name.includes('shnongpdeng') || name.includes('nongjrong') || name.includes('village')) {
        villagesCount++;
      }
    });
    let villages = "Low";
    if (villagesCount >= 3) villages = "High";
    else if (villagesCount >= 1) villages = "Medium";

    return {
      budgetFit: `${budgetFit}%`,
      fatigue,
      efficiency,
      crowd,
      weatherRisk,
      villages
    };
  };

  const health = calculateHealthMetrics();

  // Dynamic AI Suggestions filtering based on Style Chips & Checkbox interests
  const getFilteredNearbyDiscovery = () => {
    if (!activeTrip || !activeTrip.transport_options) return [];
    const activeItinerary = activeTrip.transport_options[Object.keys(activeTrip.transport_options)[0]];
    if (!activeItinerary || !activeItinerary.nearby_attractions) return [];

    const rawList = activeItinerary.nearby_attractions;

    return [...rawList].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      const highlightsA = (a.highlights || []).map(h => h.toLowerCase());
      const highlightsB = (b.highlights || []).map(h => h.toLowerCase());
      const catA = (a.quick_facts?.Type || '').toLowerCase();
      const catB = (b.quick_facts?.Type || '').toLowerCase();

      const styleLower = travelStyle.toLowerCase();
      if (highlightsA.includes(styleLower)) scoreA += 5;
      if (highlightsB.includes(styleLower)) scoreB += 5;

      interests.forEach(interest => {
        const intLower = interest.toLowerCase();
        if (highlightsA.includes(intLower) || catA.includes(intLower)) scoreA += 3;
        if (highlightsB.includes(intLower) || catB.includes(intLower)) scoreB += 3;
      });

      return scoreB - scoreA;
    });
  };

  const filteredDiscovery = getFilteredNearbyDiscovery();
  const visibleDiscovery = filteredDiscovery.slice(0, 9);

  // AI recommendations array
  const getAiRecommendations = () => {
    const list = [];
    const budget = budgetInput || 25000;
    const totalCost = estimatedCosts.total;

    if (totalCost > budget) {
      list.push({ text: `Over budget by ₹${(totalCost - budget).toLocaleString()}. Consider switching comfort level to 'Budget' or reducing local stops.`, type: 'warning' });
    } else {
      list.push({ text: `Fits perfectly within your budget of ₹${budget.toLocaleString()}. Saving of ₹${(budget - totalCost).toLocaleString()} expected.`, type: 'success' });
    }

    if (transportPreference === 'Road Trip') {
      list.push({ text: "This route is optimized for less backtracking via national highways.", type: 'success' });
    } else if (transportPreference === 'Public Transport') {
      list.push({ text: "Public transport reduces travel costs but increases transfer fatigue.", type: 'info' });
    }

    if (interests.includes('Waterfalls') && (startDate.includes('-07-') || startDate.includes('-08-'))) {
      list.push({ text: "Best waterfalls during peak monsoon season. Expect full water volumes.", type: 'success' });
    }

    if (travelStyle === 'Adventure') {
      list.push({ text: "Balanced mix of high-intensity treks (Nongriat) and river kayaking.", type: 'info' });
    }

    return list;
  };

  const recommendations = getAiRecommendations();

  // Render SVG Donut Chart
  const drawDonutChart = () => {
    const { stay, food, transport, activities, misc, total } = estimatedCosts;
    const pStay = Math.round((stay / total) * 100) || 0;
    const pFood = Math.round((food / total) * 100) || 0;
    const pTransport = Math.round((transport / total) * 100) || 0;
    const pAct = Math.round((activities / total) * 100) || 0;
    const pMisc = Math.max(1, 100 - (pStay + pFood + pTransport + pAct)) || 0;

    const o1 = 0;
    const o2 = -pTransport;
    const o3 = -(pTransport + pStay);
    const o4 = -(pTransport + pStay + pFood);
    const o5 = -(pTransport + pStay + pFood + pAct);

    return (
      <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-4 xl:gap-6 w-full min-w-0">
        <div className="h-42 w-42 sm:h-36 sm:w-36 shrink-0 relative flex items-center justify-center">
          <svg viewBox="0 0 42 42" className="h-full w-full transform -rotate-90">
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#F1F5F9" strokeWidth="5" />
            {/* Transport (Green) */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#16A34A" strokeWidth="5"
              strokeDasharray={`${pTransport} ${100 - pTransport}`} strokeDashoffset={o1} />
            {/* Stay (Dark Green) */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#15803D" strokeWidth="5"
              strokeDasharray={`${pStay} ${100 - pStay}`} strokeDashoffset={o2} />
            {/* Food (Orange) */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#F59E0B" strokeWidth="5"
              strokeDasharray={`${pFood} ${100 - pFood}`} strokeDashoffset={o3} />
            {/* Activities (Purple) */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#8B5CF6" strokeWidth="5"
              strokeDasharray={`${pAct} ${100 - pAct}`} strokeDashoffset={o4} />
            {/* Misc (Red/Gray) */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#6B7280" strokeWidth="5"
              strokeDasharray={`${pMisc} ${100 - pMisc}`} strokeDashoffset={o5} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-travel-text-muted font-bold">Total Est.</span>
            <span className="text-xs font-black text-travel-text-primary">₹{total.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-xs sm:text-sm font-semibold text-travel-text-secondary w-full min-w-0">
          <div className="flex items-center justify-between gap-2 whitespace-nowrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A] shrink-0" />
              <span className="truncate text-xs sm:text-sm">Transport</span>
            </div>
            <span className="shrink-0 pl-2 text-xs sm:text-sm">₹{transport.toLocaleString()} <span className="text-[11px] sm:text-[13px] font-medium text-gray-500">({pTransport}%)</span></span>
          </div>
          <div className="flex items-center justify-between gap-2 whitespace-nowrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-[#15803D] shrink-0" />
              <span className="truncate text-xs sm:text-sm">Stay</span>
            </div>
            <span className="shrink-0 pl-2 text-xs sm:text-sm">₹{stay.toLocaleString()} <span className="text-[11px] sm:text-[13px] font-medium text-gray-500">({pStay}%)</span></span>
          </div>
          <div className="flex items-center justify-between gap-2 whitespace-nowrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B] shrink-0" />
              <span className="truncate text-xs sm:text-sm">Food</span>
            </div>
            <span className="shrink-0 pl-2 text-xs sm:text-sm">₹{food.toLocaleString()} <span className="text-[11px] sm:text-[13px] font-medium text-gray-500">({pFood}%)</span></span>
          </div>
          <div className="flex items-center justify-between gap-2 whitespace-nowrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6] shrink-0" />
              <span className="truncate text-xs sm:text-sm">Activities</span>
            </div>
            <span className="shrink-0 pl-2 text-xs sm:text-sm">₹{activities.toLocaleString()} <span className="text-[11px] sm:text-[13px] font-medium text-gray-500">({pAct}%)</span></span>
          </div>
          <div className="flex items-center justify-between gap-2 whitespace-nowrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-[#6B7280] shrink-0" />
              <span className="truncate text-xs sm:text-sm">Misc</span>
            </div>
            <span className="shrink-0 pl-2 text-xs sm:text-sm">₹{misc.toLocaleString()} <span className="text-[11px] sm:text-[13px] font-medium text-gray-500">({pMisc}%)</span></span>
          </div>
        </div>
      </div>
    );
  };

  // Build sequential day-wise summaries dynamically based on selectedPlaces
  const getDynamicItineraryDays = () => {
    const days = [];
    const count = selectedPlaces.length || 8;
    const step = Math.max(1, Math.ceil(count / duration));

    for (let i = 1; i <= duration; i++) {
      const startIndex = (i - 1) * step;
      const dayStops = selectedPlaces.slice(startIndex, startIndex + step);

      let title = "Exploration & Transit";
      let acts = ["Scenic drive in region", "Local check-in & relax", "Overnight stay"];

      if (i === 1) {
        title = "Arrival & Shillong Check-in";
        acts = ["Arrival & check-in", "Local market exploration", "Overnight stay"];
      } else if (i === duration) {
        title = "Departure transit";
        acts = ["Last minute packing & breakfast", "Drive to airport / return hub", "Departure"];
      } else if (dayStops.length > 0) {
        title = `${dayStops.map(p => p.name.split(' (')[0]).join(' & ')} Day`;
        acts = dayStops.map(p => p.summary || "Explore attraction");
        acts.push("Overnight stay");
      }

      days.push({
        day: i,
        title,
        activities: acts
      });
    }
    return days;
  };

  const daywiseDays = getDynamicItineraryDays();

  // Load a fast-track onboarding template
  const loadQuickTemplate = (dest) => {
    if (dest === 'Meghalaya') {
      setStartLocation('Guwahati, Assam');
      setStartCoords([26.1445, 91.7362]);
      setDestination('Meghalaya');
      setDestCoords([25.5788, 91.8833]);
      setStartDate('2026-07-12');
      setEndDate('2026-07-18');
      setDuration(7);
      setTravelers(2);
      setBudgetInput(25000);
      setTravelStyle('Adventure');
      setTransportPreference('Road Trip');
      setInterests(['Waterfalls', 'Trekking', 'Caves', 'Photography']);
      // Trigger generate API
      onGenerateFromForm({
        destination: 'Meghalaya',
        startLocation: 'Guwahati, Assam',
        totalDays: 7,
        travelers: 2,
        budget: 25000,
        comfortLevel: 'moderate',
        transportPreference: 'fastest',
        placeTypes: ['waterfalls', 'trekking', 'caves', 'photography']
      });
    } else if (dest === 'Kerala') {
      setStartLocation('Kochi, Kerala');
      setStartCoords([9.9312, 76.2673]);
      setDestination('Kerala');
      setDestCoords([9.4981, 76.3388]);
      setStartDate('2026-08-01');
      setEndDate('2026-08-06');
      setDuration(6);
      setTravelers(2);
      setBudgetInput(30000);
      setTravelStyle('Relaxed');
      setTransportPreference('Mixed');
      setInterests(['Lakes', 'Food', 'Villages']);
      onGenerateFromForm({
        destination: 'Kerala',
        startLocation: 'Kochi, Kerala',
        totalDays: 6,
        travelers: 2,
        budget: 30000,
        comfortLevel: 'moderate',
        transportPreference: 'fastest',
        placeTypes: ['lakes', 'food', 'villages']
      });
    } else if (dest === 'Rajasthan') {
      setStartLocation('Jaipur, Rajasthan');
      setStartCoords([26.9124, 75.7873]);
      setDestination('Rajasthan');
      setDestCoords([24.5854, 73.7125]);
      setStartDate('2026-09-10');
      setEndDate('2026-09-15');
      setDuration(6);
      setTravelers(2);
      setBudgetInput(28000);
      setTravelStyle('Culture');
      setTransportPreference('Road Trip');
      setInterests(['History', 'Shopping', 'Food']);
      onGenerateFromForm({
        destination: 'Rajasthan',
        startLocation: 'Jaipur, Rajasthan',
        totalDays: 6,
        travelers: 2,
        budget: 28000,
        comfortLevel: 'moderate',
        transportPreference: 'fastest',
        placeTypes: ['history', 'shopping', 'food']
      });
    }
  };

  const activeItinerary = activeTrip?.transport_options?.['Road Trip'] || activeTrip?.transport_options?.[Object.keys(activeTrip?.transport_options || {})[0]] || {
    regions: activeTrip?.regions || [],
    budget_utilization: activeTrip?.budget_utilization || {},
    nearby_attractions: activeTrip?.nearby_attractions || []
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-24 sm:px-6 lg:px-8 select-none font-sans text-travel-text-primary">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT COLUMN: Fixed Left-Side Workspace Panel for Trip Preference Form */}
        <div className="lg:col-span-3 xl:col-span-3 bg-white border border-travel-borders p-5 rounded-2xl shadow-premium text-left space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-travel-borders">
            <span className="font-display font-semibold text-travel-dark text-[16px] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-[#16A34A]" />
              Trip Preferences
            </span>
          </div>

          <form onSubmit={handleRegenerateSubmit} className="space-y-5 text-body-custom">
            {/* Start location */}
            <div className="relative" ref={startAutocompleteRef}>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Starting Location (e.g. Mumbai)"
                  value={startLocation}
                  onChange={(e) => {
                    setStartLocation(e.target.value);
                    setUserTypingStart(true);
                  }}
                  onFocus={() => {
                    if (startSuggestions.length > 0) setShowStartDropdown(true);
                  }}
                  className="w-full rounded-xl border border-travel-borders bg-travel-bg-soft/20 py-2 pl-9 pr-3 text-[14px] font-normal outline-none transition focus:border-travel-button-dark focus:bg-white"
                />
                {showStartDropdown && startSuggestions.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-travel-borders rounded-xl shadow-premium max-h-48 overflow-y-auto">
                    {startSuggestions.map((item, idx) => (
                      <li
                        key={idx}
                        onClick={() => {
                          setStartLocation(item.name);
                          setStartCoords([item.lat, item.lon]);
                          setUserTypingStart(false);
                          setStartSuggestions([]);
                          setShowStartDropdown(false);
                        }}
                        className="px-4 py-2 hover:bg-travel-bg-soft cursor-pointer text-[12px] text-travel-text-primary border-b border-travel-borders/40 last:border-b-0"
                      >
                        {item.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Destination Area */}
            <div className="relative" ref={destAutocompleteRef}>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">To / Region</label>
              <div className="relative">
                <Compass className="absolute left-3 top-3 h-4 w-4 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Destination Area (e.g. Meghalaya)"
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setUserTypingDest(true);
                  }}
                  onFocus={() => {
                    if (destSuggestions.length > 0) setShowDestDropdown(true);
                  }}
                  className="w-full rounded-xl border border-travel-borders bg-travel-bg-soft/20 py-2 pl-9 pr-3 text-[14px] font-normal outline-none transition focus:border-travel-button-dark focus:bg-white"
                />
                {showDestDropdown && destSuggestions.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-travel-borders rounded-xl shadow-premium max-h-48 overflow-y-auto">
                    {destSuggestions.map((item, idx) => (
                      <li
                        key={idx}
                        onClick={() => {
                          setDestination(item.name.split(',')[0].trim());
                          setDestCoords([item.lat, item.lon]);
                          setUserTypingDest(false);
                          setDestSuggestions([]);
                          setShowDestDropdown(false);
                        }}
                        className="px-4 py-2 hover:bg-travel-bg-soft cursor-pointer text-[12px] text-travel-text-primary border-b border-travel-borders/40 last:border-b-0"
                      >
                        {item.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Dates & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#6B7280]" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-travel-borders bg-travel-bg-soft/20 py-2 pl-8 pr-1 text-[12px] font-normal outline-none transition focus:border-travel-button-dark focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-travel-borders bg-travel-bg-soft/20 py-2 px-2 text-[12px] font-normal outline-none transition focus:border-travel-button-dark focus:bg-white cursor-pointer"
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10, 12, 14].map(d => (
                    <option key={d} value={d}>{d} Days</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Travelers & Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">Travellers</label>
                <select
                  value={travelers}
                  onChange={(e) => setTravelers(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-travel-borders bg-travel-bg-soft/20 py-2 px-2 text-[12px] font-normal outline-none transition focus:border-travel-button-dark focus:bg-white cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map(t => (
                    <option key={t} value={t}>{t} {t === 1 ? 'Person' : 'People'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">Budget (Total)</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(parseFloat(e.target.value) || '')}
                  className="w-full rounded-xl border border-travel-borders bg-travel-bg-soft/20 py-2 px-3 text-[12px] font-normal outline-none transition focus:border-travel-button-dark focus:bg-white"
                />
              </div>
            </div>

            {/* Travel Mode */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Travel Mode</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'budget', label: 'Budget' },
                  { id: 'moderate', label: 'Comfort' },
                  { id: 'luxury', label: 'Premium' }
                ].map(mode => {
                  const isSel = comfortLevel === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleTravelModeChange(mode.id)}
                      className={`h-[38px] px-4 py-2 text-[14px] font-medium rounded-full border transition-all duration-150 cursor-pointer ${isSel
                        ? 'bg-black border-black text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-black'
                        }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Style Chips */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Travel Style / Vibe</label>
              <div className="flex flex-wrap gap-2">
                {['Adventure', 'Nature', 'Relaxed', 'Offbeat', 'Culture'].map(style => {
                  const isSel = travelStyle === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setTravelStyle(style)}
                      className={`h-[38px] px-4 py-2 text-[14px] font-medium rounded-full border transition-all duration-150 cursor-pointer ${isSel
                        ? 'bg-black border-black text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-black'
                        }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transport Preference */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Transport Preference</label>
              <div className="flex flex-wrap gap-2">
                {['Road Trip', 'Public Transport', 'Mixed'].map(pref => {
                  const isSel = transportPreference === pref;
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setTransportPreference(pref)}
                      className={`h-[38px] px-4 py-2 text-[14px] font-medium rounded-full border transition-all duration-150 cursor-pointer ${isSel
                        ? 'bg-black border-black text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-black'
                        }`}
                    >
                      {pref}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interests Filter Chips */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Interests</label>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto border border-travel-borders p-3 rounded-xl bg-travel-bg-soft/10">
                {['Waterfalls', 'Trekking', 'Lakes', 'Food', 'Caves', 'Photography', 'Villages', 'History', 'Shopping'].map(interest => {
                  const isChecked = interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`h-[38px] px-4 py-2 text-[14px] font-medium rounded-full border transition-all duration-150 cursor-pointer ${isChecked
                        ? 'bg-black border-black text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-black'
                        }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional Preferences */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">Additional Preferences</label>
              <textarea
                placeholder="Any restrictions or notes..."
                value={additionalPrefs}
                onChange={(e) => setAdditionalPrefs(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-travel-borders bg-travel-bg-soft/20 py-2 px-3 text-[12px] font-normal outline-none transition focus:border-travel-button-dark focus:bg-white resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1.5">
              <button
                type="submit"
                disabled={itineraryLoading}
                className="btn-premium btn-premium-primary w-full animate-pulse-slow"
              >
                {itineraryLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Sparkles className="h-4 w-4 text-white" />
                )}
                <span>{itineraryLoading ? 'Generating...' : (activeTrip ? 'Regenerate' : 'Generate Plan')}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="btn-premium btn-premium-secondary w-full"
              >
                <span>Save Draft</span>
              </button>
            </div>
          </form>

          {/* Health metrics panel */}
          <div className="space-y-3 pt-5 border-t border-travel-borders text-left">
            <span className="block text-[12px] font-semibold uppercase text-[#6B7280] tracking-wider">Trip Health Overview</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-travel-bg-soft border border-travel-borders p-2 rounded-xl text-center">
                <span className="text-[12px] text-emerald-600 font-semibold block">{health.budgetFit}</span>
                <span className="text-[10px] font-medium text-[#6B7280] block mt-0.5 leading-none">Budget Fit</span>
              </div>
              <div className="bg-travel-bg-soft border border-travel-borders p-2 rounded-xl text-center">
                <span className="text-[12px] text-travel-text-primary font-semibold block">{health.fatigue}</span>
                <span className="text-[10px] font-medium text-[#6B7280] block mt-0.5 leading-none">Fatigue</span>
              </div>
              <div className="bg-travel-bg-soft border border-travel-borders p-2 rounded-xl text-center">
                <span className="text-[12px] text-emerald-600 font-semibold block">{health.efficiency}</span>
                <span className="text-[10px] font-medium text-[#6B7280] block mt-0.5 leading-none">Efficiency</span>
              </div>
              <div className="bg-travel-bg-soft border border-travel-borders p-2 rounded-xl text-center">
                <span className="text-[12px] text-travel-text-primary font-semibold block">{health.crowd}</span>
                <span className="text-[10px] font-medium text-[#6B7280] block mt-0.5 leading-none">Crowd Level</span>
              </div>
              <div className="bg-travel-bg-soft border border-travel-borders p-2 rounded-xl text-center">
                <span className="text-[12px] text-travel-text-primary font-semibold block">{health.weatherRisk}</span>
                <span className="text-[10px] font-medium text-[#6B7280] block mt-0.5 leading-none">Weather Risk</span>
              </div>
              <div className="bg-travel-bg-soft border border-travel-borders p-2 rounded-xl text-center">
                <span className="text-[12px] text-emerald-600 font-semibold block">{health.villages}</span>
                <span className="text-[10px] font-medium text-[#6B7280] block mt-0.5 leading-none">Villages</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Dashboard workspace / Empty Placeholders */}
        <div className="lg:col-span-9 xl:col-span-9 space-y-6">
          {showTimeoutWarning && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-3 text-left">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-800">Still working on your itinerary...</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">The AI generation is taking longer than expected. You can wait or cancel and retry.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTimeoutWarning(false);
                  if (onResetLoading) onResetLoading();
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
              >
                Cancel & Retry
              </button>
            </div>
          )}

          {perfFallbackActive && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-3 text-left animate-fade-in relative z-20">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-800">Classic 2D Map Active</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">We have reverted to our classic 2D map layout because hardware-accelerated 3D rendering is running slowly on your device.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPerfFallbackActive(false)}
                className="text-amber-800 hover:text-amber-950 text-xs font-bold px-2 py-1 rounded border border-amber-300 bg-white shadow-xs shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {itineraryLoading || isFinalizing ? (
            <SkeletonLoader />
          ) : activeTrip === null ? (

            // ============================================
            // 1. PREMIUM EMPTY ONBOARDING STATE
            // ============================================
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 text-left"
            >
              {/* Onboarding Welcome Card */}
              <div className="rounded-2xl border border-travel-borders bg-white p-6 text-center shadow-premium space-y-4">
                <span className="inline-flex items-center gap-1 bg-travel-accent-green/50 text-[#16A34A] px-3.5 py-1 rounded-full text-[12px] font-semibold uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" />
                  Travel Operating System Workspace
                </span>
                <h1 className="text-page-title text-travel-dark leading-tight tracking-tight">
                  Compile your next masterpiece voyage with AI
                </h1>
                <p className="text-body-custom text-[#6B7280] leading-relaxed max-w-xl mx-auto">
                  Antigravity Travel matches your vibes, budgets, and schedules in real-time. Start by configuring your starting location and destination.
                </p>
              </div>

              {/* Quick Sandbox Templates */}
              <div className="space-y-3 w-full">
                <h3 className="text-small-custom font-semibold text-[#6B7280] uppercase tracking-wider">Quick Sandbox Templates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                  <div
                    onClick={() => loadQuickTemplate('Meghalaya')}
                    className="bg-white border border-travel-borders hover:border-[#16A34A] p-5 rounded-2xl cursor-pointer hover:shadow-xs transition flex flex-col justify-between group"
                  >
                    <div>
                      <span className="text-[12px] uppercase font-medium text-[#16A34A]">Adventure • Nature</span>
                      <h4 className="text-card-heading text-travel-dark mt-1 group-hover:text-[#16A34A] transition-colors">Meghalaya Hills</h4>
                      <p className="text-small-custom text-[#6B7280] leading-relaxed mt-1">Living root bridges of Cherrapunji & Umngot waters.</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 text-small-custom font-semibold text-[#6B7280] border-t border-travel-borders/60 mt-3">
                      <span>7 Days • ₹25,000</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  <div
                    onClick={() => loadQuickTemplate('Kerala')}
                    className="bg-white border border-travel-borders hover:border-[#16A34A] p-5 rounded-2xl cursor-pointer hover:shadow-xs transition flex flex-col justify-between group"
                  >
                    <div>
                      <span className="text-[12px] uppercase font-medium text-[#16A34A]">Relaxed • Lakes</span>
                      <h4 className="text-card-heading text-travel-dark mt-1 group-hover:text-[#16A34A] transition-colors">Kerala Backwaters</h4>
                      <p className="text-small-custom text-[#6B7280] leading-relaxed mt-1">Cruising houseboats, tea gardens, and coco groves.</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 text-small-custom font-semibold text-[#6B7280] border-t border-travel-borders/60 mt-3">
                      <span>6 Days • ₹30,000</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  <div
                    onClick={() => loadQuickTemplate('Rajasthan')}
                    className="bg-white border border-travel-borders hover:border-[#16A34A] p-5 rounded-2xl cursor-pointer hover:shadow-xs transition flex flex-col justify-between group"
                  >
                    <div>
                      <span className="text-[12px] uppercase font-medium text-[#16A34A]">Culture • History</span>
                      <h4 className="text-card-heading text-travel-dark mt-1 group-hover:text-[#16A34A] transition-colors">Rajasthan Heritage</h4>
                      <p className="text-small-custom text-[#6B7280] leading-relaxed mt-1">Hill forts of Jaipur and lake palaces of Udaipur.</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 text-small-custom font-semibold text-[#6B7280] border-t border-travel-borders/60 mt-3">
                      <span>6 Days • ₹28,000</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>

              {/* DASHED PLACEHOLDERS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 w-full">
                {/* Map placeholder */}
                <div className="border-2 border-dashed border-travel-borders rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-white min-h-[260px] hover:border-[#16A34A] hover:bg-emerald-50/5 hover:shadow-premium-hover transition-all duration-300 group">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                    <Map className="h-10 w-10 text-[#6B7280]/70" />
                  </div>
                  <h4 className="text-[15px] font-black text-travel-dark uppercase tracking-wider">Route Map</h4>
                  <p className="text-small-custom text-[#6B7280] mt-3 max-w-[200px] leading-relaxed">Generate an itinerary to visualize interactive route insights.</p>
                </div>

                {/* Budget placeholder */}
                <div className="border-2 border-dashed border-travel-borders rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-white min-h-[260px] hover:border-[#16A34A] hover:bg-emerald-50/5 hover:shadow-premium-hover transition-all duration-300 group">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                    <Wallet className="h-10 w-10 text-[#6B7280]/70" />
                  </div>
                  <h4 className="text-[15px] font-black text-travel-dark uppercase tracking-wider">Budget Breakdown</h4>
                  <p className="text-small-custom text-[#6B7280] mt-3 max-w-[200px] leading-relaxed">Interactive cost charts will calculate dynamically.</p>
                </div>

                {/* Itinerary placeholder */}
                <div className="border-2 border-dashed border-travel-borders rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-white min-h-[260px] hover:border-[#16A34A] hover:bg-emerald-50/5 hover:shadow-premium-hover transition-all duration-300 group">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                    <Calendar className="h-10 w-10 text-[#6B7280]/70" />
                  </div>
                  <h4 className="text-[15px] font-black text-travel-dark uppercase tracking-wider">Itinerary Snapshot</h4>
                  <p className="text-small-custom text-[#6B7280] mt-3 max-w-[200px] leading-relaxed">Your day-wise schedule and stops will appear here.</p>
                </div>

                {/* Suggestions placeholder */}
                <div className="border-2 border-dashed border-travel-borders rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-white min-h-[260px] hover:border-[#16A34A] hover:bg-emerald-50/5 hover:shadow-premium-hover transition-all duration-300 group">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                    <Compass className="h-10 w-10 text-[#6B7280]/70" />
                  </div>
                  <h4 className="text-[15px] font-black text-travel-dark uppercase tracking-wider">Discovery Sights</h4>
                  <p className="text-small-custom text-[#6B7280] mt-3 max-w-[200px] leading-relaxed">Suggested local attractions will appear here.</p>
                </div>
              </div>
            </motion.div>
          ) : (

            // ============================================
            // 2. ACTIVE LOADED TRIP DASHBOARD
            // ============================================
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* Trip Header Banner */}
              <div className="flex items-center justify-between border-b border-travel-borders pb-3">
                <div className="text-left">
                  <h1 className="text-section-heading text-travel-dark flex items-center gap-2">
                    <span>Your {destination} Adventure</span>
                  </h1>
                  <p className="text-small-custom font-semibold text-[#6B7280] mt-0.5 uppercase tracking-wider">
                    AI-Powered Travel Operating System Dashboard
                  </p>
                </div>

                <button
                  onClick={() => {
                    setActiveTrip(null);
                    setSelectedPlaces([]);
                  }}
                  className="btn-premium btn-premium-danger"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear Board</span>
                </button>
              </div>

              {/* TOP SUMMARY SECTION */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white border border-travel-borders p-4 rounded-xl shadow-xs text-left">
                  <span className="text-small-custom font-semibold text-[#6B7280] uppercase tracking-wider block">Total Trip Cost</span>
                  <h3 className="text-card-heading text-travel-dark mt-0.5 font-semibold">₹{estimatedCosts.total.toLocaleString()}</h3>
                  <span className="text-small-custom text-[#6B7280] block mt-0.5">Est. for {travelers} People</span>
                </div>

                <div className="bg-white border border-travel-borders p-4 rounded-xl shadow-xs text-left">
                  <span className="text-small-custom font-semibold text-[#6B7280] uppercase tracking-wider block">Total Distance</span>
                  <h3 className="text-card-heading text-travel-dark mt-0.5 font-semibold">~{routeInfo?.distance || 820} km</h3>
                  <span className="text-small-custom text-[#6B7280] block mt-0.5">OSRM road routes</span>
                </div>

                <div className="bg-white border border-travel-borders p-4 rounded-xl shadow-xs text-left">
                  <span className="text-small-custom font-semibold text-[#6B7280] uppercase tracking-wider block">Duration</span>
                  <h3 className="text-card-heading text-travel-dark mt-0.5 font-semibold">{duration} Days</h3>
                  <span className="text-small-custom text-[#6B7280] block mt-0.5">{duration - 1} Nights trip</span>
                </div>

                <div className="bg-white border border-travel-borders p-4 rounded-xl shadow-xs text-left">
                  <span className="text-small-custom font-semibold text-[#6B7280] uppercase tracking-wider block">Best Time</span>
                  <h3 className="text-card-heading text-emerald-600 mt-0.5 font-semibold">July - Sept</h3>
                  <span className="text-small-custom text-[#6B7280] block mt-0.5">Rainy waterfalls peak</span>
                </div>

                <button
                  onClick={() => setActiveTab('Blueprint')}
                  className="bg-white hover:bg-travel-bg-soft border border-travel-borders hover:border-black p-4 rounded-xl shadow-xs text-left flex flex-col justify-between transition group active:scale-98 cursor-pointer"
                >
                  <span className="text-small-custom font-semibold text-[#6B7280] uppercase tracking-wider block">Blueprints</span>
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className="text-small-custom font-semibold text-travel-dark">View Blueprint</span>
                    <ArrowRight className="h-4 w-4 text-[#6B7280] group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {/* SUB-NAVIGATION TABS */}
              <div className="flex border-b border-travel-borders overflow-x-auto scrollbar-none gap-2">
                {['Overview', 'Itinerary', 'Blueprint', 'Map', 'Budget', 'Attractions', 'Stay', 'Food', 'Tips', 'Packing List'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-3 text-small-custom font-semibold uppercase border-b-2 tracking-wider whitespace-nowrap transition-colors duration-150 cursor-pointer ${activeTab === tab
                      ? 'border-[#16A34A] text-[#16A34A]'
                      : 'border-transparent text-[#6B7280] hover:text-travel-text-primary'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* ACTIVE TAB CONTENTS */}
              <div className="space-y-5">
                {activeTab === 'Overview' && (
                  <div className="space-y-5 animate-fade-in">

                    {/* Map & Budget Split Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch w-full">

                      {/* Left Side: Route Overview Map (7 cols) */}
                      <div className="xl:col-span-8 flex flex-col bg-white border border-travel-borders rounded-xl p-4 shadow-xs text-left">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-card-heading text-travel-text-primary uppercase tracking-wider">Route Overview</h3>
                            <p className="text-small-custom text-[#6B7280] mt-0.5">Base Hub: Shillong</p>
                          </div>
                          <select className="text-small-custom font-semibold bg-travel-bg-soft border border-travel-borders px-2 py-1 rounded-lg cursor-pointer">
                            <option>View: All Stops</option>
                          </select>
                        </div>

                        <div className="h-[400px] w-full z-10 rounded-xl overflow-hidden border border-travel-borders">
                          {canRender3D ? (
                            <TravelMap3D
                              startCoords={startCoords}
                              destCoords={destCoords}
                              startLocation={startLocation}
                              destination={destination}
                              selectedPlaces={selectedPlaces}
                              routeGeometry={routeInfo?.geometry}
                              selectedTransport={transportPreference === 'Road Trip' ? 'cheapest' : (transportPreference === 'Public Transport' ? 'fastest' : 'comfortable')}
                              pitch={map3DState.pitch}
                              bearing={map3DState.bearing}
                              exaggeration={map3DState.exaggeration}
                              activeStyle={map3DState.activeStyle}
                              onStateChange={setMap3DState}
                              onPerformanceFallback={(reason) => {
                                console.warn("Terrain V6 auto-fallback triggered:", reason);
                                setPerfFallbackActive(true);
                              }}
                              showControls={false}
                            />
                          ) : (
                            <TravelMap
                              startCoords={startCoords}
                              destCoords={destCoords}
                              startLocation={startLocation}
                              destination={destination}
                              regions={activeItinerary.regions}
                              nearbyAttractions={activeItinerary.nearby_attractions}
                              selectedTransport={transportPreference === 'Road Trip' ? 'cheapest' : (transportPreference === 'Public Transport' ? 'fastest' : 'comfortable')}
                              selectedPlaces={selectedPlaces}
                              allowInternationalTransit={false}
                              routeGeometry={routeInfo?.geometry}
                              destinationImageUrl={activeItinerary.destination_image_url}
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-2.5 border-t border-travel-borders/60 pt-4 mt-4 text-center">
                          <div>
                            <span className="text-small-custom text-[#6B7280] font-semibold block">Total Stops</span>
                            <span className="text-small-custom font-semibold text-travel-dark block mt-0.5">{selectedPlaces.length} Stops</span>
                          </div>
                          <div>
                            <span className="text-small-custom text-[#6B7280] font-semibold block">Total Drive Time</span>
                            <span className="text-small-custom font-semibold text-travel-dark block mt-0.5">~{routeInfo?.duration || 18} hr</span>
                          </div>
                          <div>
                            <span className="text-small-custom text-[#6B7280] font-semibold block">Total Distance</span>
                            <span className="text-small-custom font-semibold text-travel-dark block mt-0.5">~{routeInfo?.distance || 820} km</span>
                          </div>
                          <div>
                            <span className="text-small-custom text-[#6B7280] font-semibold block">Avg. Daily Drive</span>
                            <span className="text-small-custom font-semibold text-travel-dark block mt-0.5">~3-4 hr</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Budget & Recommendations (5 cols) */}
                      <div className="xl:col-span-4 flex flex-col justify-between gap-4 text-left w-full min-w-0">

                        {/* Budget card with soft green background (premium feel, not oversaturated) */}
                        <div className="bg-[#FFFFFF] border border-emerald-200 rounded-xl p-4 sm:p-5 lg:p-6 shadow-premium flex-1 flex flex-col justify-between w-full min-w-0">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-small-custom font-semibold text-emerald-800 uppercase tracking-wider">Budget Breakdown</h3>
                            <div className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
                          </div>

                          {drawDonutChart()}

                          <button
                            onClick={() => setActiveTab('Budget')}
                            className="btn-premium  btn-premium-primary w-full mt-3"
                          >
                            View Full Budget
                          </button>
                        </div>

                        {/* AI Recommendations panel */}
                        <div className="bg-white border border-travel-borders rounded-xl p-4 shadow-xs flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 mb-3">
                              <Sparkles className="h-4 w-4 text-[#16A34A]" />
                              <h3 className="text-small-custom font-semibold text-travel-text-primary uppercase tracking-wider">AI Recommendations</h3>
                            </div>

                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {recommendations.map((rec, idx) => (
                                <div key={idx} className="flex gap-2 items-start text-small-custom font-normal leading-relaxed">
                                  {rec.type === 'success' && <Check className="h-3 w-3 text-[#16A34A] shrink-0 mt-0.5" />}
                                  {rec.type === 'warning' && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />}
                                  {rec.type === 'info' && <Compass className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />}
                                  <span className="text-travel-text-secondary">{rec.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* SUGGESTED PLACES (AI Nearby Discovery Suggestions - Major Redesign) */}
                    <div className="space-y-3 pt-2 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Compass className="h-5 w-5 text-[#16A34A]" />
                          <h2 className="text-section-heading text-travel-text-primary uppercase tracking-wider">AI Nearby Discovery Suggestions</h2>
                        </div>
                        <button
                          onClick={() => setActiveTab('Attractions')}
                          className="text-small-custom font-semibold text-[#16A34A] hover:underline uppercase"
                        >
                          View All Suggestions
                        </button>
                      </div>

                      {/* 3-column Grid, min 9 cards visible with real names and toggle interaction */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visibleDiscovery.map((item, idx) => {
                          const isAdded = selectedPlaces.some(p => p.name?.toLowerCase().trim() === item.name?.toLowerCase().trim());
                          return (
                            <div
                              key={idx}
                              onMouseEnter={() => setHoveredDiscoveryIdx(idx)}
                              onMouseLeave={() => setHoveredDiscoveryIdx(null)}
                              className="group relative overflow-hidden rounded-xl border border-travel-borders bg-white shadow-xs hover:shadow-premium-hover transition-all duration-300 hover:scale-[1.01] flex flex-col h-44 cursor-pointer"
                            >
                              <img
                                src={getDestinationImage(item)}
                                alt={item.name}
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                              {/* Toggle added stop interaction */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isAdded) {
                                    onRemovePlace(item);
                                  } else {
                                    onAddPlace(item);
                                  }
                                }}
                                className={`absolute top-2.5 right-2.5 p-1.5 rounded-full border shadow-md active:scale-90 transition-all duration-150 flex items-center justify-center z-20 cursor-pointer ${isAdded
                                  ? hoveredDiscoveryIdx === idx
                                    ? 'bg-red-500 text-white border-red-500'
                                    : 'bg-[#16A34A] text-white border-[#16A34A]'
                                  : 'bg-white/95 text-travel-text-primary border-travel-borders hover:bg-white hover:border-black'
                                  }`}
                                title={isAdded ? "Remove Stop" : "Add Stop"}
                              >
                                {isAdded ? (
                                  hoveredDiscoveryIdx === idx ? (
                                    <Minus className="h-3.5 w-3.5" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )
                                ) : (
                                  <Plus className="h-3.5 w-3.5" />
                                )}
                              </button>

                              {/* Click details navigation overlay */}
                              <div
                                className="absolute inset-0 z-[5]"
                                onClick={() => onNavigateToPlace && onNavigateToPlace(item.name)}
                              />

                              <div className="absolute bottom-3 left-3 right-3 text-left z-10 pointer-events-none">
                                <span className="text-[12px] uppercase font-semibold text-emerald-400 block mb-0.5 tracking-wider">
                                  {item.quick_facts?.Type || 'Attraction'}
                                </span>
                                <h4 className="text-card-heading text-white truncate font-semibold leading-tight">
                                  {item.name}
                                </h4>
                                <span className="text-small-custom text-white/70 block mt-0.5">
                                  {item.distance || 'Nearby'} • ⭐ {item.quick_facts?.Rating || '4.5'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ITINERARY SNAPSHOT SECTION */}
                    <div className="space-y-3 pt-2 text-left">
                      <h2 className="text-section-heading text-travel-text-primary uppercase tracking-wider">Itinerary Snapshot (Day-wise Plan)</h2>

                      <div className="flex gap-4 overflow-x-auto pb-3.5 scrollbar-none">
                        {daywiseDays.map((day, idx) => (
                          <div
                            key={idx}
                            className="bg-white border border-travel-borders rounded-xl p-4 shadow-xs w-64 shrink-0 flex flex-col justify-between"
                          >
                            <div>
                              <span className="text-small-custom font-semibold text-[#16A34A] block">Day {day.day}</span>
                              <h4 className="text-card-heading text-travel-text-primary mt-1 truncate leading-tight font-semibold">
                                {day.title}
                              </h4>

                              <ul className="mt-3.5 space-y-2">
                                {day.activities.slice(0, 3).map((act, aIdx) => (
                                  <li key={aIdx} className="flex gap-2 items-start text-small-custom font-normal text-travel-text-secondary leading-normal">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                                    <span className="line-clamp-2">{act}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BOTTOM MINI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-left">
                      {/* Weather outlook */}
                      <div className="bg-white border border-travel-borders p-4 rounded-xl shadow-xs flex items-center gap-4">
                        <CloudRain className="h-8 w-8 text-[#16A34A] shrink-0" />
                        <div>
                          <h4 className="text-card-heading text-travel-text-primary uppercase tracking-wider font-semibold">Weather Outlook</h4>
                          <p className="text-small-custom text-[#6B7280] mt-0.5">{getDestinationOverviewInfo(destination).weather}</p>
                          <button
                            onClick={() => setActiveTab('Tips')}
                            className="text-small-custom font-semibold text-[#16A34A] hover:underline uppercase mt-1.5 block cursor-pointer"
                          >
                            View Details &rarr;
                          </button>
                        </div>
                      </div>

                      {/* Packing suggestions */}
                      <div className="bg-white border border-travel-borders p-4 rounded-xl shadow-xs flex items-center gap-4">
                        <Briefcase className="h-8 w-8 text-[#16A34A] shrink-0" />
                        <div>
                          <h4 className="text-card-heading text-travel-text-primary uppercase tracking-wider font-semibold">Packing Suggestions</h4>
                          <p className="text-small-custom text-[#6B7280] mt-0.5">{getDestinationOverviewInfo(destination).packing}</p>
                          <button
                            onClick={() => setActiveTab('Packing List')}
                            className="text-small-custom font-semibold text-[#16A34A] hover:underline uppercase mt-1.5 block cursor-pointer"
                          >
                            View List &rarr;
                          </button>
                        </div>
                      </div>

                      {/* Safety & tips */}
                      <div className="bg-white border border-travel-borders p-4 rounded-xl shadow-xs flex items-center gap-4">
                        <ShieldAlert className="h-8 w-8 text-[#16A34A] shrink-0" />
                        <div>
                          <h4 className="text-card-heading text-travel-text-primary uppercase tracking-wider font-semibold">Safety & Tips</h4>
                          <p className="text-small-custom text-[#6B7280] mt-0.5">{getDestinationOverviewInfo(destination).safety}</p>
                          <button
                            onClick={() => setActiveTab('Tips')}
                            className="text-small-custom font-semibold text-[#16A34A] hover:underline uppercase mt-1.5 block cursor-pointer"
                          >
                            View Tips &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Blueprint' && posterData && (
                  <div className="space-y-6 animate-fade-in text-left">
                    {/* DOWNLOAD & PRINT BAR */}
                    <div className="bg-white border border-travel-borders p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-small-custom font-bold text-slate-700 uppercase tracking-wide">Map Provider:</span>
                          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button
                              onClick={() => setMapProvider('osrm')}
                              className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${mapProvider === 'osrm'
                                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/50'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                              OSRM Router
                            </button>
                            <button
                              onClick={() => setMapProvider('gemini')}
                              className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${mapProvider === 'gemini'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                              Gemini AI
                            </button>
                            <button
                              onClick={() => setMapProvider('openai')}
                              className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${mapProvider === 'openai'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                              OpenAI Poster
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-0 md:ml-4 md:border-l md:pl-4 border-slate-300">
                          <span className="text-small-custom font-bold text-slate-700 uppercase tracking-wide">Blueprint Version:</span>
                          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button
                              onClick={() => setUseBlueprintV3(false)}
                              className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${!useBlueprintV3
                                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/50'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                              V2 Poster
                            </button>
                            <button
                              onClick={() => setUseBlueprintV3(true)}
                              className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${useBlueprintV3
                                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/50'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                              V3 Atlas
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onSaveTrip(activeTrip)}
                          disabled={isSaved}
                          className={`btn-premium ${isSaved
                            ? 'btn-premium-success-outline cursor-not-allowed'
                            : 'btn-premium-indigo'
                            }`}
                        >
                          <Check className="h-4 w-4" />
                          <span>{isSaved ? 'Saved ✓' : 'Save Trip'}</span>
                        </button>
                        <button
                          onClick={handlePrint}
                          className="btn-premium btn-premium-secondary"
                        >
                          <Printer className="h-4 w-4" />
                          <span>Print / Save as PDF</span>
                        </button>
                        <button
                          onClick={handleDownloadPNG}
                          className="btn-premium btn-premium-primary"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Poster</span>
                        </button>
                      </div>
                    </div>

                    {/* BLUEPRINT CARD */}
                    <div id="travel-blueprint-card">
                      {useBlueprintV3 ? (
                        <BlueprintV3
                          activeTrip={activeTrip}
                          selectedPlaces={selectedPlaces}
                          routeInfo={routeInfo}
                          startDate={startDate}
                          travelStyle={travelStyle}
                          transportPreference={transportPreference}
                        />
                      ) : (
                        <BlueprintV2
                          activeTrip={activeTrip}
                          selectedPlaces={selectedPlaces}
                          routeInfo={routeInfo}
                          startDate={startDate}
                          travelStyle={travelStyle}
                          transportPreference={transportPreference}
                        />
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'Itinerary' && (
                  <div className="bg-white border border-travel-borders rounded-xl p-5 shadow-xs space-y-5 animate-fade-in text-left">
                    <div className="flex items-center justify-between border-b border-travel-borders pb-3">
                      <h3 className="text-section-heading text-travel-text-primary uppercase tracking-wider">Detailed Day-wise Schedule</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-small-custom font-semibold text-[#6B7280]">Total Days: {duration}</span>
                        <button
                          onClick={() => onSaveTrip(activeTrip)}
                          disabled={isSaved}
                          className={`btn-premium ${isSaved
                            ? 'btn-premium-success-outline cursor-not-allowed'
                            : 'btn-premium-indigo'
                            }`}
                        >
                          <Check className="h-4 w-4" />
                          <span>{isSaved ? 'Saved ✓' : 'Save Trip'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {daywiseDays.map((day, idx) => (
                        <div key={idx} className="relative border-l-2 border-[#16A34A] pl-4 py-1">
                          <span className="absolute -left-[9px] top-1 h-4.5 w-4.5 rounded-full bg-[#16A34A] border-4 border-white shadow-sm" />
                          <div className="mb-2">
                            <span className="text-small-custom font-semibold text-[#16A34A]">Day {day.day}</span>
                            <h4 className="text-card-heading text-travel-dark mt-0.5 font-semibold">{day.title}</h4>
                          </div>

                          <div className="space-y-2 mt-3">
                            {day.activities.map((act, aIdx) => (
                              <div key={aIdx} className="bg-travel-bg-soft/40 border border-travel-borders p-3 rounded-xl text-body-custom font-normal text-travel-text-secondary flex justify-between items-center">
                                <span>{act}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'Map' && (
                  <div className="bg-white border border-travel-borders rounded-xl p-4 shadow-xs animate-fade-in relative z-10 text-left">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-section-heading text-travel-text-primary uppercase tracking-wider">Journey Routing Map</h3>
                      <span className="text-small-custom text-[#6B7280]">Real road route mapping via OSRM</span>
                    </div>
                    <div className="h-[600px] w-full rounded-xl overflow-hidden border border-travel-borders z-10">
                      {canRender3D ? (
                        <TravelMap3D
                          startCoords={startCoords}
                          destCoords={destCoords}
                          startLocation={startLocation}
                          destination={destination}
                          selectedPlaces={selectedPlaces}
                          routeGeometry={routeInfo?.geometry}
                          selectedTransport={transportPreference === 'Road Trip' ? 'cheapest' : (transportPreference === 'Public Transport' ? 'fastest' : 'comfortable')}
                          pitch={map3DState.pitch}
                          bearing={map3DState.bearing}
                          exaggeration={map3DState.exaggeration}
                          activeStyle={map3DState.activeStyle}
                          onStateChange={setMap3DState}
                          onPerformanceFallback={(reason) => {
                            console.warn("Terrain V6 auto-fallback triggered:", reason);
                            setPerfFallbackActive(true);
                          }}
                          showControls={true}
                          collapsibleControls={true}
                        />
                      ) : (
                        <TravelMap
                          startCoords={startCoords}
                          destCoords={destCoords}
                          startLocation={startLocation}
                          destination={destination}
                          regions={activeItinerary.regions}
                          nearbyAttractions={activeItinerary.nearby_attractions}
                          selectedTransport={transportPreference === 'Road Trip' ? 'cheapest' : (transportPreference === 'Public Transport' ? 'fastest' : 'comfortable')}
                          selectedPlaces={selectedPlaces}
                          allowInternationalTransit={false}
                          routeGeometry={routeInfo?.geometry}
                          destinationImageUrl={activeItinerary.destination_image_url}
                        />
                      )}
                    </div>

                    <div className="mt-5">
                      <TransportCard
                        startLocation={startLocation}
                        destination={destination}
                        comfortLevel={activeTrip?.comfort_level || 'moderate'}
                        transportPreference={transportPreference}
                        currency={activeTrip?.currency || 'INR'}
                        options={activeTrip?.transport_options}
                        selectedOption={
                          transportPreference === 'Road Trip' ? 'cheapest' :
                            (transportPreference === 'Public Transport' ? 'fastest' : 'comfortable')
                        }
                        onSelectOption={(optionId) => {
                          if (optionId === 'cheapest') setTransportPreference('Road Trip');
                          else if (optionId === 'fastest') setTransportPreference('Public Transport');
                          else setTransportPreference('Mixed');
                        }}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'Budget' && (
                  <div className="animate-fade-in text-left">
                    <BudgetSummary
                      budgetData={{
                        total_budget: budgetInput,
                        travelers: travelers,
                        comfort_level: activeTrip?.comfort_level || 'moderate',
                        destination: destination,
                        distance: routeInfo?.distance,
                        breakdown: {
                          transport: { percentage: Math.round((estimatedCosts.transport / estimatedCosts.total) * 100), amount: estimatedCosts.transport, description: "Fuel & local vehicle rentals" },
                          stay: { percentage: Math.round((estimatedCosts.stay / estimatedCosts.total) * 100), amount: estimatedCosts.stay, description: "Cottages & boutique stays" },
                          food: { percentage: Math.round((estimatedCosts.food / estimatedCosts.total) * 100), amount: estimatedCosts.food, description: "Local meals & highway dhabas" },
                          activities: { percentage: Math.round((estimatedCosts.activities / estimatedCosts.total) * 100), amount: estimatedCosts.activities, description: "Entry fees & river sports" },
                          savings: { percentage: Math.round((estimatedCosts.misc / estimatedCosts.total) * 100), amount: estimatedCosts.misc, description: "Emergency fund" }
                        },
                        tips: activeTrip?.budget_tips || [
                          "Avoid premium resorts on weekends near Sohra.",
                          "Pre-negotiate day-cabs to prevent airport-to-city dynamic surges."
                        ]
                      }}
                      currency="INR"
                    />
                  </div>
                )}

                {activeTab === 'Attractions' && (
                  <div className="space-y-6 animate-fade-in text-left">
                    {/* Search Bar */}
                    <div className="bg-white border border-travel-borders p-5 rounded-2xl shadow-xs">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Compass className="h-5 w-5 text-slate-400" />
                        </span>
                        <input
                          type="text"
                          placeholder={`Search attractions in ${destination || 'destination'} (e.g. Dawki, waterfall, village, canyon)...`}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-travel-borders bg-travel-bg-soft/20 text-sm font-medium text-slate-700 outline-none transition-all duration-200 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                          >
                            <X className="h-4.5 w-4.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sights Catalog */}
                    <div className="bg-white border border-travel-borders rounded-2xl p-6 shadow-xs space-y-5">
                      <h3 className="text-section-heading text-travel-text-primary uppercase tracking-wider border-b border-travel-borders pb-3 font-black">
                        Sights Catalog
                      </h3>

                      {/* Grid Layout */}
                      {(() => {
                        const filteredList = (activeItinerary.nearby_attractions || []).filter(att => {
                          if (!searchQuery) return true;
                          const query = searchQuery.toLowerCase().trim();

                          const nameMatch = (att.name || '').toLowerCase().includes(query);
                          const categoryMatch = (att.quick_facts?.Type || att.type || '').toLowerCase().includes(query);
                          const highlightsMatch = (att.highlights || []).some(h => h.toLowerCase().includes(query));
                          const descMatch = (att.summary || att.description || '').toLowerCase().includes(query);
                          const tagsMatch = (att.tags || []).some(t => t.toLowerCase().includes(query));

                          return nameMatch || categoryMatch || highlightsMatch || descMatch || tagsMatch;
                        });

                        if (filteredList.length === 0) {
                          return (
                            <div className="text-center py-12 border-2 border-dashed border-travel-borders rounded-2xl">
                              <Compass className="h-8 w-8 text-slate-300 mx-auto mb-2.5" />
                              <h4 className="text-sm font-bold text-slate-700">No attractions match your search</h4>
                              <p className="text-xs text-slate-400 mt-1">Try searching for other terms like "waterfall", "river", "cave", or "canyon".</p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-6 w-full">
                            {filteredList.map((att, idx) => {
                              const isAdded = selectedPlaces.some(p => p.name?.toLowerCase().trim() === att.name?.toLowerCase().trim());
                              return (
                                <div
                                  key={idx}
                                  className="group border border-travel-borders rounded-2xl overflow-hidden bg-white shadow-xs hover:shadow-premium-hover transition duration-300 flex flex-col justify-between"
                                >
                                  {/* Card Image Header */}
                                  <div className="relative h-44 w-full overflow-hidden shrink-0">
                                    <img
                                      src={att.image_url || getCategoryMatchedImage(att.name, att.quick_facts?.Type || att.type || '', att.description || att.summary || '')}
                                      alt={att.name}
                                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                                    {/* Category badge */}
                                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-white/10">
                                      {att.quick_facts?.Type || att.type || 'Attraction'}
                                    </div>

                                    {/* Rating badge */}
                                    <div className="absolute top-3 right-3 bg-white/95 text-slate-800 text-[10px] font-black px-2 py-0.5 rounded shadow-sm border border-slate-150">
                                      ⭐ {att.quick_facts?.Rating || '4.5'}
                                    </div>

                                    {/* Distance label */}
                                    <span className="absolute bottom-3 left-3 text-2xs font-extrabold text-white flex items-center gap-1 drop-shadow-md">
                                      <MapPin className="h-3 w-3 text-emerald-400" />
                                      {att.distance || 'Nearby'}
                                    </span>
                                  </div>

                                  {/* Card Body */}
                                  <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div className="space-y-2">
                                      <h4 className="text-body-custom font-extrabold text-slate-800 leading-tight truncate">
                                        {att.name}
                                      </h4>
                                      <p className="text-small-custom text-slate-500 leading-relaxed line-clamp-2">
                                        {att.summary || att.description}
                                      </p>
                                    </div>

                                    {/* Card Footer Action Buttons */}
                                    <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between gap-2.5 w-full min-w-0">
                                      {/* Explore Button */}
                                      <button
                                        type="button"
                                        onClick={() => setExplorePlace(att)}
                                        className="btn-premium btn-premium-secondary flex-1 whitespace-nowrap min-w-0"
                                      >
                                        <Compass className="h-4 w-4 shrink-0" />
                                        <span className="truncate">Explore</span>
                                      </button>

                                      {/* Add To Trip Toggle Button */}
                                      <button
                                        type="button"
                                        onClick={() => isAdded ? onRemovePlace(att) : onAddPlace(att)}
                                        className={`btn-premium flex-1 whitespace-nowrap min-w-0 ${isAdded ? 'btn-premium-success-outline' : 'btn-premium-primary'
                                          }`}
                                      >
                                        {isAdded ? (
                                          <div className="relative flex items-center justify-center gap-2 whitespace-nowrap min-w-0">
                                            <span className="inline group-hover:hidden truncate">✓ Added</span>
                                            <span className="hidden group-hover:inline truncate">✖ Remove</span>
                                          </div>
                                        ) : (
                                          <div className="relative flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0">
                                            <Plus className="h-4 w-4 shrink-0" />
                                            <span className="truncate">Add To Trip</span>
                                          </div>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {activeTab === 'Stay' && (
                  <div className="bg-white border border-travel-borders rounded-xl p-5 shadow-xs animate-fade-in text-left">
                    <div className="flex items-center justify-between mb-4 border-b border-travel-borders pb-2">
                      <h3 className="text-section-heading text-travel-text-primary uppercase tracking-wider">Stay Recommendations</h3>
                      <span className="text-small-custom text-[#6B7280]">AI-Filtered Accommodations for {destination}</span>
                    </div>

                    {staysLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-2">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                        <span className="text-body-custom font-semibold text-travel-text-secondary">Loading stays...</span>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {['Budget', 'Mid-range', 'Premium'].map((tier) => {
                          const tierStays = staysData[tier] || [];
                          if (tierStays.length === 0) return null;

                          return (
                            <div key={tier} className="space-y-4">
                              <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                                <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${tier === 'Budget' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                  tier === 'Mid-range' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    'bg-purple-50 text-purple-700 border border-purple-100'
                                  }`}>
                                  {tier} Stays
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tierStays.map((stay, sIdx) => (
                                  <div key={sIdx} className="border border-travel-borders rounded-2xl overflow-hidden bg-white shadow-xs hover:shadow-premium-hover transition duration-300 flex flex-col justify-between">
                                    <div className="relative h-44 w-full">
                                      <img src={stay.image_url || stay.image} alt={stay.name} className="h-full w-full object-cover" />
                                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-white/20">
                                        {stay.accommodation_type || stay.type}
                                      </div>
                                      <div className="absolute top-3 right-3 bg-white/95 text-slate-800 text-[10px] font-black px-2 py-0.5 rounded shadow-sm border border-slate-150">
                                        ⭐ {stay.rating} / 5.0
                                      </div>
                                    </div>

                                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                                      <div className="space-y-1.5">
                                        <h4 className="text-body-custom font-extrabold text-slate-800 leading-tight line-clamp-1">{stay.name}</h4>
                                        <div className="flex flex-wrap items-center gap-1.5 text-2xs text-[#6B7280] font-semibold">
                                          <span>📍 {stay.distance}</span>
                                          <span>•</span>
                                          <span className="uppercase">{stay.provider}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 pt-1">
                                          {stay.amenities?.map((amenity, aIdx) => (
                                            <span key={aIdx} className="bg-slate-50 text-slate-600 text-[9px] font-semibold px-2 py-0.5 rounded border border-slate-100">
                                              {amenity}
                                            </span>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="border-t border-slate-100 pt-3.5 mt-2.5 flex items-center justify-between">
                                        <div>
                                          <span className="text-3xs text-[#6B7280] font-bold block uppercase leading-none">Price per night</span>
                                          <span className="text-card-heading text-emerald-600 font-extrabold block mt-1">₹{Math.round(stay.price_per_night || stay.price).toLocaleString()}</span>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => window.open(stay.booking_link || 'https://booking.com', '_blank')}
                                            className="btn-premium btn-premium-secondary"
                                          >
                                            View Details
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => window.open(stay.booking_link || 'https://booking.com', '_blank')}
                                            className="btn-premium btn-premium-primary"
                                          >
                                            Book Now
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Food' && (
                  <div className="bg-white border border-travel-borders rounded-xl p-5 shadow-xs animate-fade-in text-left">
                    <h3 className="text-section-heading text-travel-text-primary uppercase tracking-wider mb-4 border-b border-travel-borders pb-2">Cuisine & Local Diners</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeItinerary.regions?.map((reg, idx) => (
                        <div key={idx} className="border border-travel-borders p-4 rounded-xl hover:border-black transition">
                          <span className="text-small-custom font-semibold text-[#6B7280] uppercase tracking-wider">{reg.region_name} Local Foods</span>
                          <h4 className="text-card-heading text-travel-text-primary mt-1 font-semibold">Local dining recommendations</h4>
                          <ul className="mt-3.5 space-y-1.5">
                            {reg.food_recommendations?.map((food, fIdx) => (
                              <li key={fIdx} className="text-small-custom font-normal text-travel-text-secondary flex gap-2">
                                <span>🍲</span>
                                <span>{food}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'Tips' && (
                  <div className="bg-white border border-travel-borders rounded-xl p-5 shadow-xs animate-fade-in text-left space-y-5">
                    <h3 className="text-section-heading text-travel-text-primary uppercase tracking-wider border-b border-travel-borders pb-2">Warnings & Local Guidelines</h3>

                    <div className="space-y-4">
                      {getDestinationTips(destination).map((tip, idx) => {
                        const isSevere = tip.type === 'warning' && (tip.title.includes('Severe') || tip.title.includes('Altitude') || tip.title.includes('Permit') || tip.title.includes('ban'));
                        const bgClass = isSevere ? 'bg-red-50 border-red-200' : (tip.type === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200');
                        const titleClass = isSevere ? 'text-red-800 font-semibold' : (tip.type === 'warning' ? 'text-amber-800 font-semibold' : 'text-blue-800 font-semibold');
                        const textClass = isSevere ? 'text-red-700 mt-1 leading-relaxed' : (tip.type === 'warning' ? 'text-amber-700 mt-1 leading-relaxed' : 'text-blue-700 mt-1 leading-relaxed');
                        const Icon = isSevere ? ShieldAlert : (tip.type === 'warning' ? AlertCircle : Compass);
                        const iconColor = isSevere ? 'text-red-600' : (tip.type === 'warning' ? 'text-amber-600' : 'text-blue-600');

                        return (
                          <div key={idx} className={`${bgClass} border p-4 rounded-xl flex items-start gap-3`}>
                            <Icon className={`h-5 w-5 ${iconColor} shrink-0 mt-0.5`} />
                            <div>
                              <h4 className={`text-card-heading ${titleClass}`}>{tip.title}</h4>
                              <p className={`text-small-custom ${textClass}`}>{tip.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'Packing List' && (() => {
                  const packing = getDestinationPackingList(destination);
                  const isHillStation = destination.toLowerCase().includes('sikkim') || destination.toLowerCase().includes('gangtok') || destination.toLowerCase().includes('lachen');
                  const apparelTitle = isHillStation ? '🧥 Winter & Alpine Gear' : '🥾 Hiking & Apparel';

                  return (
                    <div className="bg-white border border-travel-borders rounded-xl p-5 shadow-xs animate-fade-in text-left">
                      <h3 className="text-section-heading text-travel-text-primary uppercase tracking-wider mb-4 border-b border-travel-borders pb-2">Checklists & Pack suggestions</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-card-heading text-travel-text-primary mb-3 font-semibold">{apparelTitle}</h4>
                          <ul className="space-y-2 text-body-custom font-normal text-travel-text-secondary">
                            {packing.apparel.map((itemObj, idx) => (
                              <li key={idx} className="flex gap-2">
                                <input
                                  type="checkbox"
                                  defaultChecked={itemObj.checked}
                                  className="rounded border-travel-borders text-[#16A34A] focus:ring-[#16A34A]"
                                />
                                <span>{itemObj.item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-card-heading text-travel-text-primary mb-3 font-semibold">🎒 Essentials & Meds</h4>
                          <ul className="space-y-2 text-body-custom font-normal text-travel-text-secondary">
                            {packing.essentials.map((itemObj, idx) => (
                              <li key={idx} className="flex gap-2">
                                <input
                                  type="checkbox"
                                  defaultChecked={itemObj.checked}
                                  className="rounded border-travel-borders text-[#16A34A] focus:ring-[#16A34A]"
                                />
                                <span>{itemObj.item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* PERSISTENT BOTTOM TRIP BAR (Cleaned up, no adjust filters button) */}
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-travel-borders py-3 z-40 shadow-premium flex justify-center">
                <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#16A34A] text-white font-black">
                      🛒
                    </span>
                    <div className="text-left font-body">
                      <span className="text-small-custom font-semibold uppercase text-[#6B7280] block">Your Trip Cart</span>
                      <span className="text-[12px] font-semibold text-travel-text-primary block mt-0.5">{selectedPlaces.length} Places Added</span>
                    </div>
                  </div>

                  {/* Place chips horizontal list */}
                  <div className="flex-1 flex gap-2.5 overflow-x-auto py-1 px-2 select-none scrollbar-none max-w-2xl">
                    {selectedPlaces.map((place, idx) => (
                      <div
                        key={idx}
                        className="bg-travel-bg-soft border border-travel-borders hover:border-black rounded-lg px-2.5 py-1 text-small-custom font-semibold text-travel-text-primary flex items-center gap-1.5 shrink-0 transition"
                      >
                        <span className="text-[#16A34A]">{idx + 1}</span>
                        <span className="truncate max-w-[100px]">{place.name.split(' (')[0]}</span>
                        <button
                          onClick={() => onRemovePlace(place)}
                          className="text-red-500 hover:text-red-700 font-bold cursor-pointer text-small-custom"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {selectedPlaces.length === 0 && (
                      <span className="text-small-custom text-[#6B7280] font-semibold italic py-1">No stops selected. Click '+' on suggestions to add.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Optimize My Trip CTA - Primary Green */}
                    <button
                      onClick={async () => {
                        try {
                          await onFinalize();
                          setActiveTab('Blueprint');
                        } catch (err) {
                          console.error("Optimization failed:", err);
                        }
                      }}
                      disabled={selectedPlaces.length === 0 || isFinalizing}
                      className="btn-premium btn-premium-primary"
                    >
                      {isFinalizing ? (
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-150" />
                      ) : (
                        <Shuffle className="h-4 w-4 text-emerald-100" />
                      )}
                      <span>{isFinalizing ? 'Optimizing Route...' : 'Optimize Route'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Explore Attraction Details Modal */}
              <AnimatePresence>
                {explorePlace && (
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm select-none">
                    {/* Modal Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setExplorePlace(null)}
                      className="absolute inset-0 cursor-pointer"
                    />

                    {/* Modal Card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 15 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 border border-slate-200"
                    >
                      {/* Hero Image */}
                      <div className="relative h-64 md:h-72 w-full shrink-0">
                        <img
                          src={explorePlace.image_url || getCategoryMatchedImage(explorePlace.name, explorePlace.quick_facts?.Type || explorePlace.type || '', explorePlace.description || explorePlace.summary || '')}
                          alt={explorePlace.name}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

                        {/* Floating Close Button */}
                        <button
                          onClick={() => setExplorePlace(null)}
                          className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition active:scale-90 border border-white/10 cursor-pointer"
                        >
                          <X className="h-5 w-5" />
                        </button>

                        {/* Floating Category Chip */}
                        <span className="absolute bottom-4 left-6 bg-emerald-600/90 text-white text-xs font-black uppercase px-3 py-1 rounded-full border border-emerald-400/30">
                          {explorePlace.quick_facts?.Type || explorePlace.type || 'Attraction'}
                        </span>
                      </div>

                      {/* Scrollable Content */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
                        <div className="border-b border-slate-100 pb-4">
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">
                            {explorePlace.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 mt-2">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-emerald-600" />
                              {explorePlace.distance || 'Nearby'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-emerald-600" />
                              {explorePlace.visit_duration || '2 Hours'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1.5">
                              <Star className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                              {explorePlace.quick_facts?.Rating || '4.5'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider">About the Attraction</h4>
                          <p className="text-sm text-slate-600 leading-relaxed font-medium">
                            {explorePlace.description || explorePlace.summary}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <span className="text-[10px] font-black uppercase text-emerald-800 block">🌦️ Best Time to Visit</span>
                            <span className="text-xs font-bold text-slate-700">{explorePlace.best_time || 'October to April'}</span>
                          </div>
                          <div className="space-y-1.5 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <span className="text-[10px] font-black uppercase text-emerald-800 block">🚗 Local Transit</span>
                            <span className="text-xs font-bold text-slate-700">{explorePlace.local_transport || 'Cab / Shared taxi'}</span>
                          </div>
                        </div>

                        {explorePlace.tips && (
                          <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-xl space-y-1">
                            <h4 className="text-xs font-bold uppercase text-amber-900 flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-amber-600" />
                              💡 Travel Tips
                            </h4>
                            <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                              {explorePlace.tips}
                            </p>
                          </div>
                        )}

                        {explorePlace.nearby_activities && explorePlace.nearby_activities.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider">Suggested Activities</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {explorePlace.nearby_activities.map((act, aIdx) => (
                                <span key={aIdx} className="bg-emerald-50 text-emerald-850 text-2xs font-semibold px-2.5 py-1 rounded-md border border-emerald-100">
                                  {act}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="text-left">
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Coordinates</span>
                            <span className="text-2xs font-bold text-slate-500">
                              🌍 {explorePlace.lat ? explorePlace.lat.toFixed(4) : (explorePlace.coords?.[0] ? explorePlace.coords[0].toFixed(4) : '0.0000')}° N, {explorePlace.lon ? explorePlace.lon.toFixed(4) : (explorePlace.coords?.[1] ? explorePlace.coords[1].toFixed(4) : '0.0000')}° E
                            </span>
                          </div>

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(explorePlace.name + ', ' + (destination || 'India'))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-premium btn-premium-secondary"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>View on Google Maps</span>
                          </a>
                        </div>
                      </div>

                      {/* Modal Footer Actions */}
                      <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-3 shrink-0">
                        <button
                          onClick={() => setExplorePlace(null)}
                          className="btn-premium btn-premium-secondary"
                        >
                          Close
                        </button>
                        {(() => {
                          const modalIsAdded = selectedPlaces.some(p => p.name?.toLowerCase().trim() === explorePlace.name?.toLowerCase().trim());
                          return (
                            <button
                              onClick={() => modalIsAdded ? onRemovePlace(explorePlace) : onAddPlace(explorePlace)}
                              className={`btn-premium ${modalIsAdded ? 'btn-premium-danger' : 'btn-premium-primary'
                                }`}
                            >
                              {modalIsAdded ? (
                                <>
                                  <Minus className="h-4 w-4" />
                                  <span>Remove From Trip</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  <span>Add To Trip</span>
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

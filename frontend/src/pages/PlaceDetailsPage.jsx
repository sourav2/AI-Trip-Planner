import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, PlusCircle, Check, MapPin, Calendar, Compass, ShieldAlert, Sparkles, Utensils } from 'lucide-react';
import { travelApi } from '../services/api';

export default function PlaceDetailsPage({
  placeName,
  onBack,
  selectedPlaces = [],
  onAddPlace,
  onRemovePlace
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  useEffect(() => {
    async function loadDetails() {
      setLoading(true);
      setError(null);
      try {
        const data = await travelApi.fetchPlaceDetails(placeName);
      
        console.log("PLACE DETAILS RESPONSE:", data);
        
        setDetails(data);
        
      } 
      catch (err) {
        console.error("Failed to load place details:", err);
        setError("Could not load travel guide details. Please check connection.");
      } 
      finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [placeName]);

  // Render Leaflet Map centered at the place
  useEffect(() => {
    if (loading || error || !details || !mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: details.coords || [20.5937, 78.9629],
        zoom: 12,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView(details.coords || [20.5937, 78.9629],
    12);
    }

    // Clean up markers layer group
    const layerGroup = L.layerGroup().addTo(mapRef.current);
    if (!details.coords || details.coords.length < 2) {
      return;
    }

    // Add main place marker (Blue)
    const placeIcon = L.divIcon({
      html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white shadow-lg border-2 border-white font-bold" style="font-size:16px;">📍</div>`,
      className: 'custom-map-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    if (details.coords) {
  L.marker(details.coords, { icon: placeIcon })
    .bindPopup(`<strong>${details.name}</strong><br/>Central Hub`)
    .addTo(layerGroup);
}
      

    // Add nearby attractions markers (Red)
    const attrIcon = L.divIcon({
      html: `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-rose-500 text-white shadow-md border-2 border-white font-bold" style="font-size:13px;">✨</div>`,
      className: 'custom-map-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    if (!details.coords || details.coords.length < 2) {
    
    details.attractions?.forEach(att => {
      // Generate nearby coordinate offset
      const hash = att.name.charCodeAt(0) + att.name.charCodeAt(att.name.length - 1);
      const latOffset = ((hash % 10) - 5) * 0.005;
      const lonOffset = (((hash >> 1) % 10) - 5) * 0.005;
      const attCoords = [details.coords[0] + latOffset, details.coords[1] + lonOffset];

      L.marker(attCoords, { icon: attrIcon })
        .bindPopup(`<strong>${att.name}</strong><br/>${att.type}`)
        .addTo(layerGroup);
    });
  }
    return () => {
      if (mapRef.current) {
        mapRef.current.removeLayer(layerGroup);
      }
    };
  }, [loading, error, details]);

  // Clean up full map object on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center">
        <Compass className="h-12 w-12 text-emerald-600 animate-spin-slow mx-auto mb-4" />
        <h3 className="text-xs font-bold text-travel-text-primary">Loading travel guide for {placeName}...</h3>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-base font-bold text-travel-text-primary mb-2">Error Loading Guide</h3>
        <p className="text-sm text-travel-text-muted mb-6">{error}</p>
        <button onClick={onBack} className="btn-premium btn-premium-primary">
          Go Back
        </button>
      </div>
    );
  }

  const isAdded = selectedPlaces.some(p => p.name?.toLowerCase().trim() === details.name?.toLowerCase().trim());
  const formattedPlace = {
    name: details.name,
    coords: details.coords || [0, 0],
    lat: details.coords?.[0] || 0,
    lon: details.coords?.[1] || 0,
    summary: details.overview,
    visit_duration: "1 Day",
    local_cost: 0
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 pb-20 sm:px-6 lg:px-8 space-y-6">
      {/* Top Breadcrumb & Quick Back Navigation */}
      <div className="flex items-center justify-between border-b border-travel-accent-gray pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-travel-text-secondary hover:text-black transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to AI Workspace</span>
        </button>

        <button
          onClick={() => isAdded ? onRemovePlace(formattedPlace) : onAddPlace(formattedPlace)}
          className={`btn-premium ${
            isAdded ? 'btn-premium-success-outline' : 'btn-premium-primary'
          }`}
        >
          {isAdded ? (
            <div className="relative flex items-center justify-center gap-2">
              <Check className="h-4 w-4" />
              <span>Added to Trip</span>
            </div>
          ) : (
            <>
              <PlusCircle className="h-4 w-4" />
              <span>Add to Trip Cart</span>
            </>
          )}
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative h-[280px] sm:h-[350px] rounded-2xl overflow-hidden shadow-premium">
        <img
          src={details.gallery?.[activeImageIdx] || details.hero_image}
          alt={details.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        
        {/* Banner Title */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1 bg-white/20 border border-white/30 backdrop-blur-md rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              <Compass className="h-3 w-3 text-emerald-400" /> Curated Travel Guide
            </span>
            <h1 className="text-page-title text-white mt-2">
              {details.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Grid: Info columns vs Gallery & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side (7 cols) - Narrative details */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Overview */}
          <div className="rounded-2xl border border-travel-borders bg-white p-5 shadow-xs">
            <h3 className="text-section-heading text-travel-text-primary mb-3">Overview</h3>
            <p className="text-body-custom text-travel-text-secondary leading-relaxed">
              {details.overview}
            </p>
          </div>

          {/* Quick Facts & Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Quick Facts */}
            <div className="rounded-2xl border border-travel-borders bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-card-heading text-travel-text-primary mb-3 flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-[#16A34A]" /> Best Time to Visit
                </h3>
                <p className="text-body-custom text-travel-text-secondary leading-relaxed">
                  {details.best_time}
                </p>
              </div>
            </div>

            {/* Travel Tips */}
            <div className="rounded-2xl border border-travel-borders bg-white p-5 shadow-xs">
              <h3 className="text-card-heading text-travel-text-primary mb-3">Traveler Tips</h3>
              <ul className="space-y-2">
                {(details.tips || []).map((tip, idx) => (
                  <li key={idx} className="flex gap-2 items-start text-body-custom text-travel-text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Attractions List */}
          <div className="rounded-2xl border border-travel-borders bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-section-heading text-travel-text-primary font-semibold">Must-Visit Points of Interest</h3>
            <div className="space-y-4">
              {(details.attractions || []).map((att, idx) => (
                <div key={idx} className="flex items-start gap-4 border-b border-travel-borders pb-4 last:border-b-0 last:pb-0">
                  {att.image_url && (
                    <img
                      src={att.image_url}
                      alt={att.name}
                      className="h-16 w-16 rounded-xl object-cover shrink-0 border border-travel-borders"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-card-heading text-travel-text-primary truncate font-semibold">{att.name}</h4>
                      <span className="text-small-custom font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                        {att.type}
                      </span>
                    </div>
                    <p className="text-body-custom text-travel-text-secondary leading-relaxed mt-1">
                      {att.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side (5 cols) - Map and Visual assets */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Map Preview */}
          <div className="rounded-2xl border border-travel-borders bg-white p-5 shadow-xs flex flex-col h-[280px]">
            <h3 className="text-card-heading text-travel-text-primary mb-2 flex items-center gap-1">
              <MapPin className="h-4 w-4 text-rose-500" /> Geography Preview
            </h3>
            <div
              ref={mapContainerRef}
              className="flex-1 rounded-xl border border-travel-borders overflow-hidden z-10"
            />
          </div>

          {/* Photo Gallery Selector Carousel */}
          <div className="rounded-2xl border border-travel-borders bg-white p-5 shadow-xs">
            <h3 className="text-card-heading text-travel-text-primary mb-3">Scenic Gallery</h3>
            <div className="grid grid-cols-4 gap-2.5">
              {(details.gallery || []).map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-square rounded-xl overflow-hidden border cursor-pointer transition ${
                    activeImageIdx === idx
                      ? 'border-[#16A34A] ring-2 ring-emerald-500/20'
                      : 'border-travel-borders hover:border-black'
                  }`}
                >
                  <img src={img} alt="Gallery item" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Food & Activities Highlights */}
          <div className="rounded-2xl border border-travel-borders bg-white p-5 shadow-xs grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-card-heading text-travel-text-primary mb-2.5 flex items-center gap-1">
                <Utensils className="h-3 w-3 text-travel-text-primary" /> Food Stops
              </h4>
              <ul className="space-y-2">
                {(details.food_recommendations || []).map((foodName, idx) => (
                  <li key={idx} className="text-body-custom text-travel-text-secondary leading-snug">
                    🍲 {foodName}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-card-heading text-travel-text-primary mb-2.5 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[#16A34A]" /> Top Activities
              </h4>
              <ul className="space-y-2">
                {(details.activities || []).map((act, idx) => (
                  <li key={idx} className="text-body-custom text-travel-text-secondary leading-snug">
                    ⚡ {act}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

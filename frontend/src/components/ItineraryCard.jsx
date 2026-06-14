import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Car, Hotel, Tag, Calendar, ChevronDown, ChevronUp, Utensils, PlusCircle, Check } from 'lucide-react';
import TravelTimeline from './TravelTimeline';

const FALLBACK_CATEGORIES = {
  mountain: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1486916856992-e4db22c8df33?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=600&auto=format&fit=crop"
  ],
  beach: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473116763269-255448993f66?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1540206395-68808572332f?q=80&w=600&auto=format&fit=crop"
  ],
  heritage: [
    "https://images.unsplash.com/photo-1585128719715-46776b56a0d1?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1598977123418-45f04b615ae9?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1590050752117-238cb0612b1b?q=80&w=600&auto=format&fit=crop"
  ],
  water: [
    "https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1432406186267-3473b3398c2a?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1433832597046-4f10e10ac764?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1508873696983-2df519f0397e?q=80&w=600&auto=format&fit=crop"
  ],
  forest: [
    "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501183007986-d0d080b147f9?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=600&auto=format&fit=crop"
  ],
  temple: [
    "https://images.unsplash.com/photo-1561361513-2d000a50f0db?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1609137144813-09743c3a0774?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1608958416755-e4659b8b3db2?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1512553148256-7543b7c6282b?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1590050752117-238cb0612b1b?q=80&w=600&auto=format&fit=crop"
  ],
  shopping: [
    "https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1488459718432-040817266a80?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1567401893930-79072f53b462?q=80&w=600&auto=format&fit=crop"
  ],
  general: [
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1500835595337-f740268f4327?q=80&w=600&auto=format&fit=crop"
  ]
};

const getFallbackImage = (name) => {
  if (!name) return FALLBACK_CATEGORIES.general[0];
  const q_clean = name.trim();
  const q_lower = q_clean.toLowerCase();
  
  let category = "general";
  if (/temple|shrine|monastery|church|mosque|cathedral|spiritual/i.test(q_lower)) {
    category = "temple";
  } else if (/beach|sea|ocean|coast|sand|wave|goa|baga|calangute|anjuna|vagator|colva|palolem/i.test(q_lower)) {
    category = "beach";
  } else if (/mountain|valley|hill|peak|snow|trek|himalaya|shimla|darjeeling|munnar|ridge|kufri|mashobra|chail|naldehra|jakhoo/i.test(q_lower)) {
    category = "mountain";
  } else if (/lake|river|waterfall|falls|boat|boating|stream|pichola|sagar|umiam|dawki/i.test(q_lower)) {
    category = "water";
  } else if (/palace|fort|monument|gate|memorial|castle|heritage|history|cultural|amber|hawa mahal|city palace|jagdish|taj|qutub/i.test(q_lower)) {
    category = "heritage";
  } else if (/forest|wood|nature|park|garden|wildlife|safari|tree|greenery|nandi/i.test(q_lower)) {
    category = "forest";
  } else if (/market|bazaar|shop|street|mall|plaza|lane|nightlife|pub|bar|club|cafe|lounge/i.test(q_lower)) {
    category = "shopping";
  }
  
  const img_list = FALLBACK_CATEGORIES[category];
  
  let h = 0;
  for (let i = 0; i < q_clean.length; i++) {
    h = (h * 31 + q_clean.charCodeAt(i)) & 0xFFFFFFFF;
  }
  const idx = Math.abs(h) % img_list.length;
  return img_list[idx];
};

export default function ItineraryCard({ 
  region, 
  currency = 'INR',
  selectedPlaces = [],
  onAddPlace = null,
  onRemovePlace = null
}) {
  const [expanded, setExpanded] = useState(false);

  const regionKey = region.region_name?.toLowerCase().trim();
  const imageUrl = region.image_url || getFallbackImage(region.region_name);
  const isAdded = selectedPlaces.some(p => p.name?.toLowerCase().trim() === regionKey);

  return (
    <motion.div 
      layout
      className="overflow-hidden rounded-2xl border border-travel-accent-gray bg-travel-bg-white shadow-premium transition-all duration-300 hover:shadow-premium-hover hover:scale-[1.02] flex flex-col h-full"
    >
      
      {/* Top Section: Immersive travel image with rounded top corners */}
      <div className="relative h-48 w-full overflow-hidden">
        <img 
          src={imageUrl} 
          alt={region.region_name} 
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        
        {/* Floating Add to Trip Button */}
        {onAddPlace && onRemovePlace && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const placeObj = {
                name: region.region_name,
                coords: region.region_coords,
                lat: region.region_coords?.[0],
                lon: region.region_coords?.[1],
                summary: region.quick_summary,
                visit_duration: "1 Day",
                local_cost: region.estimated_cost || 0
              };
              if (isAdded) {
                onRemovePlace(placeObj);
              } else {
                onAddPlace(placeObj);
              }
            }}
            className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all duration-200 border shadow-md active:scale-90 flex items-center justify-center gap-1.5 ${
              isAdded 
                ? 'bg-red-500 text-white border-red-400 hover:bg-red-600' 
                : 'bg-white/90 text-travel-text-primary border-travel-accent-gray hover:bg-white hover:border-travel-button-dark'
            }`}
            title={isAdded ? "Remove from Trip" : "Add to Trip"}
          >
            {isAdded ? (
              <Check className="h-4 w-4" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            <span className="text-3xs font-bold">{isAdded ? 'Added' : 'Add to Trip'}</span>
          </button>
        )}
      </div>

      {/* Bottom Section: Content flowing downward naturally */}
      <div className="p-5 flex flex-col flex-1">
        
        {/* Region Stop Category Badge */}
        <div className="flex items-center gap-1 text-3xs uppercase tracking-wider text-travel-text-muted font-bold mb-1">
          <MapPin className="h-3 w-3" />
          <span>Itinerary Stop</span>
        </div>

        {/* Place Name / Region Name */}
        <h3 className="font-display text-base font-bold text-travel-text-primary mb-2">
          {region.region_name}
        </h3>

        {/* Short Summary */}
        <p className="text-xs text-travel-text-muted leading-relaxed mb-4">
          {region.quick_summary}
        </p>

        {/* Transport Mode & Hotel Stay Recommendation (Side-by-Side) */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs border-b border-travel-accent-gray pb-4">
          <div className="flex items-start gap-2">
            <Car className="h-4.5 w-4.5 text-travel-text-muted mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold block text-travel-text-primary">Transport</span>
              <span className="text-travel-text-muted capitalize text-2xs">{region.transport}</span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Hotel className="h-4.5 w-4.5 text-travel-text-muted mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold block text-travel-text-primary">Stay Quality</span>
              <span className="text-travel-text-muted capitalize text-2xs">{region.hotel_type}</span>
            </div>
          </div>
        </div>

        {/* Highlight Details: Nearby Attractions & Highlights */}
        <div className="space-y-4 mb-5">
          
          {/* Nearby Attractions */}
          {region.places && region.places.length > 0 && (
            <div>
              <span className="text-3xs font-bold uppercase tracking-wider text-travel-text-muted block mb-1.5">
                Key Attractions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {region.places.map((place, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-lg bg-travel-bg-soft border border-travel-accent-gray px-2 py-0.5 text-3xs font-medium text-travel-text-secondary"
                  >
                    <Tag className="h-2.5 w-2.5 opacity-60" />
                    {place}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Activity Highlights */}
          {region.activities && region.activities.length > 0 && (
            <div>
              <span className="text-3xs font-bold uppercase tracking-wider text-travel-text-muted block mb-1.5">
                Activity Highlights
              </span>
              <div className="flex flex-wrap gap-1.5">
                {region.activities.map((act, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-lg bg-travel-bg-soft border border-travel-accent-gray px-2 py-0.5 text-3xs font-medium text-travel-text-primary"
                  >
                    {act}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Food Suggestions */}
          {region.food_recommendations && region.food_recommendations.length > 0 && (
            <div>
              <span className="text-3xs font-bold uppercase tracking-wider text-travel-text-muted block mb-1.5 flex items-center gap-1">
                <Utensils className="h-3 w-3" /> Food Suggestions
              </span>
              <ul className="text-2xs text-travel-text-secondary list-disc pl-4 space-y-1">
                {region.food_recommendations.slice(0, 2).map((food, idx) => (
                  <li key={idx}>{food}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Cost & Expand Action Footer */}
        <div className="mt-auto border-t border-travel-accent-gray pt-4 flex items-center justify-between">
          <div>
            <span className="text-3xs uppercase tracking-wider font-semibold text-travel-text-muted block">
              Estimated Cost
            </span>
            <span className="text-sm font-bold text-travel-text-primary">
              {currency === 'INR' ? '₹' : '$'}{region.estimated_cost?.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-premium btn-premium-secondary"
          >
            <span>{expanded ? 'Hide Timeline' : 'View Day Schedule'}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

      </div>

      {/* Expanded day scheduling details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-travel-accent-gray bg-travel-bg-gray overflow-hidden"
          >
            <div className="p-5">
              <h4 className="text-xs font-bold text-travel-text-primary mb-3 flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Day-by-Day Schedule
              </h4>
              <TravelTimeline timeline={region.timeline} currency={currency} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

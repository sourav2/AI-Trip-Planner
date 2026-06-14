import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ArrowUp, ArrowDown, Clock, Coins, Sparkles, MapPin, Compass, HelpCircle, GripVertical } from 'lucide-react';
import { getCategoryMatchedImage, CATEGORY_IMAGES } from '../services/blueprintProvider';

const FALLBACK_CATEGORIES = {
  mountain: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=600&auto=format&fit=crop"
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
  general: [
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop"
  ]
};

function getFallbackImage(name) {
  if (!name) return CATEGORY_IMAGES?.general || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop';
  return getCategoryMatchedImage(name, '', '');
}

function getDistrictState(place) {
  if (place.sub_region) {
    return place.sub_region;
  }
  if (place.formatted_address) {
    const parts = place.formatted_address.split(',').map(p => p.trim());
    const nameLower = (place.name || '').toLowerCase();
    const filtered = parts.filter(p => {
      const pLower = p.toLowerCase();
      return pLower !== nameLower && pLower !== 'india' && !/^\d+$/.test(p);
    });
    if (filtered.length > 0) {
      return filtered.slice(0, 2).join(', ');
    }
  }
  return 'Scenic Spot';
}

function estimatePlaceCosts(placeName, comfortLevel = 'moderate') {
  const nameLower = placeName.toLowerCase();
  
  let food = comfortLevel === 'luxury' ? 1000 : (comfortLevel === 'budget' ? 400 : 600);
  let stay = comfortLevel === 'luxury' ? 3500 : (comfortLevel === 'budget' ? 800 : 1800);
  let transport = comfortLevel === 'luxury' ? 800 : (comfortLevel === 'budget' ? 250 : 400);
  let activity = 150;
  
  if (nameLower.includes("dawki") || nameLower.includes("shnongpdeng") || nameLower.includes("umngot")) {
    activity = 500;
  } else if (nameLower.includes("nongjrong")) {
    activity = 300;
    transport += 200;
  } else if (nameLower.includes("cherrapunji") || nameLower.includes("sohra")) {
    activity = 200;
  } else if (nameLower.includes("laitlum")) {
    activity = 150;
  } else if (nameLower.includes("krang suri") || nameLower.includes("waterfall")) {
    activity = 150;
  }
  
  return {
    food,
    stay,
    transport,
    activity,
    total: food + stay + transport + activity
  };
}

export default function TripCartDrawer({
  isOpen,
  onClose,
  selectedPlaces = [],
  onRemovePlace,
  onReorderPlaces,
  onFinalize,
  isFinalizing = false,
  startLocation = '',
  destination = '',
  currency = 'INR',
  comfortLevel = 'moderate'
}) {
  const symbol = currency === 'INR' ? '₹' : '$';
  const totalStops = selectedPlaces.length;
  
  const [draggedIndex, setDraggedIndex] = React.useState(null);

  // Calculate dynamic costs for each stop
  const placesWithCosts = selectedPlaces.map(place => {
    const costs = estimatePlaceCosts(place.name, comfortLevel);
    return {
      ...place,
      costs
    };
  });

  const totalStay = placesWithCosts.reduce((sum, p) => sum + p.costs.stay, 0);
  const totalFood = placesWithCosts.reduce((sum, p) => sum + p.costs.food, 0);
  const totalTransport = placesWithCosts.reduce((sum, p) => sum + p.costs.transport, 0);
  const totalActivity = placesWithCosts.reduce((sum, p) => sum + p.costs.activity, 0);
  const totalCost = totalStay + totalFood + totalTransport + totalActivity;

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newPlaces = [...selectedPlaces];
    const temp = newPlaces[index];
    newPlaces[index] = newPlaces[index - 1];
    newPlaces[index - 1] = temp;
    onReorderPlaces(newPlaces);
  };

  const handleMoveDown = (index) => {
    if (index === selectedPlaces.length - 1) return;
    const newPlaces = [...selectedPlaces];
    const temp = newPlaces[index];
    newPlaces[index] = newPlaces[index + 1];
    newPlaces[index + 1] = temp;
    onReorderPlaces(newPlaces);
  };

  const handleDrop = (fromIdx, toIdx) => {
    if (fromIdx === undefined || fromIdx === null || fromIdx === toIdx) return;
    const newPlaces = [...selectedPlaces];
    const item = newPlaces[fromIdx];
    newPlaces.splice(fromIdx, 1);
    newPlaces.splice(toIdx, 0, item);
    onReorderPlaces(newPlaces);
    setDraggedIndex(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[99990] bg-black/40 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 z-[99991] h-full w-full sm:w-[460px] bg-travel-bg-white shadow-2xl border-l border-travel-accent-gray p-6 flex flex-col focus:outline-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-travel-accent-gray pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-travel-button-dark text-white">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-travel-text-primary">Selected Trip Stops</h3>
                  <p className="text-3xs text-travel-text-muted mt-0.5">Customize stops sequence and finalize</p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg border border-travel-accent-gray hover:border-travel-text-muted text-travel-text-muted hover:text-travel-text-primary transition active:scale-95 animate-transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Places List (Cart) */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 mb-6">
              <AnimatePresence mode="popLayout">
                {placesWithCosts.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-travel-accent-gray/80 rounded-2xl bg-travel-bg-gray/25 p-6 mt-4"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100/50">
                      <svg className="w-8 h-8 text-emerald-600/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.446 5.562-2.225a2.25 2.25 0 0 0 1.258-2.086V4.118a2.25 2.25 0 0 0-3.478-1.904l-5.5 3.197a2.25 2.25 0 0 1-2.046 0l-5.5-3.197a2.25 2.25 0 0 0-3.478 1.904v12.423a2.25 2.25 0 0 0 1.258 2.086l5.562 2.225a2.25 2.25 0 0 0 1.624 0l5.562-2.225Z" />
                      </svg>
                    </div>
                    <p className="text-2xs font-bold text-travel-text-primary">Your Trip Cart is Empty</p>
                    <p className="text-3xs text-travel-text-muted mt-1.5 max-w-[240px] leading-relaxed">
                      Build your customized dream route by adding destinations, viewpoints, waterfalls, and local spots from the suggestions board.
                    </p>
                  </motion.div>
                ) : (
                  placesWithCosts.map((place, idx) => (
                    <motion.div
                      key={place.name}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", idx.toString());
                        setDraggedIndex(idx);
                      }}
                      onDragEnd={() => setDraggedIndex(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                        handleDrop(fromIdx, idx);
                      }}
                      className={`flex gap-3.5 p-3.5 rounded-xl border transition duration-200 ${
                        draggedIndex === idx
                          ? 'border-emerald-500 bg-emerald-50/10 opacity-55'
                          : 'border-travel-accent-gray hover:border-travel-button-dark bg-travel-bg-gray/50'
                      }`}
                    >
                      {/* Drag Handle */}
                      <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-travel-text-muted/50 hover:text-travel-text-primary self-stretch px-0.5">
                        <GripVertical className="h-4.5 w-4.5 shrink-0" />
                      </div>

                      {/* Thumbnail */}
                      <img 
                        src={place.image_url || getFallbackImage(place.name)} 
                        alt={place.name} 
                        className="h-16 w-16 rounded-lg object-cover shrink-0 border border-travel-accent-gray/80"
                      />

                      {/* Content Column */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-2xs font-bold text-travel-text-primary truncate">{place.name}</h4>
                            <span className="text-[10px] uppercase font-bold text-emerald-600 shrink-0">
                              Stop {idx + 1}
                            </span>
                          </div>
                          <span className="text-3xs text-travel-text-muted block mt-0.5">
                            {getDistrictState(place)}
                          </span>
                        </div>

                        {/* Breakdown Costs */}
                        <div className="grid grid-cols-4 gap-1.5 mt-2.5 pt-2 border-t border-travel-accent-gray/60 text-[9px] leading-none text-travel-text-secondary">
                          <div>
                            <span className="text-travel-text-muted block mb-0.5">Stay</span>
                            <span className="font-semibold text-travel-text-primary">{symbol}{place.costs.stay}</span>
                          </div>
                          <div>
                            <span className="text-travel-text-muted block mb-0.5">Food</span>
                            <span className="font-semibold text-travel-text-primary">{symbol}{place.costs.food}</span>
                          </div>
                          <div>
                            <span className="text-travel-text-muted block mb-0.5">Trans.</span>
                            <span className="font-semibold text-travel-text-primary">{symbol}{place.costs.transport}</span>
                          </div>
                          <div>
                            <span className="text-travel-text-muted block mb-0.5">Total</span>
                            <span className="font-bold text-emerald-600">{symbol}{place.costs.total}</span>
                          </div>
                        </div>
                      </div>

                      {/* Controls Column */}
                      <div className="flex flex-col gap-1 shrink-0 justify-center">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded-md border border-travel-accent-gray bg-travel-bg-white text-travel-text-muted hover:text-travel-text-primary disabled:opacity-30 disabled:pointer-events-none transition"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === selectedPlaces.length - 1}
                          className="p-1 rounded-md border border-travel-accent-gray bg-travel-bg-white text-travel-text-muted hover:text-travel-text-primary disabled:opacity-30 disabled:pointer-events-none transition"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onRemovePlace(place)}
                          className="p-1 rounded-md border border-red-100 bg-red-50/20 text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Footer Statistics & finalization */}
            {placesWithCosts.length > 0 && (
              <div className="bg-travel-bg-soft rounded-xl border border-travel-accent-gray/80 p-4.5 space-y-3 mb-4 text-2xs text-travel-text-secondary">
                <div className="flex justify-between border-b border-travel-accent-gray/60 pb-2">
                  <span className="text-travel-text-muted">Total Selected Destinations</span>
                  <span className="font-bold text-travel-text-primary">{totalStops} places</span>
                </div>
                
                {/* Cost Breakdown Accumulators */}
                <div className="space-y-1.5 border-b border-travel-accent-gray/60 pb-2 text-3xs">
                  <div className="flex justify-between">
                    <span className="text-travel-text-muted">Stays Accumulator</span>
                    <span className="font-semibold text-travel-text-primary">{symbol}{totalStay.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-travel-text-muted">Food & Dine Estimate</span>
                    <span className="font-semibold text-travel-text-primary">{symbol}{totalFood.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-travel-text-muted">Transit Costs</span>
                    <span className="font-semibold text-travel-text-primary">{symbol}{totalTransport.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-travel-text-muted">Sightseeing & Entry Fees</span>
                    <span className="font-semibold text-travel-text-primary">{symbol}{totalActivity.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-travel-text-muted font-bold">Total Estimated Budget</span>
                  <span className="text-xs font-black text-emerald-600">{symbol}{totalCost.toLocaleString()}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                onFinalize();
                onClose();
              }}
              disabled={selectedPlaces.length === 0 || isFinalizing}
              className="w-full btn-premium btn-premium-primary"
            >
              <Sparkles className="h-4.5 w-4.5 text-travel-accent-blue" />
              {isFinalizing ? 'Generating Optimized Itinerary...' : 'Generate Final Itinerary'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

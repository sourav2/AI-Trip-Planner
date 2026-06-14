import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Trash2, MapPin, Sparkles, Clock, Coins, Compass } from 'lucide-react';

export default function TripBuilderDashboard({
  selectedPlaces = [],
  onRemovePlace,
  onReorderPlaces,
  onFinalize,
  isFinalizing = false,
  startLocation = '',
  destination = '',
  currency = 'INR'
}) {
  const symbol = currency === 'INR' ? '₹' : '$';

  // Calculate live statistics
  const totalStops = selectedPlaces.length;
  const totalEstimatedCost = selectedPlaces.reduce((sum, place) => sum + (place.local_cost || 0), 0);
  
  // Estimate time: 2 hours per attraction + 1 hour transit in between
  const estimatedHours = totalStops > 0 ? (totalStops * 2 + (totalStops - 1) * 1) : 0;

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

  return (
    <div className="rounded-2xl border border-travel-accent-gray bg-travel-bg-white p-6 shadow-premium space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-travel-accent-gray pb-4">
        <div>
          <h3 className="text-sm font-bold text-travel-text-primary flex items-center gap-1.5">
            <Compass className="h-4.5 w-4.5 text-travel-button-dark" />
            Trip Builder Dashboard
          </h3>
          <p className="text-3xs text-travel-text-muted mt-0.5">
            Add attractions, reorder stops, and finalize your travel sequence.
          </p>
        </div>
        <span className="flex items-center justify-center rounded-lg bg-travel-button-dark/5 text-travel-button-dark border border-travel-accent-gray px-2.5 py-1 text-3xs font-semibold">
          {totalStops} Stops Selected
        </span>
      </div>

      {/* Places List (Cart) */}
      <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {selectedPlaces.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-travel-accent-gray/80 rounded-xl bg-travel-bg-gray/20 p-4"
            >
              <Sparkles className="h-7 w-7 text-travel-text-muted opacity-40 mb-2 animate-pulse" />
              <p className="text-2xs font-semibold text-travel-text-primary">Your Trip Cart is Empty</p>
              <p className="text-3xs text-travel-text-muted mt-1 max-w-[220px]">
                Click "Add to Trip" on nearby attraction cards below to design your custom stops sequence.
              </p>
            </motion.div>
          ) : (
            selectedPlaces.map((place, idx) => (
              <motion.div
                key={place.name}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-travel-accent-gray hover:border-travel-button-dark bg-travel-bg-gray/50 hover:shadow-xs transition duration-200"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-travel-button-dark text-white text-3xs font-bold mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-2xs font-bold text-travel-text-primary truncate">{place.name}</h4>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-0.5 text-3xs text-travel-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {place.visit_duration || '2 Hours'}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-travel-text-secondary">
                        <Coins className="h-3 w-3 shrink-0" />
                        {place.local_cost === 0 ? 'Free' : `${symbol}${place.local_cost}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stop Action Panel (Reordering & Delete) */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg border border-travel-accent-gray bg-travel-bg-white text-travel-text-muted hover:text-travel-text-primary hover:border-travel-text-muted disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Move Stop Up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === selectedPlaces.length - 1}
                    className="p-1.5 rounded-lg border border-travel-accent-gray bg-travel-bg-white text-travel-text-muted hover:text-travel-text-primary hover:border-travel-text-muted disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Move Stop Down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onRemovePlace(place)}
                    className="p-1.5 rounded-lg border border-red-100 bg-red-50/20 text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition"
                    title="Remove Stop"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Route Info & Live Statistics */}
      {selectedPlaces.length > 0 && (
        <div className="bg-travel-bg-soft rounded-xl border border-travel-accent-gray/80 p-4 space-y-2.5 text-2xs text-travel-text-secondary">
          <div className="flex justify-between border-b border-travel-accent-gray/60 pb-2">
            <span className="text-travel-text-muted">Travel Sequence</span>
            <span className="font-semibold text-travel-text-primary flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-travel-text-muted" />
              {startLocation || 'Start'} ➜ {selectedPlaces.map(p => p.name).join(' ➜ ')} ➜ {destination || 'End'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between pb-1">
              <span className="text-travel-text-muted">Attractions Cost</span>
              <span className="font-bold text-travel-text-primary">
                {symbol}{totalEstimatedCost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-travel-text-muted">Visiting Time</span>
              <span className="font-bold text-travel-text-primary">
                {estimatedHours} Hours
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Action Button */}
      <button
        onClick={onFinalize}
        disabled={selectedPlaces.length === 0 || isFinalizing}
        className="w-full btn-premium btn-premium-primary"
      >
        <Sparkles className="h-4.5 w-4.5 text-travel-accent-blue" />
        {isFinalizing ? 'Optimizing & Compiling route...' : 'Finalize & Generate Optimized Itinerary'}
      </button>
    </div>
  );
}

import React from 'react';
import { Clock, Tag, MapPin, Navigation, Compass, AlertCircle, PlusCircle } from 'lucide-react';

const DEFAULT_ATTRACTION_IMAGE = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop";

export default function SuggestionCards({ attractions, selectedPlaces = [], onAddPlace, onRemovePlace, currency = "INR" }) {
  if (!attractions || attractions.length === 0) return null;

  const symbol = currency === "INR" ? "₹" : "$";

  return (
    <div className="space-y-6 mt-12 border-t border-travel-accent-gray pt-10">
      
      {/* Invitation Header */}
      <div className="rounded-2xl border border-travel-accent-gray bg-travel-bg-white p-6 shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-full">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-travel-accent-gray text-travel-button-dark">
            <Compass className="h-5.5 w-5.5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-travel-text-primary">
              Would you like to add nearby attractions?
            </h3>
            <p className="text-xs text-travel-text-muted mt-1">
              Hover over each attraction card to reveal hidden gems, visitor tips, distance, and nearby activities.
            </p>
          </div>
        </div>
      </div>

      {/* Suggestion Cards Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {attractions.map((attraction, idx) => {
          const nameKey = attraction.name?.toLowerCase().trim();
          const imageUrl = attraction.image_url || DEFAULT_ATTRACTION_IMAGE;
          const isAdded = selectedPlaces.some(p => p.name?.toLowerCase().trim() === nameKey);

          return (
            <div 
              key={idx}
              className="group relative overflow-hidden rounded-2xl border border-travel-accent-gray bg-travel-bg-white shadow-premium transition-all duration-300 hover:shadow-premium-hover hover:scale-[1.02] flex flex-col h-auto cursor-pointer"
            >
              
              {/* Image banner */}
              <div className="relative h-44 w-full overflow-hidden">
                <img 
                  src={imageUrl} 
                  alt={attraction.name} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 font-display text-sm font-semibold text-white tracking-tight">
                  {attraction.name}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 flex flex-col flex-1">
                
                {/* Summary */}
                <p className="text-xs text-travel-text-muted leading-relaxed mb-4">
                  {attraction.summary}
                </p>

                {/* Duration & Cost */}
                <div className="grid grid-cols-2 gap-3 mb-1 text-xs border-b border-travel-accent-gray pb-4">
                  <div className="flex items-center gap-1.5 text-travel-text-secondary">
                    <Clock className="h-4 w-4 text-travel-text-muted shrink-0" />
                    <span>{attraction.visit_duration}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-travel-text-secondary">
                    <span className="font-semibold text-travel-text-primary">Est. Cost:</span>
                    <span>{attraction.local_cost === 0 ? "Free" : `${symbol}${attraction.local_cost}`}</span>
                  </div>
                </div>

                {/* Add to Trip Action Buttons */}
                <div className="mt-4 mb-2 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isAdded) {
                        onRemovePlace(attraction);
                      } else {
                        onAddPlace(attraction);
                      }
                    }}
                    className={`w-full btn-premium ${
                      isAdded ? 'btn-premium-success-outline' : 'btn-premium-primary'
                    }`}
                  >
                    {isAdded ? (
                      <span>Remove Stop</span>
                    ) : (
                      <>
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Add to Trip</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Hover Expansion Panel - Premium easing timing curve */}
                <div className="max-h-0 opacity-0 overflow-hidden pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:max-h-[600px] group-hover:opacity-100 group-hover:pointer-events-auto mt-0 group-hover:mt-4 space-y-4">
                  
                  {/* Detailed Description */}
                  <div className="text-xs text-travel-text-secondary leading-relaxed border-t border-dashed border-travel-accent-gray pt-3">
                    <p>{attraction.description}</p>
                  </div>

                  {/* Highlights Tags */}
                  {attraction.highlights && (
                    <div className="flex flex-wrap gap-1.5">
                      {attraction.highlights.map((h, hIdx) => (
                        <span key={hIdx} className="inline-flex items-center gap-1 rounded-lg bg-travel-bg-soft border border-travel-accent-gray px-2 py-0.5 text-3xs font-medium text-travel-text-secondary">
                          <Tag className="h-2.5 w-2.5 opacity-60" />
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Travel Stats Grid */}
                  <div className="grid grid-cols-1 gap-2 bg-travel-bg-soft p-3 rounded-xl border border-travel-accent-gray/60 text-3xs text-travel-text-secondary">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-travel-text-muted mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-travel-text-primary block">Distance</span>
                        <span>{attraction.distance}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Navigation className="h-3.5 w-3.5 text-travel-text-muted mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-travel-text-primary block">Local Transit</span>
                        <span>{attraction.local_transport}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-travel-text-muted mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-travel-text-primary block">Best Time to Visit</span>
                        <span>{attraction.best_time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Facts Panel */}
                  {attraction.quick_facts && (
                    <div className="border-t border-dashed border-travel-accent-gray pt-3">
                      <span className="text-3xs uppercase tracking-wider font-bold text-travel-text-muted block mb-1.5">
                        Quick Facts
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(attraction.quick_facts).map(([key, val]) => (
                          <div key={key} className="bg-travel-bg-gray p-2 rounded-lg border border-travel-accent-gray/50 text-3xs">
                            <span className="text-travel-text-muted block capitalize">{key}</span>
                            <span className="font-semibold text-travel-text-primary block mt-0.5">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nearby Activities */}
                  {attraction.nearby_activities && (
                    <div className="border-t border-dashed border-travel-accent-gray pt-3">
                      <span className="text-3xs uppercase tracking-wider font-bold text-travel-text-muted block mb-1.5">
                        Nearby Activities
                      </span>
                      <ul className="text-3xs text-travel-text-secondary list-disc pl-4 space-y-1">
                        {attraction.nearby_activities.map((act, actIdx) => (
                          <li key={actIdx}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Travel Tip */}
                  {attraction.tips && (
                    <div className="flex items-start gap-2 bg-travel-bg-soft border border-travel-accent-gray/80 p-3 rounded-xl">
                      <AlertCircle className="h-4 w-4 text-travel-button-dark mt-0.5 shrink-0" />
                      <div className="text-3xs text-travel-text-secondary leading-relaxed">
                        <span className="font-bold text-travel-text-primary block mb-0.5">Consultant Tip</span>
                        {attraction.tips}
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

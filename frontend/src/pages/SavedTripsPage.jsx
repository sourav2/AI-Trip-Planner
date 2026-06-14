import React, { useState } from 'react';
import { Bookmark, Calendar, Users, Trash2, Compass } from 'lucide-react';

export default function SavedTripsPage({ savedTrips, onDeleteTrip, onSelectTrip, setCurrentPage }) {
  const [selectedTripDetails, setSelectedTripDetails] = useState(null);

  const handleSelect = (trip) => {
    setSelectedTripDetails(trip);
  };

  const handleCloseDetails = () => {
    setSelectedTripDetails(null);
  };

  const handleLoadInWorkspace = (trip) => {
    onSelectTrip(trip);
    setCurrentPage('planner');
  };

  return (
    <div className="space-y-8 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="border-b border-travel-accent-gray pb-5">
        <h1 className="font-display text-2xl font-extrabold text-travel-text-primary">Saved Journeys</h1>
        <p className="text-2xs text-travel-text-muted mt-1.5">Your catalog of curated travel schedules, budget plans, and routing choices.</p>
      </div>

      {savedTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-travel-accent-gray rounded-2xl bg-travel-bg-white p-8 max-w-md mx-auto">
          <Bookmark className="h-12 w-12 text-travel-text-muted opacity-40 mb-4" />
          <h3 className="text-sm font-bold text-travel-text-primary mb-1.5">No Saved Trips Yet</h3>
          <p className="text-2xs text-travel-text-muted mb-6 leading-relaxed">
            Generate custom travel guides using the AI Planner and tap "Save Trip" to store them in your collection.
          </p>
          <button
            onClick={() => setCurrentPage('planner')}
            className="btn-premium btn-premium-primary"
          >
            Start Planning
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* List Section */}
          <div className="lg:col-span-1 space-y-4">
            <span className="text-3xs font-bold uppercase tracking-wider text-travel-text-muted block px-1">
              Active Saved Plans ({savedTrips.length})
            </span>
            <div className="space-y-3">
              {savedTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => handleSelect(trip)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 text-left ${
                    selectedTripDetails?.id === trip.id
                      ? 'border-travel-button-dark bg-travel-accent-gray/45 shadow-sm'
                      : 'border-travel-accent-gray bg-travel-bg-white hover:bg-travel-bg-gray hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-xs font-bold text-travel-text-primary truncate">
                      {trip.destination}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedTripDetails?.id === trip.id) {
                          setSelectedTripDetails(null);
                        }
                        onDeleteTrip(trip.id);
                      }}
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition"
                      title="Delete trip"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-3xs text-travel-text-muted mb-3 border-b border-travel-accent-gray/60 pb-2.5">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{trip.total_days} Days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{trip.travelers} Guests</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xs text-travel-text-muted uppercase tracking-wider font-semibold block">Total Budget</span>
                      <span className="text-2xs font-bold text-travel-text-primary">
                        ₹{trip.budget?.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-3xs font-semibold text-travel-button-dark bg-travel-accent-gray px-2 py-0.5 rounded capitalize">
                      {trip.comfort_level}
                    </span>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Details Preview Section */}
          <div className="lg:col-span-2">
            {selectedTripDetails ? (
              <div className="rounded-2xl border border-travel-accent-gray bg-travel-bg-white p-6 shadow-premium space-y-6">
                
                {/* Preview Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-travel-accent-gray pb-5">
                  <div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-travel-button-dark bg-travel-accent-gray px-2.5 py-1 rounded">
                      Collection Preview
                    </span>
                    <h2 className="text-lg font-bold text-travel-text-primary mt-2">
                      Trip to {selectedTripDetails.destination}
                    </h2>
                    <p className="text-2xs text-travel-text-muted mt-0.5">
                      Curated itinerary breakdown and daily routes.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoadInWorkspace(selectedTripDetails)}
                      className="btn-premium btn-premium-primary"
                    >
                      Load in AI Workspace
                    </button>
                    <button
                      onClick={handleCloseDetails}
                      className="btn-premium btn-premium-secondary"
                    >
                      Close Preview
                    </button>
                  </div>
                </div>

                {/* Regional overview list */}
                <div className="space-y-4">
                  <h3 className="text-2xs font-bold uppercase tracking-wider text-travel-text-muted">
                    Regions Covered ({selectedTripDetails.regions?.length || 0})
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTripDetails.regions?.map((reg, idx) => (
                      <div key={idx} className="rounded-xl border border-travel-accent-gray p-4 bg-travel-bg-gray">
                        <h4 className="text-2xs font-bold text-travel-text-primary mb-1">
                          {reg.region_name}
                        </h4>
                        <p className="text-3xs text-travel-text-muted leading-relaxed mb-3">
                          {reg.quick_summary}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-3xs text-travel-text-secondary border-t border-travel-accent-gray/60 pt-2">
                          <div>
                            <span className="font-semibold block text-travel-text-muted">Transport</span>
                            <span className="capitalize">{reg.transport}</span>
                          </div>
                          <div>
                            <span className="font-semibold block text-travel-text-muted">Stay Type</span>
                            <span className="capitalize">{reg.hotel_type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-travel-accent-gray bg-travel-bg-white rounded-2xl p-8">
                <Compass className="h-10 w-10 text-travel-text-muted opacity-40 mb-3 animate-spin-slow" />
                <h3 className="text-xs font-bold text-travel-text-primary mb-1">Select a Trip</h3>
                <p className="text-2xs text-travel-text-muted max-w-xs">
                  Click any plan in your saved collections on the left sidebar to preview its details.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

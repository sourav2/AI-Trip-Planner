import React from 'react';
import { 
  Compass, Bookmark, MessageSquare, PlusCircle, Trash2, X, Shield
} from 'lucide-react';

export default function Sidebar({ 
  isOpen, 
  onClose, 
  currentPage, 
  setCurrentPage, 
  savedTrips = [], 
  onDeleteTrip,
  onSelectTrip,
  
  // Keep unused props to avoid breaking App.jsx mounts
  activeTrip,
  setActiveTrip,
  onGenerateFromForm,
  itineraryLoading,
  selectedPlaces = []
}) {
  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: Compass },
    { id: 'planner', label: 'AI Planner OS', icon: MessageSquare },
    { id: 'saved', label: 'My Saved Trips', icon: Bookmark },
    { id: 'developer', label: 'API Diagnostics', icon: Shield }
  ];

  return (
    <>
      {/* Drawer Overlay */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 z-[9998] bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-[9998] flex w-80 sm:w-96 flex-col border-r border-travel-accent-gray bg-white px-5 py-5 transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Close */}
        <div className="flex items-center justify-between pb-3 border-b border-travel-accent-gray">
          <span className="font-display font-extrabold text-travel-text-primary text-sm uppercase tracking-wider">Antigravity Menu</span>
          <button 
            onClick={onClose} 
            className="rounded-xl p-1.5 border border-travel-accent-gray hover:border-black transition active:scale-95 cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Global Page Navigation */}
        <div className="mt-4 flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  onClose();
                }}
                className={`flex items-center gap-3 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-travel-accent-green/50 text-[#16A34A] border border-travel-accent-green'
                    : 'text-travel-text-muted hover:bg-travel-bg-soft hover:text-travel-text-primary'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <hr className="my-4 border-travel-accent-gray" />

        {/* Saved Plan Collections List */}
        <div className="flex flex-1 flex-col min-h-0 text-left">
          <div className="flex items-center justify-between mb-3 px-2 mt-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-travel-text-muted">
              Recent Plan Collections
            </span>
            <button
              onClick={() => {
                setCurrentPage('planner');
                onClose();
              }}
              className="text-[#16A34A] hover:text-[#15803D]"
              title="Plan new trip"
            >
              <PlusCircle className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
            {savedTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-travel-text-muted">
                <Bookmark className="h-8 w-8 mb-2 opacity-30 text-travel-text-muted" />
                No saved itineraries yet.
              </div>
            ) : (
              savedTrips.map((trip) => (
                <div
                  key={trip.id || trip.destination + trip.budget}
                  className="group relative flex items-center justify-between rounded-xl border border-travel-accent-gray hover:border-[#16A34A] bg-travel-bg-gray p-3 transition-all duration-200 hover:shadow-xs"
                >
                  <button
                    onClick={() => {
                      onSelectTrip(trip);
                      setCurrentPage('planner');
                      onClose();
                    }}
                    className="flex flex-col items-start text-left flex-1 min-w-0"
                  >
                    <span className="text-xs font-black truncate text-travel-text-primary w-full">
                      {trip.destination}
                    </span>
                    <span className="text-[10px] text-travel-text-muted font-semibold mt-0.5">
                      {trip.total_days} Days • {trip.travelers} Guests
                    </span>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTrip(trip.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-opacity cursor-pointer"
                    title="Delete plan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Brand Info */}
        <div className="mt-auto pt-4 border-t border-travel-accent-gray text-center text-[10px] text-travel-text-muted font-bold">
          <p>© 2026 Antigravity SaaS Inc.</p>
          <p className="mt-0.5">Premium Intelligent Travel Guide</p>
        </div>
      </aside>
    </>
  );
}

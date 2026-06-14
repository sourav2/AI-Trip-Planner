import React from 'react';
import { Plane, Train, Car, Bus, ArrowRight, CheckCircle, CircleDot } from 'lucide-react';

const getIcon = (iconName) => {
  switch (iconName?.toLowerCase()) {
    case 'plane':
    case 'flight':
      return Plane;
    case 'train':
      return Train;
    case 'bus':
      return Bus;
    case 'car':
    case 'cab':
    case 'shared_taxi':
    case 'rental':
    default:
      return Car;
  }
}

const isRemotePlace = (dest) => {
  if (!dest) return false;
  const d = dest.toLowerCase();
  return d.includes('meghalaya') || d.includes('shillong') || d.includes('leh') || d.includes('ladakh') || d.includes('munnar') || d.includes('wayanad') || d.includes('cherrapunji') || d.includes('spiti') || d.includes('kasol') || d.includes('manali') || d.includes('coorg');
};

export default function TransportCard({ 
  startLocation, 
  destination, 
  comfortLevel, 
  transportPreference,
  currency = 'INR',
  options = null,
  selectedOption = 'fastest',
  onSelectOption = null
}) {
  const symbol = currency === 'INR' ? '₹' : '$';

  // Fallback modes if options are not passed from backend
  const fallbackModes = {
    fastest: {
      name: 'Flight + Cab Transfer',
      icon: 'plane',
      tag: 'Fastest Route',
      duration: '4 - 6 Hours',
      comfortRating: '★★★★★',
      estCost: comfortLevel === 'luxury' ? 14000 : (comfortLevel === 'budget' ? 7500 : 9500)
    },
    cheapest: {
      name: 'Express Train + Bus Link',
      icon: 'train',
      tag: 'Most Economic',
      duration: '18 - 24 Hours',
      comfortRating: '★★★☆☆',
      estCost: comfortLevel === 'luxury' ? 4200 : (comfortLevel === 'budget' ? 1800 : 2800)
    },
    comfortable: {
      name: 'Private Intercity Cab',
      icon: 'car',
      tag: 'Best Flexibility',
      duration: '12 - 14 Hours',
      comfortRating: '★★★★☆',
      estCost: comfortLevel === 'luxury' ? 12000 : (comfortLevel === 'budget' ? 6000 : 8500)
    }
  };

  const activeOptions = options && Object.keys(options).length > 0 ? options : fallbackModes;

  const isRemote = isRemotePlace(destination);

  const rawModes = Object.entries(activeOptions).map(([key, val]) => {
    return {
      id: key,
      name: val.name,
      icon: getIcon(val.icon || key),
      duration: val.duration,
      estCost: val.estCost || val.total_trip_cost || 0,
      comfortRating: val.comfortRating,
      tag: val.tag || (key.charAt(0).toUpperCase() + key.slice(1))
    };
  });

  const modes = isRemote
    ? rawModes.filter(m => {
        const nameLower = m.name.toLowerCase();
        const tagLower = m.tag.toLowerCase();
        const idLower = m.id.toLowerCase();
        return !(nameLower.includes('flight') || nameLower.includes('plane') || nameLower.includes('train') || nameLower.includes('rail') ||
                 tagLower.includes('flight') || tagLower.includes('train') ||
                 idLower.includes('flight') || idLower.includes('plane') || idLower.includes('train'));
      })
    : rawModes;

  if (isRemote && modes.length < 2) {
    const hasBus = modes.some(m => m.name.toLowerCase().includes('bus') || m.id === 'bus');
    const hasCab = modes.some(m => m.name.toLowerCase().includes('cab') || m.name.toLowerCase().includes('car') || m.id === 'comfortable');

    if (!hasCab) {
      modes.unshift({
        id: 'comfortable',
        name: 'Private Intercity Cab',
        icon: Car,
        duration: '10 - 12 Hours',
        estCost: comfortLevel === 'luxury' ? 12000 : (comfortLevel === 'budget' ? 6000 : 8500),
        comfortRating: '★★★★☆',
        tag: 'Best Flexibility'
      });
    }
    if (!hasBus) {
      modes.push({
        id: 'bus',
        name: 'Luxury Sleeper Bus',
        icon: Bus,
        duration: '12 - 14 Hours',
        estCost: comfortLevel === 'luxury' ? 3000 : (comfortLevel === 'budget' ? 1200 : 1800),
        comfortRating: '★★★☆☆',
        tag: 'Budget Road Trip'
      });
    }
  }

  return (
    <div className="rounded-2xl border border-travel-accent-gray bg-travel-bg-white p-5 sm:p-6 shadow-premium">
      
      {/* Route Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-travel-accent-gray pb-4 mb-5 gap-4">
        <div>
          <h3 className="text-base font-bold text-travel-text-primary">Transport Routes & Options</h3>
          <p className="text-xs text-travel-text-muted mt-0.5">Select a route option to dynamically update map and budget details</p>
        </div>
        
        <div className="flex items-center gap-2.5 bg-travel-accent-gray/50 border border-travel-accent-gray px-3.5 py-1.5 rounded-full text-xs font-semibold text-travel-text-primary self-start sm:self-auto">
          <span>{startLocation || 'Source'}</span>
          <ArrowRight className="h-3 w-3 text-travel-text-muted" />
          <span>{destination || 'Destination'}</span>
        </div>
      </div>

      {/* Modes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedOption === mode.id;
          return (
            <div 
              key={mode.id}
              onClick={() => onSelectOption && onSelectOption(mode.id)}
              className={`relative rounded-xl border p-5 flex flex-col transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-premium-hover ${
                isSelected 
                  ? 'border-emerald-600 border-2 bg-emerald-50/10 shadow-md ring-2 ring-emerald-600/10' 
                  : 'border-travel-accent-gray bg-travel-bg-white hover:bg-travel-bg-soft hover:border-travel-text-muted'
              }`}
            >
              {/* Mode Header Flex Container */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isSelected ? 'bg-emerald-600 text-white' : 'bg-travel-bg-soft text-travel-text-muted border border-travel-accent-gray'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-travel-text-muted block truncate">{mode.tag}</span>
                    <h4 className="text-sm font-bold text-travel-text-primary truncate mt-0.5">{mode.name}</h4>
                  </div>
                </div>
                
                <div className="shrink-0 mt-1">
                  {isSelected ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <CircleDot className="h-5 w-5 text-travel-text-muted opacity-40 hover:opacity-75" />
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs mt-auto">
                <div className="flex justify-between border-b border-travel-accent-gray/60 pb-1.5">
                  <span className="text-travel-text-muted">Estimated Duration</span>
                  <span className="font-semibold text-travel-text-primary">{mode.duration}</span>
                </div>
                <div className="flex justify-between border-b border-travel-accent-gray/60 pb-1.5">
                  <span className="text-travel-text-muted">Comfort Index</span>
                  <span className="text-amber-500 font-semibold">{mode.comfortRating}</span>
                </div>
                <div className="flex justify-between pt-1.5">
                  <span className="text-travel-text-muted">Est. Cost (Total)</span>
                  <span className="text-sm font-bold text-travel-text-primary">
                    {symbol}{mode.estCost.toLocaleString()}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

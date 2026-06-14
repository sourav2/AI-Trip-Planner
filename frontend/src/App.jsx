import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import PlannerPage from './pages/PlannerPage';
import SavedTripsPage from './pages/SavedTripsPage';
import PlaceDetailsPage from './pages/PlaceDetailsPage';
import DeveloperTestPage from './pages/DeveloperTestPage';
import { useLocalStorage } from './hooks/useLocalStorage';
import { travelApi } from './services/api';
import { useTripCart } from './context/TripCartContext';
import TripCartDrawer from './components/TripCartDrawer';
import ChatInterface from './components/ChatInterface';
import { Compass, X, MessageSquare } from 'lucide-react';

const MOCK_MEGHALAYA_TRIP = {
  id: 'meghalaya-default',
  destination: 'Meghalaya',
  start_location: 'Mumbai, Maharashtra',
  total_days: 7,
  travelers: 2,
  budget: 25000,
  comfort_level: 'moderate',
  transport_preference: 'Road Trip',
  currency: 'INR',
  start_coords: [19.0760, 72.8777],
  dest_coords: [25.5788, 91.8833],
  budget_tips: [
    "This route is optimized for less backtracking",
    "Best waterfalls during monsoon season",
    "Balanced mix of adventure and relaxation",
    "Within your budget of ₹25,000"
  ],
  transport_options: {
    'Road Trip': {
      regions: [
        {
          region_name: 'Shillong',
          region_coords: [25.5788, 91.8833],
          quick_summary: 'Pine-covered hills & waterfalls.',
          hotel_type: 'Boutique Homestay',
          transport: 'Road Trip',
          estimated_cost: 4800,
          places: ['Laitlum Canyon', 'Shillong Peak', 'Elephant Falls'],
          activities: ['Sightseeing', 'Shopping', 'Local Food'],
          food_recommendations: ['Jadoh', 'Dohneiiong', 'Trattoria'],
          timeline: [
            {
              day: 1,
              title: 'Arrival & check-in',
              activities: [
                { time: '12:00 PM', activity: 'Arrive at Guwahati Airport, drive to Shillong (cab)', cost: 1800 },
                { time: '03:30 PM', activity: 'Check-in to Boutique Homestay', cost: 0 },
                { time: '05:00 PM', activity: 'Explore Police Bazar local markets', cost: 200 }
              ]
            },
            {
              day: 2,
              title: 'Shillong Sightseeing',
              activities: [
                { time: '09:00 AM', activity: 'Visit Laitlum Canyon viewpoints', cost: 100 },
                { time: '01:00 PM', activity: 'Lunch at Cafe Shillong', cost: 600 },
                { time: '03:00 PM', activity: 'Explore Shillong Peak & Elephant Falls', cost: 150 }
              ]
            }
          ]
        },
        {
          region_name: 'Sohra (Cherrapunji)',
          region_coords: [25.2702, 91.7324],
          quick_summary: 'Dramatic cliffs, living root bridges.',
          hotel_type: 'Scenic Cottage',
          transport: 'Road Trip',
          estimated_cost: 7200,
          places: ['Wei Sawdong', 'Nohkalikai Falls', 'Mawsmai Cave'],
          activities: ['Trekking', 'Cave Exploration'],
          food_recommendations: ['Orange Roots', 'Jiva Resort dining'],
          timeline: [
            {
              day: 3,
              title: 'Cherrapunji Sightseeing',
              activities: [
                { time: '09:00 AM', activity: 'Drive to Sohra, visit Nohkalikai Falls', cost: 300 },
                { time: '02:00 PM', activity: 'Explore Mawsmai Cave limestone trails', cost: 200 },
                { time: '04:30 PM', activity: 'Enjoy views at Eco Park Cherrapunji', cost: 100 }
              ]
            },
            {
              day: 4,
              title: 'Waterfalls & Trekking',
              activities: [
                { time: '08:00 AM', activity: 'Trek down to Wei Sawdong three-tiered falls', cost: 200 },
                { time: '11:30 AM', activity: 'Double-Decker Living Root Bridge trek (Nongriat)', cost: 500 },
                { time: '05:00 PM', activity: 'Relax at Scenic Cottage in Sohra', cost: 0 }
              ]
            }
          ]
        },
        {
          region_name: 'Dawki & Shnongpdeng',
          region_coords: [25.1500, 92.0167],
          quick_summary: 'Crystal clear rivers & camping.',
          hotel_type: 'Riverfront Camp',
          transport: 'Road Trip',
          estimated_cost: 5600,
          places: ['Dawki Bridge', 'Umngot River', 'Krang Suri Falls'],
          activities: ['Boating', 'Kayaking', 'Camping'],
          food_recommendations: ['Local fish curry meals'],
          timeline: [
            {
              day: 5,
              title: 'Sohra to Dawki',
              activities: [
                { time: '09:00 AM', activity: 'Scenic drive to Dawki border town', cost: 1200 },
                { time: '12:00 PM', activity: 'Boating on crystal clear Umngot River', cost: 600 },
                { time: '03:00 PM', activity: 'Check-in to Shnongpdeng riverside camp', cost: 0 },
                { time: '05:00 PM', activity: 'Kayaking & swimming in clean water', cost: 400 }
              ]
            },
            {
              day: 6,
              title: 'Riverside Adventures',
              activities: [
                { time: '09:30 AM', activity: 'Zip-lining and cliff jumping in Shnongpdeng', cost: 800 },
                { time: '01:00 PM', activity: 'Drive to breathtaking Krang Suri blue waterfall', cost: 900 },
                { time: '04:30 PM', activity: 'Relax by campfire at Shnongpdeng', cost: 200 }
              ]
            }
          ]
        },
        {
          region_name: 'Nongjrong Valley',
          region_coords: [25.4320, 92.1220],
          quick_summary: 'Majestic clouds valley sunrise view.',
          hotel_type: 'None (Guwahati departure)',
          transport: 'Road Trip',
          estimated_cost: 2800,
          places: ['Nongjrong Sunrise Point'],
          activities: ['Sunrise photography', 'Return drive'],
          food_recommendations: ['Highway dhabas'],
          timeline: [
            {
              day: 7,
              title: 'Nongjrong Clouds View & Departure',
              activities: [
                { time: '04:00 AM', activity: 'Early drive to Nongjrong for sunrise above cloud sea', cost: 1000 },
                { time: '09:00 AM', activity: 'Return drive to Guwahati Airport', cost: 1500 }
              ]
            }
          ]
        }
      ],
      budget_utilization: {
        transport: { percentage: 42, amount: 10200, description: "Cab rentals, airport transit, local drives" },
        accommodation: { percentage: 28, amount: 6800, description: "Homestays, resorts & camps" },
        food: { percentage: 18, amount: 4500, description: "Local cuisines, café visits & highway food" },
        activities: { percentage: 9, amount: 2200, description: "Boating, zip-lining, park entry & trekking fees" },
        savings: { percentage: 3, amount: 650, description: "Emergency buffer savings" }
      },
      nearby_attractions: [
        {
          name: 'Laitlum Canyon',
          image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop',
          coords: [25.4503, 91.9567],
          lat: 25.4503,
          lon: 91.9567,
          quick_facts: { Type: 'Scenic Viewpoint', Rating: '4.8', Distance: '25 km' },
          summary: 'Majestic amphitheater canyon view.',
          description: 'Stunning viewpoint overlooking deep gorge valleys.',
          highlights: ['Scenic', 'Must Visit', 'Valley View'],
          distance: '~25 km from Shillong',
          local_transport: 'Cab',
          best_time: 'July - Oct',
          nearby_activities: ['Trekking', 'Photography'],
          tips: 'Go early in the morning to avoid fog covering the valley.',
          local_cost: 50
        },
        {
          name: 'Sohra (Cherrapunji)',
          image_url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop',
          coords: [25.2702, 91.7324],
          lat: 25.2702,
          lon: 91.7324,
          quick_facts: { Type: 'Waterfalls • Caves', Rating: '4.7', Distance: '55 km' },
          summary: 'The rainiest spot on Earth.',
          description: 'Vibrant green valleys, limestone caves, and waterfalls.',
          highlights: ['Nature', 'Popular', 'Waterfalls'],
          distance: '~55 km from Shillong',
          local_transport: 'Bus/Cab',
          best_time: 'June - Sept',
          nearby_activities: ['Cave exploration', 'Waterfall viewing'],
          tips: 'Always carry an umbrella or raincoat since it rains frequently.',
          local_cost: 100
        },
        {
          name: 'Wei Sawdong Falls',
          image_url: 'https://images.unsplash.com/photo-1433832597046-4f10e10ac764?q=80&w=600&auto=format&fit=crop',
          coords: [25.2891, 91.6841],
          lat: 25.2891,
          lon: 91.6841,
          quick_facts: { Type: 'Waterfall', Rating: '4.9', Distance: '60 km' },
          summary: 'Three-tiered emerald pool waterfall.',
          description: 'Challenging but extremely rewarding trek down to a spectacular three-tiered waterfall.',
          highlights: ['Nature', 'Treacherous Path', 'Emerald Pool'],
          distance: '~60 km from Shillong',
          local_transport: 'Private Cab',
          best_time: 'Oct - Feb',
          nearby_activities: ['Hiking', 'Swimming'],
          tips: 'The descent is very steep. Wear shoes with good grip.',
          local_cost: 50
        },
        {
          name: 'Dawki',
          image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=600&auto=format&fit=crop',
          coords: [25.1500, 92.0167],
          lat: 25.1500,
          lon: 92.0167,
          quick_facts: { Type: 'River • Boating', Rating: '4.6', Distance: '80 km' },
          summary: 'Crystal clear water in Umngot River.',
          description: 'Scenic boat rides in water so clean boats look like they\'re floating in air.',
          highlights: ['Boating', 'Border town', 'Popular'],
          distance: '~80 km from Shillong',
          local_transport: 'Cab',
          best_time: 'Nov - March',
          nearby_activities: ['Boating', 'Photography', 'Border crossing check'],
          tips: 'Winter is the best time to see the transparent water.',
          local_cost: 600
        },
        {
          name: 'Shnongpdeng',
          image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=600&auto=format&fit=crop',
          coords: [25.1764, 92.0125],
          lat: 25.1764,
          lon: 92.0125,
          quick_facts: { Type: 'River Island', Rating: '4.7', Distance: '90 km' },
          summary: 'Adventures by the crystal clear river.',
          description: 'Famous for river activities, camping, zip-lining, and clear water kayaking.',
          highlights: ['Offbeat', 'Adventure', 'Riverside'],
          distance: '~90 km from Shillong',
          local_transport: 'Cab',
          best_time: 'Nov - Feb',
          nearby_activities: ['Kayaking', 'Cliff jumping', 'Camping'],
          tips: 'Stay in a tent overnight right next to the riverbed.',
          local_cost: 800
        },
        {
          name: 'Mawsmai Cave',
          image_url: 'https://images.unsplash.com/photo-1507163879400-419f50e128c9?q=80&w=600&auto=format&fit=crop',
          coords: [25.2570, 91.7225],
          lat: 25.2570,
          lon: 91.7225,
          quick_facts: { Type: 'Cave', Rating: '4.5', Distance: '55 km' },
          summary: 'Limestone fossils and rock formations.',
          description: 'A popular, well-lit limestone cave showing spectacular rock pillars.',
          highlights: ['Adventure', 'Cave Trails', 'Limestone'],
          distance: '~55 km from Shillong',
          local_transport: 'Cab',
          best_time: 'All seasons',
          nearby_activities: ['Caving', 'Fossil hunting'],
          tips: 'It can be narrow in some sections, not recommended for claustrophobic visitors.',
          local_cost: 100
        },
        {
          name: 'Krang Suri Falls',
          image_url: 'https://images.unsplash.com/photo-1433832597046-4f10e10ac764?q=80&w=600&auto=format&fit=crop',
          coords: [25.3218, 92.5435],
          lat: 25.3218,
          lon: 92.5435,
          quick_facts: { Type: 'Waterfall', Rating: '4.8', Distance: '80 km' },
          summary: 'Breathtaking turquoise water pool.',
          description: 'One of the most photogenic waterfalls in West Jaintia Hills with deep blue water.',
          highlights: ['Nature', 'Turquoise Pool', 'Popular'],
          distance: '~80 km from Shillong',
          local_transport: 'Private Cab',
          best_time: 'Sept - April',
          nearby_activities: ['Swimming', 'Boating'],
          tips: 'Life jackets are mandatory for swimming in the pool.',
          local_cost: 150
        },
        {
          name: 'Nongjrong',
          image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop',
          coords: [25.4320, 92.1220],
          lat: 25.4320,
          lon: 92.1220,
          quick_facts: { Type: 'Valley View', Rating: '4.7', Distance: '60 km' },
          summary: 'Stunning sunrise above sea of clouds.',
          description: 'High hilltop overlooking a valley that fills with clouds every morning.',
          highlights: ['Offbeat', 'Sunrise', 'Foggy Valley'],
          distance: '~60 km from Shillong',
          local_transport: 'Private Cab',
          best_time: 'Oct - April',
          nearby_activities: ['Photography', 'Camping'],
          tips: 'Reach the viewpoint before 5:30 AM to see the sunrise.',
          local_cost: 0
        },
        {
          name: 'Nongriat',
          image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop',
          coords: [25.2798, 91.6702],
          lat: 25.2798,
          lon: 91.6702,
          quick_facts: { Type: 'Trek • Roots', Rating: '4.9', Distance: '65 km' },
          summary: 'Double Decker Living Root Bridge.',
          description: 'Trek through lush forest down 3,000 steps to see the unique living root structures.',
          highlights: ['Adventure', 'Roots', 'Trekking'],
          distance: '~65 km from Shillong',
          local_transport: 'Trek from Tyrna',
          best_time: 'All year',
          nearby_activities: ['Trekking', 'Hot spring bath'],
          tips: 'It is a strenuous trek. Stay fit and carry sufficient drinking water.',
          local_cost: 100
        }
      ]
    }
  }
};

export default function App() {
  const {
    selectedPlaces,
    isCartOpen,
    setIsCartOpen,
    addPlace,
    removePlace,
    reorderPlaces,
    clearCart
  } = useTripCart();

  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/place/')) return 'place';
    if (path === '/saved') return 'saved';
    if (path === '/planner') return 'planner';
    if (path === '/developer') return 'developer';
    return 'home';
  });
  
  const [selectedPlaceGuide, setSelectedPlaceGuide] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/place/')) {
      return decodeURIComponent(path.substring('/place/'.length));
    }
    return '';
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [startLocation, setStartLocation] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState(4);
  const [travelers, setTravelers] = useState(2);
  const [budgetInput, setBudgetInput] = useState('');
  const [travelStyle, setTravelStyle] = useState('');
  const [transportPreference, setTransportPreference] = useState('');
  const [interests, setInterests] = useState([]);
  const [additionalPrefs, setAdditionalPrefs] = useState('');
  const [savedTrips, setSavedTrips] = useLocalStorage('saved_trips', []);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [downloadTrigger, setDownloadTrigger] = useState(0);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [itineraryError, setItineraryError] = useState(null);
  const [lastFormData, setLastFormData] = useState(null);

  // Synchronize history popping back and forward
  React.useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/place/')) {
        setSelectedPlaceGuide(decodeURIComponent(path.substring('/place/'.length)));
        setCurrentPage('place');
      } else if (path === '/saved') {
        setCurrentPage('saved');
      } else if (path === '/planner') {
        setCurrentPage('planner');
      } else if (path === '/developer') {
        setCurrentPage('developer');
      } else {
        setCurrentPage('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page, place = '') => {
    let url = '/';
    if (page === 'planner') url = '/planner';
    else if (page === 'saved') url = '/saved';
    else if (page === 'developer') url = '/developer';
    else if (page === 'place' && place) url = `/place/${encodeURIComponent(place)}`;
    
    window.history.pushState({}, '', url);
    setCurrentPage(page);
    if (place) {
      setSelectedPlaceGuide(place);
    }
  };

  // Send a chat message to conversational API
  const handleSendChatMessage = async (text) => {
    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      const systemContext = `You are a travel assistant. Current context:
      - Selected Destination: ${destination || activeTrip?.destination || 'None'}
      - Total Days: ${duration || activeTrip?.total_days || 4}
      - Budget Limit: ₹${budgetInput || activeTrip?.budget || 20000}
      - Travelers: ${travelers || activeTrip?.travelers || 2}
      - Current Selected Stops (in cart): ${selectedPlaces.map(p => p.name).join(', ') || 'None'}
      - Active Route Regions: ${activeTrip?.regions?.map(r => r.region_name).join(', ') || 'None'}
      Ensure all your travel recommendations and itinerary edits are strictly within the geographical state of the selected destination (e.g. if planning Nagaland, suggest Kohima, Dzukou Valley, Kisama, etc. Never suggest places from other states like Taj Mahal, Amber Fort, Hawa Mahal, etc.).`;

      const requestMessages = [
        { role: 'system', content: systemContext },
        ...updatedMessages
      ];

      const response = travelApi.chat ? await travelApi.chat(requestMessages) : { role: "assistant", content: "Chat offline." };
      setChatMessages(prev => [...prev, response]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setChatLoading(false);
    }
  };

  // Generate itinerary from Preference Wizard Form
  const handleGenerateFromForm = async (formData) => {
    setItineraryLoading(true);
    setItineraryError(null);
    setLastFormData(formData);
    try {
      // 1. Generate full structured itinerary JSON
      const itinerary = await travelApi.generateItinerary({
        destination: formData.destination,
        startLocation: formData.startLocation,
        total_days: formData.totalDays,
        travelers: formData.travelers,
        budget: formData.budget,
        comfort_level: formData.comfortLevel,
        transport_preference: formData.transportPreference,
        place_types: formData.placeTypes
      });

      // 2. Fetch budget breakdown tips to enrich output
      const budgetDetails = await travelApi.getBudgetBreakdown({
        budget: formData.budget,
        travelers: formData.travelers,
        comfortLevel: formData.comfortLevel,
        destination: formData.destination
      });

      // Merge results
      const finalizedTrip = {
        ...itinerary,
        id: Math.random().toString(36).substr(2, 9), // unique ID
        start_location: formData.startLocation,
        budget_tips: budgetDetails.tips || []
      };

      setActiveTrip(finalizedTrip);
      
      // Update global cart
      clearCart();
      // Discovery cards should NOT be selected by default (Item 14)
      // We do not auto-add nearby_attractions to the cart on initial generation.
    } catch (error) {
      console.error("Failed to generate plan:", error);
      setItineraryError(
        error.message || "Connection failed. Please ensure the backend FastAPI service is running."
      );
    } finally {
      setItineraryLoading(false);
    }
  };

  // Save a generated itinerary to local storage
  const handleSaveTrip = (trip) => {
    if (!trip) return;
    // Check if already saved
    if (savedTrips.some(t => t.id === trip.id)) return;
    const tripToSave = {
      ...trip,
      selected_places: selectedPlaces
    };
    setSavedTrips(prev => [tripToSave, ...prev]);
  };

  // Delete a saved itinerary
  const handleDeleteTrip = (tripId) => {
    setSavedTrips(prev => prev.filter(t => t.id !== tripId));
  };

  // Select a trip to load in the workspace
  const handleSelectTrip = (trip) => {
    setActiveTrip(trip);
    clearCart();
    const places = trip.selected_places || trip.nearby_attractions || [];
    places.forEach(place => addPlace(place));
    setItineraryError(null);
    setCurrentPage('planner');
  };

  const handleFinalizeItinerary = async () => {
    if (!activeTrip) return;
    setIsFinalizing(true);
    setItineraryError(null);
    try {
      const finalized = await travelApi.finalizeItinerary({
        destination: activeTrip.destination,
        startLocation: activeTrip.start_location,
        totalDays: activeTrip.total_days,
        travelers: activeTrip.travelers,
        budget: activeTrip.budget,
        comfortLevel: activeTrip.comfort_level,
        transportPreference: activeTrip.transport_preference,
        selectedPlaces: selectedPlaces
      });

      const updatedTrip = {
        ...finalized,
        id: activeTrip.id,
        budget_tips: activeTrip.budget_tips || []
      };

      setActiveTrip(updatedTrip);
    } catch (error) {
      console.error("Failed to finalize itinerary:", error);
      setItineraryError("Failed to optimize and finalize itinerary. Please verify backend connection.");
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-travel-bg-soft">
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={(p) => navigateTo(p)} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenChat={() => setIsChatOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left Drawer Navigation */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          currentPage={currentPage}
          setCurrentPage={(p) => navigateTo(p)}
          savedTrips={savedTrips}
          onDeleteTrip={handleDeleteTrip}
          onSelectTrip={handleSelectTrip}
          // Form preference props
          activeTrip={activeTrip}
          setActiveTrip={setActiveTrip}
          onGenerateFromForm={handleGenerateFromForm}
          itineraryLoading={itineraryLoading}
          selectedPlaces={selectedPlaces}
          startLocation={startLocation}
          setStartLocation={setStartLocation}
          startCoords={startCoords}
          setStartCoords={setStartCoords}
          destination={destination}
          setDestination={setDestination}
          destCoords={destCoords}
          setDestCoords={setDestCoords}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          duration={duration}
          setDuration={setDuration}
          travelers={travelers}
          setTravelers={setTravelers}
          budgetInput={budgetInput}
          setBudgetInput={setBudgetInput}
          travelStyle={travelStyle}
          setTravelStyle={setTravelStyle}
          transportPreference={transportPreference}
          setTransportPreference={setTransportPreference}
          interests={interests}
          setInterests={setInterests}
          additionalPrefs={additionalPrefs}
          setAdditionalPrefs={setAdditionalPrefs}
        />

        {/* Main Dashboard Panel */}
        <main className="flex-1 pb-20">
          {currentPage === 'home' && (
            <HomePage setCurrentPage={(p) => navigateTo(p)} />
          )}

          {currentPage === 'planner' && (
            <PlannerPage
              activeTrip={activeTrip}
              setActiveTrip={setActiveTrip}
              onSaveTrip={handleSaveTrip}
              savedTrips={savedTrips}
              onDeleteTrip={handleDeleteTrip}
              chatMessages={chatMessages}
              onSendChatMessage={handleSendChatMessage}
              chatLoading={chatLoading}
              itineraryLoading={itineraryLoading}
              itineraryError={itineraryError}
              lastFormData={lastFormData}
              onGenerateFromForm={handleGenerateFromForm}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              downloadTrigger={downloadTrigger}
              selectedPlaces={selectedPlaces}
              setSelectedPlaces={reorderPlaces}
              onAddPlace={addPlace}
              onRemovePlace={removePlace}
              onReorderPlaces={reorderPlaces}
              onFinalize={handleFinalizeItinerary}
              isFinalizing={isFinalizing}
              onResetLoading={() => { setItineraryLoading(false); setIsFinalizing(false); }}
              onNavigateToPlace={(place) => navigateTo('place', place)}
              toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              // Lifted state props
              startLocation={startLocation}
              setStartLocation={setStartLocation}
              startCoords={startCoords}
              setStartCoords={setStartCoords}
              destination={destination}
              setDestination={setDestination}
              destCoords={destCoords}
              setDestCoords={setDestCoords}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              duration={duration}
              setDuration={setDuration}
              travelers={travelers}
              setTravelers={setTravelers}
              budgetInput={budgetInput}
              setBudgetInput={setBudgetInput}
              travelStyle={travelStyle}
              setTravelStyle={setTravelStyle}
              transportPreference={transportPreference}
              setTransportPreference={setTransportPreference}
              interests={interests}
              setInterests={setInterests}
              additionalPrefs={additionalPrefs}
              setAdditionalPrefs={setAdditionalPrefs}
            />
          )}

          {currentPage === 'saved' && (
            <SavedTripsPage
              savedTrips={savedTrips}
              onDeleteTrip={handleDeleteTrip}
              onSelectTrip={handleSelectTrip}
              setCurrentPage={(p) => navigateTo(p)}
            />
          )}

          {currentPage === 'place' && (
            <PlaceDetailsPage
              placeName={selectedPlaceGuide}
              onBack={() => navigateTo('planner')}
              selectedPlaces={selectedPlaces}
              onAddPlace={addPlace}
              onRemovePlace={removePlace}
            />
          )}

          {currentPage === 'developer' && (
            <DeveloperTestPage
              onBack={() => navigateTo('home')}
            />
          )}
        </main>
      </div>

      {/* Global Floating Trip Cart Trigger Button */}
      <div className="fixed bottom-6 right-6 z-[9990]">
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl transition duration-300 active:scale-95 border border-white/10"
        >
          <Compass className="h-6.5 w-6.5 animate-spin-slow group-hover:scale-110" />
          {selectedPlaces.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 border-2 border-white text-3xs font-black text-white shadow-md animate-bounce">
              {selectedPlaces.length}
            </span>
          )}
        </button>
      </div>

      {/* Global Trip Cart Drawer */}
      <TripCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        selectedPlaces={selectedPlaces}
        onRemovePlace={removePlace}
        onReorderPlaces={reorderPlaces}
        onFinalize={handleFinalizeItinerary}
        isFinalizing={isFinalizing}
        startLocation={activeTrip?.start_location || ''}
        destination={activeTrip?.destination || ''}
        currency={activeTrip?.currency || 'INR'}
        comfortLevel={activeTrip?.comfort_level || 'moderate'}
      />

      {/* Global Floating AI Chatbot Slide-Over Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <div className="fixed inset-0 z-[9995] flex items-center justify-end select-none pointer-events-none">
            {/* Backdrop: Visible only on Mobile (screen < 640px) and it blocks clicks */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs pointer-events-auto sm:hidden"
            />

            {/* Chat Drawer container: Allows clicking through to page on desktop, blocks clicks within itself */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full sm:w-[460px] h-full sm:h-[calc(100vh-64px)] sm:top-16 bg-white border-l border-travel-borders shadow-2xl p-6 flex flex-col z-10 pointer-events-auto"
            >
              <div className="flex items-center justify-between border-b border-travel-borders pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-travel-dark text-white">
                    <MessageSquare className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-card-heading font-semibold text-travel-text-primary uppercase tracking-wider">AI Travel Consultant</h3>
                    <p className="text-small-custom text-[#6B7280] mt-0.5">Chat in real-time to adjust travel cards</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="rounded-xl border border-travel-borders bg-white p-2 text-[#6B7280] hover:text-travel-text-primary transition cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <ChatInterface
                  messages={chatMessages}
                  onSendMessage={handleSendChatMessage}
                  loading={chatLoading}
                  onCloseChat={() => setIsChatOpen(false)}
                  onOptimizeRoute={async () => {
                    await handleFinalizeItinerary();
                    setActiveTab('Blueprint');
                    setCurrentPage('planner');
                  }}
                  onReduceBudget={() => {
                    const currentBudget = parseFloat(budgetInput || activeTrip?.budget || 20000);
                    const newBudget = Math.round(currentBudget * 0.85);
                    setBudgetInput(newBudget);
                    handleGenerateFromForm({
                      destination: destination || activeTrip?.destination || 'Meghalaya',
                      startLocation: startLocation || activeTrip?.start_location || 'Guwahati',
                      totalDays: duration || activeTrip?.total_days || 4,
                      travelers: travelers || activeTrip?.travelers || 2,
                      budget: newBudget,
                      comfortLevel: activeTrip?.comfort_level || 'moderate',
                      transportPreference: transportPreference || activeTrip?.transport_preference || 'Road Trip',
                      placeTypes: interests.map(i => i.toLowerCase())
                    });
                  }}
                  onAddAttractions={() => {
                    const nextAtt = activeTrip?.nearby_attractions?.find(
                      att => !selectedPlaces.some(p => p.name.toLowerCase().trim() === att.name.toLowerCase().trim())
                    );
                    if (nextAtt) addPlace(nextAtt);
                  }}
                  onAddWaterfalls={() => {
                    const nextWaterfall = activeTrip?.nearby_attractions?.find(
                      att => {
                        const text = `${att.name} ${att.summary} ${att.description} ${att.quick_facts?.Type || ''}`.toLowerCase();
                        const isWaterfall = text.includes('waterfall') || text.includes('falls') || text.includes('fall');
                        const inCart = selectedPlaces.some(p => p.name.toLowerCase().trim() === att.name.toLowerCase().trim());
                        return isWaterfall && !inCart;
                      }
                    );
                    if (nextWaterfall) addPlace(nextWaterfall);
                  }}
                  onAddFoodStops={() => {
                    const nextFood = activeTrip?.nearby_attractions?.find(
                      att => {
                        const text = `${att.name} ${att.summary} ${att.description} ${att.quick_facts?.Type || ''} ${att.type || ''}`.toLowerCase();
                        const isFood = text.includes('restaurant') || text.includes('cafe') || text.includes('café') || text.includes('food') || text.includes('diner');
                        const inCart = selectedPlaces.some(p => p.name.toLowerCase().trim() === att.name.toLowerCase().trim());
                        return isFood && !inCart;
                      }
                    );
                    if (nextFood) addPlace(nextFood);
                  }}
                  onAddViewpoints={() => {
                    const nextView = activeTrip?.nearby_attractions?.find(
                      att => {
                        const text = `${att.name} ${att.summary} ${att.description} ${att.quick_facts?.Type || ''} ${att.type || ''}`.toLowerCase();
                        const isView = text.includes('viewpoint') || text.includes('canyon') || text.includes('valley') || text.includes('peak') || text.includes('mountain') || text.includes('hill');
                        const inCart = selectedPlaces.some(p => p.name.toLowerCase().trim() === att.name.toLowerCase().trim());
                        return isView && !inCart;
                      }
                    );
                    if (nextView) addPlace(nextView);
                  }}
                  onGenerateBlueprint={() => {
                    setCurrentPage('planner');
                    setActiveTab('Blueprint');
                  }}
                  onDownloadGuide={() => {
                    setCurrentPage('planner');
                    setActiveTab('Blueprint');
                    setDownloadTrigger(prev => prev + 1);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

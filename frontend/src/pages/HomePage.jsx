import React from 'react';
import { Compass, Sparkles, Map, Wallet } from 'lucide-react';

export default function HomePage({ setCurrentPage }) {
  const features = [
    {
      title: "AI Itinerary Synthesis",
      description: "Generates custom multi-region travel cards with optimized day-by-day sightseeing activities.",
      icon: Compass,
      bg: "bg-travel-accent-gray text-travel-button-dark"
    },
    {
      "title": "Smart Budgeting",
      "description": "Intelligently scales accommodation, transport, and food costs to stay precisely within your threshold.",
      icon: Wallet,
      bg: "bg-travel-accent-gray text-travel-button-dark"
    },
    {
      "title": "Route Optimization",
      "description": "Compares express trains, cabs, and flight paths based on speed, comfort, or financial savings.",
      icon: Map,
      bg: "bg-travel-accent-gray text-travel-button-dark"
    }
  ];

  const featuredDestinations = [
    {
      title: "Meghalaya, India",
      tag: "Nature & Adventure",
      image: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=400&auto=format&fit=crop",
      description: "Explore the living root bridges of Cherrapunji and crystal waters of Dawki.",
      comfort: "Moderate",
      days: 5
    },
    {
      title: "Kerala Backwaters",
      tag: "Relaxation & Culture",
      image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=400&auto=format&fit=crop",
      description: "Cruise in traditional houseboats along coco groves and tea valleys of Munnar.",
      comfort: "Luxury",
      days: 4
    },
    {
      title: "Jaipur & Udaipur",
      tag: "Royal Heritage",
      image: "https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?q=80&w=400&auto=format&fit=crop",
      description: "Behold majestic hill forts, heritage palaces, and romantic lakeside dinners.",
      comfort: "Heritage",
      days: 6
    }
  ];

  return (
    <div className="space-y-16 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Presentation */}
      <section className="text-center space-y-6 max-w-3xl mx-auto py-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-travel-accent-gray px-4 py-1.5 text-2xs font-semibold text-travel-button-dark">
          <Sparkles className="h-3.5 w-3.5" />
          The Future of Personalized Leisure
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-travel-text-primary leading-tight">
          Craft your next masterpiece voyage with <span className="text-travel-button-dark">AI Logic</span>
        </h1>
        <p className="text-sm text-travel-text-muted leading-relaxed max-w-xl mx-auto">
          Meet your personal intelligent travel consultant. Simply share your budget, timeframe, and vibes to compile structured multi-region plans instantly.
        </p>
        <div className="flex justify-center gap-4 pt-3">
          <button
            onClick={() => setCurrentPage('planner')}
            className="btn-premium btn-premium-primary"
          >
            Launch AI Planner
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('features');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-premium btn-premium-secondary"
          >
            Explore Features
          </button>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="space-y-8 scroll-mt-20">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-travel-text-primary">Engineered for Premium Experiences</h2>
          <p className="text-2xs text-travel-text-muted mt-1.5">Optimizing every element of travel, from budget allocations to transit comfort.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div 
                key={idx}
                className="rounded-2xl border border-travel-accent-gray bg-travel-bg-white p-6 shadow-premium hover:shadow-premium-hover transition duration-200"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl mb-4 ${f.bg}`}>
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-xs font-bold text-travel-text-primary mb-2">{f.title}</h3>
                <p className="text-2xs text-travel-text-muted leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Curated Recommendations */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-travel-text-primary">Featured AI Journeys</h2>
            <p className="text-2xs text-travel-text-muted mt-1.5">Popular itineraries synthesized and vetted by our travel consultants.</p>
          </div>
          <button
            onClick={() => setCurrentPage('planner')}
            className="text-sm font-semibold text-travel-button-dark hover:underline text-left"
          >
            Plan yours now &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredDestinations.map((dest, idx) => (
            <div 
              key={idx}
              className="overflow-hidden rounded-2xl border border-travel-accent-gray bg-travel-bg-white shadow-premium hover:shadow-premium-hover transition-premium duration-200 flex flex-col"
            >
              <div className="relative h-44 overflow-hidden">
                <img 
                  src={dest.image} 
                  alt={dest.title} 
                  className="h-full w-full object-cover"
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-3xs font-bold uppercase tracking-wider text-travel-text-primary px-2.5 py-1 rounded-lg">
                  {dest.tag}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-travel-text-primary mb-1">{dest.title}</h3>
                  <p className="text-2xs text-travel-text-muted leading-relaxed mb-4">{dest.description}</p>
                </div>
                <div className="border-t border-travel-accent-gray pt-4 flex items-center justify-between text-2xs">
                  <span className="text-travel-text-muted">{dest.days} Days • {dest.comfort} Comfort</span>
                  <button
                    onClick={() => setCurrentPage('planner')}
                    className="font-semibold text-travel-button-dark hover:text-travel-button-darkHover"
                  >
                    Quick Load
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, MapPin, Navigation, Image, RefreshCw, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { envConfig } from '../services/envConfig';
import { geocodingService } from '../services/maps/geocodingService';
import { routingService } from '../services/maps/routingService';
import { imageProvider } from '../services/images/imageProvider';

export default function DeveloperTestPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState({
    gemini: { status: 'Checking...', details: 'Validating key configuration' },
    geocoding: { status: 'Checking...', details: 'Testing Nominatim OSM connection' },
    routing: { status: 'Checking...', details: 'Testing OSRM route connection' },
    images: { status: 'Checking...', details: 'Testing Unsplash and Pexels searches' }
  });

  const runDiagnostics = async () => {
    setLoading(true);
    const results = { ...statuses };

    // 1. Gemini AI Status Check
    const geminiKey = envConfig.GEMINI_API_KEY;
    if (geminiKey) {
      results.gemini = {
        status: 'Connected',
        details: `Key configured (${geminiKey.substring(0, 5)}...${geminiKey.substring(geminiKey.length - 3)}). Ready for generative travel planning.`,
        ok: true
      };
    } else {
      results.gemini = {
        status: 'Not Connected',
        details: 'VITE_GEMINI_API_KEY environment variable is empty. AI operations will use local high-fidelity mocks.',
        ok: false
      };
    }

    // 2. Geocoding Status Check
    try {
      const coords = await geocodingService.getCoordinates('Shillong');
      if (coords && Array.isArray(coords) && coords.length === 2 && coords[0] !== 20.5937) {
        results.geocoding = {
          status: 'Connected',
          details: `Nominatim OSM active. Geocoded "Shillong" to coordinates: [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}].`,
          ok: true
        };
      } else {
        results.geocoding = {
          status: 'Not Connected',
          details: 'Geocoding endpoint returned default center coordinates. Falling back to local offline presets.',
          ok: false
        };
      }
    } catch (e) {
      results.geocoding = {
        status: 'Not Connected',
        details: `Nominatim connection failed: ${e.message}. Offline presets active.`,
        ok: false
      };
    }

    // 3. Routing Status Check
    try {
      const guwahati = [26.1445, 91.7362];
      const shillong = [25.5788, 91.8831];
      const route = await routingService.getDrivingRoute([guwahati, shillong]);
      if (route && route.distance > 0 && route.geometry.length > 2) {
        results.routing = {
          status: 'Connected',
          details: `OSRM Service online. Guwahati to Shillong driving distance: ${route.distance} km, estimated time: ${route.duration} hrs.`,
          ok: true
        };
      } else {
        results.routing = {
          status: 'Not Connected',
          details: 'OSRM routing query failed. Falling back to straight-line math coordinates.',
          ok: false
        };
      }
    } catch (e) {
      results.routing = {
        status: 'Not Connected',
        details: `OSRM routing query failed: ${e.message}. Straight-line math fallback active.`,
        ok: false
      };
    }

    // 4. Image Provider Status Check
    try {
      const images = await imageProvider.searchDestinationImages('Shillong', 'Meghalaya', 'hills');
      const usingKey = !!(import.meta.env.VITE_UNSPLASH_API_KEY || import.meta.env.VITE_PEXELS_API_KEY);
      if (images && images.length > 0 && images[0]) {
        results.images = {
          status: 'Connected',
          details: `Image providers active. Successfully loaded search assets ${usingKey ? '(Key-based)' : '(Keyless NAPI)'}. Found URL: ${images[0].substring(0, 50)}...`,
          ok: true
        };
      } else {
        results.images = {
          status: 'Not Connected',
          details: 'Image queries failed or timed out. Loading local curated fallback database.',
          ok: false
        };
      }
    } catch (e) {
      results.images = {
        status: 'Not Connected',
        details: `Image provider search failed: ${e.message}. Curated fallback database active.`,
        ok: false
      };
    }

    setStatuses(results);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              Developer Diagnostic Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium">Verify system connections, credentials validation, and API integrity</p>
          </div>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Run Diagnostics
        </button>
      </div>

      {/* Grid of Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Gemini Diagnostic Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Gemini AI Model</h3>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold ${
                statuses.gemini.status === 'Connected' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : statuses.gemini.status === 'Checking...'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {statuses.gemini.status === 'Connected' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {statuses.gemini.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {statuses.gemini.details}
            </p>
          </div>
          <div className="text-3xs text-slate-400 font-mono pt-3 border-t border-slate-50">
            Variable: VITE_GEMINI_API_KEY
          </div>
        </div>

        {/* OSM Geocoding Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Nominatim Geocoding</h3>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold ${
                statuses.geocoding.status === 'Connected' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : statuses.geocoding.status === 'Checking...'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {statuses.geocoding.status === 'Connected' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {statuses.geocoding.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {statuses.geocoding.details}
            </p>
          </div>
          <div className="text-3xs text-slate-400 font-mono pt-3 border-t border-slate-50">
            Endpoint: OpenStreetMap Nominatim API
          </div>
        </div>

        {/* OSRM Routing Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Navigation className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">OSRM Road Routing</h3>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold ${
                statuses.routing.status === 'Connected' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : statuses.routing.status === 'Checking...'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {statuses.routing.status === 'Connected' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {statuses.routing.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {statuses.routing.details}
            </p>
          </div>
          <div className="text-3xs text-slate-400 font-mono pt-3 border-t border-slate-50">
            Endpoint: Project OSRM Route Engine
          </div>
        </div>

        {/* Image Providers Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Image className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Visual Image Providers</h3>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold ${
                statuses.images.status === 'Connected' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : statuses.images.status === 'Checking...'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {statuses.images.status === 'Connected' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {statuses.images.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {statuses.images.details}
            </p>
          </div>
          <div className="text-3xs text-slate-400 font-mono pt-3 border-t border-slate-50">
            Variables: VITE_UNSPLASH_API_KEY / VITE_PEXELS_API_KEY
          </div>
        </div>

      </div>

      {/* Developer Information Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
        <h3 className="text-xs font-bold text-slate-800">System Integration Status Notes:</h3>
        <ul className="text-xs text-slate-500 font-medium list-disc pl-5 space-y-1">
          <li>If Gemini AI is not connected, the frontend seamlessly maps prompt calls to local Mock planners.</li>
          <li>Nominatim (OSM) and OSRM are keyless open-source engines and are functional out-of-the-box.</li>
          <li>For Image searches, the application defaults to curated high-resolution matching templates if API quotas are exceeded.</li>
        </ul>
      </div>

    </div>
  );
}

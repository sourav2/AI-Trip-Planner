import React, { useState, useEffect } from 'react';
import { Compass } from 'lucide-react';

const LOADING_MESSAGES = [
  "Finding destinations...",
  "Optimizing route...",
  "Calculating costs...",
  "Creating itinerary...",
  "Generating recommendations...",
  "Preparing travel insights..."
];

export default function SkeletonLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000); // Update every 2 seconds for a lively feel
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 py-4 animate-pulse">

      {/* Dynamic message loader card - Premium design */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-[#F0FDF4] p-8 text-center shadow-premium max-w-xxl mx-auto">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-[#16A34A] border border-emerald-200">
          <Compass className="h-7 w-7 animate-spin-slow" />
          <span className="absolute inset-0 rounded-full border-2 border-dashed border-[#16A34A] animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <h3 className="text-sm font-bold text-emerald-800 mb-1">Synthesizing Your Custom Itinerary</h3>
        <p className="text-xs text-emerald-700 font-medium transition-all duration-300 min-h-[1.5rem]">
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </div>

      {/* 1. TOP SUMMARY CARDS SHIMMER (5 grid items) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((idx) => (
          <div key={idx} className="bg-white border border-travel-borders p-4 rounded-xl shadow-xs space-y-2">
            <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-3/4 bg-gray-300 rounded animate-pulse" />
            <div className="h-2.5 w-2/3 bg-gray-150 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* 2. MAP & BUDGET SPLIT SHIMMER */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Route Map (8 cols) */}
        <div className="xl:col-span-8 flex flex-col bg-white border border-travel-borders rounded-xl p-4 shadow-xs">
          <div className="h-4 w-1/3 bg-gray-200 rounded mb-4 animate-pulse" />
          <div className="h-[400px] w-full bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
            <Compass className="h-10 w-10 text-gray-300 animate-spin" />
          </div>
        </div>

        {/* Budget Breakdown (4 cols) */}
        <div className="xl:col-span-4 flex flex-col justify-between gap-4">
          <div className="bg-white border border-travel-borders rounded-xl p-5 shadow-premium flex-1 flex flex-col gap-4">
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
            <div className="flex items-center gap-6 my-auto justify-center py-6">
              {/* Circular donut chart skeleton */}
              <div className="h-28 w-28 rounded-full border-8 border-gray-200 border-t-emerald-500 animate-spin shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-full bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* 3. SUGGESTED PLACES DISCOVERY SHIMMER (3-column grid) */}
      <div className="space-y-3 pt-2">
        <div className="h-5 w-48 bg-gray-200 rounded mb-3 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="rounded-xl border border-travel-borders bg-white p-4 h-44 flex flex-col justify-between shadow-xs">
              <div className="space-y-2">
                <div className="h-3.5 w-1/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-4.5 w-3/4 bg-gray-300 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="h-3.5 w-1/3 bg-gray-150 rounded animate-pulse" />
                <div className="h-7 w-7 rounded-full bg-gray-200 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. DAY-WISE ITINERARY SHIMMER (horizontal cards) */}
      <div className="space-y-3 pt-2">
        <div className="h-5 w-60 bg-gray-200 rounded mb-3 animate-pulse" />
        <div className="flex gap-4 overflow-hidden pb-2 select-none">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="bg-white border border-travel-borders rounded-xl p-4 shadow-xs w-64 shrink-0 space-y-3">
              <div className="h-3 w-1/4 bg-emerald-100 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-300 rounded animate-pulse" />
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full bg-gray-150 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-gray-150 rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-gray-150 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

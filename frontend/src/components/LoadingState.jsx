import React from 'react';
import { Compass } from 'lucide-react';

/**
 * Reusable Premium Loading State Component
 * @param {object} props
 * @param {string} props.message - Primary status text (e.g. "Generating Trip...")
 * @param {string} props.subMessage - Secondary detail text
 * @param {boolean} props.fullScreen - Whether to overlay the entire screen
 */
export default function LoadingState({ 
  message = "Generating Trip...", 
  subMessage = "Our AI is crafting your bespoke travel experience", 
  fullScreen = false 
}) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto animate-fade-in">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-[#10B981] border border-emerald-100 shadow-md">
        <Compass className="h-10 w-10 animate-spin" style={{ animationDuration: '3s' }} />
        <span 
          className="absolute inset-0 rounded-full border-2 border-dashed border-[#10B981] animate-spin" 
          style={{ animationDuration: '8s' }} 
        />
      </div>
      
      <h3 className="text-lg font-bold text-slate-800 mb-2 tracking-wide animate-pulse">
        {message}
      </h3>
      
      {subMessage && (
        <p className="text-sm text-slate-500 font-medium max-w-xs leading-relaxed">
          {subMessage}
        </p>
      )}

      {/* Subtle micro-progress indicator */}
      <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden mt-6">
        <div className="h-full bg-emerald-500 rounded-full animate-progress" style={{ width: '60%' }} />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
        <div className="bg-white rounded-3xl p-6 shadow-premium max-w-md w-[90%] border border-slate-100">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-12 flex items-center justify-center rounded-3xl border border-slate-100 bg-slate-50/50">
      {content}
    </div>
  );
}

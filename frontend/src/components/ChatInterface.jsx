import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, RefreshCw } from 'lucide-react';

export default function ChatInterface({ 
  messages, 
  onSendMessage, 
  loading,
  onCloseChat,
  onOptimizeRoute,
  onReduceBudget,
  onAddAttractions,
  onAddWaterfalls,
  onAddFoodStops,
  onAddViewpoints,
  onGenerateBlueprint,
  onDownloadGuide
}) {
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef(null);

  const suggestedPrompts = [
    "Plan a 4-day budget trip to Meghalaya for 3 people.",
    "Recommend a luxury getaway to Udaipur for 2 people.",
    "What are the best food experiences in Kerala?",
    "Give me cheapest transport options for Goa."
  ];

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  const handleSuggestClick = (prompt) => {
    if (loading) return;
    onSendMessage(prompt);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className={onCloseChat ? "flex flex-col h-full overflow-hidden bg-transparent" : "flex flex-col h-[500px] rounded-2xl border border-travel-accent-gray bg-travel-bg-white shadow-premium overflow-hidden"}>
      
      {/* Chat Header - Only show if not inside the global drawer panel */}
      {!onCloseChat && (
        <div className="flex items-center gap-3 border-b border-travel-accent-gray bg-travel-bg-gray px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-travel-button-dark text-white">
            <Sparkles className="h-5 w-5 text-travel-accent-gray" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-travel-text-primary">Travel Consultant Agent</h3>
            <p className="text-2xs text-travel-text-muted">Online • Powered by AI Travel Logic</p>
          </div>
        </div>
      )}

      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full justify-center items-center text-center p-6 space-y-6">
            <div className="max-w-md">
              <h4 className="text-base font-bold text-travel-text-primary mb-2">
                Let's plan your customized journey
              </h4>
              <p className="text-xs text-travel-text-muted">
                Describe your dream vacation in simple words. Ask about budgets, destinations, transport, sights, hotels, or regional secrets.
              </p>
            </div>
            
            {/* Suggestions bubbles - compact styling */}
            <div className="w-full max-w-lg space-y-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-travel-text-muted block text-left">
                Suggested Starters
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestClick(p)}
                    className="rounded-xl border border-travel-accent-gray hover:border-travel-button-dark bg-travel-bg-gray hover:bg-travel-accent-gray px-3.5 py-2 text-xs font-semibold text-travel-text-secondary transition text-left cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div 
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                    isUser 
                      ? 'bg-travel-accent-gray text-travel-button-dark border border-travel-accent-gray' 
                      : 'bg-travel-button-dark text-white'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : 'A'}
                </div>

                {/* Message Bubble */}
                <div 
                  className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isUser 
                      ? 'bg-travel-button-dark text-white rounded-tr-none' 
                      : 'bg-travel-bg-soft text-travel-text-primary rounded-tl-none border border-travel-accent-gray'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}

        {/* Loading / Thinking Indicator & Skeleton Message */}
        {loading && (
          <div className="space-y-3 max-w-[85%] mr-auto animate-pulse">
            <div className="flex gap-3 items-center">
              {/* Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-travel-button-dark text-white">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
              </div>
              
              {/* Typing Animation */}
              <div className="flex items-center gap-1 bg-travel-bg-soft border border-travel-accent-gray rounded-2xl rounded-tl-none px-4 py-2.5">
                <span className="text-2xs font-semibold text-travel-text-muted">Thinking</span>
                <span className="flex items-center gap-0.5 ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" />
                </span>
              </div>
            </div>

            {/* Skeleton Messages */}
            <div className="ml-11 space-y-2">
              <div className="h-3 w-48 bg-slate-200 rounded-md" />
              <div className="h-3.5 w-64 bg-slate-100 rounded-md" />
              <div className="h-3 w-56 bg-slate-100 rounded-md" />
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Quick Action Chips */}
      <div className="px-4 py-2 bg-travel-bg-gray/50 border-t border-travel-accent-gray flex gap-1.5 overflow-x-auto scrollbar-none select-none shrink-0">
        <button
          type="button"
          onClick={onOptimizeRoute}
          className="px-3 py-1 bg-white hover:bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-full text-3xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer"
        >
          ⚡ Optimize Route
        </button>
        <button
          type="button"
          onClick={onReduceBudget}
          className="px-3 py-1 bg-white hover:bg-amber-50 border border-amber-250 text-amber-800 rounded-full text-3xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer"
        >
          💰 Reduce Budget
        </button>
        <button
          type="button"
          onClick={onAddAttractions}
          className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-full text-3xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer"
        >
          📍 Add Attractions
        </button>
        <button
          type="button"
          onClick={onAddWaterfalls}
          className="px-3 py-1 bg-white hover:bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-3xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer"
        >
          🌊 Add Waterfalls
        </button>
        <button
          type="button"
          onClick={onAddFoodStops}
          className="px-3 py-1 bg-white hover:bg-orange-50 border border-orange-200 text-orange-850 rounded-full text-3xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer"
        >
          🍲 Add Food Stops
        </button>
        <button
          type="button"
          onClick={onAddViewpoints}
          className="px-3 py-1 bg-white hover:bg-teal-50 border border-teal-200 text-teal-800 rounded-full text-3xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer"
        >
          ⛰️ Add Viewpoints
        </button>
        <button
          type="button"
          onClick={onGenerateBlueprint}
          className="px-3 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full text-3xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer"
        >
          🗺️ Generate Blueprint
        </button>
        <button
          type="button"
          onClick={onDownloadGuide}
          className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-250 text-purple-800 rounded-full text-3xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer"
        >
          📥 Download Guide
        </button>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="border-t border-travel-accent-gray p-4 bg-travel-bg-gray flex gap-2 shrink-0">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask me something, e.g. 'Add one more waterfall...'"
          disabled={loading}
          className="flex-1 rounded-xl border border-travel-accent-gray bg-travel-bg-white px-4 py-3 text-xs outline-none focus:border-travel-button-dark focus:ring-1 focus:ring-travel-button-dark disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-travel-button-dark hover:bg-travel-button-darkHover text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>

    </div>
  );
}

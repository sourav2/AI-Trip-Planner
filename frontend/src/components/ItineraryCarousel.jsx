import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ItineraryCard from './ItineraryCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ItineraryCarousel({ 
  regions = [], 
  currency = 'INR', 
  selectedPlaces = [], 
  onAddPlace, 
  onRemovePlace 
}) {
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(1);
  const containerRef = useRef(null);
  const autoplayRef = useRef(null);

  const totalItems = regions.length;

  // Track screen size to determine items per view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setItemsPerView(3); // xl: 3 cards
      } else if (window.innerWidth >= 768) {
        setItemsPerView(2); // md: 2 cards
      } else {
        setItemsPerView(1); // mobile: 1 card
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset index if regions list changes or itemsPerView changes
  useEffect(() => {
    setIndex(0);
  }, [regions, itemsPerView]);

  const maxIndex = Math.max(0, totalItems - itemsPerView);

  // Autoplay timer
  useEffect(() => {
    if (isHovered || maxIndex === 0) {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      return;
    }

    autoplayRef.current = setInterval(() => {
      setIndex((prev) => {
        if (prev >= maxIndex) {
          return 0;
        }
        return prev + 1;
      });
    }, 2800); // auto-slide every 2.8 seconds

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [isHovered, maxIndex, index]);

  const handlePrev = () => {
    setIndex((prev) => (prev === 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  if (totalItems === 0) return null;

  return (
    <div 
      className="relative w-full py-2 group/carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Navigation Controls */}
      {maxIndex > 0 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-travel-accent-gray bg-travel-bg-white/90 backdrop-blur-md text-travel-text-primary hover:bg-travel-bg-white shadow-md active:scale-90 transition opacity-100 sm:opacity-0 sm:group-hover/carousel:opacity-100 duration-300 pointer-events-auto"
            aria-label="Previous Stop"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-travel-accent-gray bg-travel-bg-white/90 backdrop-blur-md text-travel-text-primary hover:bg-travel-bg-white shadow-md active:scale-90 transition opacity-100 sm:opacity-0 sm:group-hover/carousel:opacity-100 duration-300 pointer-events-auto"
            aria-label="Next Stop"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Carousel Viewport Container */}
      <div 
        ref={containerRef}
        className="w-full overflow-hidden rounded-2xl"
      >
        <motion.div
          drag={maxIndex > 0 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(e, info) => {
            if (info.offset.x > 80) {
              handlePrev();
            } else if (info.offset.x < -80) {
              handleNext();
            }
          }}
          animate={{ x: `-${index * (100 / itemsPerView)}%` }}
          transition={{ type: 'spring', damping: 26, stiffness: 130 }}
          className={`flex w-full ${maxIndex > 0 ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
          {regions.map((region, idx) => (
            <div 
              key={idx} 
              className="w-full md:w-1/2 xl:w-1/3 shrink-0 px-2"
            >
              <div className="h-full pb-2">
                <ItineraryCard
                  region={region}
                  currency={currency}
                  selectedPlaces={selectedPlaces}
                  onAddPlace={onAddPlace}
                  onRemovePlace={onRemovePlace}
                />
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dots Indicator */}
      {maxIndex > 0 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === idx ? 'w-5 bg-travel-button-dark' : 'w-1.5 bg-travel-accent-gray'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

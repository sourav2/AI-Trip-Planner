import React, { createContext, useContext, useState, useEffect } from 'react';

const TripCartContext = createContext();

export function TripCartProvider({ children }) {
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('selected_places', JSON.stringify(selectedPlaces));
  }, [selectedPlaces]);

  const addPlace = (place) => {
    if (!place || !place.name) return;
    setSelectedPlaces((prev) => {
      const exists = prev.some(
        (p) => p.name.toLowerCase().trim() === place.name.toLowerCase().trim()
      );
      if (exists) return prev;
      return [...prev, place];
    });
  };

  const removePlace = (place) => {
    if (!place || !place.name) return;
    setSelectedPlaces((prev) =>
      prev.filter(
        (p) => p.name.toLowerCase().trim() !== place.name.toLowerCase().trim()
      )
    );
  };

  const reorderPlaces = (newPlaces) => {
    setSelectedPlaces(newPlaces);
  };

  const clearCart = () => {
    setSelectedPlaces([]);
  };

  return (
    <TripCartContext.Provider
      value={{
        selectedPlaces,
        isCartOpen,
        setIsCartOpen,
        addPlace,
        removePlace,
        reorderPlaces,
        clearCart
      }}
    >
      {children}
    </TripCartContext.Provider>
  );
}

export function useTripCart() {
  const context = useContext(TripCartContext);
  if (!context) {
    throw new Error('useTripCart must be used within a TripCartProvider');
  }
  return context;
}

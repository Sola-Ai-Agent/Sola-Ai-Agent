import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Place } from '../types';

interface MapComponentProps {
  places: Place[];
  selectedPlaceId?: string;
  onSelectPlace: (id: string) => void;
  userLocation?: { lat: number; lng: number };
}

const getCategoryIconHtml = (name: string, category: string = '', isSelected: boolean) => {
  let emoji = '📍';
  let bgColor = 'bg-emerald-600';
  let borderColor = 'border-emerald-400';
  let shadowColor = 'rgba(16, 185, 129, 0.6)';

  const cat = (category || name).toLowerCase();
  if (cat.includes('hospital') || cat.includes('doctor') || cat.includes('health') || cat.includes('clinic')) {
    emoji = '🏥';
    bgColor = 'bg-rose-600';
    borderColor = 'border-rose-400';
    shadowColor = 'rgba(225, 29, 72, 0.7)';
  } else if (cat.includes('saloon') || cat.includes('salon') || cat.includes('hair') || cat.includes('spa') || cat.includes('style')) {
    emoji = '💇';
    bgColor = 'bg-emerald-600';
    borderColor = 'border-emerald-400';
    shadowColor = 'rgba(16, 185, 129, 0.7)';
  } else if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dine') || cat.includes('bhavan')) {
    emoji = '🍽️';
    bgColor = 'bg-amber-600';
    borderColor = 'border-amber-400';
    shadowColor = 'rgba(217, 119, 6, 0.7)';
  }

  const pulseEffect = isSelected
    ? `ring-4 ring-white ring-offset-2 ring-offset-zinc-900 scale-125 z-50`
    : `hover:scale-110`;

  return `
    <div class="relative flex flex-col items-center justify-center transition-all duration-300 ${pulseEffect}" style="pointer-events: auto;">
      <div class="w-10 h-10 rounded-full ${bgColor} border-2 ${borderColor} flex items-center justify-center text-lg shadow-2xl cursor-pointer" style="box-shadow: 0 4px 18px ${shadowColor};">
        ${emoji}
      </div>
      <div class="mt-1 px-2 py-0.5 bg-zinc-900/95 text-white text-[10px] font-bold rounded-md shadow-lg border border-zinc-700 max-w-[120px] truncate text-center pointer-events-none">
        ${name}
      </div>
    </div>
  `;
};

const getUserLocationIconHtml = () => `
  <div class="relative flex items-center justify-center">
    <span class="absolute w-8 h-8 rounded-full bg-emerald-400/40 animate-ping"></span>
    <div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-xs shadow-xl font-bold text-black" style="box-shadow: 0 0 15px rgba(16, 185, 129, 0.9);">
      🎯
    </div>
  </div>
`;

const MapComponent: React.FC<MapComponentProps> = ({ places, selectedPlaceId, onSelectPlace, userLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [13.0827, 80.2707];
      const map = L.map(mapRef.current, {
        center: initialCenter,
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // CartoDB Dark Matter tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when places, selectedPlaceId, or userLocation change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const bounds = L.latLngBounds([]);
    const placesBounds = L.latLngBounds([]);

    // 1. Draw User Location Marker if available
    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      const userIcon = L.divIcon({
        className: 'custom-user-marker-icon',
        html: getUserLocationIconHtml(),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 });
      userMarker.bindPopup(`
        <div class="p-1 font-sans text-center text-xs font-semibold text-emerald-400">
          🎯 You Are Here
        </div>
      `, { className: 'custom-leaflet-popup', closeButton: false });

      markersGroup.addLayer(userMarker);
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    // 2. Draw Places / Shops Markers
    places.forEach((place) => {
      if (!place.location || typeof place.location.lat !== 'number' || typeof place.location.lng !== 'number') return;

      const isSelected = place.id === selectedPlaceId;
      const customIcon = L.divIcon({
        className: 'custom-shop-marker-icon',
        html: getCategoryIconHtml(place.name, place.category, isSelected),
        iconSize: [120, 60],
        iconAnchor: [60, 20],
      });

      const marker = L.marker([place.location.lat, place.location.lng], { icon: customIcon });

      const categoryBadge = place.category 
        ? `<span class="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1">${place.category}</span>` 
        : '';

      const popupContent = `
        <div class="p-1 font-sans text-zinc-100 min-w-[190px]">
          ${categoryBadge}
          <h4 class="font-bold text-sm text-white m-0 leading-snug">${place.name}</h4>
          <p class="text-xs text-zinc-400 mt-1 mb-2 leading-tight">${place.address}</p>
          <div class="flex items-center justify-between text-xs mb-2 pt-1 border-t border-zinc-800">
            <span class="text-amber-400 font-bold">★ ${place.rating || '4.5'}</span>
            <span class="text-emerald-400 font-mono text-[11px]">${place.phoneNumber || ''}</span>
          </div>
          <button id="btn-select-${place.id}" class="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg shadow transition-colors text-center cursor-pointer">
            ${isSelected ? '✓ Selected' : 'Select Provider'}
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'custom-leaflet-popup',
        closeButton: false,
      });

      marker.on('click', () => {
        onSelectPlace(place.id);
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-${place.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            onSelectPlace(place.id);
          };
        }
      });

      markersGroup.addLayer(marker);
      bounds.extend([place.location.lat, place.location.lng]);
      placesBounds.extend([place.location.lat, place.location.lng]);

      if (isSelected) {
        marker.openPopup();
      }
    });

    if (placesBounds.isValid()) {
      map.fitBounds(placesBounds, { padding: [70, 70], maxZoom: 15 });
    } else if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 15 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [places, selectedPlaceId, onSelectPlace, userLocation]);

  return (
    <div className="w-full h-full relative z-0 overflow-hidden">
      <style>{`
        .leaflet-container {
          z-index: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        .custom-shop-marker-icon, .custom-user-marker-icon {
          background: transparent !important;
          border: none !important;
          overflow: visible !important;
        }
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          background: rgba(24, 24, 27, 0.96);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
          color: #f4f4f5;
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: rgba(24, 24, 27, 0.96);
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full bg-[#09090b] relative z-0" />
    </div>
  );
};

export default MapComponent;

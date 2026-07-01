import React, { useEffect, useRef, useState } from 'react';
import { ViewMode, Place, Appointment, BookingDetails } from '../types';
import MapComponent from './MapComponent';
import CalendarView from './CalendarView';

interface DynamicPanelProps {
  mode: ViewMode;
  places: Place[];
  selectedPlaceId?: string;
  onSelectPlace: (id: string) => void;
  onSearchPlaces?: (queryOrCategory: string) => void;
  userLocation?: { lat: number; lng: number };
  onRequestLocation?: () => void;
  locationPermissionStatus?: 'prompt' | 'granted' | 'denied' | 'loading';
  appointment?: Appointment;
  isCallingReceptionist: boolean;
  bookingDetails?: BookingDetails;
  volumeLevel: number;
  onAddToCalendar?: () => void;
  onEndCall?: () => void;
  onCancelBooking?: () => void;
  onCloseBooking?: () => void;
  onGoHome?: () => void;
  activeCategory: 'all' | 'hospital' | 'saloon' | 'restaurant';
  setActiveCategory: (cat: 'all' | 'hospital' | 'saloon' | 'restaurant') => void;
  onSendEmail?: (email: string) => Promise<boolean>;
}

const DynamicPanel: React.FC<DynamicPanelProps> = ({
  mode,
  places,
  selectedPlaceId,
  onSelectPlace,
  onSearchPlaces,
  userLocation,
  onRequestLocation,
  locationPermissionStatus = 'prompt',
  appointment,
  isCallingReceptionist,
  bookingDetails,
  volumeLevel,
  onAddToCalendar,
  onEndCall,
  onCancelBooking,
  onCloseBooking,
  onGoHome,
  activeCategory,
  setActiveCategory,
  onSendEmail
}) => {
  const isDialing = bookingDetails?.status === 'negotiating' && !isCallingReceptionist;

  // Search & Category State
  const [searchInputValue, setSearchInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Track whether location is chosen / search results are returned
  const initialPlacesRef = useRef<Place[] | null>(null);
  const [showPlaces, setShowPlaces] = useState(true);

  useEffect(() => {
    if (initialPlacesRef.current === null) {
      initialPlacesRef.current = places;
      return;
    }
    if (initialPlacesRef.current !== places) {
      setShowPlaces(true);
      setIsSearching(false);
    }
  }, [places]);

  // Call timer for live call UI
  const [callSeconds, setCallSeconds] = useState(0);
  useEffect(() => {
    let t: number | undefined;
    if (isCallingReceptionist) {
      t = window.setInterval(() => setCallSeconds(s => s + 1), 1000);
    } else {
      setCallSeconds(0);
    }
    return () => { if (t) clearInterval(t); };
  }, [isCallingReceptionist]);

  const formatTime = (s: number) => {
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const phoneVisible = isDialing || isCallingReceptionist;

  const handleCategoryClick = (cat: 'all' | 'hospital' | 'saloon' | 'restaurant') => {
    setActiveCategory(cat);
    setIsSearching(true);
    if (onSearchPlaces) {
      onSearchPlaces(cat);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInputValue.trim()) return;
    setIsSearching(true);
    if (onSearchPlaces) {
      onSearchPlaces(searchInputValue.trim());
    }
  };

  const ActionButton: React.FC<{
    label: string;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
    variant?: 'circle' | 'square';
    children?: React.ReactNode;
  }> = ({ label, onClick, active, disabled, ariaLabel, variant = 'square', children }) => {
    const base = "flex flex-col items-center gap-2 text-xs select-none";
    const btnCommon = "inline-flex items-center justify-center transition-transform transform-gpu focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500";
    const squareClasses = "w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-sm hover:scale-105 hover:bg-zinc-800";
    const circleClasses = "w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center shadow-lg";

    return (
      <div className={base} aria-hidden={disabled}>
        <button
          onClick={onClick}
          aria-label={ariaLabel || label}
          disabled={disabled}
          className={`${btnCommon} ${variant === 'square' ? squareClasses : circleClasses} ${disabled ? 'opacity-50 cursor-not-allowed scale-100' : ''}`}
          title={label}
          type="button"
        >
          {children}
        </button>
        <div className="text-[11px] text-zinc-300">{label}</div>
      </div>
    );
  };

  const PhoneShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <>
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" style={{ pointerEvents: 'auto' }} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[420px] h-[90vh] md:h-[720px] bg-[#121215] rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col" role="dialog" aria-modal="true">
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </div>
        </div>
      </>
    );
  };

  if (isDialing) {
    const selectedPlace = places.find(p => p.id === bookingDetails?.placeId);
    const displayName = selectedPlace?.name || bookingDetails?.placeName || 'Unknown';
    const displayNumber = selectedPlace?.phoneNumber || '•••• ••• ••••';

    return (
      <>
        <div className="h-full w-full relative pointer-events-none select-none z-0">
          <MapComponent places={places} selectedPlaceId={selectedPlaceId} onSelectPlace={onSelectPlace} userLocation={userLocation} />
        </div>
        <PhoneShell>
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium">Calling</span>
              </div>
              <div className="text-xs text-zinc-400">—</div>
            </div>
            <div className="flex flex-col items-center text-center mt-6">
              <div className="w-36 h-36 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-4 border-zinc-800 flex items-center justify-center shadow-xl">
                <span className="text-5xl font-bold text-zinc-200">{displayName.charAt(0)}</span>
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-white">{displayName}</h2>
              <p className="text-sm text-zinc-400 mt-1">{displayNumber}</p>
              <div className="mt-4">
                <div className="inline-flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 106.32 17.76L21 22l-2.24-2.24A10 10 0 0012 2z"/></svg>
                  Ringing...
                </div>
              </div>
              <div className="mt-4 text-xs text-zinc-400 flex gap-4 justify-center">
                <div>Service: <span className="text-zinc-200 font-medium">{bookingDetails?.service}</span></div>
                {bookingDetails?.guests && (
                  <div>Guests: <span className="text-zinc-200 font-medium">{bookingDetails.guests}</span></div>
                )}
              </div>
            </div>
          </div>
          <div className="px-6 pb-6 md:absolute md:bottom-6 md:left-6 md:right-6 md:flex md:items-center md:justify-between md:gap-4">
            <div className="flex gap-6 justify-center md:justify-start w-full">
              <ActionButton ariaLabel="Mute" label="Mute">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9v6a3 3 0 0 0 6 0v-1" /><path d="M5 10v1a7 7 0 0 0 14 0v-1" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              </ActionButton>
              <ActionButton ariaLabel="Keypad" label="Keypad">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M8 8h.01M16 8h.01M8 12h.01M16 12h.01M8 16h.01M16 16h.01" /></svg>
              </ActionButton>
              <ActionButton ariaLabel="Speaker" label="Speaker">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5l6 4v6l-6 4v-14z" /><path d="M5 9v6" /></svg>
              </ActionButton>
            </div>
            <div className="flex flex-col items-center mt-4 md:mt-0">
              <ActionButton ariaLabel="End call" label="End" onClick={() => onEndCall?.()} variant="circle">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-18 0" /><path d="M16 8l-8 8" /></svg>
              </ActionButton>
            </div>
          </div>
        </PhoneShell>
      </>
    );
  }

  if (isCallingReceptionist) {
    const selectedPlace = places.find(p => p.id === bookingDetails?.placeId);
    const displayName = selectedPlace?.name || bookingDetails?.placeName || 'Unknown';
    const phoneNumber = selectedPlace?.phoneNumber || '—';
    const saveEnabled = bookingDetails?.status === 'confirmed' && !!onAddToCalendar;

    return (
      <>
        <div className="h-full w-full relative pointer-events-none select-none z-0">
          <MapComponent places={places} selectedPlaceId={selectedPlaceId} onSelectPlace={onSelectPlace} userLocation={userLocation} />
        </div>
        <PhoneShell>
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 106.32 17.76L21 22l-2.24-2.24A10 10 0 0012 2z"/></svg>
                <span className="font-medium text-emerald-400">On Call</span>
              </div>
              <div className="text-xs font-mono">{formatTime(callSeconds)}</div>
            </div>
            <div className="flex flex-col items-center text-center mt-6">
              <div className="w-36 h-36 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-4 border-zinc-800 flex items-center justify-center shadow-xl">
                <span className="text-5xl font-bold text-zinc-200">{displayName.charAt(0)}</span>
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-white">{displayName}</h2>
              <p className="text-sm text-zinc-400 mt-1">{phoneNumber}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="text-xs text-zinc-300 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">{bookingDetails?.service}</div>
                <div className="text-xs text-zinc-300 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">HD Voice</div>
              </div>
            </div>
          </div>
          <div className="px-6">
            <div className="w-full h-20 rounded-xl bg-black/60 border border-zinc-800 flex items-end px-2 overflow-hidden">
              {Array.from({ length: 48 }).map((_, i) => {
                const base = 6;
                const wave = Math.abs(Math.sin(i * 0.2 + (Date.now() / 400)));
                const h = Math.max(base, Math.min(70, base + wave * (12 + volumeLevel * 90)));
                return <div key={i} className="w-1.5 mx-0.5 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t" style={{ height: `${h}px` }} />;
              })}
            </div>
          </div>
          <div className="px-6 mt-6">
            <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Booking Request</div>
                  <div className="text-sm font-medium text-white mt-1">
                    {bookingDetails?.service} • {bookingDetails?.date} {bookingDetails?.time}
                    {bookingDetails?.guests && ` • ${bookingDetails.guests} Persons`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Status</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1">{bookingDetails?.status === 'confirmed' ? 'Confirmed' : 'Negotiating'}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-zinc-400">Notes: Receptionist checking availability and timeslots.</div>
            </div>
          </div>
          <div className="px-6 pb-6 md:absolute md:bottom-6 md:left-6 md:right-6 flex gap-3 items-center justify-between">
            <div className="flex gap-6">
              <ActionButton ariaLabel="Mute" label="Mute">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9v6a3 3 0 0 0 6 0v-1" /><path d="M5 10v1a7 7 0 0 0 14 0v-1" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              </ActionButton>
              <ActionButton ariaLabel="Keypad" label="Keypad">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M8 8h.01M16 8h.01M8 12h.01M16 12h.01M8 16h.01M16 16h.01" /></svg>
              </ActionButton>
              <ActionButton ariaLabel="Speaker" label="Speaker">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5l6 4v6l-6 4v-14z" /><path d="M5 9v6" /></svg>
              </ActionButton>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { if (saveEnabled) onAddToCalendar?.(); }}
                disabled={!saveEnabled}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${saveEnabled ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
              >
                Save
              </button>
              <ActionButton
                ariaLabel="End call"
                label=""
                onClick={() => {
                  if (bookingDetails && bookingDetails.status !== 'confirmed') {
                    onCancelBooking?.();
                  }
                  onEndCall?.();
                }}
                variant="circle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </ActionButton>
            </div>
          </div>
        </PhoneShell>
      </>
    );
  }

  if (mode === ViewMode.CALENDAR && appointment) {
    return <CalendarView appointment={appointment} bookingDetails={bookingDetails} onAddToCalendar={onAddToCalendar} onSendEmail={onSendEmail} />;
  }

  const getPlaceBadge = (cat?: string) => {
    if (!cat) return { emoji: '📍', label: 'Place', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    const c = cat.toLowerCase();
    if (c.includes('hospital') || c.includes('doctor')) return { emoji: '🏥', label: 'Hospital', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    if (c.includes('saloon') || c.includes('salon') || c.includes('hair')) return { emoji: '💇', label: 'Saloon', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (c.includes('restaurant') || c.includes('food')) return { emoji: '🍽️', label: 'Restaurant', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    return { emoji: '📍', label: cat, color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' };
  };

  const displayedPlaces = places.filter(p => {
    if (activeCategory === 'all') return true;
    const cat = (p.category || p.name).toLowerCase();
    if (activeCategory === 'hospital') return cat.includes('hospital') || cat.includes('doctor') || cat.includes('health') || cat.includes('clinic');
    if (activeCategory === 'saloon') return cat.includes('saloon') || cat.includes('salon') || cat.includes('hair') || cat.includes('spa') || cat.includes('style');
    if (activeCategory === 'restaurant') return cat.includes('restaurant') || cat.includes('food') || cat.includes('bhavan') || cat.includes('dining') || cat.includes('bistr');
    return true;
  });

  const hasChosenLocation = showPlaces && displayedPlaces.length > 0 && mode === ViewMode.MAP && !phoneVisible;

  return (
    <div className="h-full w-full relative flex flex-col overflow-hidden bg-[#09090b]">
      {/* Top Floating Geoapify Category Search Bar & Location Access (z-30 so it floats above map) */}
      {mode === ViewMode.MAP && !phoneVisible && (
        <div className="absolute top-4 left-4 right-4 z-30 flex flex-col gap-2.5 max-w-xl mx-auto pointer-events-auto">
          {/* Search Input Box & Location Access Button */}
          <div className="flex items-center gap-2">
            {onGoHome && (
              <button
                onClick={onGoHome}
                title="Return to Home Page"
                className="px-3.5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border border-zinc-800 bg-zinc-900/95 text-zinc-300 hover:bg-zinc-800 hover:text-white backdrop-blur-md shadow-xl shrink-0"
                type="button"
              >
                <span>🏠</span>
                <span>Home</span>
              </button>
            )}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 flex items-center shadow-2xl">
              <input
                type="text"
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                placeholder="Search hospitals, saloons, restaurants..."
                className="w-full pl-10 pr-24 py-3 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
              <button
                type="submit"
                className="absolute right-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                {isSearching ? (
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Search'
                )}
              </button>
            </form>

            <button
              onClick={onRequestLocation}
              title={locationPermissionStatus === 'granted' ? 'Location Active' : 'Access Device Location'}
              className={`px-3.5 py-3 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border backdrop-blur-md shadow-xl shrink-0 ${
                locationPermissionStatus === 'granted'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400/40'
                  : locationPermissionStatus === 'loading'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                  : 'bg-zinc-900/95 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>{locationPermissionStatus === 'loading' ? '⏳' : '🎯'}</span>
              <span className="hidden sm:inline">{locationPermissionStatus === 'granted' ? 'Near Me' : 'Enable Location'}</span>
            </button>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: 'all', label: '✨ All Places', icon: '📍' },
              { id: 'hospital', label: '🏥 Hospitals', icon: '🏥' },
              { id: 'saloon', label: '💇 Saloons', icon: '💇' },
              { id: 'restaurant', label: '🍽️ Restaurants', icon: '🍽️' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border backdrop-blur-md shadow-lg ${
                  activeCategory === cat.id
                    ? 'bg-emerald-600 border-emerald-400 text-white ring-2 ring-emerald-400/30'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Booking Draft Banner if active (z-30) */}
      {bookingDetails && !phoneVisible && (() => {
        const selectedPlace = places.find(p => p.id === bookingDetails.placeId);
        const isRestaurant = (selectedPlace?.category === 'restaurant') || (bookingDetails.placeName && (bookingDetails.placeName.toLowerCase().includes('restaurant') || bookingDetails.placeName.toLowerCase().includes('dining') || bookingDetails.placeName.toLowerCase().includes('cafe') || bookingDetails.placeName.toLowerCase().includes('bistro') || bookingDetails.placeName.toLowerCase().includes('bhavan') || bookingDetails.placeName.toLowerCase().includes('food') || bookingDetails.placeName.toLowerCase().includes('route')));
        const showGuests = !!bookingDetails.guests || isRestaurant;

        return (
          <div className="absolute top-28 left-4 right-4 z-30 max-w-xl mx-auto rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-md p-3.5 shadow-xl pointer-events-auto">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold">Booking Request</div>
                <div className="mt-0.5 text-sm font-semibold text-white">
                  {bookingDetails.placeName || 'Select a place'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs rounded-full px-2.5 py-0.5 border border-amber-500/40 bg-amber-500/10 text-amber-300 font-medium">
                  {bookingDetails.status}
                </div>
                {onCloseBooking && (
                  <button
                    onClick={onCloseBooking}
                    className="w-6 h-6 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors border border-zinc-700/60"
                    title="Close Booking Request"
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className={`mt-2 grid gap-2 text-xs text-zinc-300 ${showGuests ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/60 px-2.5 py-1.5">
                <span className="block text-zinc-400 text-[10px]">Service</span>
                <span className="truncate font-medium text-white">{bookingDetails.service || '—'}</span>
              </div>
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/60 px-2.5 py-1.5">
                <span className="block text-zinc-400 text-[10px]">Date</span>
                <span className="font-medium text-white">{bookingDetails.date || '—'}</span>
              </div>
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/60 px-2.5 py-1.5">
                <span className="block text-zinc-400 text-[10px]">Time</span>
                <span className="truncate font-medium text-white">{bookingDetails.time || '—'}</span>
              </div>
              {showGuests && (
                <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/60 px-2.5 py-1.5">
                  <span className="block text-zinc-400 text-[10px]">Guests</span>
                  <span className="truncate font-medium text-white">{bookingDetails.guests || '—'}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Dynamic 80% / 20% Division Layout */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative z-0">
        {/* Top Section: Map (80% when location chosen, 100% otherwise) */}
        <div className={`w-full transition-all duration-300 ${hasChosenLocation ? 'h-[80%]' : 'h-full'} ${phoneVisible ? 'pointer-events-none opacity-60' : 'pointer-events-auto'} relative z-0 overflow-hidden`}>
          <MapComponent
            places={displayedPlaces}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={onSelectPlace}
            userLocation={userLocation}
          />
        </div>

        {/* Bottom Section (20%): List of shops near chosen location - shows ONLY when location is chosen */}
        {hasChosenLocation && (
          <div className="h-[20%] w-full bg-[#121215] border-t border-zinc-800 p-3.5 overflow-y-auto z-20 flex flex-col shrink-0 relative pointer-events-auto">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800 shrink-0">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <span>Shops Near Chosen Location</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-mono">{displayedPlaces.length} shops</span>
              </h3>
              <span className="text-[11px] text-zinc-400">Click a shop to select & book</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 overflow-y-auto flex-1 pr-1">
              {displayedPlaces.map(place => {
                const badge = getPlaceBadge(place.category);
                const isSelected = selectedPlaceId === place.id;
                return (
                  <div
                    key={place.id}
                    onClick={() => onSelectPlace(place.id)}
                    className={`p-2.5 rounded-xl cursor-pointer border flex justify-between items-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-950/80 to-zinc-900 border-emerald-500/60 text-white shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-zinc-900/80 border-zinc-800 hover:bg-zinc-800/90 hover:border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm shrink-0">
                        {badge.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-white text-xs truncate">{place.name}</span>
                          <span className={`px-1 py-0.2 text-[8px] font-semibold uppercase rounded border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate mt-0.5">{place.address}</div>
                        <div className="text-[11px] font-mono text-emerald-400 mt-0.5 flex items-center gap-2">
                          <span>📞 {place.phoneNumber}</span>
                          {isSelected && <span className="text-emerald-400 font-bold text-[10px]">✓ Selected</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="block text-[11px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">★ {place.rating}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicPanel;

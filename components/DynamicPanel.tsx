import React, { useEffect, useRef, useState } from 'react';
import { ViewMode, Place, Appointment, BookingDetails } from '../types';
import MapComponent from './MapComponent';
import CalendarView from './CalendarView';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Phone, 
  Sparkles, 
  RefreshCw, 
  Calendar, 
  Users, 
  Mail, 
  X, 
  Volume2, 
  Star, 
  Home, 
  PhoneOff, 
  MicOff, 
  Grid, 
  Check, 
  Clock,
  Compass
} from 'lucide-react';

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
    const btnCommon = "inline-flex items-center justify-center transition-all duration-300 transform-gpu focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 active:scale-95";
    const squareClasses = "w-12 h-12 rounded-2xl bg-zinc-900/90 dark:bg-zinc-800/80 border border-zinc-800/80 dark:border-zinc-700/50 flex items-center justify-center shadow-md hover:scale-105 hover:bg-zinc-800 hover:text-white text-zinc-400";
    const circleClasses = "w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center shadow-lg text-white";

    return (
      <div className={base} aria-hidden={disabled}>
        <button
          onClick={onClick}
          aria-label={ariaLabel || label}
          disabled={disabled}
          className={`${btnCommon} ${variant === 'square' ? squareClasses : circleClasses} ${disabled ? 'opacity-40 cursor-not-allowed scale-100' : ''}`}
          title={label}
          type="button"
        >
          {children}
        </button>
        {label && <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{label}</div>}
      </div>
    );
  };

  const PhoneShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <>
        <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md z-40 transition-all duration-500 pointer-events-auto" />
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[400px] h-[90vh] md:h-[640px] bg-white dark:bg-zinc-950 rounded-[32px] shadow-2xl border border-zinc-200/80 dark:border-zinc-900 overflow-hidden flex flex-col transition-all duration-500" role="dialog" aria-modal="true">
            <div className="flex-1 overflow-auto flex flex-col">
              {children}
            </div>
          </div>
        </div>
      </>
    );
  };

  const BookingProgressTimeline: React.FC<{ step: 'dialing' | 'talking' | 'confirmed' }> = ({ step }) => {
    const steps = [
      { id: 1, label: 'Connecting to Sola AI Node', isDone: true, isActive: false },
      { id: 2, label: 'Finding Nearby Providers', isDone: true, isActive: false },
      { id: 3, label: 'Initiating Telephone Call', isDone: step !== 'dialing', isActive: step === 'dialing' },
      { id: 4, label: 'Negotiating Appt with Receptionist', isDone: step === 'confirmed', isActive: step === 'talking' },
      { id: 5, label: 'Booking Saved & Confirmed', isDone: step === 'confirmed', isActive: false }
    ];

    return (
      <div className="w-full mt-6 px-4 text-left">
        <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Live Progress tracker</h4>
        <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-3 space-y-4">
          {steps.map(s => (
            <div key={s.id} className="relative pl-6">
              <span className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border transition-all duration-500 ${
                s.isDone 
                  ? 'bg-emerald-500 border-emerald-500 text-white dark:text-zinc-950 shadow-sm shadow-emerald-500/10' 
                  : s.isActive 
                  ? 'bg-brand-500 border-brand-500 text-white dark:text-zinc-950 animate-pulse'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
              }`}>
                {s.isDone && <Check className="h-2.5 w-2.5 stroke-[3]" />}
              </span>
              <p className={`text-xs font-semibold ${
                s.isActive 
                  ? 'text-brand-600 dark:text-brand-400' 
                  : s.isDone 
                  ? 'text-zinc-700 dark:text-zinc-300' 
                  : 'text-zinc-400 dark:text-zinc-650'
              }`}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
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
          <div className="p-6 flex-1 flex flex-col justify-between">
            {/* Top Bar info */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <span>Contacting Provider</span>
              </div>
              <div>Ringing</div>
            </div>

            {/* Middle avatar section */}
            <div className="flex flex-col items-center text-center my-auto">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-brand-100 to-brand-50 dark:from-zinc-900 dark:to-zinc-950 border border-brand-200 dark:border-zinc-800 flex items-center justify-center shadow-xl">
                <Phone className="h-10 w-10 text-brand-600 dark:text-brand-400 animate-bounce" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{displayName}</h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-mono">{displayNumber}</p>
              
              <BookingProgressTimeline step="dialing" />
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto pt-6 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center gap-4">
              <div className="flex gap-4">
                <ActionButton ariaLabel="Mute" label="Mute">
                  <MicOff className="w-5 h-5" />
                </ActionButton>
                <ActionButton ariaLabel="Speaker" label="Speaker">
                  <Volume2 className="w-5 h-5" />
                </ActionButton>
              </div>
              <ActionButton ariaLabel="End call" label="" onClick={() => onEndCall?.()} variant="circle">
                <PhoneOff className="w-5 h-5" />
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
          <div className="p-6 flex-1 flex flex-col justify-between">
            {/* Top timer bar */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 dark:text-emerald-450">Active Call</span>
              </div>
              <div className="font-mono text-zinc-700 dark:text-zinc-400 font-semibold">{formatTime(callSeconds)}</div>
            </div>

            {/* Avatar & Info */}
            <div className="flex flex-col items-center text-center my-auto">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-brand-100 to-brand-50 dark:from-zinc-900 dark:to-zinc-950 border border-brand-200 dark:border-zinc-800 flex items-center justify-center shadow-xl">
                <span className="text-3xl font-extrabold text-brand-700 dark:text-brand-350">{displayName.charAt(0)}</span>
              </div>
              <h2 className="mt-5 text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{displayName}</h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-mono">{phoneNumber}</p>

              {/* Waveform feedback representing volume/speaking state */}
              <div className="w-full max-w-[280px] h-12 mt-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 flex items-end justify-center px-2 overflow-hidden shadow-inner">
                {Array.from({ length: 30 }).map((_, i) => {
                  const base = 4;
                  const wave = Math.abs(Math.sin(i * 0.3 + (Date.now() / 300)));
                  const h = Math.max(base, Math.min(38, base + wave * (6 + volumeLevel * 75)));
                  return <div key={i} className="w-1.5 mx-0.5 bg-brand-500 dark:bg-brand-450 rounded-t" style={{ height: `${h}px` }} />;
                })}
              </div>

              <BookingProgressTimeline step="talking" />
            </div>

            {/* Footer widgets */}
            <div className="mt-auto pt-6 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center gap-4">
              <div className="flex gap-4">
                <ActionButton ariaLabel="Mute" label="Mute">
                  <MicOff className="w-5 h-5" />
                </ActionButton>
                <ActionButton ariaLabel="Speaker" label="Speaker">
                  <Volume2 className="w-5 h-5" />
                </ActionButton>
              </div>
              <ActionButton ariaLabel="End call" label="" onClick={() => onEndCall?.()} variant="circle">
                <PhoneOff className="w-5 h-5" />
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
    if (!cat) return { emoji: '📍', label: 'Place', color: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/30' };
    const c = cat.toLowerCase();
    if (c.includes('hospital') || c.includes('doctor')) return { emoji: '🏥', label: 'Hospital', color: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-300 border-rose-100 dark:border-rose-900/30' };
    if (c.includes('saloon') || c.includes('salon') || c.includes('hair')) return { emoji: '💇', label: 'Salon', color: 'bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-300 border-brand-100 dark:border-brand-900/30' };
    if (c.includes('restaurant') || c.includes('food')) return { emoji: '🍽️', label: 'Restaurant', color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-300 border-amber-100 dark:border-amber-900/30' };
    return { emoji: '📍', label: cat, color: 'bg-zinc-100 dark:bg-zinc-800/20 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/30' };
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
    <div className="h-full w-full relative flex flex-col overflow-hidden bg-slate-50 dark:bg-[#09090b] transition-colors duration-300">
      {/* Top Floating Geoapify Category Search Bar & Location Access */}
      {mode === ViewMode.MAP && !phoneVisible && (
        <div className="absolute top-4 left-4 right-4 z-30 flex flex-col gap-2.5 max-w-xl mx-auto pointer-events-auto">
          {/* Search Box & GPS Buttons */}
          <div className="flex items-center gap-2">
            {onGoHome && (
              <button
                onClick={onGoHome}
                title="Return to Home Page"
                className="px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white backdrop-blur-md shadow-md hover:scale-[1.02] shrink-0 font-sans"
                type="button"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Home</span>
              </button>
            )}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 flex items-center shadow-lg">
              <input
                type="text"
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                placeholder="Search hospitals, salons, restaurants..."
                className="w-full pl-10 pr-24 py-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-transparent transition-all shadow-inner"
              />
              <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <button
                type="submit"
                className="absolute right-2 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1"
              >
                {isSearching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Search'
                )}
              </button>
            </form>

            <button
              onClick={onRequestLocation}
              title={locationPermissionStatus === 'granted' ? 'Location Active' : 'Access Device Location'}
              className={`px-3.5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border backdrop-blur-md shadow-md shrink-0 hover:scale-[1.02] ${
                locationPermissionStatus === 'granted'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-400/25'
                  : locationPermissionStatus === 'loading'
                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 animate-pulse'
                  : 'bg-white/95 dark:bg-zinc-900/95 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              {locationPermissionStatus === 'loading' ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Compass className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{locationPermissionStatus === 'granted' ? 'Near Me' : 'GPS'}</span>
            </button>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: 'all', label: 'All Places', icon: <Grid className="w-3 h-3" /> },
              { id: 'hospital', label: 'Hospitals', icon: <span>🏥</span> },
              { id: 'saloon', label: 'Salons', icon: <span>💇</span> },
              { id: 'restaurant', label: 'Restaurants', icon: <span>🍽️</span> },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border backdrop-blur-md shadow-md hover:scale-[1.02] ${
                  activeCategory === cat.id
                    ? 'bg-brand-600 dark:bg-brand-500 border-brand-500 text-white dark:text-zinc-950 shadow-brand-500/10'
                    : 'bg-white/95 dark:bg-zinc-900/90 border-zinc-200/80 dark:border-zinc-800 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Booking Draft Banner */}
      {bookingDetails && !phoneVisible && (() => {
        const selectedPlace = places.find(p => p.id === bookingDetails.placeId);
        const isRestaurant = (selectedPlace?.category === 'restaurant') || (bookingDetails.placeName && (bookingDetails.placeName.toLowerCase().includes('restaurant') || bookingDetails.placeName.toLowerCase().includes('dining') || bookingDetails.placeName.toLowerCase().includes('cafe') || bookingDetails.placeName.toLowerCase().includes('bistro') || bookingDetails.placeName.toLowerCase().includes('bhavan') || bookingDetails.placeName.toLowerCase().includes('food') || bookingDetails.placeName.toLowerCase().includes('route')));
        const showGuests = !!bookingDetails.guests || isRestaurant;

        return (
          <div className="absolute top-28 left-4 right-4 z-30 max-w-xl mx-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-4 shadow-xl pointer-events-auto">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 font-bold">Booking Details Draft</div>
                <div className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
                  {bookingDetails.placeName || 'Select a place'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] rounded-full px-2.5 py-0.5 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                  {bookingDetails.status}
                </div>
                {onCloseBooking && (
                  <button
                    onClick={onCloseBooking}
                    className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center transition-colors border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm"
                    title="Close Booking Request"
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-3.5 grid gap-2.5 text-xs text-zinc-600 dark:text-zinc-300 grid-cols-3">
              <div className="rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850/80 p-2">
                <span className="block text-zinc-400 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-wider">Service</span>
                <span className="truncate font-semibold text-zinc-800 dark:text-white mt-0.5 block">{bookingDetails.service || '—'}</span>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850/80 p-2">
                <span className="block text-zinc-400 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-wider">Date</span>
                <span className="font-semibold text-zinc-800 dark:text-white mt-0.5 block">{bookingDetails.date || '—'}</span>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850/80 p-2">
                <span className="block text-zinc-400 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-wider">Time</span>
                <span className="truncate font-semibold text-zinc-800 dark:text-white mt-0.5 block">{bookingDetails.time || '—'}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dynamic 80% / 20% Division Layout */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative z-0">
        <div className={`w-full transition-all duration-500 ${hasChosenLocation ? 'h-[75%]' : 'h-full'} ${phoneVisible ? 'pointer-events-none opacity-60' : 'pointer-events-auto'} relative z-0 overflow-hidden`}>
          <MapComponent
            places={displayedPlaces}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={onSelectPlace}
            userLocation={userLocation}
          />
        </div>

        {/* Bottom Section (25%): List of shops near chosen location */}
        {hasChosenLocation && (
          <div className="h-[25%] w-full bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-900 p-4 overflow-y-auto z-20 flex flex-col shrink-0 relative pointer-events-auto transition-colors duration-300">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
              <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <span>Shops Near Location</span>
                <span className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30 rounded-full text-[9px] font-mono">{displayedPlaces.length} found</span>
              </h3>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Select a provider to start booking</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto flex-1 pr-1">
              {displayedPlaces.map(place => {
                const badge = getPlaceBadge(place.category);
                const isSelected = selectedPlaceId === place.id;
                return (
                  <div
                    key={place.id}
                    onClick={() => onSelectPlace(place.id)}
                    className={`p-3 rounded-2xl cursor-pointer border flex justify-between items-center transition-all hover:scale-[1.01] ${
                      isSelected
                        ? 'bg-brand-50/20 dark:bg-brand-950/10 border-brand-400/80 dark:border-brand-500/50 text-zinc-900 dark:text-white premium-shadow ring-1 ring-brand-400/30'
                        : 'bg-slate-50/50 dark:bg-zinc-900/40 border-zinc-150 dark:border-zinc-850 hover:bg-slate-100/60 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-150 dark:border-zinc-700/50 flex items-center justify-center text-base shrink-0 shadow-sm">
                        {badge.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-zinc-800 dark:text-white text-xs truncate">{place.name}</span>
                          <span className={`px-1.5 py-0.2 text-[8px] font-bold uppercase rounded border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{place.address}</div>
                        <div className="text-[10px] font-mono text-brand-600 dark:text-brand-400 mt-1 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {place.phoneNumber}
                          </span>
                          {isSelected && <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Selected</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900/30 shadow-sm">
                        <Star className="h-3 w-3 fill-current text-amber-500" />
                        {place.rating}
                      </span>
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

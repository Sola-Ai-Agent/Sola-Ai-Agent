import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { base64ToFloat32Array, float32ArrayToBase64, INPUT_SAMPLE_RATE, PCM_SAMPLE_RATE } from './utils/audioUtils';
import { 
  ai, 
  searchPlacesWithGrounding, 
  getUserSystemInstruction, 
  getReceptionistSystemInstruction,
  userTools,
  receptionistTools
} from './services/geminiService';
import VoiceControls from './components/VoiceControls';
import DynamicPanel from './components/DynamicPanel';
import HomePage from './components/HomePage';
import { addToGoogleCalendar, sendCalendarEmail } from './services/calendarClient';
import { fetchPlacesFromGeoapify, geocodeLocation, extractLocationFromQuery, searchPlacesSmart } from './services/geoapifyService';
import { ViewMode, Place, Appointment, Message, SessionMode, BookingDetails } from './types';

const App: React.FC = () => {
  // Default places (used as the single source of truth for the demo)
  const DEFAULT_PLACES: Place[] = [
    { id: '1', name: 'Chennai Classic Saloon', address: '12, Anna Salai, Chennai', phoneNumber: '+91 98765 43210', rating: 4.5, userRatingCount: 120, location: { lat: 13.0827, lng: 80.2707 } },
    { id: '2', name: 'Velachery Spa & Saloon', address: '45, Bypass Rd, Velachery', phoneNumber: '044 2244 6688', rating: 4.2, userRatingCount: 85, location: { lat: 12.9815, lng: 80.2180 } },
    { id: '3', name: 'Style Cuts', address: '8, T Nagar, Chennai', phoneNumber: '+91 91234 56789', rating: 4.8, userRatingCount: 340, location: { lat: 13.0418, lng: 80.2341 } },
    { id: '4', name: 'Green Trends', address: 'Mylapore, Chennai', phoneNumber: '044 2468 1357', rating: 4.3, userRatingCount: 210, location: { lat: 13.0368, lng: 80.2676 } },
    { id: '5', name: 'Naturals', address: 'Adyar, Chennai', phoneNumber: '+91 99887 76655', rating: 4.6, userRatingCount: 190, location: { lat: 13.0012, lng: 80.2565 } },
  ];
  // State
  const [showHomePage, setShowHomePage] = useState<boolean>(true);
  const [sessionMode, setSessionMode] = useState<SessionMode>(SessionMode.USER);
  const [isActive, setIsActive] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.MAP);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [places, setPlaces] = useState<Place[]>(DEFAULT_PLACES);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'hospital' | 'saloon' | 'restaurant'>('all');
  
  // Geolocation State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'loading'>('prompt');
  const userLocationRef = useRef<{lat: number, lng: number} | undefined>(undefined);

  const requestDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocationPermissionStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        userLocationRef.current = coords;
        setLocationPermissionStatus('granted');
        console.log("Device Geolocation Granted:", coords);
        try { addSystemMessage(`🎯 Device location acquired: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`); } catch (e) {}
        // Automatically refresh places search near user acquired location
        fetchPlacesFromGeoapify('all', coords).then(results => {
          setPlaces(results);
          try { addSystemMessage(`✨ Displaying ${results.length} shops found around your location.`); } catch (e) {}
        });
      },
      (err) => {
        console.warn("Geolocation Error:", err);
        setLocationPermissionStatus('denied');
        try { addSystemMessage("⚠️ Location permission denied or unavailable. Using default location."); } catch (e) {}
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Automatically request device location access on app load
  useEffect(() => {
    requestDeviceLocation();
  }, []);

  // Booking State
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [appointment, setAppointment] = useState<Appointment | undefined>(undefined);
  const [lastCallStatus, setLastCallStatus] = useState<string | undefined>(undefined);

  // Refs for State Access inside Callbacks
  const bookingDetailsRef = useRef<BookingDetails | null>(null);
  const dialingTriggeredRef = useRef<boolean>(false);
  // Refs to avoid stale closures for places and selectedPlaceId inside live message handlers
  const placesRef = useRef<Place[]>(DEFAULT_PLACES);
  const selectedPlaceIdRef = useRef<string | undefined>(undefined);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback Refs
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // Session Ref
  const sessionRef = useRef<Promise<any> | null>(null);
  const connectedRef = useRef(false);

  // Keep Ref in sync with State
  useEffect(() => {
    bookingDetailsRef.current = bookingDetails;
  }, [bookingDetails]);

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  useEffect(() => {
    selectedPlaceIdRef.current = selectedPlaceId;
  }, [selectedPlaceId]);

  // Helper: Safely merge booking details without overwriting known values
  const updateBookingDetails = (newDetails: Partial<BookingDetails>) => {
    setBookingDetails(prev => {
      const prevSafe = prev ?? { placeId: '', placeName: '', service: '', date: '', time: '', status: 'draft' as const };
      const merged: BookingDetails = { ...prevSafe } as BookingDetails;

      const changes: string[] = [];
      Object.entries(newDetails).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          if ((merged as any)[key] !== value) {
            (merged as any)[key] = value;
            changes.push(`${key}=${value}`);
          }
        }
      });

      // Ensure status defaults to draft if not present
      if (!merged.status) merged.status = (newDetails.status || 'draft') as BookingDetails['status'];

      // Update ref immediately so callers using bookingDetailsRef see latest
      bookingDetailsRef.current = merged;

      if (changes.length > 0) {
        const msg = `Booking draft updated: ${changes.join(', ')}`;
        console.log(msg, merged);
        try { addSystemMessage(msg); } catch (e) { console.log('addSystemMessage failed', e); }
      } else {
        console.log('updateBookingDetails: no changes to booking draft');
      }

      return merged;
    });
  };

  // If an external "information" object (bookingDetails) appears with negotiating status,
  // automatically transition to the receptionist call. Pass the details object explicitly
  // through the transition path to avoid any timing/ref staleness issues.
  useEffect(() => {
    if (bookingDetails && bookingDetails.status === 'negotiating' && sessionMode === SessionMode.USER && !dialingTriggeredRef.current) {
      dialingTriggeredRef.current = true;
      // Slight delay to allow UI to update before connecting
      setTimeout(() => {
        transitionToReceptionist(bookingDetails);
      }, 300);
    }
  }, [bookingDetails, sessionMode]);

  // Initialize Audio Output Context
  useEffect(() => {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    outputAudioContextRef.current = new Ctx({ sampleRate: PCM_SAMPLE_RATE });
  }, []);

  // --- CONNECTION MANAGER ---

  // NOTE: This function is recreated on render, but we need to be careful about stale state in closures.
  // We use refs (bookingDetailsRef) to ensure we always get the latest data.
  const connectToLiveAPI = async (mode: SessionMode, detailsParam?: BookingDetails) => {
    try {
      // Cleanup previous session if any
      await disconnectLiveAPI(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new Ctx({ sampleRate: INPUT_SAMPLE_RATE });
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      // Config Selection
      let systemInstruction = "";
      let tools: any[] = [];
      
      if (mode === SessionMode.USER) {
        systemInstruction = getUserSystemInstruction(lastCallStatus);
        tools = userTools;
        console.log("Connecting as USER");
      } else {
        // Receptionist Mode - Always use the latest bookingDetailsRef, NOT the stale detailsParam
        // This ensures we have the most recent details that were merged/updated
        const currentDetails = bookingDetailsRef.current;
        console.log('connectToLiveAPI: receptionist mode - using bookingDetailsRef.current =', currentDetails, '(ignoring potentially stale detailsParam)');
        if (!currentDetails) {
            console.error("No booking details found for receptionist call.");
            addSystemMessage('No booking details available to call receptionist.');
            throw new Error("No booking details for call");
        }
        systemInstruction = getReceptionistSystemInstruction(currentDetails);
        tools = receptionistTools;
        console.log("Connecting as RECEPTIONIST to:", currentDetails.placeName, "for", currentDetails.service, "on", currentDetails.date, "at", currentDetails.time);
      }

      // Connect Live API
      sessionRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log(`Connected to Live API [${mode}]`);
            connectedRef.current = true;
            setIsActive(true);
            setSessionMode(mode);
          },
          onmessage: async (message: LiveServerMessage) => {
            // We need to pass the *current* mode from the closure when this listener was created
            handleLiveMessage(message, mode);
          },
          onclose: () => {
            console.log(`Live API disconnected [${mode}]`);
            connectedRef.current = false;
            setIsActive(false);
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            connectedRef.current = false;
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          tools: tools,
        }
      });

      // Start processing audio input
      processorRef.current.onaudioprocess = (e) => {
        if (!connectedRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Volume Visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        setVolumeLevel(Math.sqrt(sum / inputData.length));

        // Send to API
        const base64Data = float32ArrayToBase64(inputData);
        sessionRef.current?.then(session => {
          session.sendRealtimeInput({
            media: {
              mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
              data: base64Data
            }
          });
        });
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

    } catch (err) {
      console.error("Failed to connect:", err);
      addSystemMessage('Failed to connect live API: ' + String(err));
      try { alert("Could not access microphone or connect to Gemini: " + String(err)); } catch(e) { console.error('alert failed', e); }
      // allow future dialing attempts
      dialingTriggeredRef.current = false;
    }
  };

  const disconnectLiveAPI = async (resetUI = true) => {
    console.log('disconnectLiveAPI: starting');
    connectedRef.current = false;
    
    if (sessionRef.current) {
        const session = await sessionRef.current;
        // Try close if available
        if (session && typeof session.close === 'function') {
           session.close();
        }
        sessionRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (resetUI) {
      setIsActive(false);
      setVolumeLevel(0);
    }
    console.log('disconnectLiveAPI: completed');
  };

  // --- MESSAGE HANDLER ---

  const handleLiveMessage = async (message: LiveServerMessage, currentMode: SessionMode) => {
    // 1. Play Audio
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      playAudioResponse(audioData);
    }

    // 1.b Parse any assistant text in the model turn and attempt to extract booking details
    try {
      const parts = message.serverContent?.modelTurn?.parts || [];
      let combinedText = '';
      for (const p of parts as any[]) {
        if (!p) continue;
        if (typeof p === 'string') combinedText += ' ' + p;
        else if (p.content && typeof p.content === 'string') combinedText += ' ' + p.content;
        else if (p.displayText) combinedText += ' ' + p.displayText;
        else if (p.text) combinedText += ' ' + p.text;
        else if (p.inlineText) combinedText += ' ' + p.inlineText;
        else if (p.serverMessage && typeof p.serverMessage === 'string') combinedText += ' ' + p.serverMessage;
      }
      combinedText = combinedText.trim();
      if (combinedText) {
        // heuristics: extract YYYY-MM-DD, HH:MM, and common service keywords
        const dateMatch = combinedText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        const timeMatch = combinedText.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
        const serviceMatch = combinedText.match(/\b(haircut|spa|massage|trim|color|shave|facial|pedicure|manicure|consultation|therapy|lunch|dinner|breakfast|food|dining|table)\b/i);
        const guestMatch = combinedText.match(/\b(\d+)\s*(?:people|persons|guests|members|members of party|table for|per|person|pax)\b/i);
        const emailMatch = combinedText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
        const parsed: Partial<BookingDetails> = {};
        if (serviceMatch) parsed.service = serviceMatch[0];
        if (dateMatch) parsed.date = dateMatch[0];
        if (timeMatch) parsed.time = timeMatch[0];
        if (guestMatch) parsed.guests = guestMatch[1];
        if (emailMatch) parsed.email = emailMatch[1];
        if (Object.keys(parsed).length > 0) {
          console.log('handleLiveMessage: parsed assistant text for booking details:', parsed, 'from:', combinedText);
          updateBookingDetails(parsed);
        }
      }
    } catch (e) {
      console.warn('handleLiveMessage: error parsing assistant text for booking details', e);
    }

    // 2. Handle Tools
    const toolCall = message.toolCall;
    if (toolCall) {
      for (const fc of toolCall.functionCalls) {
        console.log(`Function Called [${currentMode}]:`, fc.name, fc.args);
        // Defensive parsing: some live messages serialize function args as JSON strings.
        let parsedArgs: any = fc.args;
        try {
          if (typeof fc.args === 'string') {
            parsedArgs = JSON.parse(fc.args);
            console.log('Parsed function args from stringified JSON:', parsedArgs);
          }
        } catch (parseErr) {
          console.warn('Failed to parse function call args, using raw args:', parseErr, fc.args);
          parsedArgs = fc.args;
        }

        let result: any = { status: 'ok' };

        // --- USER MODE TOOLS ---
        if (currentMode === SessionMode.USER) {
            if (fc.name === 'findPlaces') {
              const query = parsedArgs?.query;
                addSystemMessage(`Searching for "${query}"...`);
                setViewMode(ViewMode.MAP);
                setActiveCategory('all');
                const foundPlaces = await searchPlacesWithGrounding(query, userLocationRef.current);
                setPlaces(foundPlaces);
                result = { 
                  found_count: foundPlaces.length,
                  places: foundPlaces.map(p => ({
                    id: p.id,
                    name: p.name,
                    address: p.address,
                    rating: p.rating,
                    phoneNumber: p.phoneNumber
                  }))
                };
            } 
            else if (fc.name === 'selectProvider') {
              const pid = parsedArgs?.providerId;
                setSelectedPlaceId(pid);
                selectedPlaceIdRef.current = pid;
              const place = placesRef.current.find(p => p.id === pid);
              console.log('selectProvider: providerId=', pid, 'places.length=', placesRef.current.length);
              console.log('selectProvider: found place =', place);
              
              // NEW: Create or merge booking state immediately when provider is selected
              if (place) {
                updateBookingDetails({
                  placeId: place.id,
                  placeName: place.name
                });
                console.log('selectProvider: booking state created/updated with provider', place.id, place.name);
                addSystemMessage(`Selected ${place.name}. Ask for date/time to proceed.`);
                result = { selected: place.name, phoneNumber: place.phoneNumber };
              } else {
                // If the provider id isn't in the current places list (voice may reference external id),
                // attempt to match by provided name (voice may provide a human-readable name).
                const providedName = parsedArgs?.providerName || parsedArgs?.provider || pid;
                console.log('selectProvider: provider not found by id, attempting name match for:', providedName);
                let matched = undefined as Place | undefined;
                if (providedName && typeof providedName === 'string') {
                  const pn = providedName.trim().toLowerCase();
                  matched = placesRef.current.find(p => p.name && p.name.toLowerCase() === pn) || placesRef.current.find(p => p.name && p.name.toLowerCase().includes(pn));
                }

                if (matched) {
                  // Use matched place id and update state
                  setSelectedPlaceId(matched.id);
                  selectedPlaceIdRef.current = matched.id;
                  updateBookingDetails({ placeId: matched.id, placeName: matched.name });
                  console.log('selectProvider: matched provided name to place', matched.id, matched.name);
                  addSystemMessage(`Selected ${matched.name} (matched by name). Ask for date/time to proceed.`);
                  result = { selected: matched.name, phoneNumber: matched.phoneNumber };
                } else {
                  // No match found - create draft with provided info so flow can continue
                  updateBookingDetails({
                    placeId: pid,
                    placeName: providedName
                  });
                  console.log('selectProvider: provider not in places list, created draft with provided id/name', pid, providedName);
                  addSystemMessage(`Selected ${providedName}. Booking draft updated.`);
                  result = { selected: providedName };
                }
              }
            }
            else if (fc.name === 'initiateCall') {
              console.log('initiateCall: current places length=', placesRef.current.length, 'places=', placesRef.current.map(p => p.id));
                const { placeId, service, date, time, guests, email } = parsedArgs || {};
                // Diagnostic logging to help track undefined placeId issues
                console.log('initiateCall: raw args =', fc.args, 'parsedArgs =', parsedArgs);
                const draftForLog = bookingDetailsRef.current;
                console.log('initiateCall: currentDraft =', draftForLog, 'selectedPlaceId =', selectedPlaceIdRef.current);
                if (!placeId) {
                  console.warn('initiateCall: provided placeId is undefined or empty');
                  addSystemMessage('Debug: initiateCall received no placeId from the assistant. Using draft or selected place if available.');
                }
                // Prioritize the current booking draft, then the selected provider, then the tool args.
                const currentDraft = bookingDetailsRef.current;
                const targetPlaceId = currentDraft?.placeId || selectedPlaceIdRef.current || placeId;
                console.log('initiateCall: selectedPlaceId=', selectedPlaceIdRef.current, 'providedPlaceId=', placeId, 'using targetPlaceId=', targetPlaceId);

                let place = placesRef.current.find(p => p.id === targetPlaceId);

                if (!place) {
                  if (!currentDraft && placesRef.current.length > 0) {
                    // If the provided id doesn't match any default place (e.g., a Google Maps id),
                    // ignore it and fall back to the first default place.
                    console.warn('initiateCall: target placeId not found in default places, falling back to first default place. targetPlaceId=', targetPlaceId);
                    place = placesRef.current[0];
                  } else {
                    // No default places available — return an explicit error so flow can handle it.
                    console.warn('initiateCall: no default places available to fallback to');
                  }
                }

                if (place || currentDraft) {
                  // Merge details instead of replacing, preserving any existing booking state.
                  // Prioritize provided values over draft, fall back to draft for missing values
                  const newDetails: Partial<BookingDetails> = {
                    placeId: place?.id || currentDraft?.placeId || '',
                    placeName: place?.name || currentDraft?.placeName || '',
                    service: service || currentDraft?.service || '',
                    date: date || currentDraft?.date || '',
                    time: time || currentDraft?.time || '',
                    guests: guests || currentDraft?.guests || '',
                    email: email || currentDraft?.email || '',
                    status: 'negotiating'
                  };
                  
                  // Validate that all required details are available
                  // Note: empty strings are falsy, so this catches both undefined and empty string cases
                  const missing: string[] = [];
                  const hasSvc = newDetails.service && newDetails.service.trim() !== '';
                  const hasDate = newDetails.date && newDetails.date.trim() !== '';
                  const hasTime = newDetails.time && newDetails.time.trim() !== '';
                  const hasShop = (newDetails.placeId && newDetails.placeId.trim() !== '') || (newDetails.placeName && newDetails.placeName.trim() !== '');
                  
                  if (!hasSvc) missing.push('Service');
                  if (!hasDate) missing.push('Date');
                  if (!hasTime) missing.push('Time');
                  if (!hasShop) missing.push('Shop/Provider');

                  // Restaurant validation for number of guests/persons
                  const isRestaurant = 
                    (place?.category === 'restaurant') ||
                    (place?.name && (place.name.toLowerCase().includes('restaurant') || place.name.toLowerCase().includes('dining') || place.name.toLowerCase().includes('cafe') || place.name.toLowerCase().includes('bistro') || place.name.toLowerCase().includes('bhavan') || place.name.toLowerCase().includes('food') || place.name.toLowerCase().includes('route'))) ||
                    (currentDraft?.placeName && (currentDraft.placeName.toLowerCase().includes('restaurant') || currentDraft.placeName.toLowerCase().includes('dining') || currentDraft.placeName.toLowerCase().includes('cafe') || currentDraft.placeName.toLowerCase().includes('bistro') || currentDraft.placeName.toLowerCase().includes('bhavan') || currentDraft.placeName.toLowerCase().includes('food') || currentDraft.placeName.toLowerCase().includes('route')));

                  if (isRestaurant && (!newDetails.guests || newDetails.guests.trim() === '')) {
                    missing.push('Number of guests (persons)');
                  }

                  if (missing.length > 0) {
                    const missingMsg = `Cannot book yet. Missing: ${missing.join(', ')}. Please provide these details first.`;
                    console.warn('initiateCall: missing required details:', missing, 'provided:', { service, date, time, placeId, guests, email }, 'draft:', currentDraft);
                    addSystemMessage(missingMsg);
                    result = { error: missingMsg };
                  } else {
                    // All required details present - proceed with booking
                    console.log('initiateCall: validation passed, details ready:', { service: newDetails.service, date: newDetails.date, time: newDetails.time, placeName: newDetails.placeName, guests: newDetails.guests });
                    updateBookingDetails(newDetails);
                    
                    // Get the updated details for transition
                    const updatedDetails = bookingDetailsRef.current;
                    const needsGuests = isRestaurant && (!updatedDetails?.guests || updatedDetails.guests.trim() === '');
                    
                    if (updatedDetails && updatedDetails.service?.trim() && updatedDetails.date?.trim() && updatedDetails.time?.trim() && !needsGuests) {
                      // Update ref and state to ensure status is 'negotiating'
                      updatedDetails.status = 'negotiating';
                      setBookingDetails(updatedDetails);
                      bookingDetailsRef.current = updatedDetails;
                      console.log('initiateCall: final booking details verified:', updatedDetails);
                      
                      // Show complete booking summary before dialing
                      const guestInfo = updatedDetails.guests ? ` for ${updatedDetails.guests} persons` : '';
                      addSystemMessage(`Booking confirmed: ${updatedDetails.service}${guestInfo} at ${updatedDetails.placeName} on ${updatedDetails.date} at ${updatedDetails.time}. Dialing receptionist...`);
                      console.log('initiateCall: all details present and verified, transitioning to receptionist');

                      result = { status: 'switching_session' };
                      transitionToReceptionist(updatedDetails);
                    } else {
                      console.warn('initiateCall: validation passed but details became empty after merge:', updatedDetails);
                      addSystemMessage('Warning: Booking details became incomplete after merge. Please provide service, date, and time.');
                      result = { error: 'Booking details incomplete after merge' };
                    }
                  }
                } else {
                  result = { error: 'Place not found' };
                }
            }
        } 
        
        // --- RECEPTIONIST MODE TOOLS ---
        else if (currentMode === SessionMode.RECEPTIONIST) {
            if (fc.name === 'reportBookingOutcome') {
                const { success, finalDate, finalTime, notes } = fc.args as any;
                
                // Get fresh details from ref
                const details = bookingDetailsRef.current;
                
                if (success && details) {
                    const newAppt: Appointment = {
                        id: Date.now().toString(),
                        providerId: details.placeId,
                        providerName: details.placeName,
                        date: new Date(`${finalDate || details.date}T${finalTime || details.time}`),
                        serviceType: details.service
                    };
                    setAppointment(newAppt);
                    setLastCallStatus("Success: Booking confirmed.");
                    setViewMode(ViewMode.CALENDAR);
                    
                    // Add to Google Calendar (async)
                    addToGoogleCalendar(newAppt).then((res:any) => {
                      console.log('[CALENDAR] addToGoogleCalendar result:', res);
                      addSystemMessage('✓ Booking added to your Google Calendar');
                    }).catch((err:any) => {
                      console.error('[CALENDAR] addToGoogleCalendar error:', err);
                      addSystemMessage('❌ Calendar: ' + (err?.message || JSON.stringify(err)));
                    });
                    
                    // Automated Resend Email dispatch if we have an API Key and user email
                    if (process.env.RESEND_API_KEY && details.email) {
                      sendCalendarEmail(newAppt, details.email).then(ok => {
                        if (ok) {
                          addSystemMessage(`✓ Automatically sent calendar invite to ${details.email}`);
                        }
                      });
                    }
                    
                    // IMPORTANT: Update status to stop Dialing UI when we switch back
                    const updatedDetails = { ...details, status: 'confirmed' as const };
                    setBookingDetails(updatedDetails);
                    bookingDetailsRef.current = updatedDetails;

                } else {
                    setLastCallStatus(`Failed: ${notes || "Receptionist unavailable"}`);
                    if (details) {
                        const updatedDetails = { ...details, status: 'failed' as const };
                        setBookingDetails(updatedDetails);
                        bookingDetailsRef.current = updatedDetails;
                    }
                }
                
                result = { status: 'call_ended' };
                
                // TRANSITION: Disconnect Receptionist, Back to User
                transitionToUser();
            }
        }

        // Send Tool Response
        try {
          sessionRef.current?.then(session => {
            console.log('sending tool response for', fc.name, 'id=', fc.id, 'result=', result, 'session=', session);
            session.sendToolResponse({
              functionResponses: [
                {
                  id: fc.id,
                  name: fc.name,
                  response: result
                }
              ]
            });
          }).catch((err:any) => {
            console.error('Error resolving sessionRef when sending tool response:', err);
            addSystemMessage('Error sending tool response: ' + String(err));
          });
        } catch (err) {
          console.error('Exception sending tool response:', err);
          addSystemMessage('Exception sending tool response: ' + String(err));
        }
      }
    }
  };

  // Helper to handle transitions with delays, ensuring we call the main connect function
  // We use references to class-level methods or stable functions
    const transitionToReceptionist = (details?: BookingDetails) => {
       console.log('transitionToReceptionist: scheduled in 3s with details =', details);
       // If caller passed details, ensure state/ref are set immediately so connect path has them.
       if (details) {
         setBookingDetails(details);
         bookingDetailsRef.current = details;
         addSystemMessage('Preparing to call: ' + details.placeName);
       }
       // mark that dialing was triggered (prevents duplicate triggers)
       dialingTriggeredRef.current = true;
       setTimeout(() => {
          try {
            console.log('transitionToReceptionist: invoking handleSessionTransition(RECEPTIONIST)');
            handleSessionTransition(SessionMode.RECEPTIONIST, details);
          } catch (e) {
            console.error('transitionToReceptionist: error calling handleSessionTransition', e);
            addSystemMessage('Error transitioning to receptionist: ' + String(e));
            // allow retry
            dialingTriggeredRef.current = false;
          }
       }, 3000); // 3 seconds dialing time
    };

  const transitionToUser = () => {
      setTimeout(() => {
        // allow future dialing flows to trigger again
        dialingTriggeredRef.current = false;
        handleSessionTransition(SessionMode.USER);
      }, 1500);
  };

  const handleSessionTransition = async (nextMode: SessionMode, detailsParam?: BookingDetails) => {
    console.log('handleSessionTransition: nextMode=', nextMode, 'detailsParam=', detailsParam);
    // 1. Disconnect current
    console.log('handleSessionTransition: calling disconnectLiveAPI');
    await disconnectLiveAPI(false);
    console.log('handleSessionTransition: disconnectLiveAPI completed');
    
    // 2. Short delay for clean audio break
    await new Promise(r => setTimeout(r, 500));
    
    // 3. Connect next (pass details through)
    console.log('handleSessionTransition: connecting to nextMode', nextMode);
    await connectToLiveAPI(nextMode, detailsParam);
  };

  const playAudioResponse = async (base64Data: string) => {
    if (!outputAudioContextRef.current) return;
    try {
        const float32Data = base64ToFloat32Array(base64Data);
        const buffer = outputAudioContextRef.current.createBuffer(1, float32Data.length, PCM_SAMPLE_RATE);
        buffer.getChannelData(0).set(float32Data);
        const source = outputAudioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(outputAudioContextRef.current.destination);
        const now = outputAudioContextRef.current.currentTime;
        const startTime = Math.max(now, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
    } catch (e) {
        console.error("Error playing audio", e);
    }
  };

  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9), role: 'system', text, timestamp: new Date() }]);
  };

  const handleToggle = () => {
    if (isActive) {
      disconnectLiveAPI(true);
      setSessionMode(SessionMode.USER); // Reset to User mode on full stop
    } else {
      // Always start as User
      connectToLiveAPI(SessionMode.USER);
    }
  };

  // --- New: End-call handler exposed to DynamicPanel ---
  const handleEndCall = async () => {
    console.log('handleEndCall: user requested to end call');
    // disconnect the live session and reset UI
    await disconnectLiveAPI(true);
    setSessionMode(SessionMode.USER);

    // If we had an in-progress booking (negotiating) and no confirmed appointment, cancel it
    const current = bookingDetailsRef.current;
    if (current && current.status === 'negotiating') {
      const updated = { ...current, status: 'failed' as const };
      setBookingDetails(updated);
      bookingDetailsRef.current = updated;
      setAppointment(undefined);
      setLastCallStatus('Cancelled: call ended before confirmation.');
      addSystemMessage('Booking cancelled because call was ended before confirmation.');
    }

    dialingTriggeredRef.current = false;
  };

  // Allow UI to explicitly cancel booking without touching call (hook for a "Cancel" control if needed)
  const handleCancelBooking = () => {
    const current = bookingDetailsRef.current;
    if (current && current.status === 'negotiating') {
      const updated = { ...current, status: 'failed' as const };
      setBookingDetails(updated);
      bookingDetailsRef.current = updated;
      setAppointment(undefined);
      setLastCallStatus('Cancelled by user.');
      addSystemMessage('Booking cancelled by user.');
    }
  };

  // DEBUG: helper to simulate an external booking information object and trigger receptionist
  const simulateBookingAndDial = () => {
    const sample: BookingDetails = {
      placeId: 'debug-1',
      placeName: 'Debug Salon',
      service: 'Haircut',
      date: new Date().toISOString().slice(0,10),
      time: '15:30',
      status: 'negotiating'
    };
    setBookingDetails(sample);
    bookingDetailsRef.current = sample;
    addSystemMessage('Debug: injected booking details');
    transitionToReceptionist(sample);
  };

  const handleCloseBooking = () => {
    setBookingDetails(null);
    bookingDetailsRef.current = null;
    dialingTriggeredRef.current = false;
  };

  const handleSendEmail = async (emailAddress: string): Promise<boolean> => {
    if (!appointment) return false;
    addSystemMessage(`Sending calendar invite to ${emailAddress}...`);
    const ok = await sendCalendarEmail(appointment, emailAddress);
    if (ok) {
      addSystemMessage(`✓ Calendar invite sent successfully to ${emailAddress}`);
    } else {
      addSystemMessage(`❌ Failed to send invite to ${emailAddress}. Ensure RESEND_API_KEY is configured in your .env file.`);
    }
    return ok;
  };

  const handleSearchPlaces = async (queryOrCategory: string) => {
    try {
      addSystemMessage(`Searching places for "${queryOrCategory}"...`);
      if (['all', 'hospital', 'saloon', 'restaurant'].includes(queryOrCategory)) {
        setActiveCategory(queryOrCategory as any);
      } else {
        setActiveCategory('all');
      }
      const res = await searchPlacesSmart(queryOrCategory, userLocationRef.current);
      setPlaces(res.places);
      const locInfo = res.locationName ? ` at ${res.locationName}` : '';
      addSystemMessage(`📍 Map updated${locInfo}. Found ${res.places.length} places.`);
    } catch (err) {
      console.error('handleSearchPlaces error:', err);
    }
  };

  // Calendar integration is handled in services/calendarClient.ts
  // Only enable calendar action when appointment exists AND bookingDetails status is confirmed
  const calendarAction = (appointment && bookingDetails?.status === 'confirmed') ? (() => addToGoogleCalendar(appointment)) : undefined;

  const visibleMessages = messages.filter(m => m.role !== 'system');

  if (showHomePage) {
    return <HomePage onGetStarted={() => setShowHomePage(false)} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100 font-sans">
      {/* Left Panel: Sola Interface */}
      <div className={`w-1/3 flex flex-col shadow-2xl z-20 transition-colors duration-500 bg-zinc-900/60 border-r border-zinc-800/80 backdrop-blur-md`}>
        <div className="p-6 border-b border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold flex items-center gap-3 tracking-tight">
                <span className={`w-3 h-3 rounded-full ${sessionMode === SessionMode.RECEPTIONIST ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'} shadow-sm`} />
                {sessionMode === SessionMode.USER ? "Sola Assistant" : "Live Call"}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">{sessionMode === SessionMode.USER ? "Regional voice booking assistant" : `Calling: ${bookingDetails?.placeName}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowHomePage(true)} 
                title="Back to Home Page" 
                className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 font-semibold"
                type="button"
              >
                <span>🏠</span>
                <span>Home</span>
              </button>
              <button 
                onClick={() => setMessages([])} 
                title="Clear Chat History" 
                className="text-xs px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg shadow-sm transition-all flex items-center gap-1"
                type="button"
              >
                <span>🗑️</span>
              </button>
              <button onClick={simulateBookingAndDial} className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg shadow-sm transition-all">Debug: Dial</button>
            </div>
          </div>
        </div>
        
        {/* Chat / Transcript Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
           {visibleMessages.length === 0 && sessionMode === SessionMode.USER && (
             <div className="text-center text-zinc-500 mt-10">
               <p className="text-sm">Say "Find a saloon nearby" or click "Enable Location" to start.</p>
             </div>
           )}
           {sessionMode === SessionMode.RECEPTIONIST && (
             <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
                <p className="text-emerald-400 font-bold mb-1">📞 Connected</p>
                <p className="text-sm text-zinc-400">Sola is speaking to the receptionist.</p>
             </div>
           )}
           {visibleMessages.map(msg => (
             <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                 msg.role === 'user' ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-medium shadow-md' : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-100 shadow-sm'
               }`}>
                 {msg.text}
               </div>
             </div>
           ))}
        </div>

        {/* Voice Controls */}
        <div className="p-6 border-t border-zinc-800/80 bg-zinc-900/40">
           <VoiceControls 
             isActive={isActive} 
             onToggle={handleToggle} 
             volumeLevel={volumeLevel}
           />
        </div>
      </div>

      {/* Right Panel: Dynamic Content */}
      <div className="flex-1 relative h-full overflow-hidden z-10">
        <DynamicPanel 
          mode={viewMode}
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={(id) => {
             setSelectedPlaceId(id);
             const place = places.find(p => p.id === id);
             if (place) {
               updateBookingDetails({ placeId: place.id, placeName: place.name });
               console.log('UI selectPlace: booking draft merged with place', place.id);
               addSystemMessage(`Selected ${place.name} via UI. Booking draft updated.`);
             } else {
               console.warn('UI selectPlace: selected place id not found in places array', id);
               addSystemMessage('Selected place not found in current results.');
             }
          }}
          onSearchPlaces={handleSearchPlaces}
          userLocation={userLocation}
          onRequestLocation={requestDeviceLocation}
          locationPermissionStatus={locationPermissionStatus}
          appointment={appointment}
          isCallingReceptionist={sessionMode === SessionMode.RECEPTIONIST}
          bookingDetails={bookingDetails || undefined}
          volumeLevel={volumeLevel}
          // Pass calendar action only when booked & confirmed
          onAddToCalendar={calendarAction}
          // New handlers (DynamicPanel can call these when user presses end/cancel/close)
          onEndCall={handleEndCall}
          onCancelBooking={handleCancelBooking}
          onCloseBooking={handleCloseBooking}
          onGoHome={() => setShowHomePage(true)}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onSendEmail={handleSendEmail}
        />
      </div>
    </div>
  );
};

export default App;

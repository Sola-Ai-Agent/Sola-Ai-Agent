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
import { ViewMode, Place, Appointment, Message, SessionMode, BookingDetails, User, Profile, UserPreferences } from './types';
import { Sparkles, Home, Trash2, PhoneCall, RefreshCw, X, Check, Brain, PhoneIncoming } from 'lucide-react';

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
  
  // Auth & Database States
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sola_token'));
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [bookings, setBookings] = useState<BookingDetails[]>([]);
  const [feedbackBookings, setFeedbackBookings] = useState<BookingDetails[]>([]);
  const [pendingMemory, setPendingMemory] = useState<{ profile: Profile; data: Record<string, any> } | null>(null);

  const profilesRef = useRef<Profile[]>([]);
  const selectedProfileIdRef = useRef<string>('');
  
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);
  
  useEffect(() => {
    selectedProfileIdRef.current = selectedProfileId;
  }, [selectedProfileId]);

  // Load session from localStorage on mount and fetch user data
  useEffect(() => {
    if (token) {
      fetchUserData(token);
    }
  }, [token]);

  const fetchUserData = async (jwtToken: string) => {
    try {
      const userRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      } else {
        onLogout();
        return;
      }

      const profRes = await fetch('/api/profiles', {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      if (profRes.ok) {
        const list = await profRes.json();
        setProfiles(list);
        const me = list.find((p: any) => p.relation === 'Me') || list[0];
        if (me && me._id) {
          setSelectedProfileId(me._id);
        }
      }

      const prefRes = await fetch('/api/preferences', {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      if (prefRes.ok) {
        const prefs = await prefRes.json();
        setPreferences(prefs);
      }

      const bookRes = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      if (bookRes.ok) {
        const list = await bookRes.json();
        setBookings(list);

        const feedRes = await fetch('/api/feedback', {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        if (feedRes.ok) {
          const feedList = await feedRes.json();
          const now = new Date();
          const pending = list.filter((b: any) => {
            if (b.status !== 'confirmed') return false;
            const bTime = new Date(b.dateTime || `${b.date}T${b.time}`);
            if (bTime >= now) return false;
            const hasFeedback = feedList.some((f: any) => f.bookingId === b._id);
            return !hasFeedback;
          });
          setFeedbackBookings(pending);
        }
      }
    } catch (e) {
      console.error('Error fetching user data', e);
    }
  };

  const onLogin = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('sola_token', data.token);
        setToken(data.token);
        setUser(data.user);
        await fetchUserData(data.token);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const onSignup = async (name: string, email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: pass })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('sola_token', data.token);
        setToken(data.token);
        setUser(data.user);
        await fetchUserData(data.token);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const onLogout = () => {
    localStorage.removeItem('sola_token');
    setToken(null);
    setUser(null);
    setProfiles([]);
    setPreferences(null);
    setBookings([]);
    setFeedbackBookings([]);
    setShowHomePage(true);
  };

  const onAddProfile = async (profilePayload: Omit<Profile, 'userId'>) => {
    if (!token) return;
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profilePayload)
      });
      if (res.ok) {
        const profRes = await fetch('/api/profiles', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profRes.ok) {
          const list = await profRes.json();
          setProfiles(list);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onUpdateProfile = async (profilePayload: Profile) => {
    if (!token) return;
    try {
      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profilePayload)
      });
      if (res.ok) {
        const profRes = await fetch('/api/profiles', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profRes.ok) {
          const list = await profRes.json();
          setProfiles(list);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onDeleteProfile = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const profRes = await fetch('/api/profiles', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profRes.ok) {
          const list = await profRes.json();
          setProfiles(list);
          if (selectedProfileId === id && list.length > 0) {
            setSelectedProfileId(list[0]._id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onSavePreferences = async (prefsPayload: UserPreferences) => {
    if (!token) return;
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(prefsPayload)
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onSubmitFeedback = async (bookingId: string, rating: number, comments: string, wouldVisitAgain: boolean) => {
    if (!token) return;
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId, rating, comments, wouldVisitAgain })
      });
      if (res.ok) {
        const bookRes = await fetch('/api/bookings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (bookRes.ok) {
          const list = await bookRes.json();
          setBookings(list);
        }
        const prefRes = await fetch('/api/preferences', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (prefRes.ok) {
          const prefs = await prefRes.json();
          setPreferences(prefs);
        }
        setFeedbackBookings(prev => prev.filter(b => b._id !== bookingId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onBookNew = (profileId: string) => {
    setSelectedProfileId(profileId);
    setBookingDetails(null);
    bookingDetailsRef.current = null;
    setShowHomePage(false);
  };

  const onRebookLast = (lastBooking: BookingDetails) => {
    const rebook: BookingDetails = {
      placeId: lastBooking.placeId,
      placeName: lastBooking.placeName,
      service: lastBooking.service,
      date: new Date().toISOString().slice(0, 10),
      time: lastBooking.time,
      guests: lastBooking.guests || '',
      email: lastBooking.email || '',
      status: 'draft',
      businessCategory: lastBooking.businessCategory,
      categoryDetails: lastBooking.categoryDetails
    };
    setBookingDetails(rebook);
    bookingDetailsRef.current = rebook;
    setShowHomePage(false);
  };

  const scanMessagesForMemory = () => {
    const candidates: Record<string, any> = {};
    const recentMsgs = messages.slice(-15).map(m => m.text.toLowerCase());
    
    for (const text of recentMsgs) {
      const weightMatch = text.match(/weight(?:\s+is|\s+of)?\s*(\d+)/) || text.match(/(\d+)\s*kg/);
      if (weightMatch && weightMatch[1]) {
        candidates.weight = weightMatch[1] + ' kg';
      }

      const bgMatch = text.match(/\b(o\+|o-|a\+|a-|b\+|b-|ab\+|ab-)\b/) || text.match(/\b(o|a|b|ab)\s*(positive|negative)\b/);
      if (bgMatch) {
        candidates.bloodGroup = bgMatch[0].toUpperCase();
      }

      const vehicleNoMatch = text.match(/\b([a-z]{2}\s*\d{2}\s*[a-z]{1,2}\s*\d{4})\b/i);
      if (vehicleNoMatch) {
        candidates.vehicleNumber = vehicleNoMatch[1].toUpperCase().replace(/\s+/g, '');
      }

      const modelMatch = text.match(/\b(honda\s+city|swift|wagonr|creta|i20|fortuner|innova|activa|vespa|bullet)\b/i);
      if (modelMatch) {
        candidates.vehicleModel = modelMatch[0].charAt(0).toUpperCase() + modelMatch[0].slice(1);
      }
    }
    return candidates;
  };

  const handleSaveMemory = async () => {
    if (!pendingMemory || !token) return;
    const { profile, data } = pendingMemory;
    const updatedMetadata = { ...(profile.metadata || {}), ...data };
    const updatedProfile = { ...profile, metadata: updatedMetadata };

    try {
      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedProfile)
      });
      if (res.ok) {
        addSystemMessage(`✓ Saved memory parameters to ${profile.name}'s profile.`);
        const profRes = await fetch('/api/profiles', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profRes.ok) {
          const list = await profRes.json();
          setProfiles(list);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPendingMemory(null);
    }
  };

  const buildUserContextString = () => {
    if (!user) return '';

    const selectedProfile = profiles.find(p => p._id === selectedProfileId);
    const profileStr = selectedProfile 
      ? `Active booking profile is for: ${selectedProfile.name} (Relation: ${selectedProfile.relation}, Age: ${selectedProfile.age || 'Unknown'}, Gender: ${selectedProfile.gender || 'Unknown'}, Preferred Language: ${selectedProfile.preferredLanguage || 'English'}). Notes: ${selectedProfile.notes || 'None'}. Profile Metadata: ${JSON.stringify(selectedProfile.metadata || {})}`
      : 'Active booking profile is for the user himself.';

    const prefsStr = preferences 
      ? `Preferences:\n- Preferred Hospitals: ${preferences.preferredHospitals?.join(', ') || 'None'}\n- Preferred Doctors: ${preferences.preferredDoctors?.join(', ') || 'None'}\n- Preferred Salons: ${preferences.preferredSalons?.join(', ') || 'None'}\n- Preferred Stylists: ${preferences.preferredStylists?.join(', ') || 'None'}\n- Preferred Time slots: ${preferences.preferredAppointmentTimes?.join(', ') || 'None'}\n- Disliked Businesses (Do not suggest these!): ${preferences.dislikedBusinesses?.join(', ') || 'None'}\n- Preferred Language: ${preferences.preferredLanguage || 'English'}`
      : 'No preferences configured.';

    const pastBookings = bookings
      .filter(b => b.status === 'confirmed')
      .slice(-3)
      .map(b => `- Service: ${b.service} at ${b.placeName} on ${b.date} at ${b.time} (Outcome: ${JSON.stringify(b.receptionistOutcome || {})})`)
      .join('\n');

    return `
${profileStr}

${prefsStr}

Recent Booking History:
${pastBookings || 'No bookings in history.'}
`;
  };

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
      
      const userContext = buildUserContextString();
      if (mode === SessionMode.USER) {
        systemInstruction = getUserSystemInstruction(lastCallStatus, userContext);
        tools = userTools;
        console.log("Connecting as USER");
      } else {
        // Receptionist Mode - Always use the latest bookingDetailsRef, NOT the stale detailsParam
        const currentDetails = bookingDetailsRef.current;
        console.log('connectToLiveAPI: receptionist mode - using bookingDetailsRef.current =', currentDetails);
        if (!currentDetails) {
            console.error("No booking details found for receptionist call.");
            addSystemMessage('No booking details available to call receptionist.');
            throw new Error("No booking details for call");
        }
        systemInstruction = getReceptionistSystemInstruction(currentDetails, userContext);
        tools = receptionistTools;
        console.log("Connecting as RECEPTIONIST to:", currentDetails.placeName);
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
                 
                 // Exclude disliked businesses
                 const disliked = preferences?.dislikedBusinesses || [];
                 const filteredPlaces = foundPlaces.filter(p => !disliked.includes(p.name));
                 
                 setPlaces(filteredPlaces);
                 result = { 
                   found_count: filteredPlaces.length,
                   places: filteredPlaces.map(p => ({
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
              
              if (place) {
                updateBookingDetails({
                  placeId: place.id,
                  placeName: place.name
                });
                addSystemMessage(`Selected ${place.name}. Ask for date/time to proceed.`);
                result = { selected: place.name, phoneNumber: place.phoneNumber };
              } else {
                const providedName = parsedArgs?.providerName || parsedArgs?.provider || pid;
                let matched = undefined as Place | undefined;
                if (providedName && typeof providedName === 'string') {
                  const pn = providedName.trim().toLowerCase();
                  matched = placesRef.current.find(p => p.name && p.name.toLowerCase() === pn) || placesRef.current.find(p => p.name && p.name.toLowerCase().includes(pn));
                }

                if (matched) {
                  setSelectedPlaceId(matched.id);
                  selectedPlaceIdRef.current = matched.id;
                  updateBookingDetails({ placeId: matched.id, placeName: matched.name });
                  addSystemMessage(`Selected ${matched.name} (matched by name). Ask for date/time to proceed.`);
                  result = { selected: matched.name, phoneNumber: matched.phoneNumber };
                } else {
                  updateBookingDetails({
                    placeId: pid,
                    placeName: providedName
                  });
                  addSystemMessage(`Selected ${providedName}. Booking draft updated.`);
                  result = { selected: providedName };
                }
              }
            }
            else if (fc.name === 'initiateCall') {
                const { placeId, service, date, time, guests, email } = parsedArgs || {};
                const currentDraft = bookingDetailsRef.current;
                const targetPlaceId = currentDraft?.placeId || selectedPlaceIdRef.current || placeId;
                
                let place = placesRef.current.find(p => p.id === targetPlaceId);
                if (!place && !currentDraft && placesRef.current.length > 0) {
                  place = placesRef.current[0];
                }

                if (place || currentDraft) {
                  const isRestaurant = 
                    (place?.category === 'restaurant') ||
                    (place?.name && (place.name.toLowerCase().includes('restaurant') || place.name.toLowerCase().includes('dining') || place.name.toLowerCase().includes('cafe') || place.name.toLowerCase().includes('bistro') || place.name.toLowerCase().includes('bhavan') || place.name.toLowerCase().includes('food') || place.name.toLowerCase().includes('route'))) ||
                    (currentDraft?.placeName && (currentDraft.placeName.toLowerCase().includes('restaurant') || currentDraft.placeName.toLowerCase().includes('dining') || currentDraft.placeName.toLowerCase().includes('cafe') || currentDraft.placeName.toLowerCase().includes('bistro') || currentDraft.placeName.toLowerCase().includes('bhavan') || currentDraft.placeName.toLowerCase().includes('food') || currentDraft.placeName.toLowerCase().includes('route')));

                  // Set Category details JSON
                  const categoryDetails: Record<string, any> = {};
                  if (guests) categoryDetails.guests = guests;
                  if (email) categoryDetails.email = email;
                  
                  // Merge active profile metadata parameters
                  const activeProf = profilesRef.current.find(p => p._id === selectedProfileIdRef.current);
                  if (activeProf && activeProf.metadata) {
                    Object.assign(categoryDetails, activeProf.metadata);
                  }

                  const newDetails: Partial<BookingDetails> = {
                    placeId: place?.id || currentDraft?.placeId || '',
                    placeName: place?.name || currentDraft?.placeName || '',
                    service: service || currentDraft?.service || '',
                    date: date || currentDraft?.date || '',
                    time: time || currentDraft?.time || '',
                    guests: guests || currentDraft?.guests || '',
                    email: email || currentDraft?.email || '',
                    status: 'negotiating',
                    businessCategory: place?.category || activeCategory || 'service',
                    categoryDetails: categoryDetails
                  };
                  
                  const missing: string[] = [];
                  const hasSvc = newDetails.service && newDetails.service.trim() !== '';
                  const hasDate = newDetails.date && newDetails.date.trim() !== '';
                  const hasTime = newDetails.time && newDetails.time.trim() !== '';
                  const hasShop = (newDetails.placeId && newDetails.placeId.trim() !== '') || (newDetails.placeName && newDetails.placeName.trim() !== '');
                  
                  if (!hasSvc) missing.push('Service');
                  if (!hasDate) missing.push('Date');
                  if (!hasTime) missing.push('Time');
                  if (!hasShop) missing.push('Shop/Provider');
                  
                  if (isRestaurant && (!newDetails.guests || newDetails.guests.trim() === '')) {
                    missing.push('Number of guests (persons)');
                  }

                  if (missing.length > 0) {
                    const missingMsg = `Cannot book yet. Missing: ${missing.join(', ')}. Please provide these details first.`;
                    addSystemMessage(missingMsg);
                    result = { error: missingMsg };
                  } else {
                    updateBookingDetails(newDetails);
                    const updatedDetails = bookingDetailsRef.current;
                    const needsGuests = isRestaurant && (!updatedDetails?.guests || updatedDetails.guests.trim() === '');
                    
                    if (updatedDetails && updatedDetails.service?.trim() && updatedDetails.date?.trim() && updatedDetails.time?.trim() && !needsGuests) {
                      updatedDetails.status = 'negotiating';
                      setBookingDetails(updatedDetails);
                      bookingDetailsRef.current = updatedDetails;
                      
                      const guestInfo = updatedDetails.guests ? ` for ${updatedDetails.guests} persons` : '';
                      addSystemMessage(`Booking confirmed: ${updatedDetails.service}${guestInfo} at ${updatedDetails.placeName} on ${updatedDetails.date} at ${updatedDetails.time}. Dialing receptionist...`);
                      
                      result = { status: 'switching_session' };
                      transitionToReceptionist(updatedDetails);
                    } else {
                      addSystemMessage('Warning: Booking details became incomplete after merge.');
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
                const outcomeArgs = fc.args as any;
                const { success, finalDate, finalTime, notes } = outcomeArgs;
                
                const details = bookingDetailsRef.current;
                const targetDate = finalDate || details?.date || new Date().toISOString().slice(0, 10);
                const targetTime = finalTime || details?.time || '12:00';
                
                if (success && details) {
                    const newAppt: Appointment = {
                        id: Date.now().toString(),
                        providerId: details.placeId,
                        providerName: details.placeName,
                        date: new Date(`${targetDate}T${targetTime}`),
                        serviceType: details.service
                    };
                    setAppointment(newAppt);
                    setLastCallStatus("Success: Booking confirmed.");
                    setViewMode(ViewMode.CALENDAR);
                    
                    addToGoogleCalendar(newAppt).then((res:any) => {
                      addSystemMessage('✓ Booking added to your Google Calendar');
                    }).catch((err:any) => {
                      addSystemMessage('❌ Calendar: ' + (err?.message || JSON.stringify(err)));
                    });
                    
                    if (process.env.RESEND_API_KEY && details.email) {
                      sendCalendarEmail(newAppt, details.email).then(ok => {
                        if (ok) {
                          addSystemMessage(`✓ Automatically sent calendar invite to ${details.email}`);
                        }
                      });
                    }
                    
                    const updatedDetails: BookingDetails = { 
                      ...details, 
                      status: 'confirmed' as const,
                      receptionistOutcome: outcomeArgs
                    };
                    setBookingDetails(updatedDetails);
                    bookingDetailsRef.current = updatedDetails;

                    // Save Confirmed Booking to MongoDB API
                    if (user && token) {
                      const bookingPayload = {
                        profileId: selectedProfileIdRef.current || null,
                        businessId: details.placeId || '',
                        businessName: details.placeName,
                        businessCategory: details.businessCategory || activeCategory || 'service',
                        service: details.service,
                        dateTime: new Date(`${targetDate}T${targetTime}`).toISOString(),
                        status: 'confirmed',
                        receptionistOutcome: outcomeArgs,
                        categoryDetails: details.categoryDetails || {}
                      };

                      fetch('/api/bookings', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(bookingPayload)
                      }).then(async r => {
                        if (r.ok) {
                          const savedBooking = await r.json();
                          setBookings(prev => [...prev, savedBooking]);
                          
                          // Check for AI memory extraction
                          const candidates = scanMessagesForMemory();
                          const selectedProf = profilesRef.current.find(p => p._id === selectedProfileIdRef.current);
                          if (selectedProf && Object.keys(candidates).length > 0) {
                            const newKeys = Object.keys(candidates).filter(k => selectedProf.metadata?.[k] !== candidates[k]);
                            if (newKeys.length > 0) {
                              const newCandidates: Record<string, any> = {};
                              newKeys.forEach(k => { newCandidates[k] = candidates[k]; });
                              setPendingMemory({
                                profile: selectedProf,
                                data: newCandidates
                              });
                            }
                          }
                        }
                      });
                    }

                } else {
                    setLastCallStatus(`Failed: ${notes || "Receptionist unavailable"}`);
                    if (details) {
                        const updatedDetails: BookingDetails = { 
                          ...details, 
                          status: 'failed' as const,
                          receptionistOutcome: { notes: notes || "Receptionist unavailable" }
                        };
                        setBookingDetails(updatedDetails);
                        bookingDetailsRef.current = updatedDetails;

                        // Save Failed Booking to MongoDB API
                        if (user && token) {
                          const bookingPayload = {
                            profileId: selectedProfileIdRef.current || null,
                            businessId: details.placeId || '',
                            businessName: details.placeName,
                            businessCategory: details.businessCategory || activeCategory || 'service',
                            service: details.service,
                            dateTime: new Date(`${details.date}T${details.time}`).toISOString(),
                            status: 'failed',
                            receptionistOutcome: { notes: notes || "Receptionist unavailable" },
                            categoryDetails: details.categoryDetails || {}
                          };

                          fetch('/api/bookings', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(bookingPayload)
                          }).then(async r => {
                            if (r.ok) {
                              const savedBooking = await r.json();
                              setBookings(prev => [...prev, savedBooking]);
                            }
                          });
                        }
                    }
                }
                
                result = { status: 'call_ended' };
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
  const calendarAction = (appointment && bookingDetails?.status === 'confirmed') ? (() => addToGoogleCalendar(appointment)) : undefined;  const visibleMessages = messages.filter(m => m.role !== 'system');

  if (showHomePage) {
    return (
      <HomePage
        user={user}
        onLogin={onLogin}
        onSignup={onSignup}
        onLogout={onLogout}
        profiles={profiles}
        onAddProfile={onAddProfile}
        onUpdateProfile={onUpdateProfile}
        onDeleteProfile={onDeleteProfile}
        preferences={preferences}
        onSavePreferences={onSavePreferences}
        bookings={bookings}
        onBookNew={onBookNew}
        onRebookLast={onRebookLast}
        onSubmitFeedback={onSubmitFeedback}
        feedbackBookings={feedbackBookings}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/* Left Panel: Sola Interface */}
      <div className="w-1/3 flex flex-col shadow-xl z-20 bg-white/95 dark:bg-zinc-950/95 border-r border-zinc-200/80 dark:border-zinc-900 backdrop-blur-md transition-colors duration-300">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-bold flex items-center gap-2 tracking-tight text-zinc-900 dark:text-white">
                <div className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                </div>
                <span>{sessionMode === SessionMode.USER ? "Sola Assistant" : "Live Phone Call"}</span>
              </h1>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 font-semibold truncate uppercase tracking-wider">
                {sessionMode === SessionMode.USER ? "Regional Voice Agent" : `Calling: ${bookingDetails?.placeName}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={() => setShowHomePage(true)} 
                title="Back to Dashboard" 
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-950 dark:hover:text-white rounded-xl border border-zinc-200/60 dark:border-zinc-850 shadow-sm transition-all"
                type="button"
              >
                <Home className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setMessages([])} 
                title="Clear Chat History" 
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-405 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl border border-zinc-200/60 dark:border-zinc-850 shadow-sm transition-all"
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={simulateBookingAndDial} 
                title="Simulate Call Dialing"
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-550 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl border border-zinc-200/60 dark:border-zinc-850 shadow-sm transition-all"
                type="button"
              >
                <PhoneCall className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* AI Memory Banner */}
        {pendingMemory && (
          <div className="mx-4 mt-4 p-4 bg-brand-50/50 dark:bg-zinc-900/60 border border-brand-200/60 dark:border-zinc-800 rounded-2xl flex flex-col gap-3 relative z-30 shadow-lg text-left">
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
              💡 Sola noticed new details. Save this to <strong>{pendingMemory.profile.name}'s</strong> profile?
            </p>
            <div className="bg-white/80 dark:bg-zinc-950/80 rounded-xl p-3 border border-zinc-200/80 dark:border-zinc-900 font-mono text-[10px] text-zinc-500 dark:text-zinc-400 space-y-1">
              {Object.entries(pendingMemory.data).map(([k, v]) => (
                <div key={k}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: {String(v)}</div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingMemory(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-550 dark:text-zinc-300 font-bold text-[10px] rounded-lg border border-zinc-200 dark:border-transparent transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleSaveMemory}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-zinc-950 font-bold text-[10px] rounded-lg shadow-md transition-all active:scale-[0.98]"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Chat / Transcript Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
           {visibleMessages.length === 0 && sessionMode === SessionMode.USER && (
             <div className="text-center text-zinc-400 dark:text-zinc-600 mt-14 px-6 space-y-3">
               <Brain className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-750" />
               <p className="text-xs font-semibold leading-relaxed">
                 Say "Find a salon nearby" or search for providers on the right to start booking.
               </p>
             </div>
           )}
           {sessionMode === SessionMode.RECEPTIONIST && (
             <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/15 border border-brand-200 dark:border-brand-900/30 text-center flex items-center justify-center gap-2">
                <PhoneIncoming className="h-4 w-4 text-brand-650 dark:text-brand-400 animate-pulse" />
                <p className="text-xs font-bold text-brand-700 dark:text-brand-350">Sola is speaking with the receptionist...</p>
             </div>
           )}
           {visibleMessages.map(msg => (
             <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed font-semibold shadow-sm ${
                 msg.role === 'user' 
                   ? 'bg-brand-600 dark:bg-brand-500 text-white shadow-brand-500/5' 
                   : 'bg-slate-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/40 text-zinc-800 dark:text-zinc-200'
               }`}>
                 {msg.text}
               </div>
             </div>
           ))}
        </div>

        {/* Voice Controls */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-950/20">
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

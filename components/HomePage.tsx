import React, { useState, useEffect } from 'react';
import { Profile, UserPreferences, BookingDetails, User } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  History, 
  LogOut, 
  Sun, 
  Moon, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  Check, 
  Star, 
  Mail, 
  Smartphone,
  ChevronRight,
  Shield,
  Sparkles,
  Info,
  Menu,
  X,
  FileText
} from 'lucide-react';

interface HomePageProps {
  user: User | null;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onSignup: (name: string, email: string, password: string) => Promise<boolean>;
  onLogout: () => void;
  profiles: Profile[];
  onAddProfile: (profile: Omit<Profile, 'userId'>) => Promise<void>;
  onUpdateProfile: (profile: Profile) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  preferences: UserPreferences | null;
  onSavePreferences: (prefs: UserPreferences) => Promise<void>;
  bookings: BookingDetails[];
  onBookNew: (profileId: string) => void;
  onRebookLast: (booking: BookingDetails) => void;
  onSubmitFeedback: (bookingId: string, rating: number, comments: string, wouldVisitAgain: boolean) => Promise<void>;
  feedbackBookings: BookingDetails[];
}

type TabType = 'widgets' | 'profiles' | 'preferences' | 'history';

const HomePage: React.FC<HomePageProps> = ({
  user,
  onLogin,
  onSignup,
  onLogout,
  profiles,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  preferences,
  onSavePreferences,
  bookings,
  onBookNew,
  onRebookLast,
  onSubmitFeedback,
  feedbackBookings
}) => {
  // Auth Form State
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('widgets');

  // Selected Profile for Booking
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profName, setProfName] = useState('');
  const [profRelation, setProfRelation] = useState('Me');
  const [profAge, setProfAge] = useState('');
  const [profGender, setProfGender] = useState('Male');
  const [profPhone, setProfPhone] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [profLang, setProfLang] = useState('English');
  const [profNotes, setProfNotes] = useState('');
  const [profMetadataStr, setProfMetadataStr] = useState('{}');

  // Preferences form state
  const [prefHospitals, setPrefHospitals] = useState('');
  const [prefDoctors, setPrefDoctors] = useState('');
  const [prefSalons, setPrefSalons] = useState('');
  const [prefStylists, setPrefStylists] = useState('');
  const [prefTimes, setPrefTimes] = useState('');
  const [prefLangVal, setPrefLangVal] = useState('English');
  const [dislikedInput, setDislikedInput] = useState('');
  const [dislikedList, setDislikedList] = useState<string[]>([]);
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);

  // Feedback Modal State
  const [feedbackBooking, setFeedbackBooking] = useState<BookingDetails | null>(null);
  const [feedRating, setFeedRating] = useState(5);
  const [feedComments, setFeedComments] = useState('');
  const [feedVisitAgain, setFeedVisitAgain] = useState(true);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // History detail expansion State
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  // Mobile sidebar visible
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Dark/Light Mode state
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  // Initialize Preferences when active
  if (preferences && !hasLoadedPrefs) {
    setPrefHospitals(preferences.preferredHospitals?.join(', ') || '');
    setPrefDoctors(preferences.preferredDoctors?.join(', ') || '');
    setPrefSalons(preferences.preferredSalons?.join(', ') || '');
    setPrefStylists(preferences.preferredStylists?.join(', ') || '');
    setPrefTimes(preferences.preferredAppointmentTimes?.join(', ') || '');
    setPrefLangVal(preferences.preferredLanguage || 'English');
    setDislikedList(preferences.dislikedBusinesses || []);
    setHasLoadedPrefs(true);
  }

  // Set default profile selection
  if (profiles.length > 0 && !selectedProfileId) {
    const meProfile = profiles.find(p => p.relation === 'Me') || profiles[0];
    if (meProfile && meProfile._id) {
      setSelectedProfileId(meProfile._id);
    }
  }

  // Handle Auth
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      if (isLoginTab) {
        const ok = await onLogin(authEmail, authPassword);
        if (!ok) setAuthError('Invalid credentials. Double check password or format.');
      } else {
        const ok = await onSignup(authName, authEmail, authPassword);
        if (!ok) setAuthError('Email already registered.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error occurred.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Profile Form Handle
  const handleOpenProfileModal = (profile?: Profile) => {
    if (profile) {
      setEditingProfile(profile);
      setProfName(profile.name);
      setProfRelation(profile.relation);
      setProfAge(profile.age?.toString() || '');
      setProfGender(profile.gender || 'Male');
      setProfPhone(profile.phone || '');
      setProfEmail(profile.email || '');
      setProfLang(profile.preferredLanguage || 'English');
      setProfNotes(profile.notes || '');
      setProfMetadataStr(JSON.stringify(profile.metadata || {}, null, 2));
    } else {
      setEditingProfile(null);
      setProfName('');
      setProfRelation('Me');
      setProfAge('');
      setProfGender('Male');
      setProfPhone('');
      setProfEmail('');
      setProfLang('English');
      setProfNotes('');
      setProfMetadataStr('{}');
    }
    setShowProfileModal(true);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let metadataParsed = {};
    try {
      metadataParsed = JSON.parse(profMetadataStr || '{}');
    } catch (err) {
      alert('Invalid JSON metadata syntax. Please correct it (e.g. {"key": "value"}).');
      return;
    }

    const payload = {
      name: profName,
      relation: profRelation,
      age: profAge ? parseInt(profAge) : null,
      gender: profGender,
      phone: profPhone,
      email: profEmail,
      preferredLanguage: profLang,
      notes: profNotes,
      metadata: metadataParsed
    };

    if (editingProfile && editingProfile._id) {
      await onUpdateProfile({ ...payload, _id: editingProfile._id, userId: editingProfile.userId });
    } else {
      await onAddProfile(payload);
    }
    setShowProfileModal(false);
  };

  // Preference save handle
  const handleSavePrefs = async () => {
    const payload: UserPreferences = {
      userId: user?.id || '',
      preferredHospitals: prefHospitals.split(',').map(s => s.trim()).filter(Boolean),
      preferredDoctors: prefDoctors.split(',').map(s => s.trim()).filter(Boolean),
      preferredSalons: prefSalons.split(',').map(s => s.trim()).filter(Boolean),
      preferredStylists: prefStylists.split(',').map(s => s.trim()).filter(Boolean),
      preferredAppointmentTimes: prefTimes.split(',').map(s => s.trim()).filter(Boolean),
      preferredLanguage: prefLangVal,
      dislikedBusinesses: dislikedList
    };
    await onSavePreferences(payload);
    alert('✓ Preferences saved successfully!');
  };

  const handleAddDisliked = () => {
    if (!dislikedInput.trim()) return;
    if (!dislikedList.includes(dislikedInput.trim())) {
      setDislikedList(prev => [...prev, dislikedInput.trim()]);
    }
    setDislikedInput('');
  };

  const handleRemoveDisliked = (name: string) => {
    setDislikedList(prev => prev.filter(item => item !== name));
  };

  // Feedback Submit Handle
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackBooking || !feedbackBooking._id) return;
    setIsSubmittingFeedback(true);
    try {
      await onSubmitFeedback(feedbackBooking._id, feedRating, feedComments, feedVisitAgain);
      setFeedbackBooking(null);
      setFeedComments('');
      setFeedRating(5);
      setFeedVisitAgain(true);
      alert('✓ Thank you for your feedback!');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const lastBooking = bookings.length > 0 ? bookings[bookings.length - 1] : null;
  const upcomingBooking = bookings.find(b => b.status === 'confirmed' && new Date(b.dateTime || `${b.date}T${b.time}`) > new Date());

  // Render NOT logged in UI
  if (!user) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans flex flex-col items-center justify-center p-6 relative transition-colors duration-300">
        {/* Soft background decor */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-brand-300/15 via-brand-200/5 to-transparent blur-[100px] rounded-full opacity-60 dark:opacity-40" />
        </div>

        <div className="w-full max-w-[420px] relative z-10">
          {/* Logo Title */}
          <div className="flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900 flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Sola AI</h1>
          </div>

          {/* Minimal Auth Card */}
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-8 shadow-xl backdrop-blur-md">
            <div className="flex border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-6">
              <button
                onClick={() => { setIsLoginTab(true); setAuthError(''); }}
                className={`flex-1 text-center font-bold text-xs pb-2 transition-all border-b-2 uppercase tracking-wider ${isLoginTab ? 'text-brand-600 border-brand-500 dark:text-brand-400' : 'text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsLoginTab(false); setAuthError(''); }}
                className={`flex-1 text-center font-bold text-xs pb-2 transition-all border-b-2 uppercase tracking-wider ${!isLoginTab ? 'text-brand-600 border-brand-500 dark:text-brand-400' : 'text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-150 dark:border-rose-500/20 text-rose-600 dark:text-rose-455 text-xs rounded-xl font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLoginTab && (
                <div>
                  <label className="block text-[10px] text-zinc-450 dark:text-zinc-550 uppercase tracking-wider font-bold mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Wade Wilson"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 rounded-xl text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-zinc-400 dark:placeholder-zinc-650"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] text-zinc-450 dark:text-zinc-550 uppercase tracking-wider font-bold mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 rounded-xl text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-zinc-400 dark:placeholder-zinc-650"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-450 dark:text-zinc-550 uppercase tracking-wider font-bold mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 rounded-xl text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-zinc-400 dark:placeholder-zinc-650"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-brand-500/10 active:scale-[0.98] disabled:opacity-50"
              >
                {isAuthLoading ? 'Authenticating...' : (isLoginTab ? 'Sign In' : 'Sign Up')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'widgets', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profiles', label: 'Family Profiles', icon: Users },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'history', label: 'Booking History', icon: History }
  ] as const;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-900 transition-colors duration-300">
      {/* Sidebar Header Brand */}
      <div className="px-6 py-6 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900 flex items-center justify-center shadow-sm">
          <Sparkles className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400" />
        </div>
        <span className="font-bold tracking-tight text-zinc-900 dark:text-white text-base">Sola AI</span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100/50 dark:border-brand-900/30' 
                  : 'text-zinc-650 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Details */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 space-y-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-slate-100/80 dark:hover:bg-zinc-900 transition-all shadow-sm"
        >
          <span className="flex items-center gap-2">
            {isDark ? <Moon className="h-4 w-4 text-brand-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
            <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">Toggle</span>
        </button>

        {/* User logout section */}
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{user.name}</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans flex relative transition-colors duration-300 selection:bg-brand-500 selection:text-zinc-950">
      
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Navigation Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative w-64 max-w-sm h-full flex flex-col z-10 animate-slide-in">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Core Application Body Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Controls bar */}
        <header className="px-6 py-5 border-b border-zinc-200/80 dark:border-zinc-900 bg-white/70 dark:bg-[#09090b]/70 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-zinc-500"
              title="Open Navigation"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-450">
              {activeTab === 'widgets' ? 'Dashboard Summary' : activeTab === 'profiles' ? 'Family Profiles' : activeTab === 'preferences' ? 'Settings Preferences' : 'Booking History'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sola Connected</span>
            </div>
          </div>
        </header>

        {/* Pending Feedback Banner */}
        {feedbackBookings.length > 0 && (
          <div className="bg-brand-50/50 dark:bg-brand-950/10 border-b border-brand-100 dark:border-brand-900/30 py-3.5 px-6 animate-pulse">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0" />
                <p className="text-xs font-semibold text-brand-850 dark:text-brand-300">
                  Rate experience for completed booking at <strong>{feedbackBookings[0].placeName}</strong> ({feedbackBookings[0].service}).
                </p>
              </div>
              <button
                onClick={() => {
                  setFeedbackBooking(feedbackBookings[0]);
                  setFeedRating(5);
                  setFeedComments('');
                  setFeedVisitAgain(true);
                }}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap"
              >
                Submit Rating
              </button>
            </div>
          </div>
        )}

        {/* Main Dashboard Pages Container */}
        <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6 overflow-y-auto">
          
          {/* Tab 1: Dashboard Home */}
          {activeTab === 'widgets' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Side: Booking & Quick Actions */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Book New Appointment Card */}
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-3xl premium-shadow flex flex-col justify-between min-h-[220px] transition-colors duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-brand-300/10 via-brand-200/5 to-transparent blur-3xl pointer-events-none rounded-full" />
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-brand-500 animate-pulse" />
                      <span>Intelligent AI Booking</span>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-1">Book New Appointment</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2.5 leading-relaxed max-w-md">
                      Start a direct telephone conversation with Sola. She will coordinate, identify providers, dial receptionists, and dynamically negotiate slots.
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row items-end gap-3.5 border-t border-zinc-100 dark:border-zinc-850 pt-4">
                    <div className="flex-1 w-full text-left">
                      <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Select Profile Relation</label>
                      <select
                        value={selectedProfileId}
                        onChange={(e) => setSelectedProfileId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm"
                      >
                        {profiles.map(p => (
                          <option key={p._id} value={p._id}>{p.name} ({p.relation})</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => onBookNew(selectedProfileId)}
                      className="px-6 py-3 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span>Start Voice assistant</span>
                    </button>
                  </div>
                </div>

                {/* Upcoming Appointment Ticket Card */}
                {upcomingBooking ? (
                  <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-3xl premium-shadow relative overflow-hidden transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
                    <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-450 font-bold flex items-center gap-1.5 mb-4">
                      <Check className="h-3.5 w-3.5" />
                      <span>Confirmed Appointment</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-5 border-b border-zinc-100 dark:border-zinc-850">
                      <div>
                        <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Business / Provider</h4>
                        <p className="text-base font-bold text-zinc-900 dark:text-white mt-1">{upcomingBooking.placeName}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>Adyar, Chennai</span>
                        </p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Date & Time Slot</h4>
                        <p className="text-base font-bold text-zinc-900 dark:text-white mt-1">
                          {new Date(upcomingBooking.dateTime || '').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>At {upcomingBooking.time}</span>
                        </p>
                      </div>
                    </div>

                    {/* Receptionist outcomes box */}
                    {upcomingBooking.receptionistOutcome && (
                      <div className="mt-4 p-4 bg-slate-50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 rounded-2xl">
                        <h5 className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2.5">Confirmation Slip</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          {upcomingBooking.receptionistOutcome.tokenNumber && (
                            <div>
                              <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Token</span>
                              <span className="font-bold text-zinc-800 dark:text-white">{upcomingBooking.receptionistOutcome.tokenNumber}</span>
                            </div>
                          )}
                          {upcomingBooking.receptionistOutcome.reservationCode && (
                            <div>
                              <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Reservation ID</span>
                              <span className="font-bold text-zinc-800 dark:text-white">{upcomingBooking.receptionistOutcome.reservationCode}</span>
                            </div>
                          )}
                          {upcomingBooking.receptionistOutcome.doctorName && (
                            <div>
                              <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Doctor</span>
                              <span className="font-bold text-zinc-800 dark:text-white">{upcomingBooking.receptionistOutcome.doctorName}</span>
                            </div>
                          )}
                          {upcomingBooking.receptionistOutcome.stylistName && (
                            <div>
                              <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Stylist</span>
                              <span className="font-bold text-zinc-800 dark:text-white">{upcomingBooking.receptionistOutcome.stylistName}</span>
                            </div>
                          )}
                          {upcomingBooking.receptionistOutcome.roomNumber && (
                            <div>
                              <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Room/Counter</span>
                              <span className="font-bold text-zinc-800 dark:text-white">{upcomingBooking.receptionistOutcome.roomNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-3xl premium-shadow text-center py-10 transition-colors duration-300">
                    <Calendar className="h-8 w-8 text-zinc-400 dark:text-zinc-500 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">No upcoming appointments scheduled.</p>
                  </div>
                )}

                {/* Quick Rebook Same as Last Time Widget */}
                {lastBooking && (
                  <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-3xl premium-shadow flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300">
                    <div className="text-left">
                      <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 font-bold">Book Again</div>
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-white mt-0.5">{lastBooking.placeName}</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{lastBooking.service} • last booked on {lastBooking.date}</p>
                    </div>
                    <button
                      onClick={() => onRebookLast(lastBooking)}
                      className="px-4.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] border border-zinc-900 dark:border-zinc-750 flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Book Same as Last Time</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Side: Profiles List, preferences summary */}
              <div className="space-y-6">
                
                {/* Profiles summary widget card */}
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-3xl premium-shadow transition-colors duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-zinc-400" />
                      <span>My Profiles ({profiles.length})</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('profiles')}
                      className="text-[10px] text-brand-600 dark:text-brand-400 font-bold hover:underline"
                    >
                      Manage
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {profiles.slice(0, 3).map(p => (
                      <div key={p._id} className="p-3 bg-slate-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-900 rounded-2xl flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-zinc-800 dark:text-white">{p.name}</div>
                          <div className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5">{p.relation} • {p.preferredLanguage}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preferences summary widget card */}
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-3xl premium-shadow transition-colors duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Settings className="h-4 w-4 text-zinc-400" />
                      <span>Preferences</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('preferences')}
                      className="text-[10px] text-brand-600 dark:text-brand-400 font-bold hover:underline"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="block text-zinc-400 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-wider">Language</span>
                      <span className="font-semibold text-zinc-800 dark:text-white mt-0.5 block">{preferences?.preferredLanguage || 'English'}</span>
                    </div>
                    {preferences?.preferredSalons && preferences.preferredSalons.length > 0 && (
                      <div>
                        <span className="block text-zinc-400 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-wider">Preferred Salons</span>
                        <span className="font-semibold text-zinc-800 dark:text-white mt-0.5 block truncate">{preferences.preferredSalons.join(', ')}</span>
                      </div>
                    )}
                    {preferences?.preferredHospitals && preferences.preferredHospitals.length > 0 && (
                      <div>
                        <span className="block text-zinc-400 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-wider">Preferred Hospitals</span>
                        <span className="font-semibold text-zinc-800 dark:text-white mt-0.5 block truncate">{preferences.preferredHospitals.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 2: Family Profiles Manager */}
          {activeTab === 'profiles' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-900 pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Family Profiles</h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">Configuring member profiles helps Sola speak for the patient/user correctly during calls.</p>
                </div>
                <button
                  onClick={() => handleOpenProfileModal()}
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Profile</span>
                </button>
              </div>

              {/* Grid of profiles cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map(p => (
                  <div key={p._id} className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-3xl premium-shadow flex flex-col justify-between transition-all hover:scale-[1.01]">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-bold text-zinc-900 dark:text-white">{p.name}</h4>
                          <span className="inline-block px-2.5 py-0.5 bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-350 border border-brand-100 dark:border-brand-900/30 rounded-full text-[9px] font-bold uppercase tracking-wider mt-1">
                            {p.relation}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenProfileModal(p)}
                            title="Edit Profile"
                            className="p-1.5 rounded-lg hover:bg-slate-105 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-750/50"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          {p.relation !== 'Me' && p._id && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${p.name}'s profile?`)) {
                                  onDeleteProfile(p._id!);
                                }
                              }}
                              title="Delete Profile"
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-450 hover:text-rose-600 dark:hover:text-rose-400 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2.5 text-xs border-t border-zinc-100 dark:border-zinc-850 pt-3">
                        {p.age && (
                          <div className="flex justify-between">
                            <span className="text-zinc-450 dark:text-zinc-500 font-semibold">Age / Gender</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{p.age} years • {p.gender}</span>
                          </div>
                        )}
                        {p.phone && (
                          <div className="flex justify-between">
                            <span className="text-zinc-450 dark:text-zinc-500 font-semibold">Phone</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">{p.phone}</span>
                          </div>
                        )}
                        {p.preferredLanguage && (
                          <div className="flex justify-between">
                            <span className="text-zinc-450 dark:text-zinc-500 font-semibold">Language</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{p.preferredLanguage}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stored metadata segment */}
                    {p.metadata && Object.keys(p.metadata).length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-850">
                        <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider mb-2">Stored AI Memory</span>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(p.metadata).map(([k, v]) => (
                            <span key={k} className="px-2 py-0.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 text-zinc-700 dark:text-zinc-300 text-[10px] rounded-lg font-medium shadow-sm">
                              {k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: {String(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Preferences Config */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-200/60 dark:border-zinc-900 pb-4">
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Booking Preferences</h3>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">Specify preferred service providers, styling professionals, slot times, and disliked businesses.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Text Inputs */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-3xl premium-shadow transition-colors duration-300 space-y-4 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Preferred Salons</label>
                        <input
                          type="text"
                          value={prefSalons}
                          onChange={(e) => setPrefSalons(e.target.value)}
                          placeholder="e.g. Green Trends, Naturals"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Preferred Stylists</label>
                        <input
                          type="text"
                          value={prefStylists}
                          onChange={(e) => setPrefStylists(e.target.value)}
                          placeholder="e.g. Priya, John"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Preferred Hospitals</label>
                        <input
                          type="text"
                          value={prefHospitals}
                          onChange={(e) => setPrefHospitals(e.target.value)}
                          placeholder="e.g. Apollo, Fortis"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Preferred Doctors</label>
                        <input
                          type="text"
                          value={prefDoctors}
                          onChange={(e) => setPrefDoctors(e.target.value)}
                          placeholder="e.g. Dr. Kumar, Dr. Sarah"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Preferred Appointment Slots</label>
                        <input
                          type="text"
                          value={prefTimes}
                          onChange={(e) => setPrefTimes(e.target.value)}
                          placeholder="e.g. Morning, 14:00 - 16:00"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Preferred Language</label>
                        <select
                          value={prefLangVal}
                          onChange={(e) => setPrefLangVal(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="English">English</option>
                          <option value="Tamil">Tamil (தமிழ்)</option>
                          <option value="Mix">English & Tamil Mix</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleSavePrefs}
                      className="px-5 py-3 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] w-full sm:w-auto"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>

                {/* Right Side: Disliked list */}
                <div className="space-y-4 text-left">
                  <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-3xl premium-shadow transition-colors duration-300">
                    <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-zinc-400" />
                      <span>Blocked Businesses</span>
                    </h4>
                    <p className="text-[11px] text-zinc-450 dark:text-zinc-550 leading-relaxed mb-4">Businesses marked here will be fully excluded from Sola's recommendations.</p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={dislikedInput}
                        onChange={(e) => setDislikedInput(e.target.value)}
                        placeholder="Business name"
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 rounded-xl text-xs text-zinc-955 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDisliked()}
                      />
                      <button
                        onClick={handleAddDisliked}
                        className="px-3 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-850 dark:hover:bg-zinc-850 text-white font-semibold text-xs rounded-xl border border-zinc-700 transition-colors shadow-sm"
                      >
                        Block
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {dislikedList.length === 0 ? (
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-650 italic">No blocked providers.</p>
                      ) : (
                        dislikedList.map(name => (
                          <span
                            key={name}
                            onClick={() => handleRemoveDisliked(name)}
                            className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] rounded-lg cursor-pointer flex items-center gap-1 hover:bg-rose-100 hover:text-rose-700 shadow-sm"
                            title="Click to Unblock"
                          >
                            <span>{name}</span>
                            <X className="h-3 w-3" />
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 4: Booking History */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-200/60 dark:border-zinc-900 pb-4 text-left">
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Booking History</h3>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">Inspect complete outcomes of previous successful and failed receptionist negotiations.</p>
              </div>

              {bookings.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-8 rounded-3xl premium-shadow text-center py-14 transition-colors duration-300">
                  <History className="h-9 w-9 text-zinc-400 dark:text-zinc-500 mx-auto mb-2" />
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 font-medium">No bookings found in history.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...bookings].reverse().map(b => {
                    const isExpanded = expandedBookingId === b._id;
                    const dateObj = new Date(b.dateTime || `${b.date}T${b.time}`);
                    const prof = profiles.find(p => p._id === b.profileId);
                    
                    return (
                      <div
                        key={b._id}
                        className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden premium-shadow transition-colors duration-300"
                      >
                        {/* Summary Line */}
                        <div
                          onClick={() => setExpandedBookingId(isExpanded ? null : b._id || null)}
                          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-8.5 h-8.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 flex items-center justify-center text-sm shrink-0 shadow-sm">
                              {b.businessCategory?.includes('hospital') ? '🏥' : b.businessCategory?.includes('salon') ? '💇' : b.businessCategory?.includes('restaurant') ? '🍽️' : '📋'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{b.placeName}</h4>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {b.service} • Patient: {prof ? prof.name : 'User'} ({prof ? prof.relation : 'Me'})
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{dateObj.toLocaleDateString()}</div>
                              <div className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-0.5">At {b.time}</div>
                            </div>
                            <span className={`px-2.5 py-0.5 text-[8px] font-extrabold uppercase rounded-full border shadow-sm ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400'
                            }`}>
                              {b.status}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRebookLast(b);
                              }}
                              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 font-bold text-[10px] rounded-lg border border-zinc-200 dark:border-zinc-750 shadow-sm transition-all"
                            >
                              Rebook
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Outcomes Section */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-1.5 border-t border-zinc-100 dark:border-zinc-850/60 bg-slate-50/20 dark:bg-zinc-950/25">
                            <h5 className="text-[9px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider mb-2">Receptionist Outcome Details</h5>
                            
                            {b.receptionistOutcome ? (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mt-2">
                                {b.receptionistOutcome.tokenNumber && (
                                  <div>
                                    <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Token</span>
                                    <span className="font-bold text-zinc-850 dark:text-zinc-200 mt-0.5 block">{b.receptionistOutcome.tokenNumber}</span>
                                  </div>
                                )}
                                {b.receptionistOutcome.reservationCode && (
                                  <div>
                                    <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Reservation ID</span>
                                    <span className="font-bold text-zinc-850 dark:text-zinc-200 mt-0.5 block">{b.receptionistOutcome.reservationCode}</span>
                                  </div>
                                )}
                                {b.receptionistOutcome.doctorName && (
                                  <div>
                                    <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Doctor Allocated</span>
                                    <span className="font-bold text-zinc-850 dark:text-zinc-200 mt-0.5 block">{b.receptionistOutcome.doctorName}</span>
                                  </div>
                                )}
                                {b.receptionistOutcome.stylistName && (
                                  <div>
                                    <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Stylist</span>
                                    <span className="font-bold text-zinc-850 dark:text-zinc-200 mt-0.5 block">{b.receptionistOutcome.stylistName}</span>
                                  </div>
                                )}
                                {b.receptionistOutcome.waitingTime && (
                                  <div>
                                    <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Wait Time</span>
                                    <span className="font-bold text-zinc-850 dark:text-zinc-200 mt-0.5 block">{b.receptionistOutcome.waitingTime}</span>
                                  </div>
                                )}
                                {b.receptionistOutcome.consultationFee && (
                                  <div>
                                    <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Fee / Cost</span>
                                    <span className="font-bold text-zinc-850 dark:text-zinc-200 mt-0.5 block">{b.receptionistOutcome.consultationFee}</span>
                                  </div>
                                )}
                                {b.receptionistOutcome.roomNumber && (
                                  <div>
                                    <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Room/Cabin</span>
                                    <span className="font-bold text-zinc-850 dark:text-zinc-200 mt-0.5 block">{b.receptionistOutcome.roomNumber}</span>
                                  </div>
                                )}
                                {b.receptionistOutcome.requiredDocuments && (
                                  <div className="col-span-2">
                                    <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Required Documents</span>
                                    <span className="font-medium text-zinc-800 dark:text-zinc-300 mt-0.5 block">{b.receptionistOutcome.requiredDocuments}</span>
                                  </div>
                                )}
                                {b.receptionistOutcome.notes && (
                                  <div className="col-span-2">
                                    <span className="block text-zinc-400 dark:text-zinc-500 text-[8px] font-bold uppercase tracking-wider">Receptionist Notes</span>
                                    <span className="font-medium text-zinc-700 dark:text-zinc-400 mt-0.5 block italic">"{b.receptionistOutcome.notes}"</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-650 italic mt-1.5">No additional outcomes returned by receptionist.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Profile Creation/Editor Modal Overlay */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 relative animate-zoom-in text-left">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-105 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center transition-all border border-zinc-200/50 dark:border-zinc-750"
              title="Close Panel"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1.5">
              {editingProfile ? 'Edit Profile Profile' : 'Add New Family Member'}
            </h3>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-5 leading-relaxed">Enter member details and custom JSON metadata parameters.</p>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1.5">Relation</label>
                  <select
                    value={profRelation}
                    onChange={(e) => setProfRelation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="Me">Me (Self)</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Wife">Wife</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Grandparents">Grandparent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1.5">Age</label>
                  <input
                    type="number"
                    value={profAge}
                    onChange={(e) => setProfAge(e.target.value)}
                    placeholder="32"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-zinc-955 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1.5">Gender</label>
                  <select
                    value={profGender}
                    onChange={(e) => setProfGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1.5">Language</label>
                  <select
                    value={profLang}
                    onChange={(e) => setProfLang(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs font-semibold text-zinc-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="English">English</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Mix">Mix</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={profPhone}
                    onChange={(e) => setProfPhone(e.target.value)}
                    placeholder="+91 99887 76655"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-zinc-955 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={profEmail}
                    onChange={(e) => setProfEmail(e.target.value)}
                    placeholder="family@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-zinc-955 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1.5">Personal Notes / Medical alerts</label>
                <input
                  type="text"
                  value={profNotes}
                  onChange={(e) => setProfNotes(e.target.value)}
                  placeholder="Allergies to penicillin, prefers morning sessions."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 rounded-xl text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1.5">Custom Metadata Parameters (JSON format)</label>
                <textarea
                  value={profMetadataStr}
                  onChange={(e) => setProfMetadataStr(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 rounded-xl text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  placeholder='{"weight": "72 kg", "bloodGroup": "O+"}'
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100 dark:border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold text-xs rounded-xl border border-zinc-200/50 dark:border-zinc-750 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  {editingProfile ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Feedback rating Modal overlay */}
      {feedbackBooking && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-md rounded-3xl shadow-2xl p-6 relative text-left">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Provide Appointment Feedback</h3>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">Help Sola personalize future selections for {feedbackBooking.placeName}.</p>

            <form onSubmit={handleFeedbackSubmit} className="mt-4 space-y-4">
              {/* Stars selection */}
              <div>
                <label className="block text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedRating(star)}
                      className="p-1 transition-transform active:scale-95 focus:outline-none"
                    >
                      <Star className={`h-6.5 w-6.5 ${star <= feedRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-250 dark:text-zinc-700'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1.5">Comments</label>
                <textarea
                  required
                  value={feedComments}
                  onChange={(e) => setFeedComments(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 rounded-xl text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Tell Sola what you liked or disliked about this visit..."
                />
              </div>

              {/* Visited Again selection */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 rounded-2xl">
                <div>
                  <span className="block text-xs font-bold text-zinc-800 dark:text-white">Would visit again?</span>
                  <span className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5 block leading-tight">If "No", this provider gets added to blocked list.</span>
                </div>
                <input
                  type="checkbox"
                  checked={feedVisitAgain}
                  onChange={(e) => setFeedVisitAgain(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 bg-slate-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 cursor-pointer"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100 dark:border-zinc-850">
                <button
                  type="button"
                  onClick={() => setFeedbackBooking(null)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold text-xs rounded-xl border border-zinc-200/50 dark:border-zinc-750 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  {isSubmittingFeedback ? 'Submitting...' : 'Save Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HomePage;

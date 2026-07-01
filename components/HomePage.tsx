import React from 'react';

interface HomePageProps {
  onGetStarted: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen w-full bg-[#09090b] text-zinc-100 font-sans flex flex-col overflow-y-auto relative selection:bg-emerald-500 selection:text-zinc-950">
      {/* Background Ambient Lighting Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-emerald-600/20 via-teal-500/10 to-transparent blur-[140px] rounded-full opacity-70" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b15_1px,transparent_1px),linear-gradient(to_bottom,#18181b15_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onGetStarted}>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10 backdrop-blur-md">
            <span className="text-2xl">🎙️</span>
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Sola <span className="text-xs font-bold font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Voice AI</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onGetStarted}
            className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>Launch App</span>
            <span>→</span>
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 pt-10 pb-24 flex flex-col items-center justify-center text-center relative z-10">
        
        {/* Top Feature Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-900/90 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-8 shadow-xl backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="tracking-wide">Autonomous Voice Booking Assistant</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white max-w-5xl leading-[1.08] drop-shadow-sm">
          Book Local Services in <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">Colloquial Tamil & English</span>
        </h1>

        <p className="mt-8 text-lg sm:text-xl text-zinc-400 max-w-3xl leading-relaxed font-normal">
          Speak naturally in everyday colloquial Tamil or English — like <span className="text-emerald-300 font-medium italic">"pakathula irukura hospital kaatu"</span> or <span className="text-emerald-300 font-medium italic">"find nearby saloons"</span>. Sola automatically geocodes the area, ranks the top 5 rated providers, and autonomously calls receptionists live to secure your booking.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-10 py-5 rounded-2xl text-base font-extrabold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group"
          >
            <span>Let's Get Started</span>
            <span className="text-xl group-hover:translate-x-1 transition-transform">🚀</span>
          </button>
        </div>

        {/* Interactive Live Preview Graphic Card */}
        <div className="mt-16 w-full max-w-4xl rounded-3xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left">
          <div className="flex items-center justify-between pb-6 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-bold">Live Demonstration Preview</span>
            </div>
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">HD AI Voice Call</span>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Simulation Left */}
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Spoken Query</span>
              <p className="text-sm font-semibold text-emerald-300 mt-1 italic">"Pakathula irukura top hospitals kami"</p>
            </div>

            {/* Simulation Center Arrow */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold mb-1">
                ➔
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">Auto Geocode & Top 5 Ranked</span>
            </div>

            {/* Simulation Right Call Status */}
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg shrink-0">
                📞
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Sola Dialing Receptionist</span>
                <p className="text-xs font-bold text-white mt-0.5">City Multispecialty Hospital</p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Strip */}
        <div className="mt-16 w-full grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm">
            <div className="text-3xl sm:text-4xl font-black text-white">100%</div>
            <div className="text-xs text-zinc-400 mt-1 font-medium">Autonomous Live Calling</div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm">
            <div className="text-3xl sm:text-4xl font-black text-emerald-400">Top 5</div>
            <div className="text-xs text-zinc-400 mt-1 font-medium">Rating Ranked Selection</div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm">
            <div className="text-3xl sm:text-4xl font-black text-white">Colloquial Tamil</div>
            <div className="text-xs text-zinc-400 mt-1 font-medium">Natural Speech Engine</div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm">
            <div className="text-3xl sm:text-4xl font-black text-emerald-400">1-Click</div>
            <div className="text-xs text-zinc-400 mt-1 font-medium">Google Calendar Sync</div>
          </div>
        </div>

        {/* Feature Cards Section */}
        <div id="features" className="mt-28 w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">Everything You Need for Effortless Appointments</h2>
            <p className="text-zinc-400 mt-4 text-base sm:text-lg max-w-2xl mx-auto">Designed from the ground up for zero-friction local booking.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {/* Card 1 */}
            <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-xl hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  📍
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Smart Location Search</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Automatically geocodes target locations across any region and filters the top 5 highest-rated providers on the interactive map.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-xl hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  🎙️
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Colloquial Tamil Speech</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Speak comfortably in everyday Tamil or English. Sola effortlessly understands natural phrasing like <span className="italic text-zinc-300">"pakathula irukura hospital kaatu"</span>.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-xl hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  📞
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Autonomous AI Calling</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Sola dials receptionist phone numbers live, greets them politely, asks for available timeslots, and secures your booking.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-xl hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  📅
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Google Calendar Sync</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Confirmed bookings generate complete event summaries that sync directly with your Google Calendar in one click.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Final Big CTA Section */}
        <div className="mt-32 w-full p-12 sm:p-16 rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-emerald-500/15 blur-[100px] rounded-full pointer-events-none" />
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight relative z-10">
            Ready to Experience <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Next-Gen Voice Booking?</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 max-w-xl relative z-10 font-normal">
            No endless scrolling or form filling. Just tell Sola what you need and let our AI handle the rest.
          </p>
          <button
            onClick={onGetStarted}
            className="mt-10 px-10 py-5 rounded-2xl text-lg font-extrabold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all relative z-10 flex items-center gap-3 group"
          >
            <span>Let's Get Started</span>
            <span className="text-2xl group-hover:translate-x-1 transition-transform">🚀</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-800/80 py-8 text-center text-xs text-zinc-500 relative z-10">
        Sola Autonomous Voice Booking Assistant © 2026. Built with Google Gemini & Geoapify.
      </footer>
    </div>
  );
};

export default HomePage;

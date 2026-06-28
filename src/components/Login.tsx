import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { 
  Mic, Calendar, Clock, Sparkles, AlertTriangle, ArrowRight, 
  Volume2, Check, Chrome, Play, Mail, CheckSquare, Sparkle 
} from 'lucide-react';

export const Login: React.FC = () => {
  const { loginWithGoogle, loginAsGuest, loading } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);

  // Playful voice feedback of the prototype coach
  const playSamplePrompt = () => {
    if (!('speechSynthesis' in window)) return;
    setIsPlaying(true);
    window.speechSynthesis.cancel();
    const text = "Deadline Guardian alert! Your homework is due in exactly three hours. Stop procrastinating, let's start with block one: Write outline. You have this!";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-[#F5F1EB] text-[#292524] font-dm selection:bg-[#5B6B43]/20 selection:text-[#5B6B43] flex flex-col relative overflow-x-hidden pb-16">
      
      {/* Scattered Organic Background Elements */}
      <div className="absolute top-[8%] left-[-10%] w-[450px] h-[450px] bg-[#5B6B43]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] bg-[#C4705A]/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Decorative scattered dots & hand-drawn grid feeling lines */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* HEADER */}
      <header className="max-w-7xl mx-auto w-full px-6 md:px-12 py-8 flex items-center justify-between z-20 relative">
        <Logo variant="horizontal" />
        
        <nav className="flex items-center gap-3 sm:gap-6 md:gap-10 font-dm text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#292524]/80">
          <a href="#features" className="hover:text-[#5B6B43] transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#5B6B43] hover:after:w-full after:transition-all">Features</a>
          <a href="#how-it-works" className="hover:text-[#5B6B43] transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#5B6B43] hover:after:w-full after:transition-all">How it works</a>
          <a href="#about" className="hover:text-[#5B6B43] transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#5B6B43] hover:after:w-full after:transition-all">About</a>
        </nav>
      </header>

      {/* CHRONOTASK HERO STAGE (Scattered, Asymmetric, Playful) */}
      <section className="max-w-7xl mx-auto w-full px-6 md:px-12 pt-8 pb-16 relative z-10">
        
        {/* Main Content & Scattered Items Wrapper */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center min-h-[600px]">
          
          {/* Left Hero Column (Lg spans 7 for large impact layout) */}
          <div className="lg:col-span-7 space-y-8 text-left relative z-20 pr-0 lg:pr-8">
            
            {/* Playful Floating Google App Integration Badge Group */}
            <div className="inline-flex items-center gap-2 bg-[#FAF8F5] border border-[#E7E5E4] px-4 py-2 rounded-full shadow-[2px_2px_0px_#E7E5E4] hover:shadow-[4px_4px_0px_#5B6B43]/20 transition-all transform -rotate-1 hover:rotate-0">
              <span className="h-2 w-2 rounded-full bg-[#5B6B43] animate-pulse" />
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#292524]/70 flex items-center gap-1.5">
                Google Calendar & Tasks Connected
              </span>
            </div>

            <div className="space-y-4">
              <span className="font-serif italic text-[#C4705A] text-base sm:text-lg md:text-xl block tracking-wide font-medium">
                Your AI-powered last-minute life saver
              </span>
              <h1 className="font-serif font-black text-4xl sm:text-5xl md:text-6.5xl lg:text-7.5xl leading-[0.98] tracking-tight text-[#292524] drop-shadow-sm">
                DEADLINE <br />
                <span className="text-[#5B6B43]">GUARDIAN</span>
              </h1>
              <p className="font-dm text-sm sm:text-base md:text-lg text-[#292524]/80 font-medium max-w-xl leading-relaxed">
                Speak your task. AI plans everything. Never miss a deadline.
              </p>
            </div>

            {/* Micro-Interactive Hero Button Pairing */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              <button
                onClick={loginWithGoogle}
                disabled={loading}
                className="bg-[#5B6B43] hover:bg-[#4d5b38] active:translate-y-0.5 disabled:opacity-50 text-[#FAF8F5] font-dm font-bold text-xs sm:text-sm px-6 py-3.5 sm:py-4 rounded-xl shadow-[4px_4px_0px_#292524] border-2 border-[#292524] transition-all cursor-pointer flex items-center justify-center gap-2 group"
                title="Connect with Google Calendar, Google Tasks, and Firestore database"
              >
                <Chrome className="h-4 w-4 shrink-0 text-white" />
                <span>{loading ? 'Connecting...' : 'Connect Google Account'}</span>
              </button>

              <button
                onClick={loginAsGuest}
                disabled={loading}
                className="bg-[#C4705A] hover:bg-[#b05d49] active:translate-y-0.5 disabled:opacity-50 text-[#FAF8F5] font-dm font-bold text-xs sm:text-sm px-6 py-3.5 sm:py-4 rounded-xl shadow-[4px_4px_0px_#292524] border-2 border-[#292524] transition-all cursor-pointer flex items-center justify-center gap-2 group"
                title="Bypass popup blocks and database issues to preview with local demo data instantly!"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-white animate-pulse" />
                <span>Enter Sandbox Mode (Bypass Login)</span>
              </button>
              
              <a
                href="#how-it-works"
                className="bg-[#FAF8F5] hover:bg-[#FAF8F5]/85 text-[#292524] border-2 border-[#292524] font-dm font-bold text-xs sm:text-sm px-4 py-3 sm:py-4 rounded-xl shadow-[3px_3px_0px_#292524] hover:shadow-[5px_5px_0px_#292524] transition-all flex items-center justify-center cursor-pointer"
              >
                How it works
              </a>
            </div>

            {/* Trust badge with Google logos */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 pt-4">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#292524]/50 block w-full sm:w-auto">
                Works securely with:
              </span>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="bg-[#FAF8F5] border border-[#E7E5E4] px-2.5 py-1 rounded text-[10px] font-bold text-[#4285F4] flex items-center gap-1 shadow-sm">
                  <Calendar className="h-3 w-3" /> Calendar
                </span>
                <span className="bg-[#FAF8F5] border border-[#E7E5E4] px-2.5 py-1 rounded text-[10px] font-bold text-[#EA4335] flex items-center gap-1 shadow-sm">
                  <Mail className="h-3 w-3" /> Gmail
                </span>
                <span className="bg-[#FAF8F5] border border-[#E7E5E4] px-2.5 py-1 rounded text-[10px] font-bold text-[#34A853] flex items-center gap-1 shadow-sm">
                  <CheckSquare className="h-3 w-3" /> Tasks
                </span>
              </div>
            </div>

          </div>

          {/* Right ChronoTask scattered Column (Lg spans 5) */}
          <div className="lg:col-span-5 relative min-h-[500px] mt-12 lg:mt-0 flex items-center justify-center">
            
            {/* CENTRAL BRAND EMBLEM (Our beautiful new high-fidelity logo) */}
            <div className="absolute top-[50px] left-[5%] right-[5%] bg-[#FAF8F5] border-2 border-[#292524] rounded-3xl p-6 shadow-[6px_6px_0px_#292524] transform rotate-[-1deg] hover:rotate-[1deg] hover:scale-[1.01] transition-all duration-500 z-0 select-none flex flex-col items-center justify-center opacity-30 md:opacity-100">
              <Logo variant="full" className="scale-90" />
            </div>

            {/* 3D ELEMENT 1: Yellow Sticky Note with Voice Waveform */}
            <div className="absolute top-[-30px] left-0 sm:left-4 md:left-[20px] w-48 sm:w-52 bg-[#FCF8D5] border-2 border-[#292524] rounded-lg p-4 sm:p-5 shadow-[5px_5px_0px_#292524] transform -rotate-6 hover:rotate-[-2deg] transition-all duration-300 z-10 group cursor-pointer" onClick={playSamplePrompt}>
              <div className="flex justify-between items-start mb-2 sm:mb-3">
                <span className="font-serif italic text-xs text-[#292524]/60">Quick Note</span>
                <div className="h-6 w-6 rounded-full bg-[#5B6B43]/10 flex items-center justify-center">
                  <Mic className="h-3 w-3 text-[#5B6B43] animate-pulse" />
                </div>
              </div>
              <p className="font-serif text-xs sm:text-sm font-semibold text-[#292524] leading-snug mb-3 sm:mb-4">
                "Gemini, schedule my team sync tomorrow at 3 PM and alert me 1 hour before!"
              </p>
              
              {/* Waveform indicator */}
              <div className="flex items-end gap-1 h-6 w-full pt-1">
                <span className="w-1 bg-[#5B6B43] h-2 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                <span className="w-1 bg-[#5B6B43] h-4 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                <span className="w-1 bg-[#5B6B43] h-5 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                <span className="w-1 bg-[#5B6B43] h-3 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-1 bg-[#5B6B43] h-1.5 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                <span className="w-1 bg-[#5B6B43] h-4 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                <span className="w-1 bg-[#5B6B43] h-2 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
              </div>
            </div>

            {/* 3D ELEMENT 2: Tilted Phone Mockup Showing Alarm Coach Screen */}
            <div className="absolute top-20 right-0 sm:right-[10px] md:right-[40px] z-20 transform rotate-[4deg] hover:rotate-[1deg] hover:scale-102 transition-all duration-500 cursor-pointer" onClick={playSamplePrompt}>
              <div className="absolute inset-0 bg-[#C4705A]/10 rounded-[2.2rem] transform translate-x-4 translate-y-4 blur-xl" />
              
              <div className="relative bg-[#292524] w-[185px] sm:w-[210px] h-[350px] sm:h-[400px] rounded-[2.2rem] p-2 sm:p-2.5 shadow-2xl border-4 border-[#3D3A38] flex flex-col justify-between overflow-hidden">
                {/* Dynamic island cutout */}
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 sm:w-20 h-3 sm:h-4 bg-black rounded-full z-30" />

                {/* Simulated Screen */}
                <div className="bg-[#1C1A19] flex-1 rounded-[1.8rem] p-3 sm:p-3.5 flex flex-col justify-between relative text-white pt-6 pb-4">
                  <div className="flex justify-between items-center text-[7px] sm:text-[8px] font-mono opacity-50 px-1">
                    <span>9:41</span>
                    <div className="flex gap-1">
                      <span>LTE</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Smart Alarm Visualizer */}
                  <div className="text-center my-auto space-y-1 sm:space-y-2 flex flex-col items-center">
                    <div className="relative w-16 sm:w-20 h-16 sm:h-20 rounded-full border-2 border-[#C4705A]/40 flex items-center justify-center">
                      <div className="absolute inset-1 sm:inset-1.5 rounded-full border-2 border-dashed border-[#C4705A] animate-spin" style={{ animationDuration: '25s' }} />
                      <div className="absolute inset-2 sm:inset-2.5 rounded-full bg-[#C4705A]/15 animate-pulse" />
                      <Clock className="h-5 sm:h-6 w-5 sm:w-6 text-[#C4705A]" />
                    </div>
                    <span className="block font-serif text-xs sm:text-sm font-bold">Alarm Active</span>
                    <span className="block font-mono text-[6px] sm:text-[7px] tracking-widest text-[#C4705A]/80 uppercase font-black animate-pulse">Now Ringing</span>
                  </div>

                  {/* Coach prompt card */}
                  <div className="bg-[#292524] rounded-lg p-1.5 sm:p-2 border border-white/5 space-y-1">
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5 text-[#C4705A]" />
                      <span className="font-mono text-[5px] sm:text-[6px] uppercase tracking-wider text-neutral-400">Guardian Coach</span>
                    </div>
                    <p className="font-dm text-[7px] sm:text-[8px] leading-relaxed text-[#FAF8F5]">
                      "Hey, stop scrolling! We scheduled writing your outline now. Let's do 15 minutes."
                    </p>
                  </div>

                  {/* Swipe bottom indicator */}
                  <div className="space-y-1 text-center">
                    <div className="h-5 sm:h-6 w-full bg-stone-800 rounded-full flex items-center justify-center p-1 relative">
                      <span className="font-dm text-[6px] sm:text-[7px] text-stone-400">Dismiss</span>
                      <div className="absolute left-1 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-[#FAF8F5] flex items-center justify-center shadow">
                        <ArrowRight className="h-1.5 sm:h-2 w-1.5 sm:h-2 text-stone-900" />
                      </div>
                    </div>
                    <span className="font-mono text-[5px] sm:text-[6px] text-amber-400/85">Click phone for speech</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3D ELEMENT 3: Google Calendar icon styled beautifully */}
            <div className="absolute bottom-16 left-2 sm:left-[20px] md:left-[60px] bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-3 sm:p-4 shadow-[4px_4px_0px_#292524] transform rotate-12 hover:rotate-6 hover:-translate-y-1 transition-all z-10 flex flex-col items-center gap-1 cursor-pointer">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-[#4285F4]/10 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 sm:h-6 w-5 sm:w-6 text-[#4285F4]" />
              </div>
              <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-widest font-black text-[#292524]/60">Google Cal</span>
            </div>

            {/* 3D ELEMENT 4: Small "Gemini" badge */}
            <div className="absolute bottom-4 right-2 sm:right-[40px] md:right-[120px] bg-[#FAF8F5] border-2 border-[#292524] rounded-full px-3 py-1.5 sm:px-4 sm:py-2 shadow-[3px_3px_0px_#292524] transform -rotate-3 hover:-rotate-1 hover:scale-105 transition-all z-25 flex items-center gap-1.5 cursor-pointer">
              <Sparkles className="h-3 sm:h-4 w-3 sm:w-4 text-[#C4705A] fill-[#C4705A]/20" />
              <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-[#292524]">
                Gemini Powered
              </span>
            </div>

            {/* Playful Floating Dice / Cube element */}
            <div className="absolute top-[160px] left-[130px] sm:left-[150px] w-6 sm:w-8 h-6 sm:h-8 bg-[#C4705A] border-2 border-[#292524] rounded-md shadow-[3px_3px_0px_#292524] transform rotate-45 pointer-events-none opacity-80" />

          </div>

        </div>

      </section>

      {/* HOW IT WORKS (Playful asymmetric layout with big custom numbers) */}
      <section id="how-it-works" className="max-w-7xl mx-auto w-full px-6 md:px-12 py-16 border-t-2 border-dashed border-[#292524]/10 relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="font-mono text-xs uppercase tracking-widest text-[#C4705A] font-black">Methodology</span>
          <h2 className="font-serif font-black text-4xl md:text-5xl text-[#292524]">
            How It Works
          </h2>
          <p className="font-dm text-sm md:text-base text-[#292524]/75 max-w-lg mx-auto">
            Deadline Guardian pairs natural voice planning with smart Google Calendar automated scheduling and audio coaches.
          </p>
        </div>

        {/* 4 Numbered steps in an organic scattered grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Step 1 */}
          <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 shadow-[5px_5px_0px_#292524] hover:shadow-[8px_8px_0px_#5B6B43] hover:-translate-y-1 transition-all flex flex-col justify-between group">
            <span className="font-serif font-black text-6xl text-[#5B6B43]/30 tracking-tighter select-none mb-6 block group-hover:text-[#5B6B43]/55 transition-colors">
              01
            </span>
            <div className="space-y-2">
              <h4 className="font-serif text-lg font-bold text-[#292524]">
                Speak your task.
              </h4>
              <p className="font-dm text-xs text-[#292524]/75 leading-relaxed">
                Just tap mic and talk naturally. No complicated multi-step forms or strict data formats required.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 shadow-[5px_5px_0px_#292524] hover:shadow-[8px_8px_0px_#C4705A] hover:-translate-y-1 transition-all flex flex-col justify-between group transform lg:translate-y-4">
            <span className="font-serif font-black text-6xl text-[#C4705A]/30 tracking-tighter select-none mb-6 block group-hover:text-[#C4705A]/55 transition-colors">
              02
            </span>
            <div className="space-y-2">
              <h4 className="font-serif text-lg font-bold text-[#292524]">
                AI plans everything.
              </h4>
              <p className="font-dm text-xs text-[#292524]/75 leading-relaxed">
                Gemini processes your voice, creates micro-milestones and sets up realistic incremental pacing.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 shadow-[5px_5px_0px_#292524] hover:shadow-[8px_8px_0px_#5B6B43] hover:-translate-y-1 transition-all flex flex-col justify-between group">
            <span className="font-serif font-black text-6xl text-[#5B6B43]/30 tracking-tighter select-none mb-6 block group-hover:text-[#5B6B43]/55 transition-colors">
              03
            </span>
            <div className="space-y-2">
              <h4 className="font-serif text-lg font-bold text-[#292524]">
                Auto-scheduled.
              </h4>
              <p className="font-dm text-xs text-[#292524]/75 leading-relaxed">
                Instantly blocks out focusing time in Google Calendar and publishes actions to Google Tasks.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 shadow-[5px_5px_0px_#292524] hover:shadow-[8px_8px_0px_#C4705A] hover:-translate-y-1 transition-all flex flex-col justify-between group transform lg:translate-y-4">
            <span className="font-serif font-black text-6xl text-[#C4705A]/30 tracking-tighter select-none mb-6 block group-hover:text-[#C4705A]/55 transition-colors">
              04
            </span>
            <div className="space-y-2">
              <h4 className="font-serif text-lg font-bold text-[#292524]">
                Smart alarms.
              </h4>
              <p className="font-dm text-xs text-[#292524]/75 leading-relaxed">
                Triggers customized coaching vocal notes precisely when micro-milestones are due, keeping you on track.
              </p>
            </div>
          </div>

        </div>

      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="max-w-7xl mx-auto w-full px-6 md:px-12 py-16 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
          
          <div className="space-y-4 text-left">
            <span className="font-mono text-xs uppercase tracking-widest text-[#5B6B43] font-black">Capabilities</span>
            <h3 className="font-serif font-black text-3.5xl md:text-4.5xl leading-tight text-[#292524]">
              What makes it so effective?
            </h3>
            <p className="font-dm text-xs md:text-sm text-[#292524]/80 leading-relaxed">
              We ditched standard dry check-lists. Deadline Guardian is designed dynamically to handle panic, procrastination, and lack of layout direction.
            </p>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Feature card 1 */}
            <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-xl p-5 shadow-[4px_4px_0px_#292524] hover:-translate-y-0.5 transition-all">
              <div className="h-10 w-10 bg-[#5B6B43]/10 text-[#5B6B43] rounded-lg flex items-center justify-center border border-[#5B6B43]/20 mb-4">
                <Mic className="h-5 w-5" />
              </div>
              <h4 className="font-serif font-bold text-base text-[#292524] mb-1.5">Voice Input Analysis</h4>
              <p className="font-dm text-xs text-[#292524]/75 leading-relaxed">
                Describe your project, anxiety or timeline in your own style. Gemini extracts specific action structures easily.
              </p>
            </div>

            {/* Feature card 2 */}
            <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-xl p-5 shadow-[4px_4px_0px_#292524] hover:-translate-y-0.5 transition-all">
              <div className="h-10 w-10 bg-[#4285F4]/10 text-[#4285F4] rounded-lg flex items-center justify-center border border-[#4285F4]/20 mb-4">
                <Calendar className="h-5 w-5" />
              </div>
              <h4 className="font-serif font-bold text-base text-[#292524] mb-1.5">Google Calendar Sync</h4>
              <p className="font-dm text-xs text-[#292524]/75 leading-relaxed">
                Automatically blocks scheduled intervals in your Google Calendar dynamically, reserving dedicated time blocks.
              </p>
            </div>

            {/* Feature card 3 */}
            <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-xl p-5 shadow-[4px_4px_0px_#292524] hover:-translate-y-0.5 transition-all">
              <div className="h-10 w-10 bg-[#C4705A]/10 text-[#C4705A] rounded-lg flex items-center justify-center border border-[#C4705A]/20 mb-4">
                <Clock className="h-5 w-5" />
              </div>
              <h4 className="font-serif font-bold text-base text-[#292524] mb-1.5">Smart Proactive Coach</h4>
              <p className="font-dm text-xs text-[#292524]/75 leading-relaxed">
                Our vocal synth coach interrupts you with customized sound alerts and direct advice if tasks are due.
              </p>
            </div>

            {/* Feature card 4 */}
            <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-xl p-5 shadow-[4px_4px_0px_#292524] hover:-translate-y-0.5 transition-all">
              <div className="h-10 w-10 bg-[#5B6B43]/10 text-[#5B6B43] rounded-lg flex items-center justify-center border border-[#5B6B43]/20 mb-4">
                <Sparkle className="h-5 w-5" />
              </div>
              <h4 className="font-serif font-bold text-base text-[#292524] mb-1.5">AI Preparation Prep Gen</h4>
              <p className="font-dm text-xs text-[#292524]/75 leading-relaxed">
                Generates a helpful preparation toolkit for each subtask with key concepts, templates, and reference materials.
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* HUMAN DESIGNED TESTIMONIAL CARD */}
      <section className="max-w-4xl mx-auto w-full px-6 py-8 relative z-10">
        <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-3xl p-8 shadow-[6px_6px_0px_#292524] relative overflow-hidden text-center space-y-6">
          <div className="absolute top-[-20px] left-[-20px] w-24 h-24 bg-[#5B6B43]/5 rounded-full blur-xl pointer-events-none" />
          <div className="absolute bottom-[-20px] right-[-20px] w-24 h-24 bg-[#C4705A]/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="inline-flex justify-center gap-1">
            <span className="text-xl">⭐️</span>
            <span className="text-xl">⭐️</span>
            <span className="text-xl">⭐️</span>
            <span className="text-xl">⭐️</span>
            <span className="text-xl">⭐️</span>
          </div>

          <blockquote className="font-serif italic text-2xl md:text-3xl text-[#292524] leading-relaxed max-w-2xl mx-auto">
            "I haven't missed a single deadline since I started using Deadline Guardian. The voice schedule breakdown and phone alert notes are extremely helpful!"
          </blockquote>

          <div className="space-y-1">
            <p className="font-serif font-bold text-base text-[#C4705A]">Alex Chen</p>
            <p className="font-mono text-[10px] text-[#292524]/60 uppercase tracking-widest">Computer Science & AI Student</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="about" className="max-w-7xl mx-auto w-full px-6 md:px-12 pt-16 border-t border-[#292524]/10 text-center relative z-10 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo variant="horizontal" />

          <div className="flex items-center justify-center gap-4 text-xs font-bold text-[#5B6B43]">
            <a href="#features" className="hover:underline">Features</a>
            <span>·</span>
            <a href="#how-it-works" className="hover:underline">How it works</a>
            <span>·</span>
            <span className="text-[#292524]/50 font-normal">© 2026 Deadline Guardian</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-[#292524]/55 pt-2">
          <span>Built with Google Gemini API & Google Calendar Services</span>
          <span>·</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>VIBE2SHIP Hackathon Winner</span>
        </div>
      </footer>

    </div>
  );
};

export default Login;

import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';

/* ─────────────────────────────────────────────────────
   SCROLL REVEAL with Parallax
   ───────────────────────────────────────────────────── */
const Reveal = ({ children, delay = 0, className = '', parallax = false }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            if (el) {
              el.style.opacity = '1';
              el.style.transform = 'translateY(0)';
              el.style.filter = 'blur(0)';
            }
          }, delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);

    if (parallax) {
      const handleScroll = () => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrollPercent = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        const translateY = (scrollPercent - 0.5) * 40;
        el.style.setProperty('--parallax-y', `${translateY}px`);
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        observer.disconnect();
        window.removeEventListener('scroll', handleScroll);
      };
    }

    return () => observer.disconnect();
  }, [delay, parallax]);

  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        transform: parallax ? 'translateY(calc(40px + var(--parallax-y, 0px)))' : 'translateY(40px)',
        filter: 'blur(3px)',
        transition: `all 1.1s cubic-bezier(0.16, 1, 0.3, 1)`,
      }}
      className={className}
    >
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   SELF-DRAWING COURT LINES
   ───────────────────────────────────────────────────── */
const CourtLines = () => (
  <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.04]">
    <style>{`
      @keyframes draw { to { stroke-dashoffset: 0; } }
      @keyframes courtPulse { 0%,100% { opacity: 0.04; } 50% { opacity: 0.07; } }
      .court-line { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: draw 4s ease-out forwards; }
      .court-line-d { stroke-dasharray: 1500; stroke-dashoffset: 1500; animation: draw 3.5s ease-out 0.8s forwards; }
    `}</style>
    <svg viewBox="0 0 1200 700" fill="none" className="w-[140%] h-[140%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6"
      style={{ animation: 'courtPulse 8s ease-in-out infinite' }}>
      <rect x="50" y="50" width="1100" height="600" rx="4" stroke="white" strokeWidth="2" className="court-line" />
      <line x1="600" y1="50" x2="600" y2="650" stroke="white" strokeWidth="2" className="court-line" />
      <circle cx="600" cy="350" r="90" stroke="white" strokeWidth="2" className="court-line-d" />
      <rect x="50" y="180" width="180" height="340" stroke="white" strokeWidth="2" className="court-line-d" />
      <rect x="970" y="180" width="180" height="340" stroke="white" strokeWidth="2" className="court-line-d" />
      <path d="M230 260 Q310 350 230 440" stroke="white" strokeWidth="2" className="court-line-d" />
      <path d="M970 260 Q890 350 970 440" stroke="white" strokeWidth="2" className="court-line-d" />
    </svg>
  </div>
);

/* ─────────────────────────────────────────────────────
   TYPED HEADLINE
   ───────────────────────────────────────────────────── */
const TypedText = ({ text, className = '', startDelay = 0 }) => {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setStarted(true), startDelay);
        observer.unobserve(el);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, 95);
    return () => clearInterval(timer);
  }, [started, text]);

  return (
    <span ref={ref} className={className}>
      {displayed}
      {started && displayed.length < text.length && (
        <span className="inline-block w-[3px] h-[0.85em] bg-brand ml-0.5 animate-[pulse_0.6s_ease-in-out_infinite] align-middle" />
      )}
    </span>
  );
};

/* ─────────────────────────────────────────────────────
   LIVE SYSTEM LOG
   ───────────────────────────────────────────────────── */
const SystemLog = () => {
  const [visibleLines, setVisibleLines] = useState(0);
  const ref = useRef(null);
  const hasTriggered = useRef(false);

  const baseTime = useRef(new Date());
  const getTime = (offsetSec) => {
    const d = new Date(baseTime.current.getTime() + offsetSec * 1000);
    return d.toTimeString().split(' ')[0];
  };

  const lines = [
    { offset: 0, text: 'Student @shiva opened Arena Games', type: 'dim' },
    { offset: 2, text: 'Browsing Basketball → 4 courts available', type: 'dim' },
    { offset: 4, text: 'Selected Court B  ·  Slot 4:00 PM – 5:00 PM', type: 'normal' },
    { offset: 5, text: 'Invited @rahul to squad', type: 'dim' },
    { offset: 5, text: 'Invited @amit to squad', type: 'dim' },
    { offset: 8, text: '@rahul accepted invitation', type: 'success' },
    { offset: 13, text: '@amit accepted invitation', type: 'success' },
    { offset: 14, text: 'All members confirmed. Processing…', type: 'normal' },
    { offset: 14, text: 'Acquiring database lock on court_b…', type: 'dim' },
    { offset: 14, text: 'Lock acquired. Writing reservation…', type: 'dim' },
    { offset: 15, text: '', type: 'progress' },
    { offset: 15, text: 'Court B locked until 17:00. Enjoy your game.', type: 'success' },
  ];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasTriggered.current) {
        hasTriggered.current = true;
        baseTime.current = new Date();
        let i = 0;
        const timer = setInterval(() => {
          i++;
          setVisibleLines(i);
          if (i >= lines.length) clearInterval(timer);
        }, 450);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const colorMap = {
    dim: 'text-white/20',
    normal: 'text-white/50',
    success: 'text-emerald-400',
    progress: 'text-brand font-bold',
  };

  return (
    <div ref={ref} className="w-full max-w-3xl mx-auto rounded-2xl border border-white/[0.06] bg-[#08080A] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.7)] relative group">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
        <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent skew-x-12 group-hover:translate-x-[300%] transition-transform duration-1000 ease-out" />
      </div>

      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.01]">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <div className="flex-1 text-center text-[10px] text-white/15 font-mono tracking-wider">arenahub — system log</div>
      </div>

      <div className="p-5 md:p-7 font-mono text-xs md:text-[13px] leading-8 min-h-[400px]">
        {lines.slice(0, visibleLines).map((line, i) => (
          <div key={i} className={`${colorMap[line.type]}`}>
            {line.type === 'progress' ? (
              <span className="text-brand">
                <span className="text-white/10 mr-3 select-none">{getTime(line.offset)}</span>
                <ProgressBar />
              </span>
            ) : (
              <>
                <span className="text-white/10 mr-3 select-none">{getTime(line.offset)}</span>
                {line.type === 'success' && <span className="text-emerald-500 mr-1.5">✓</span>}
                {line.text}
              </>
            )}
          </div>
        ))}
        {visibleLines > 0 && visibleLines < lines.length && (
          <span className="inline-block w-2 h-4 bg-white/30 animate-[pulse_0.6s_ease-in-out_infinite] ml-1 mt-1" />
        )}
      </div>
    </div>
  );
};

const ProgressBar = () => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(100), 50);
    return () => clearTimeout(timer);
  }, []);
  return (
    <span className="inline-flex items-center gap-3">
      <span className="inline-block w-48 h-3 bg-white/[0.05] rounded-full overflow-hidden">
        <span
          className="block h-full bg-gradient-to-r from-brand to-red-600 rounded-full transition-all duration-[1200ms] ease-out"
          style={{ width: `${width}%` }}
        />
      </span>
      <span className="text-brand text-xs font-bold">{width === 100 ? 'Booking confirmed' : 'Processing…'}</span>
    </span>
  );
};

/* ─────────────────────────────────────────────────────
   3D TILT CARD
   ───────────────────────────────────────────────────── */
const TiltCard = ({ children, className = '' }) => {
  const ref = useRef(null);
  const handleMouseMove = useCallback((e) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateX(${y * -4}deg) rotateY(${x * 4}deg) scale(1.01)`;
  }, []);
  const handleMouseLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
  }, []);
  return (
    <div ref={ref} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-300 ease-out ${className}`} style={{ transformStyle: 'preserve-3d' }}>
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   SHIMMER CARD
   ───────────────────────────────────────────────────── */
const ShimmerCard = ({ children, className = '' }) => (
  <div className={`relative overflow-hidden group ${className}`}>
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
      <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent skew-x-12 group-hover:translate-x-[300%] transition-transform duration-[1200ms] ease-out" />
    </div>
    {children}
  </div>
);

/* ─────────────────────────────────────────────────────
   LIVE CLOCK
   ───────────────────────────────────────────────────── */
const LiveClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono tracking-widest text-white/25">
      <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
      {time}
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   FEATURE CARD (Unified ArenaHub Theme)
   ───────────────────────────────────────────────────── */
const FeatureCard = ({ title, description, children }) => {
  return (
    <TiltCard className="h-full">
      <ShimmerCard className="h-full">
        <div className="h-full rounded-[28px] bg-[#0A0A0C] border border-white/[0.06] hover:border-brand/30 p-8 md:p-10 relative overflow-hidden group transition-all duration-700 flex flex-col justify-between">
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-brand/[0.03] to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="w-2 h-2 rounded-full bg-brand mb-5 shadow-md shadow-brand/40" />
            <h3 className="font-display font-black text-2xl md:text-3xl tracking-tight mb-3 text-white">{title}</h3>
            <p className="text-white/40 text-sm md:text-base leading-relaxed group-hover:text-white/60 transition-colors duration-500 mb-6">{description}</p>
          </div>

          {children && <div className="relative z-10">{children}</div>}
        </div>
      </ShimmerCard>
    </TiltCard>
  );
};

/* ═════════════════════════════════════════════════════
   LANDING PAGE MAIN
   ═════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [cursor, setCursor] = useState({ x: -1000, y: -1000 });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const move = (e) => setCursor({ x: e.clientX, y: e.clientY });
    const scroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('mousemove', move);
    window.addEventListener('scroll', scroll, { passive: true });
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('scroll', scroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-white overflow-x-hidden selection:bg-brand/30">
      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      {/* Dual Cursor spotlight */}
      <div
        className="fixed pointer-events-none z-[60] w-[600px] h-[600px] rounded-full bg-brand/[0.015] blur-[100px] transition-all duration-100"
        style={{ left: cursor.x - 300, top: cursor.y - 300 }}
      />
      <div
        className="fixed pointer-events-none z-[60] w-[300px] h-[300px] rounded-full bg-white/[0.02] blur-[60px] transition-all duration-75"
        style={{ left: cursor.x - 150, top: cursor.y - 150 }}
      />

      {/* ── NAVBAR ──────────────────────────────────── */}
      <nav className={`fixed top-0 w-full z-50 px-6 lg:px-12 h-14 flex items-center justify-between backdrop-blur-2xl transition-all duration-500 ${
        scrolled ? 'bg-[#000]/95 border-b border-white/[0.08] shadow-[0_1px_30px_rgba(229,57,53,0.08)]' : 'bg-transparent border-b border-transparent'
      }`}>
        <span className="font-display font-bold text-base tracking-tight text-white">
          Arena<span className="text-brand">Hub</span>
        </span>

        <div className="flex items-center gap-6">
          <LiveClock />
          <Link to="/login" className="text-xs font-semibold text-white/50 hover:text-white transition-colors tracking-wide">
            Sign in
          </Link>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6">
        <CourtLines />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand/[0.04] rounded-full blur-[180px] pointer-events-none" />

        <Reveal parallax>
          <h1 className="font-display font-black text-[clamp(3.5rem,10vw,9rem)] tracking-[-0.04em] leading-[0.85] max-w-6xl relative z-10">
            <span className="block text-white drop-shadow-[0_0_80px_rgba(255,255,255,0.1)]">
              Book courts,
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand via-red-400 to-orange-400 drop-shadow-[0_0_60px_rgba(229,57,53,0.3)]">
              <TypedText text="not queues." startDelay={800} />
            </span>
          </h1>
        </Reveal>

        <Reveal delay={1200} parallax>
          <p className="text-white/35 text-lg md:text-xl mt-8 max-w-md font-medium leading-relaxed relative z-10">
            The campus sports portal that gets out of your way.
          </p>
        </Reveal>

        <Reveal delay={1600}>
          <div className="flex flex-col sm:flex-row items-center gap-5 mt-12 relative z-10">
            <Link
              to="/login"
              className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-brand hover:bg-red-500 text-white font-semibold text-base transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(229,57,53,0.4)]"
            >
              Get started
              <span className="text-xl transition-transform duration-300 group-hover:translate-x-1">›</span>
            </Link>
            <a
              href="#system"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 font-medium text-base transition-all duration-300 hover:scale-105"
            >
              See it work
              <span className="text-xl transition-transform duration-300 group-hover:translate-x-1">›</span>
            </a>
          </div>
        </Reveal>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-20">
          <div className="w-5 h-8 rounded-full border border-white/15 flex items-start justify-center p-1.5">
            <div className="w-1 h-2 rounded-full bg-white/30 animate-[pulse_2s_infinite]" />
          </div>
        </div>
      </section>

      {/* ── LIVE SYSTEM LOG ────────────────────────── */}
      <section id="system" className="py-40 px-6">
        <Reveal>
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <p className="text-white/12 text-xs font-bold tracking-[0.3em] uppercase mb-5">How it works</p>
            <h2 className="font-display font-black text-3xl md:text-5xl tracking-tight leading-tight">
              Watch the system work.
            </h2>
            <p className="text-white/30 text-base mt-4 leading-relaxed">
              From tap to confirmation in under 2 seconds. Here's what happens behind the scenes.
            </p>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <SystemLog />
        </Reveal>
      </section>

      {/* ── PRODUCT SHOWCASE — Bento ──────────────── */}
      <section className="px-6 lg:px-12 py-20 max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <p className="text-white/12 text-xs font-bold tracking-[0.3em] uppercase mb-5">Why ArenaHub</p>
            <h2 className="font-display font-black text-4xl md:text-6xl tracking-tight leading-tight">
              Built for speed.<br />
              <span className="text-white/40">Made for students.</span>
            </h2>
          </div>
        </Reveal>

        {/* Clean Dashboard Showcase */}
        <Reveal>
          <TiltCard>
            <ShimmerCard>
              <div className="rounded-[32px] bg-[#0A0A0C] border border-white/[0.08] hover:border-brand/30 transition-all duration-700 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-brand/[0.03] via-transparent to-transparent pointer-events-none" />
                <div className="p-10 md:p-16 text-center relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold tracking-wider uppercase mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                    Live Dashboard Sync
                  </div>
                  <h2 className="font-display font-black text-4xl md:text-6xl tracking-tight mb-4">
                    Real-time. Always.
                  </h2>
                  <p className="text-white/40 text-base md:text-lg max-w-xl mx-auto mb-12 leading-relaxed">
                    See every court, every open slot, and live player activity in real-time.
                  </p>

                  {/* Clean Dashboard UI Mockup */}
                  <div className="max-w-4xl mx-auto rounded-2xl border border-white/[0.10] bg-[#070709] overflow-hidden shadow-[0_30px_140px_rgba(0,0,0,0.95)]">
                    {/* Header Chrome */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-black/60 backdrop-blur-md">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-white/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        arenahub.campus/live-courts
                      </div>
                      <div className="text-[10px] font-mono text-white/30 hidden sm:block uppercase tracking-wider">REALTIME SYNC</div>
                    </div>

                    {/* Filter Bar */}
                    <div className="px-6 py-3 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 font-medium">
                        <span className="px-3 py-1 rounded-full bg-white text-black font-bold text-[11px]">All Arenas (12)</span>
                        <span className="px-3 py-1 rounded-full bg-white/[0.03] text-white/40 border border-white/[0.06] hidden sm:inline-block">Indoor Courts</span>
                        <span className="px-3 py-1 rounded-full bg-white/[0.03] text-white/40 border border-white/[0.06] hidden sm:inline-block">Turfs</span>
                      </div>
                      <div className="text-emerald-400/80 text-[11px] font-mono font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        12 Courts Syncing
                      </div>
                    </div>

                    {/* Grid of 3 Unified Brand Cards */}
                    <div className="p-6 md:p-8">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {/* Basketball Card */}
                        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand/40 p-5 text-left transition-all duration-500 group/card relative overflow-hidden flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <span className="w-2 h-2 rounded-full bg-brand shadow-md shadow-brand/50" />
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-brand/10 text-brand border border-brand/20">
                                4 OPEN
                              </span>
                            </div>
                            <div className="font-bold text-base text-white mb-1">Basketball</div>
                            <div className="text-xs text-white/40 mb-4 font-mono">Maple Hardwood Floor</div>
                          </div>

                          <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                            <div className="flex justify-between items-center text-[11px] font-mono text-white/40">
                              <span>Next Slot:</span>
                              <span className="text-emerald-400 font-bold">16:30 PM</span>
                            </div>
                            <Link to="/login" className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-brand to-red-600 hover:from-brand/90 hover:to-red-700 flex items-center justify-center text-xs font-bold text-white tracking-wider transition-all duration-300 shadow-lg shadow-brand/20">
                              BOOK NOW →
                            </Link>
                          </div>
                        </div>

                        {/* Badminton Card */}
                        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand/40 p-5 text-left transition-all duration-500 group/card relative overflow-hidden flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <span className="w-2 h-2 rounded-full bg-brand shadow-md shadow-brand/50" />
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-brand/10 text-brand border border-brand/20">
                                2 OPEN
                              </span>
                            </div>
                            <div className="font-bold text-base text-white mb-1">Badminton</div>
                            <div className="text-xs text-white/40 mb-4 font-mono">BWF Rubber Mat</div>
                          </div>

                          <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                            <div className="flex justify-between items-center text-[11px] font-mono text-white/40">
                              <span>Next Slot:</span>
                              <span className="text-emerald-400 font-bold">17:00 PM</span>
                            </div>
                            <Link to="/login" className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-brand to-red-600 hover:from-brand/90 hover:to-red-700 flex items-center justify-center text-xs font-bold text-white tracking-wider transition-all duration-300 shadow-lg shadow-brand/20">
                              BOOK NOW →
                            </Link>
                          </div>
                        </div>

                        {/* Table Tennis Card */}
                        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand/40 p-5 text-left transition-all duration-500 group/card relative overflow-hidden flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <span className="w-2 h-2 rounded-full bg-brand shadow-md shadow-brand/50" />
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-brand/10 text-brand border border-brand/20">
                                6 OPEN
                              </span>
                            </div>
                            <div className="font-bold text-base text-white mb-1">Table Tennis</div>
                            <div className="text-xs text-white/40 mb-4 font-mono">Stiga Pro Tables</div>
                          </div>

                          <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                            <div className="flex justify-between items-center text-[11px] font-mono text-white/40">
                              <span>Next Slot:</span>
                              <span className="text-emerald-400 font-bold">Immediate</span>
                            </div>
                            <Link to="/login" className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-brand to-red-600 hover:from-brand/90 hover:to-red-700 flex items-center justify-center text-xs font-bold text-white tracking-wider transition-all duration-300 shadow-lg shadow-brand/20">
                              BOOK NOW →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ShimmerCard>
          </TiltCard>
        </Reveal>

        {/* Feature Grid in Brand Theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Squad Lobbies */}
          <Reveal delay={100}>
            <FeatureCard
              title="Squad Lobbies"
              description="Invite friends. Court locks until everyone confirms. Someone drops? Slot auto-releases."
            >
              <div className="mt-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <span className="text-white/60 font-bold">Futsal Squad #4810</span>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
                    ✓ 4/4 CONFIRMED
                  </span>
                </div>
                <div className="flex items-center justify-between text-white/40">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-[10px] font-bold text-white border border-black">S</div>
                      <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-white border border-black">R</div>
                      <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-white border border-black">A</div>
                      <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-white border border-black">P</div>
                    </div>
                    <span>@shiva, @rahul, @amit, @priya</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-bold">LOCKED</span>
                </div>
              </div>
            </FeatureCard>
          </Reveal>

          {/* Atomic Locks */}
          <Reveal delay={200}>
            <FeatureCard
              title="Atomic Locks"
              description="Two people book simultaneously? Database transactions guarantee exactly one winner. Zero double-bookings."
            >
              <div className="mt-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span>Req A (@shiva)</span>
                  <span className="font-bold">LOCKED (0ms)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <span>Req B (@rahul)</span>
                  <span className="font-bold">ROLLBACK (1ms)</span>
                </div>
              </div>
            </FeatureCard>
          </Reveal>
        </div>

        {/* Automated Fines & Expiry Feature Card */}
        <div className="mt-6">
          <Reveal delay={300}>
            <FeatureCard
              title="Automated Fines & Expiry"
              description="Return gear late? Fines calculate automatically per minute. Uncollected bookings expire after 15 minutes to keep courts free."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] font-mono text-xs">
                  <div className="flex items-center gap-2 text-brand font-bold mb-1">
                    <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                    Automated Late Fines
                  </div>
                  <div className="text-white/40 text-[11px]">Calculated per minute</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] font-mono text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    15-Min Auto Expiry
                  </div>
                  <div className="text-white/40 text-[11px]">Auto releases uncollected slots</div>
                </div>
              </div>
            </FeatureCard>
          </Reveal>
        </div>

        {/* Campus Events & Receipts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Campus Events */}
          <Reveal delay={100}>
            <FeatureCard
              title="Campus Tournaments"
              description="From inter-college championships to casual weekend leagues. Create, manage, and track team standings."
            >
              <div className="mt-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] font-mono text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-white mb-0.5">Inter-Hostel Futsal Cup</div>
                  <div className="text-[11px] text-white/40">16 Teams Enrolled · Starts Sat 6 PM</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-brand/15 text-brand font-bold text-[10px] border border-brand/20">
                  LIVE REGISTRATION
                </span>
              </div>
            </FeatureCard>
          </Reveal>

          {/* Instant Receipts */}
          <Reveal delay={200}>
            <FeatureCard
              title="Instant Digital Receipts"
              description="Every payment and booking generates a verified digital pass with instant email confirmation."
            >
              <div className="mt-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] font-mono text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-white mb-0.5">Pass #ARN-9921</div>
                  <div className="text-[11px] text-emerald-400">Paid via Razorpay · Verified Access</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  ✓ VERIFIED
                </span>
              </div>
            </FeatureCard>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="py-44 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-brand/[0.05] rounded-full blur-[150px] pointer-events-none animate-pulse" />

        <Reveal parallax>
          <h2 className="font-display font-black text-5xl md:text-7xl tracking-tight mb-6 relative z-10">
            Ready to play?
          </h2>
          <p className="text-white/30 text-lg md:text-xl mb-12 max-w-md mx-auto relative z-10">
            Join students already booking smarter.
          </p>
          <Link
            to="/login"
            className="group relative inline-flex items-center gap-2 px-10 py-5 rounded-full bg-brand hover:bg-red-500 text-white font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_50px_rgba(229,57,53,0.5)]"
          >
            Start booking
            <span className="text-2xl transition-transform duration-300 group-hover:translate-x-1.5">›</span>
          </Link>
        </Reveal>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="px-6 py-8 border-t border-white/[0.04] relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-display font-bold text-base tracking-tight text-white/70">
              Arena<span className="text-brand">Hub</span>
            </span>
            <span className="text-white/12 text-xs">© {new Date().getFullYear()} All rights reserved</span>
          </div>

          <div className="flex items-center gap-8 text-xs">
            <a href="#" className="text-white/20 hover:text-white/50 transition-colors">Privacy</a>
            <a href="#" className="text-white/20 hover:text-white/50 transition-colors">Terms</a>
            <a href="#" className="text-white/20 hover:text-white/50 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Clean Unified Brand Spinner
 */
export const SportsSpinner = ({ size = "md" }) => {
  return (
    <div className="relative flex flex-col items-center">
      <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin shadow-lg shadow-brand/30" />
    </div>
  );
};

/**
 * Helper to identify high-level section boundaries
 */
function getSection(pathname) {
  if (pathname === '/') return 'landing';
  if (pathname === '/login' || pathname === '/register') return 'auth';
  if (pathname.startsWith('/authority')) return 'authority';
  return 'student';
}

/**
 * GlobalPageTransition — Premium transition overlay only for major section changes
 * (e.g. Landing -> Login -> Dashboard), keeping inner dashboard tabs instant.
 */
export const GlobalPageTransition = ({ children }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const currentSection = getSection(location.pathname);
    const prevSection = window.__arenaLastSection;

    // Trigger full screen wipe ONLY when crossing major section boundaries
    if (prevSection && prevSection !== currentSection) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      window.__arenaLastSection = currentSection;
      return () => clearTimeout(timer);
    }

    window.__arenaLastSection = currentSection;
  }, [location.pathname]);

  return (
    <>
      {/* Full-Screen Section Transition Overlay */}
      <div
        className={`fixed inset-0 z-[9999] bg-[#000000] flex flex-col items-center justify-center gap-4 transition-opacity duration-200 select-none ${
          isTransitioning ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin shadow-lg shadow-brand/40" />
        <div className="font-display font-black text-xs tracking-[0.3em] text-white uppercase">
          ARENA<span className="text-brand">HUB</span>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-opacity duration-200 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </div>
    </>
  );
};

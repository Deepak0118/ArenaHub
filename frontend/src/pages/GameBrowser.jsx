import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { AlertCircle, Clock, ArrowRight, Search } from 'lucide-react';

export default function GameBrowser() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const data = await apiFetch('/games');
        setGames(data.games);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-border border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl pt-8 pb-4 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          
          {}
          <div className="mb-8 border-b border-border pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-foreground/10 shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                <div className="w-2 h-2 rounded-full bg-foreground animate-pulse"></div>
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-foreground">Live Availability</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl text-foreground mb-3 drop-shadow-lg">
              Arena Games
            </h1>
            <p className="text-foreground-secondary font-medium text-sm md:text-base">
              Select a game to check availability, rules and make a booking.
            </p>
          </div>
          <div className="w-full md:w-auto flex flex-col xl:flex-row items-start xl:items-center gap-4">
            
            {}
            <div className="relative w-full xl:w-64 focus-within:xl:w-80 transition-all duration-300 ease-out">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background-elevated border border-border text-foreground rounded-lg px-4 py-2 pl-10 focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all w-full text-sm font-medium h-[44px] shadow-sm"
              />
            </div>

            {}
            <div className="w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
              <div className="flex bg-background-elevated p-1.5 rounded-lg border border-border min-w-max h-[44px]">
                {[
                  { id: 'ALL', label: 'All Games' },
                  { id: 'AVAILABLE', label: 'Available Now' },
                  { id: 'UNAVAILABLE', label: 'Full / Closed' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setFilter(opt.id)}
                    className={`px-5 py-1.5 rounded-md text-xs font-bold transition-all duration-300 ${
                      filter === opt.id 
                        ? 'bg-foreground text-background shadow-sm' 
                        : 'text-foreground-secondary hover:text-foreground hover:bg-background-card'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          </div>
          
          {}
          <div className="grid grid-cols-12 gap-4 pb-4 border-b border-border text-[11px] font-bold text-foreground-secondary hidden md:grid">
            <div className="col-span-4">Game & Session</div>
            <div className="col-span-5">Available Units</div>
            <div className="col-span-3">Availability</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-4 pb-8">
        {error && (
          <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        {}
        <div className="flex flex-col">
          
          {}

          {}
          <div className="flex flex-col gap-2">
            {(() => {
              const filteredGames = games.filter(game => {
                const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase());
                if (!matchesSearch) return false;

                const isDisabled = !game.isActive || (game.disabledForEvents && game.disabledForEvents.length > 0);
                const availableCount = game.resources.filter(r => r.status === 'AVAILABLE').length;
                const hasAvailability = availableCount > 0 && !isDisabled;
                
                if (filter === 'AVAILABLE') return hasAvailability;
                if (filter === 'UNAVAILABLE') return !hasAvailability;
                return true;
              });

              if (filteredGames.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-border rounded-lg bg-background-elevated/50">
                    <div className="w-16 h-16 rounded-full bg-background-card flex items-center justify-center mb-4 border border-border">
                      <Search className="w-6 h-6 text-foreground-muted" />
                    </div>
                    <h3 className="font-display text-xl text-foreground mb-2">No Games Found</h3>
                    <p className="text-sm text-foreground-secondary text-center max-w-sm">
                      {searchQuery 
                        ? `We couldn't find any games matching "${searchQuery}". Try a different search term.`
                        : "There are currently no games matching your selected filter."}
                    </p>
                    {(searchQuery || filter !== 'ALL') && (
                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          setFilter('ALL');
                        }}
                        className="mt-6 text-xs font-bold text-foreground hover:text-white transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                );
              }

              return filteredGames.map((game, index, arr) => {
                const isManuallyPaused = !game.isActive;
              const isEventOngoing = game.disabledForEvents && game.disabledForEvents.length > 0;
              const isDisabled = isManuallyPaused || isEventOngoing;
              
              const availableCount = game.resources.filter(r => r.status === 'AVAILABLE').length;
              const totalCount = game.resources.length;
              const hasAvailability = availableCount > 0 && !isDisabled;
              const isLast = index === arr.length - 1;

              const isAlmostFull = hasAvailability && availableCount === 1 && totalCount > 1;

              return (
                <button
                  key={game.id}
                  onClick={() => {
                    if (!isDisabled) navigate(`/book/${game.id}`);
                  }}
                  disabled={isDisabled}
                  style={{ animationDelay: `${index * 40}ms` }}
                  className={`animate-fade-in-up grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-6 text-left group transition-all duration-300 px-4 border border-transparent rounded ${
                    isDisabled 
                      ? 'cursor-not-allowed opacity-50 grayscale' 
                      : 'hover:border-border hover:shadow-xl'
                  }`}
                >
                  {}
                  <div className="col-span-1 md:col-span-4 pl-2">
                    <h2 className="font-display text-2xl leading-tight mb-2 text-foreground transition-colors">
                      {game.name}
                    </h2>
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground-secondary ">
                      <Clock className="w-4 h-4" />
                      <span>{game.slotDurationMinutes} min session</span>
                    </div>
                  </div>

                  {}
                  <div className="col-span-1 md:col-span-5 mt-4 md:mt-0 flex flex-wrap gap-x-6 gap-y-3">
                    {game.resources.map(resource => {
                      const isAvailable = resource.status === 'AVAILABLE';
                      return (
                        <div key={resource.id} className={`flex items-center gap-2 transition-opacity ${!isAvailable || isDisabled ? 'opacity-40' : 'opacity-100'}`}>
                          <span className={`text-[10px] ${isAvailable && !isDisabled ? 'text-success drop-shadow-[0_0_8px_rgba(0,250,154,0.5)]' : 'text-foreground-muted'}`}>●</span>
                          <span className="text-sm font-medium text-foreground">
                            {resource.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {}
                  <div className="col-span-1 md:col-span-3 mt-6 md:mt-0 flex items-center justify-between">
                    <div>
                      {isDisabled ? (
                        <>
                          <div className="text-sm font-bold text-foreground-muted mb-1 ">
                            {isEventOngoing ? 'Event Ongoing' : 'Unavailable'}
                          </div>
                          <div className="text-[10px] font-bold text-foreground-secondary/80">
                            Closed
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-display text-foreground mb-1.5 flex items-center gap-3">
                            <span>{availableCount} / {totalCount}</span>
                            {isAlmostFull && (
                              <span className="text-[9px] px-1.5 py-0.5 border border-warning/30 text-warning rounded font-bold ">
                                Almost Full
                              </span>
                            )}
                          </div>
                          <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[9px] font-bold border ${
                            hasAvailability 
                              ? 'bg-success/10 text-success border-success/20' 
                              : 'bg-warning/10 text-warning border-warning/20'
                          }`}>
                            {hasAvailability ? 'Available' : 'Full'}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {!isDisabled && (
                      <div className="flex items-center gap-2 text-[11px] font-bold text-foreground-muted group-hover:text-foreground transition-all transform group-hover:translate-x-1">
                        Book Session <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </button>
              );
            });
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { AlertCircle, RotateCcw, Search } from 'lucide-react';
import { apiFetch } from '../../utils/api';

export default function ControlRoom() {
  const [facilities, setFacilities] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ active: 0, total: 0, awaiting: 0, late: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const [gamesRes, awaitingRes, activeRes] = await Promise.all([
        apiFetch('/games'),
        apiFetch('/bookings/awaiting-collection'),
        apiFetch('/bookings/active')
      ]);

      const mappedFacilities = gamesRes.games.map(game => {
        const active = game.resources.filter(r => r.status === 'ISSUED').length;
        const total = game.resources.filter(r => ['AVAILABLE', 'ISSUED'].includes(r.status)).length;
        return { name: game.name, active, total };
      });
      
      setFacilities(mappedFacilities);

      const activeUnits = mappedFacilities.reduce((sum, f) => sum + f.active, 0);
      const totalUnits = mappedFacilities.reduce((sum, f) => sum + f.total, 0);
      
      // A booking is technically "late" if it's returned late, but for the stats, we might want to count 
      // active sessions that have passed their end time. Let's just use the returned statuses for now 
      // or count active bookings where now > endTime
      const now = new Date();
      const lateActive = activeRes.bookings.filter(b => b.status === 'ACTIVE' && new Date(b.endTime) < now).length;

      setStats({
        active: activeUnits,
        total: totalUnits,
        awaiting: awaitingRes.bookings.length,
        late: lateActive
      });

      setActiveSessions(activeRes.bookings.filter(b => b.status === 'ACTIVE'));

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleReturn = async (id) => {
    setActionLoading(id);
    setError('');
    try {
      await apiFetch(`/bookings/${id}/return`, { method: 'POST' });
      await fetchDashboardData();
    } catch (err) {
      setError(`Failed to return equipment: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-brand rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredSessions = activeSessions.filter(session => {
    if (filter === 'OVERDUE') {
      if (new Date(session.endTime) >= new Date()) return false;
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = session.createdBy?.name?.toLowerCase().includes(q);
      const matchUsername = session.createdBy?.username?.toLowerCase().includes(q);
      const matchGame = session.gameConfig?.name?.toLowerCase().includes(q);
      
      if (!matchName && !matchUsername && !matchGame) return false;
    }

    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-[1400px] mx-auto text-foreground">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl mb-6 border-b border-border pb-4 pt-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-foreground animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.4)]"></div>
            <span className="text-[10px] text-foreground font-bold uppercase tracking-wider">Live Status</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display text-foreground">Dashboard</h1>
            
            {/* Live Stats Pills */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="px-3 py-1.5 bg-transparent border border-border rounded flex items-center gap-2.5 shadow-sm">
                <span className="text-[10px] font-bold text-foreground-secondary">Active</span>
                <span className="text-xs font-mono font-bold text-foreground tabular-nums">{stats.active}/{stats.total}</span>
              </div>
              {stats.awaiting > 0 && (
                <div className="px-3 py-1.5 bg-warning/5 border border-warning/30 shadow-[0_0_10px_rgba(255,170,0,0.1)] rounded flex items-center gap-2.5">
                  <span className="text-[10px] font-bold text-warning">Awaiting</span>
                  <span className="text-xs font-mono font-bold text-warning tabular-nums animate-pulse">{stats.awaiting}</span>
                </div>
              )}
              {stats.late > 0 && (
                <div className="px-3 py-1.5 bg-error/5 border border-error/30 shadow-[0_0_10px_rgba(255,0,0,0.1)] rounded flex items-center gap-2.5">
                  <span className="text-[10px] font-bold text-error">Late</span>
                  <span className="text-xs font-mono font-bold text-error tabular-nums animate-pulse">{stats.late}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-error mt-0.5" />
          <p className="text-xs font-bold text-error">{error}</p>
        </div>
      )}

      {}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {}
        <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-8">
          <h3 className="text-xs font-bold text-foreground-muted mb-4">Facility Status</h3>
          
          <div className="flex flex-col gap-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 scrollbar-hide">
            {facilities.map((facility, i) => {
              const isFull = facility.active === facility.total && facility.total > 0;

              return (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-3 border rounded transition-all duration-300 ${
                      isFull ? 'border-border bg-foreground/5' : 'border-transparent bg-transparent hover:border-border hover:shadow-lg'
                    }`}
                >
                  <span className="font-bold text-sm">{facility.name.replace('\n', ' ')}</span>
                  <span className={`font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded border ${
                    isFull 
                      ? 'bg-foreground/10 text-foreground-muted border-border' 
                      : 'bg-background-card text-foreground-secondary border-border'
                  }`}>
                    {facility.active}/{facility.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {}
        <div className="lg:col-span-8 xl:col-span-9 lg:max-h-[calc(100vh-250px)] overflow-y-auto pr-2 scrollbar-hide">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 sticky top-0 bg-background/90 backdrop-blur-xl pb-2 pt-2 z-20 -mx-2 px-2">
            <h3 className="text-xs font-bold text-foreground-muted">Ongoing Sessions</h3>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Search student or game..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background-card border border-border text-foreground rounded px-4 py-2 pl-10 focus:outline-none focus:border-brand transition-colors w-full text-sm font-medium h-10"
                />
              </div>

              {}
              <div className="flex items-center gap-2 bg-background-elevated p-1 border border-border rounded shrink-0">
                <button 
                  onClick={() => setFilter('ALL')} 
                  className={`flex-1 sm:flex-none text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
                    filter === 'ALL' ? 'bg-foreground text-background' : 'text-foreground hover:bg-background'
                  }`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilter('OVERDUE')} 
                  className={`flex-1 sm:flex-none text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
                    filter === 'OVERDUE' ? 'bg-error text-background' : 'text-foreground hover:bg-error/10 hover:text-error'
                  }`}
                >
                  Overdue
                </button>
              </div>
            </div>
          </div>
          
          {filteredSessions.length === 0 ? (
            <div className="bg-background-elevated border border-border rounded p-12 text-center flex flex-col items-center justify-center">
              <p className="text-xs font-bold text-foreground-muted">
                {filter === 'OVERDUE' ? 'No overdue sessions' : 'No ongoing sessions at the moment'}
              </p>
            </div>
          ) : (
            <div className="bg-background border border-border rounded shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <div className="sticky top-[58px] z-10 grid grid-cols-12 gap-4 px-6 py-4 bg-background-elevated border-b border-border text-[10px] font-bold text-foreground-secondary hidden md:grid rounded-t">
                <div className="col-span-12 md:col-span-4">Student & Team</div>
                <div className="col-span-12 md:col-span-3">Facility</div>
                <div className="col-span-12 md:col-span-3">Status / End Time</div>
                <div className="col-span-12 md:col-span-2 text-right">Action</div>
              </div>
              
              <div className="flex flex-col gap-2 p-2">
                {filteredSessions.map((session) => {
                  const now = new Date();
                  const endTime = new Date(session.endTime);
                  const isLate = now > endTime;

                  return (
                    <div key={session.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-4 py-4 items-center border border-transparent rounded hover:border-border hover:shadow-lg transition-all duration-300 group animate-fade-in-up">
                      
                      {}
                      <div className="col-span-12 md:col-span-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-background-elevated border border-border flex items-center justify-center font-display font-bold text-lg text-foreground-secondary group-hover:border-foreground/30 group-hover:text-foreground transition-colors">
                          {session.createdBy?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{session.createdBy?.name}</div>
                          <div className="text-xs text-foreground-secondary truncate flex items-center gap-2 mt-0.5">
                            <span>@{session.createdBy?.username}</span>
                            {session.participants?.filter(p => p.userId !== session.createdById).length > 0 && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-border"></span>
                                <span className="text-foreground-muted">+ {session.participants.filter(p => p.userId !== session.createdById).length}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {}
                      <div className="col-span-12 md:col-span-3">
                        <div className="text-sm font-bold text-foreground mb-0.5">
                          {session.gameConfig?.name?.replace('\n', ' ')}
                        </div>
                        {session.resource?.label && (
                          <div className="inline-flex items-center px-2 py-0.5 bg-background-elevated border border-border rounded text-[10px] font-bold text-foreground-secondary">
                            Unit {session.resource.label}
                          </div>
                        )}
                      </div>

                      {}
                      <div className="col-span-12 md:col-span-3 flex md:flex-col justify-between md:justify-start items-center md:items-start">
                        <div className={`text-[10px] font-bold mb-0.5 ${isLate ? 'text-error' : 'text-success'}`}>
                          {isLate ? 'Overdue' : 'Active'}
                        </div>
                        <div className="text-sm font-mono text-foreground-secondary">
                          {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {}
                      <div className="col-span-12 md:col-span-2 flex justify-end mt-2 md:mt-0">
                        <button 
                          onClick={() => handleReturn(session.id)}
                          disabled={actionLoading === session.id}
                          className="w-full md:w-auto justify-center bg-transparent hover:bg-white/5 text-foreground border border-border font-bold text-[10px] px-4 py-2.5 rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group/btn"
                        >
                          {actionLoading === session.id ? 'Processing...' : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 group-hover/btn:-rotate-90 transition-transform" />
                              Return
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

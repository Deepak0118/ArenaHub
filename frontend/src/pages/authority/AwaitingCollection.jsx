import { useState, useEffect } from 'react';
import { Clock, Check, AlertCircle, ScanLine, DollarSign } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { getDynamicEquipment } from '../../utils/equipment';

const CountdownTimer = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const difference = expiration - now;

      if (difference <= 0) {
        setTimeLeft('00:00');
        setIsExpired(true);
      } else {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <div className={`flex items-center font-mono font-bold text-xl tabular-nums ${isExpired ? 'text-foreground-muted' : 'text-warning'}`}>
      <Clock className="w-4 h-4 mr-2" />
      {timeLeft}
    </div>
  );
};

export default function AwaitingCollection() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchQueue = async () => {
    try {
      const data = await apiFetch('/bookings/awaiting-collection');
      setQueue(data.bookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleIssue = async (bookingId) => {
    setActionLoading(bookingId);
    setError('');
    try {
      await apiFetch(`/bookings/${bookingId}/issue`, { method: 'POST' });
      setQueue(prev => prev.filter(b => b.id !== bookingId));
    } catch (err) {
      setError(`Failed to issue booking: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (bookingId) => {
    setActionLoading(bookingId);
    setError('');
    try {
      await apiFetch(`/bookings/${bookingId}/reject`, { method: 'POST' });
      setQueue(prev => prev.filter(b => b.id !== bookingId));
    } catch (err) {
      setError(`Failed to reject booking: ${err.message}`);
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

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto text-foreground">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl mb-8 border-b border-border pb-6 pt-4 flex items-end justify-between -mx-6 px-6 md:-mx-12 md:px-12">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-foreground animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.4)]"></div>
            <span className="text-[10px] text-foreground font-bold block">Active Requests</span>
          </div>
          <h1 className="text-3xl font-display ">Issue Equipment</h1>
        </div>
      </header>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-error mt-0.5" />
          <p className="text-sm font-bold text-error">{error}</p>
        </div>
      )}

      {}
      {queue.length === 0 ? (
        <div className="bg-transparent border border-dashed border-border rounded p-12 text-center flex flex-col items-center justify-center">
          <ScanLine className="w-8 h-8 text-foreground-muted mb-4" />
          <p className="text-xs font-bold text-foreground-muted">No equipment to issue</p>
        </div>
      ) : (
        <div className="bg-background border border-border rounded shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="sticky top-[85px] z-10 grid grid-cols-12 gap-4 px-6 py-4 bg-background-elevated border-b border-border text-[10px] font-bold text-foreground-secondary hidden md:grid rounded-t">
            <div className="col-span-4">Student & Team</div>
            <div className="col-span-4">Facility Allocation</div>
            <div className="col-span-2 text-right">Time Remaining</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          
          <div className="flex flex-col gap-2 p-2">
            {queue.map((booking) => (
              <div key={booking.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center border border-transparent rounded hover:border-border hover:shadow-lg transition-all duration-300 group animate-fade-in-up">
                
                {}
                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-background-elevated border border-border flex items-center justify-center font-display font-bold text-lg text-foreground-secondary group-hover:border-foreground/30 group-hover:text-foreground transition-colors">
                    {booking.createdBy?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{booking.createdBy?.name}</div>
                    <div className="text-xs text-foreground-secondary truncate flex items-center gap-2 mt-0.5">
                      <span>@{booking.createdBy?.username}</span>
                      {booking.participants?.filter(p => p.userId !== booking.createdById).length > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-border"></span>
                          <span className="text-foreground-muted">+ {booking.participants.filter(p => p.userId !== booking.createdById).length} teammates</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {}
                <div className="col-span-4 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-foreground">
                      {booking.gameConfig?.name?.replace('\n', ' ')}
                    </div>
                    {booking.gameConfig?.requiresPayment && (
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        booking.activityFeePayment?.status === 'PAID' 
                          ? 'bg-success/10 text-success border-success/20' 
                          : 'bg-warning/10 text-warning border-warning/20'
                      }`}>
                        <DollarSign className="w-2.5 h-2.5" />
                        {booking.activityFeePayment?.status === 'PAID' ? 'PAID' : 'FEE PENDING'}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {booking.resource?.label ? (
                      <div className="inline-flex items-center px-2 py-0.5 bg-background-elevated border border-border rounded text-[10px] font-bold text-foreground-secondary">
                        Unit {booking.resource.label}
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-warning">
                        Unassigned
                      </div>
                    )}
                    
                    {getDynamicEquipment(booking.gameConfig, booking.participants?.length || 1).map((eq, i) => (
                      <div key={i} className="inline-flex items-center px-1.5 py-0.5 bg-white/5 border border-border rounded text-[9px] font-bold text-foreground">
                        {eq}
                      </div>
                    ))}
                  </div>
                </div>

                {}
                <div className="col-span-2 flex justify-end">
                  <CountdownTimer expiresAt={booking.collectionDeadline} />
                </div>

                {}
                <div className="col-span-2 flex justify-end gap-2 items-center">
                  <button 
                    onClick={() => handleReject(booking.id)}
                    disabled={actionLoading === booking.id}
                    className="text-error hover:bg-error/10 font-bold text-[10px] px-3 py-2.5 rounded transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  {booking.gameConfig?.requiresPayment && booking.activityFeePayment?.status !== 'PAID' ? (
                    <div className="text-[10px] font-bold text-warning text-right mr-2 flex flex-col justify-center">
                      Payment<br/>Required
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleIssue(booking.id)}
                      disabled={actionLoading === booking.id}
                      className="bg-transparent text-foreground border border-border hover:bg-white/5 font-bold text-[10px] px-4 py-2.5 rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group/btn"
                    >
                      {actionLoading === booking.id ? (
                        'Wait...'
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                          Issue
                        </>
                      )}
                    </button>
                  )}
                </div>
                
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { AlertCircle, Calendar as CalendarIcon, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    <div className={`flex items-center gap-1.5 font-mono font-bold tabular-nums text-sm ${isExpired ? 'text-error' : 'text-warning'}`}>
      <Clock className="w-3.5 h-3.5" />
      {timeLeft}
    </div>
  );
};

export default function MyBookings() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiFetch('/bookings/my');
        // Sort newest first, and hide DRAFT unless creator
        setHistory(data.bookings
          .filter(b => b.status !== 'DRAFT' || b.createdById === user?.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'DRAFT': return { label: 'Pending Lobby', color: 'foreground-muted', bg: 'bg-background-elevated', border: 'border-border', text: 'text-foreground' };
      case 'ACTIVE': return { label: 'Active', color: 'success', bg: 'bg-success/10', border: 'border-success/30', text: 'text-success' };
      case 'CONFIRMED_PENDING_COLLECTION': return { label: 'Awaiting', color: 'warning', bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning' };
      case 'COMPLETED': return { label: 'Completed', color: 'foreground-muted', bg: 'bg-background-elevated', border: 'border-border', text: 'text-foreground-secondary' };
      case 'LATE_RETURNED': return { label: 'Late Return', color: 'error', bg: 'bg-error/10', border: 'border-error/30', text: 'text-error' };
      case 'CANCELLED': return { label: 'Cancelled', color: 'error', bg: 'bg-error/5', border: 'border-error/20', text: 'text-error' };
      case 'REJECTED': return { label: 'Rejected by Authority', color: 'error', bg: 'bg-error/10', border: 'border-error/40', text: 'text-error' };
      case 'EXPIRED': return { label: 'Expired', color: 'error', bg: 'bg-error/5', border: 'border-error/20', text: 'text-error' };
      default: return { label: status, color: 'foreground-muted', bg: 'bg-background-elevated', border: 'border-border', text: 'text-foreground-secondary' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-border border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-12">
        
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl mb-8 border-b border-border pb-6 pt-4 flex items-end justify-between -mx-6 px-6 lg:-mx-8 lg:px-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-foreground"></div>
              <span className="text-[10px] text-foreground font-bold ">Activity Log</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">
              My Sessions
            </h1>
            <p className="text-foreground-secondary font-medium text-xs ">
              Session history and current status
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-border rounded-lg bg-transparent">
              <p className="text-foreground-secondary font-medium text-xs ">No session history found</p>
            </div>
          ) : (
            history.map((booking) => {
              const conf = getStatusConfig(booking.status);
              
              return (
                <div 
                  key={booking.id} 
                  onClick={() => {
                    if (booking.status === 'DRAFT') {
                      navigate(`/games/${booking.gameConfigId}`);
                    } else {
                      navigate(`/active-booking/${booking.id}`);
                    }
                  }}
                  className="group bg-transparent border border-transparent rounded hover:border-border hover:shadow-lg transition-all duration-300 cursor-pointer grid grid-cols-1 md:grid-cols-12 p-5 gap-6 items-center"
                >
                  
                  {}
                  <div className="col-span-1 md:col-span-3">
                    <h2 className="font-display text-xl tracking-wide text-foreground transition-colors mb-1">
                      {booking.gameConfig?.name?.replace('\n', ' ')}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-foreground-secondary font-bold tabular-nums">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {new Date(booking.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>

                  {}
                  <div className="col-span-1 md:col-span-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground-muted">
                      <Clock className="w-3.5 h-3.5" />
                      {booking.gameConfig?.slotDurationMinutes} min session
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground-muted">
                      <Users className="w-3.5 h-3.5" />
                      {booking.participants?.length > 1 
                        ? `${booking.participants.length} Players`
                        : 'Individual'}
                    </div>
                  </div>

                  {}
                  <div className="col-span-1 md:col-span-2">
                    <div className="text-[10px] font-bold text-foreground-muted mb-0.5">Reference</div>
                    <div className="text-sm font-mono text-foreground-secondary">{booking.id.split('-')[0]}</div>
                  </div>

                  {}
                  <div className="col-span-1 md:col-span-3 flex flex-col md:items-end gap-2">
                    <span className={`inline-block px-3 py-1 rounded text-[10px] font-bold border text-center ${conf.bg} ${conf.text} ${conf.border}`}>
                      {conf.label}
                    </span>
                    {booking.status === 'CONFIRMED_PENDING_COLLECTION' && booking.collectionDeadline && (
                      <CountdownTimer expiresAt={booking.collectionDeadline} />
                    )}
                    {(booking.status === 'ACTIVE' || booking.status === 'CONFIRMED_PENDING_COLLECTION') && (
                      <span className="text-[10px] font-bold text-foreground group-hover:underline mt-1">
                        View Live →
                      </span>
                    )}
                  </div>

                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  );
}

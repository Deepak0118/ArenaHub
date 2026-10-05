import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Users, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function ActiveBooking() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialTimeLeft, setInitialTimeLeft] = useState(0);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const data = await apiFetch('/bookings/my');
        const found = data.bookings.find(b => b.id === id);
        
        if (!found) {
          throw new Error('Booking not found or you do not have permission to view it.');
        }
        
        setBooking(found);

        if (found.status === 'CONFIRMED_PENDING_COLLECTION' && found.collectionDeadline) {
          const diff = Math.floor((new Date(found.collectionDeadline).getTime() - Date.now()) / 1000);
          const validDiff = diff > 0 ? diff : 0;
          setTimeLeft(validDiff);
          
          // Estimate initial window size (usually 10 mins from createdAt)
          // For progress bar visualization
          const created = new Date(found.createdAt).getTime();
          const expires = new Date(found.collectionDeadline).getTime();
          setInitialTimeLeft(Math.max(validDiff, Math.floor((expires - created) / 1000)));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  useEffect(() => {
    if (timeLeft <= 0 || !booking || booking.status !== 'CONFIRMED_PENDING_COLLECTION') return;
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, booking]);

  const executeCancel = async () => {
    setCancelLoading(true);
    try {
      await apiFetch(`/bookings/${id}/cancel`, { method: 'POST' });
      navigate('/games');
    } catch (err) {
      setError(err.message);
      setCancelLoading(false);
    }
  };

  const handleInviteResponse = async (action) => {
    setInviteLoading(true);
    try {
      await apiFetch(`/bookings/${id}/${action}`, { method: 'POST' });
      // If declined, the booking is cancelled. We can just refresh by navigating to my-bookings or refetching
      if (action === 'decline') {
        navigate('/my-bookings');
      } else {
        // Fetch fresh booking
        const data = await apiFetch('/bookings/my');
        const found = data.bookings.find(b => b.id === id);
        if (found) setBooking(found);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handlePayFee = async () => {
    if (!booking.activityFeePayment) return;
    try {
      await apiFetch(`/payments/${booking.activityFeePayment.id}/pay`, { method: 'POST' });
      // Update local state to reflect payment
      setBooking(prev => ({
        ...prev,
        activityFeePayment: { ...prev.activityFeePayment, status: 'PAID' }
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl bg-transparent border border-border rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] p-10 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-border border-t-brand rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="w-full max-w-2xl bg-transparent border border-border rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] p-10">
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-error shrink-0" />
          <p className="text-sm text-error font-medium">{error || 'Booking not found'}</p>
        </div>
        <button onClick={() => navigate('/games')} className="px-6 py-2.5 bg-transparent border border-border hover:border-brand hover:text-brand text-foreground rounded font-bold text-sm transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  const isExpired = timeLeft <= 0 && booking.status === 'CONFIRMED_PENDING_COLLECTION';
  const isCancelled = booking.status === 'CANCELLED';
  const isActive = booking.status === 'ACTIVE';
  const isAwaiting = booking.status === 'CONFIRMED_PENDING_COLLECTION' && !isExpired;
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const getStatusConfig = (status, isExpired) => {
    if (isExpired && status === 'CONFIRMED_PENDING_COLLECTION') {
      return { label: 'Expired', color: 'error', textColor: 'text-error', borderColor: 'border-error', bgColor: 'bg-transparent shadow-[0_0_30px_rgba(239,68,68,0.1)]' };
    }
    switch(status) {
      case 'DRAFT': return { label: 'Pending Invites', color: 'foreground-muted', textColor: 'text-foreground-secondary', borderColor: 'border-border', bgColor: 'bg-transparent' };
      case 'CONFIRMED_PENDING_COLLECTION': return { label: 'Awaiting Collection', color: 'brand', textColor: 'text-brand', borderColor: 'border-brand', bgColor: 'bg-transparent shadow-brand/20' };
      case 'ACTIVE': return { label: 'Active', color: 'success', textColor: 'text-success', borderColor: 'border-success', bgColor: 'bg-transparent shadow-[0_0_30px_rgba(16,185,129,0.1)]' };
      case 'COMPLETED': return { label: 'Completed', color: 'foreground-muted', textColor: 'text-foreground-secondary', borderColor: 'border-border', bgColor: 'bg-transparent' };
      case 'LATE_RETURNED': return { label: 'Late Return', color: 'error', textColor: 'text-error', borderColor: 'border-error', bgColor: 'bg-transparent shadow-[0_0_30px_rgba(239,68,68,0.1)]' };
      case 'CANCELLED': return { label: 'Cancelled', color: 'error', textColor: 'text-error', borderColor: 'border-border border-dashed', bgColor: 'bg-transparent' };
      case 'EXPIRED': return { label: 'Expired', color: 'error', textColor: 'text-error', borderColor: 'border-error', bgColor: 'bg-transparent shadow-[0_0_30px_rgba(239,68,68,0.1)]' };
      default: return { label: status, color: 'foreground-muted', textColor: 'text-foreground-secondary', borderColor: 'border-border', bgColor: 'bg-transparent' };
    }
  };
  const statusConfig = getStatusConfig(booking.status, isExpired);

  const currentUserParticipant = booking.participants?.find(p => p.user?.username === user?.username || p.userId === user?.id);
  const isInvited = currentUserParticipant && currentUserParticipant.status === 'INVITED';
  const isCreator = booking.createdById === user?.id;

  return (
    <div className="w-full max-w-3xl bg-transparent border border-border rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6 md:p-8">
      
      {}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full bg-${statusConfig.color} ${isAwaiting || isActive ? 'animate-pulse' : ''}`}></div>
          <span className={`text-xs font-bold ${statusConfig.textColor}`}>
            {statusConfig.label}
          </span>
        </div>
        {booking.resource?.label && (
          <span className="text-[10px] text-foreground-secondary font-bold px-3 py-1 bg-transparent border border-border rounded">
            Unit {booking.resource.label}
          </span>
        )}
      </div>

      <div className="space-y-8">
        
        {}
        {isAwaiting && (
          <div className={`flex flex-col items-center justify-center py-12 ${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-lg relative overflow-hidden`}>
            {}
            <div 
              className="absolute top-0 left-0 h-1 bg-brand" 
              style={{ 
                width: initialTimeLeft > 0 ? `${(timeLeft / initialTimeLeft) * 100}%` : '100%', 
                transition: 'width 1s linear'
              }}
            ></div>
            <p className="text-xs font-bold text-brand mb-6">
              Collection Window Open
            </p>
            <div className="font-display text-8xl md:text-9xl font-bold tabular-nums text-brand">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
          </div>
        )}

        {isExpired && (
          <div className={`py-10 px-8 ${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-lg flex flex-col md:flex-row items-center md:items-start justify-between gap-4 text-center md:text-left`}>
            <div>
              <p className="font-display text-2xl text-error mb-2">Reservation Expired</p>
              <p className="text-sm text-foreground-secondary ">Your collection window closed and the unit was released.</p>
            </div>
            <AlertCircle className="w-12 h-12 text-error opacity-80 shrink-0 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          </div>
        )}

        {isActive && (
          <div className={`py-10 px-8 ${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-lg flex flex-col md:flex-row items-center md:items-start justify-between gap-4 text-center md:text-left`}>
            <div>
              <p className="font-display text-2xl text-success mb-2">Session Active</p>
              <p className="text-sm text-foreground-secondary ">Return equipment promptly to avoid penalties.</p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-success opacity-80 shrink-0 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </div>
        )}

        {isCancelled && (
          <div className={`py-10 px-8 ${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-lg text-center md:text-left`}>
            <p className="font-display text-2xl text-foreground-secondary mb-2">Booking Cancelled</p>
            <p className="text-sm text-foreground-muted ">This booking is no longer active.</p>
          </div>
        )}

        {booking.status === 'COMPLETED' && (
          <div className={`py-10 px-8 ${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-lg text-center md:text-left`}>
            <p className="font-display text-2xl text-foreground-secondary mb-2">Session Completed</p>
            <p className="text-sm text-foreground-muted ">You successfully returned the equipment.</p>
          </div>
        )}
        
        {booking.status === 'LATE_RETURNED' && (
          <div className={`py-10 px-8 ${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-lg flex flex-col md:flex-row items-center md:items-start justify-between gap-4 text-center md:text-left`}>
            <div>
              <p className="font-display text-2xl text-error mb-2">Late Return</p>
              <p className="text-sm text-foreground-secondary ">Equipment was returned after the grace period. Check your payments for any penalties.</p>
            </div>
            <AlertCircle className="w-12 h-12 text-error opacity-80 shrink-0 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          </div>
        )}

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-foreground-muted flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4" /> Session Details
            </h3>
            <div className="space-y-0 border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-transparent border-b border-border">
                <span className="text-xs font-bold text-foreground-secondary ">Facility</span>
                <span className="font-bold text-sm text-foreground ">{booking.gameConfig?.name?.replace('\n', ' ')}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-transparent border-b border-border">
                <span className="text-xs font-bold text-foreground-secondary ">Duration</span>
                <span className="font-bold text-sm text-foreground ">{booking.gameConfig?.slotDurationMinutes} min</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-transparent">
                <span className="text-xs font-bold text-foreground-secondary ">Reference</span>
                <span className="font-mono text-xs text-foreground-muted ">{booking.id.split('-')[0]}</span>
              </div>
            </div>
          </div>

          {booking.participants && booking.participants.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground-muted flex items-center gap-2 mb-4">
                <Users className="w-4 h-4" /> Roster
              </h3>
              <div className="space-y-2">
                {booking.participants.map((participant, i) => {
                  const isCreatorParticipant = participant.user?.id === booking.createdById || participant.userId === booking.createdById;
                  return (
                    <div key={i} className="flex items-center justify-between p-4 bg-transparent border border-border rounded-lg hover:border-brand/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isCreatorParticipant ? 'bg-success' : (participant.status === 'ACCEPTED' ? 'bg-success' : 'bg-warning animate-pulse')}`}></div>
                        <span className={isCreatorParticipant ? 'font-bold text-foreground text-sm' : 'font-semibold text-foreground-secondary text-sm'}>
                          {participant.user?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCreatorParticipant && (
                          <span className="text-[10px] font-bold text-foreground-secondary px-2 py-1 border border-border bg-white/5 rounded">
                            Creator
                          </span>
                        )}
                        {!isCreatorParticipant && (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded border ${participant.status === 'ACCEPTED' ? 'text-success bg-success/10 border-success/20' : 'text-warning bg-warning/10 border-warning/20'}`}>
                            {participant.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {}
        {isAwaiting && (
          <div className="p-6 bg-white/5 border border-border rounded-lg mt-6">
            <h3 className="text-xs font-bold text-warning mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Requirements
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-foreground font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0"></div>
                <span>Bring 1x Student ID to the desk</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0"></div>
                <span>Ensure all team members are present for collection</span>
              </li>
            </ul>
          </div>
        )}

      </div>

      {}
      <div className="mt-10 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="w-full md:w-auto">
          {booking.gameConfig?.requiresPayment && booking.activityFeePayment?.status === 'PENDING' && (
            <button 
              onClick={handlePayFee}
              className="w-full md:w-auto px-8 py-3 bg-brand text-background rounded font-bold text-sm transition-all hover:bg-brand-light flex items-center justify-center gap-2"
            >
              Pay Fee (₹{booking.activityFeePayment.amount})
            </button>
          )}
        </div>
        
        <div className="w-full md:w-auto">
          {(booking.status === 'DRAFT' && isInvited) ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
              <button 
                onClick={() => handleInviteResponse('decline')}
                disabled={inviteLoading}
                className="w-full sm:w-auto px-6 py-3 bg-transparent hover:bg-error/10 border border-error/50 text-error rounded font-bold text-sm transition-colors disabled:opacity-50"
              >
                Decline
              </button>
              <button 
                onClick={() => handleInviteResponse('accept')}
                disabled={inviteLoading}
                className="w-full sm:w-auto px-8 py-3 bg-transparent border border-brand hover:bg-brand/10 text-brand rounded font-bold text-sm transition-all disabled:opacity-50"
              >
                {inviteLoading ? 'Loading...' : 'Accept Invite'}
              </button>
            </div>
          ) : (booking.status === 'DRAFT' || (booking.status === 'CONFIRMED_PENDING_COLLECTION' && !isExpired)) ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-end">
              {!confirmingCancel && (
                <button 
                  onClick={() => navigate('/my-bookings')}
                  className="w-full sm:w-auto px-6 py-3 bg-transparent hover:bg-background-elevated border border-border hover:border-brand hover:text-brand text-foreground rounded font-bold text-sm transition-colors"
                >
                  Go Back
                </button>
              )}
              
              {confirmingCancel ? (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                  <span className="text-sm font-bold text-error whitespace-nowrap hidden md:block mr-2">Are you sure?</span>
                  <button 
                    onClick={() => setConfirmingCancel(false)}
                    className="w-full sm:w-auto px-6 py-3 bg-transparent hover:bg-background-elevated border border-border text-foreground rounded font-bold text-sm transition-colors"
                  >
                    No, Keep it
                  </button>
                  <button 
                    onClick={executeCancel}
                    disabled={cancelLoading}
                    className="w-full sm:w-auto px-8 py-3 bg-error hover:bg-error/90 text-background rounded font-bold text-sm transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  >
                    {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                </div>
              ) : isCreator ? (
                <button 
                  onClick={() => setConfirmingCancel(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-transparent hover:bg-error/10 border border-error/50 text-error rounded font-bold text-sm transition-colors"
                >
                  Cancel Booking
                </button>
              ) : null}
            </div>
          ) : (
            <button 
              onClick={() => navigate('/my-bookings')}
              className="w-full md:w-auto px-6 py-3 bg-transparent hover:bg-background-elevated border border-border hover:border-brand hover:text-brand text-foreground rounded font-bold text-sm transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

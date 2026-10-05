import { useState, useEffect } from 'react';
import { Clock, Users, AlertCircle, CheckCircle2, X, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { getDynamicEquipment } from '../utils/equipment';

export default function RulesPreviewModal() {
  const navigate = useNavigate();
  const { id: gameId } = useParams();
  const { user } = useAuth();
  
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // SETUP State
  const [teamSize, setTeamSize] = useState(0);
  const [teammates, setTeammates] = useState([]);
  
  // LOBBY State
  const [lobbyState, setLobbyState] = useState('SETUP'); // 'SETUP' | 'LOBBY'
  const [bookingId, setBookingId] = useState(null);
  const [lobbyData, setLobbyData] = useState(null);
  const [newTeammate, setNewTeammate] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [gameData, bookingsData] = await Promise.all([
          apiFetch(`/games/${gameId}`),
          apiFetch('/bookings/my')
        ]);
        
        setGame(gameData.game);
        
        // Check if there is already an active DRAFT lobby for this game created by this user
        const existingDraft = bookingsData.bookings.find(b => b.gameConfigId === gameId && b.status === 'DRAFT' && b.createdById === user.id);
        
        if (existingDraft) {
          setBookingId(existingDraft.id);
          setLobbyData(existingDraft);
          setLobbyState('LOBBY');
        } else if (gameData.game.minPlayers > 1) {
          setTeamSize(gameData.game.minPlayers);
          setTeammates(Array(gameData.game.minPlayers - 1).fill(''));
        }
      } catch (err) {
        setError('Failed to load game rules. ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [gameId, user.id]);

  // Polling for Lobby updates
  useEffect(() => {
    if (lobbyState !== 'LOBBY' || !bookingId) return;
    
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch('/bookings/my');
        const updated = data.bookings.find(b => b.id === bookingId);
        if (updated) {
          setLobbyData(updated);
          // If the booking was submitted from another tab, or cancelled
          if (updated.status !== 'DRAFT') {
            navigate(`/active-booking/${bookingId}`);
          }
        }
      } catch (err) {
        console.error("Failed to poll lobby", err);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [lobbyState, bookingId, navigate]);

  const isGroup = game ? game.minPlayers > 1 : false;
  const isSetupValid = !isGroup || teammates.every(t => t.trim() !== '');

  const getAvailableTeamSizes = () => {
    if (!game || game.minPlayers === game.maxPlayers) return [];
    const isPairBased = ['table tennis', 'pickleball', 'badminton', '8 ball pool'].some(n => game.name.toLowerCase().includes(n));
    const sizes = [];
    const step = isPairBased ? 2 : 1;
    for (let i = game.minPlayers; i <= game.maxPlayers; i += step) {
      sizes.push(i);
    }
    return sizes;
  };
  const availableSizes = getAvailableTeamSizes();

  const handleTeamSizeChange = (newSize) => {
    setTeamSize(newSize);
    setTeammates(Array(newSize - 1).fill(''));
  };

  const handleTeammateChange = (index, value) => {
    const newTeammates = [...teammates];
    newTeammates[index] = value;
    setTeammates(newTeammates);
  };

  const handleCreateLobby = async () => {
    if (isGroup && !isSetupValid) return;
    
    setActionLoading(true);
    setError('');
    
    try {
      const payload = {
        gameConfigId: gameId,
        participantUsernames: isGroup ? teammates : []
      };
      
      const res = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!isGroup) {
        navigate(`/active-booking/${res.booking.id}`);
      } else {
        setBookingId(res.booking.id);
        setLobbyData(res.booking);
        setLobbyState('LOBBY');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!newTeammate.trim()) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/bookings/${bookingId}/participants`, {
        method: 'POST',
        body: JSON.stringify({ username: newTeammate })
      });
      setLobbyData(res.booking);
      setNewTeammate('');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantUserId) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/bookings/${bookingId}/participants/${participantUserId}`, {
        method: 'DELETE'
      });
      setLobbyData(res.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitBooking = async () => {
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(`/bookings/${bookingId}/submit`, { method: 'POST' });
      navigate(`/active-booking/${bookingId}`);
    } catch (err) {
      setError(err.message);
      setActionLoading(false);
    }
  };

  const handleCancelLobby = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/bookings/${bookingId}/cancel`, { method: 'POST' });
      navigate('/games');
    } catch (err) {
      setError(err.message);
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-3xl bg-transparent border border-border rounded-lg p-8 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-border border-t-brand rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="w-full max-w-3xl bg-transparent border border-border rounded-lg p-8 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-error shrink-0" />
          <p className="text-sm text-error font-medium">{error || 'Game not found'}</p>
        </div>
        <button onClick={() => navigate('/games')} className="px-6 py-2.5 bg-background-elevated hover:bg-background border border-border text-foreground rounded font-bold text-sm transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  const renderLobbyView = () => {
    const participants = lobbyData?.participants || [];
    const targetSize = lobbyData?.teamSize || game.maxPlayers;
    const allAccepted = participants.every(p => p.status === 'ACCEPTED');
    const meetsMinPlayers = participants.length >= game.minPlayers;
    const isFull = participants.length >= targetSize;
    const canSubmit = allAccepted && meetsMinPlayers && participants.length === targetSize;

    return (
      <div className="space-y-8">
        <div className="text-center py-6 border-b border-border">
          <h3 className="text-2xl font-display text-foreground mb-2 flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-brand animate-spin" />
            Waiting for Players
          </h3>
          <p className="text-sm text-foreground-secondary">
            Your lobby is open. Players must accept their invites before you can finalize the booking.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-foreground-secondary ">Current Roster ({participants.length}/{targetSize})</h4>
            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${canSubmit ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-warning/10 border-warning/20 text-warning'}`}>
              {canSubmit ? 'Ready to Submit' : 'Waiting for Acceptances'}
            </span>
          </div>

          <div className="space-y-0 border border-border rounded-lg overflow-hidden">
            {participants.map((p, i) => {
              const isCreator = p.userId === lobbyData.createdById;
              const isLast = i === participants.length - 1 && isFull;
              return (
                <div key={i} className={`flex items-center justify-between p-4 bg-transparent ${!isLast && 'border-b'} border-border transition-colors hover:bg-background-elevated`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isCreator ? 'bg-brand' : (p.status === 'ACCEPTED' ? 'bg-brand' : p.status === 'DECLINED' ? 'bg-error' : 'bg-warning animate-pulse')}`}></div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{p.user?.name}</p>
                      <p className="text-xs text-foreground-secondary">@{p.user?.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {isCreator ? (
                      <span className="text-[10px] font-bold text-brand px-2 py-1 bg-brand/10 border border-brand/20 rounded">Creator</span>
                    ) : (
                      <>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${p.status === 'ACCEPTED' ? 'text-brand bg-brand/10 border-brand/20' : p.status === 'DECLINED' ? 'text-error bg-error/10 border-error/20' : 'text-warning bg-warning/10 border-warning/20'}`}>
                          {p.status}
                        </span>
                        <button 
                          onClick={() => handleRemoveParticipant(p.userId)}
                          disabled={actionLoading}
                          className="p-1.5 text-foreground-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Remove Player"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {!isFull && (
              <div className="flex flex-col md:flex-row items-stretch md:items-center p-4 bg-transparent border-t border-border gap-3">
                <input 
                  type="text" 
                  placeholder="Invite another player by username"
                  value={newTeammate}
                  onChange={(e) => setNewTeammate(e.target.value)}
                  className="flex-1 bg-transparent border-b border-border focus:border-brand text-foreground text-sm px-2 py-2 outline-none transition-colors"
                />
                <button 
                  onClick={handleAddParticipant}
                  disabled={!newTeammate.trim() || actionLoading}
                  className="px-6 py-2 bg-transparent border border-border hover:border-brand hover:text-brand text-foreground rounded font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Add
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          <button 
            onClick={handleCancelLobby}
            disabled={actionLoading}
            className="w-full sm:w-auto px-6 py-3 text-error hover:bg-error/10 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
          >
            Cancel Lobby
          </button>
          
          <button 
            onClick={handleSubmitBooking}
            disabled={!canSubmit || actionLoading}
            className="w-full sm:w-auto px-8 py-3 bg-transparent border border-brand text-brand hover:bg-brand/10 hover:shadow-brand/20 rounded font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Submitting...' : 'Create Booking'}
          </button>
        </div>
      </div>
    );
  };

  const renderSetupView = () => (
    <div className="space-y-8">
      {}
      {isGroup && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display text-foreground">Assemble Your Team</h3>
            {availableSizes.length > 0 ? (
              <select 
                value={teamSize}
                onChange={(e) => handleTeamSizeChange(Number(e.target.value))}
                className="bg-background-elevated border border-border text-sm text-foreground rounded px-3 py-1.5 outline-none font-medium cursor-pointer"
              >
                {availableSizes.map(size => (
                  <option key={size} value={size}>{size} Players</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-foreground-secondary font-medium px-2.5 py-1 bg-background-elevated rounded">
                {1 + teammates.filter(t => t.trim() !== '').length} / {game.maxPlayers}
              </span>
            )}
          </div>

          <div className="space-y-0 border border-border rounded-lg overflow-hidden">
            {}
            <div className="flex items-center gap-4 p-4 bg-transparent border-b border-border border-l-4 border-l-success/50 bg-white/5">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-border flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">You</p>
                <p className="text-xs text-foreground-secondary">@{user.username}</p>
              </div>
              <span className="text-[10px] text-foreground-secondary font-bold px-2 py-1 bg-white/5 border border-border rounded">Creator</span>
            </div>

            {}
            {teammates.map((username, index) => {
              const isLast = index === teammates.length - 1;
              return (
                <div key={index} className={`flex items-center gap-4 p-4 bg-transparent border-l-4 border-l-transparent hover:bg-background-elevated focus-within:border-l-foreground/50 focus-within:bg-white/5 transition-all ${!isLast && 'border-b border-border'}`}>
                  <div className="w-8 h-8 rounded-full bg-background-card border border-border flex items-center justify-center text-xs font-bold text-foreground-secondary">
                    {index + 2}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Enter teammate username" 
                    value={username}
                    onChange={(e) => handleTeammateChange(index, e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-foreground text-sm placeholder:text-foreground-muted"
                  />
                </div>
              );
            })}
          </div>

          <p className="text-xs text-foreground-secondary mt-3 leading-relaxed ">
            Players will receive an invite to accept before the booking is submitted.
          </p>
        </section>
      )}

      {}
      <section>
        <h3 className="text-lg font-display text-foreground mb-4">Important Information</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-foreground-secondary font-bold">Session duration</span>
            <span className="text-sm font-bold text-foreground ">{game.slotDurationMinutes} min</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-foreground-secondary font-bold">Wait before rebooking</span>
            <span className="text-sm font-bold text-foreground ">{game.cooldownMinutes} min</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-foreground-secondary font-bold">Late return penalty</span>
            <span className="text-sm font-bold text-foreground ">Rs {game.finePerMinute}/min</span>
          </div>
          <p className="text-xs text-foreground-muted leading-relaxed font-medium">
            Fine is {game.fineStrategy.toLowerCase()} across participants if equipment is not returned on time
          </p>
        </div>
      </section>

      {}
      {((game.equipmentProvided && game.equipmentProvided.length > 0) || 
        (game.equipmentRequired && game.equipmentRequired.length > 0)) && (
        <section>
          <h3 className="text-lg font-display text-foreground mb-4">Equipment</h3>
          
          <div className="space-y-0 border border-border rounded-lg overflow-hidden">
            {getDynamicEquipment(game, 1 + teammates.filter(t => t.trim() !== '').length).map((eq, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-transparent border-b border-border">
                <div className="w-6 h-6 rounded-full bg-white/5 border border-border flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground ">{eq}</p>
                  <p className="text-xs text-foreground-secondary ">Provided at collection</p>
                </div>
              </div>
            ))}
            
            {(game.equipmentRequired || []).map((eq, i) => {
              const isLast = i === (game.equipmentRequired.length - 1);
              return (
                <div key={i} className={`flex items-center gap-4 p-4 bg-transparent ${!isLast && 'border-b border-border'}`}>
                  <div className="w-6 h-6 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground ">{eq}</p>
                    <p className="text-xs text-foreground-secondary ">Bring your own</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {}
      <div className="mt-8 pt-6 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
        {game.resources && game.resources.filter(r => r.status === 'AVAILABLE').length === 0 && (
          <span className="text-warning text-sm font-bold mr-auto flex items-center gap-2 ">
            <AlertCircle className="w-4 h-4" /> All units are currently in use
          </span>
        )}
        <button 
          onClick={() => navigate('/games')}
          disabled={actionLoading}
          className="w-full sm:w-auto px-6 py-2.5 text-foreground-secondary hover:text-foreground font-bold text-sm transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button 
          onClick={handleCreateLobby}
          disabled={!isSetupValid || actionLoading || (game.resources && game.resources.filter(r => r.status === 'AVAILABLE').length === 0)}
          className="w-full sm:w-auto px-6 py-2.5 bg-transparent border border-brand text-brand hover:bg-brand/10 hover:shadow-brand/20 rounded font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading ? 'Loading...' : (isGroup ? 'Create Lobby & Invite' : 'Confirm Booking')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-3xl bg-background border border-border rounded-lg p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-y-auto scrollbar-hide max-h-[90vh]">
      
      {}
      <div className="flex items-start justify-between mb-8 pb-6 border-b border-border">
        <div className="flex-1">
          <h2 className="text-3xl md:text-4xl font-display text-foreground mb-3">{game.name}</h2>
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-foreground-secondary">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{game.slotDurationMinutes} min session</span>
            </div>
            {isGroup && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{game.minPlayers === game.maxPlayers ? game.maxPlayers : `${game.minPlayers}-${game.maxPlayers}`} players</span>
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={() => navigate('/games')}
          className="text-foreground-secondary hover:text-foreground transition-colors p-2"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error shrink-0" />
          <p className="text-sm text-error font-medium">{error}</p>
        </div>
      )}

      {lobbyState === 'SETUP' ? renderSetupView() : renderLobbyView()}

    </div>
  );
}

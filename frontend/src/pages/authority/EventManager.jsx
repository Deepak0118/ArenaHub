import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { AlertCircle, Trash2, Image as ImageIcon, Calendar, Plus, ChevronDown } from 'lucide-react';

export default function EventManager() {
  const [events, setEvents] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [registrationInfo, setRegistrationInfo] = useState('');
  const [poster, setPoster] = useState(null);
  const [disabledGames, setDisabledGames] = useState([]);
  const [isFacilitiesDropdownOpen, setIsFacilitiesDropdownOpen] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [eventsData, gamesData] = await Promise.all([
        apiFetch('/events'),
        apiFetch('/games')
      ]);
      setEvents(eventsData.events);
      setGames(gamesData.games);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGameToggle = (gameId) => {
    setDisabledGames(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      if (description) formData.append('description', description);
      formData.append('startDate', new Date(startDate).toISOString());
      formData.append('endDate', new Date(endDate).toISOString());
      if (registrationInfo) formData.append('registrationInfo', registrationInfo);
      if (poster) formData.append('poster', poster);
      formData.append('disabledGameIds', JSON.stringify(disabledGames));

      await apiFetch('/events', {
        method: 'POST',
        body: formData,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setRegistrationInfo('');
      setPoster(null);
      setDisabledGames([]);
      setIsFacilitiesDropdownOpen(false);
      
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/events/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto text-foreground">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl mb-6 border-b border-border pb-4 pt-2 flex items-end justify-between">
        <div>
          <span className="text-[10px] text-foreground font-bold uppercase tracking-wider block mb-1">Campus Activities</span>
          <h1 className="text-2xl sm:text-3xl font-display text-foreground">Events Manager</h1>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <p className="text-sm text-error font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-background border border-border rounded p-6 space-y-5 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand/30 to-transparent opacity-50"></div>
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 relative z-10">
              <Plus className="w-4 h-4 text-foreground" /> Add New Event
            </h2>
            
            <div>
              <label className="block text-[10px] font-bold text-foreground-muted mb-2">Title</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-background border border-border rounded px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand transition-colors"
                placeholder="e.g. Inter-College Table Tennis"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-foreground-muted mb-2">Start Date/Time</label>
                <input 
                  type="datetime-local" 
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand transition-colors tabular-nums cursor-pointer [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-foreground-muted mb-2">End Date/Time</label>
                <input 
                  type="datetime-local" 
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand transition-colors tabular-nums cursor-pointer [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-foreground-muted mb-2">Description</label>
              <textarea 
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-background border border-border rounded px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand transition-colors resize-none"
                placeholder="Brief description of the event..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-foreground-muted mb-2">Registration Link/Info</label>
              <input 
                type="text" 
                value={registrationInfo}
                onChange={(e) => setRegistrationInfo(e.target.value)}
                className="w-full bg-background border border-border rounded px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand transition-colors"
                placeholder="e.g. google form link"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-foreground-muted mb-2">Poster Image</label>
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setPoster(e.target.files[0])}
                  className="w-full bg-background border border-border rounded px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand transition-colors file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:file:file:bg-brand file:text-background hover:file:bg-brand/90"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-background font-bold text-xs py-3.5 rounded hover:bg-brand/90 transition-colors mt-2 disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Event'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-sm font-bold text-foreground mb-4">Active Events</h2>
          
          {events.length === 0 ? (
            <div className="bg-transparent border border-dashed border-border rounded p-12 text-center flex flex-col items-center justify-center">
              <p className="text-xs font-bold text-foreground-muted">No events found</p>
            </div>
          ) : (
            events.map(event => (
              <div key={event.id} className="bg-transparent border border-transparent rounded p-5 flex flex-col md:flex-row gap-5 items-start hover:border-border hover:shadow-lg transition-all duration-300 group animate-fade-in-up">
                
                {event.posterUrl ? (
                  <img 
                    src={event.posterUrl.startsWith('http') ? event.posterUrl : `http://localhost:5000${event.posterUrl}`} 
                    alt={event.title} 
                    className="w-32 h-24 object-cover rounded bg-background"
                  />
                ) : (
                  <div className="w-32 h-24 rounded bg-background-elevated border border-border flex items-center justify-center shrink-0">
                    <ImageIcon className="w-8 h-8 text-foreground-muted/30" />
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="font-display text-xl tracking-wide text-foreground mb-1">{event.title}</h3>
                  <div className="flex items-center gap-4 text-xs font-bold text-foreground-secondary mb-3">
                    <span className="flex items-center gap-1.5 tabular-nums">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-sm text-foreground-muted mb-3 line-clamp-2">{event.description}</p>
                  )}
                  {event.registrationInfo && (
                    <a href={event.registrationInfo.startsWith('http') ? event.registrationInfo : `https://${event.registrationInfo}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-brand hover:underline inline-block mb-1">
                      Registration Link ↗
                    </a>
                  )}
                </div>

                <button 
                  onClick={() => handleDelete(event.id)}
                  className="p-2 text-foreground-secondary hover:text-error hover:bg-error/10 rounded transition-colors shrink-0"
                  title="Delete Event"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

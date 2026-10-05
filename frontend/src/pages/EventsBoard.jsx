import { useState, useEffect } from 'react';
import { Calendar, AlertCircle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function EventsBoard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await apiFetch('/events');
        setEvents(data.events);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const formatDateRange = (start, end) => {
    const d1 = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const d2 = new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return d1 === d2 ? d1 : `${d1} - ${d2}`;
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
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 md:py-12">
        
        <div className="mb-8 border-b border-border pb-6 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-foreground"></div>
              <span className="text-[10px] text-foreground font-bold ">Campus Activities</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">
              Events Board
            </h1>
            <p className="text-foreground-secondary font-medium text-xs ">
              Upcoming sports events and tournaments
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        {events.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-border rounded-lg bg-transparent text-center">
            <p className="text-foreground-secondary font-medium text-xs ">No upcoming events scheduled</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map(event => (
              <div 
                key={event.id}
                className="bg-transparent border border-transparent rounded overflow-hidden flex flex-col group hover:border-border hover:shadow-lg transition-all"
              >
                {}
                <div className="w-full h-48 bg-background-elevated border-b border-border relative overflow-hidden flex items-center justify-center">
                  {event.posterUrl ? (
                    <img 
                      src={event.posterUrl.startsWith('http') ? event.posterUrl : `http://localhost:5000${event.posterUrl}`} 
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-foreground-muted/30">
                      <ImageIcon className="w-12 h-12 mb-2" />
                      <span className="text-[10px] font-bold ">No Poster</span>
                    </div>
                  )}
                  {}
                  <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm border border-border rounded px-3 py-1.5 flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-foreground-muted" />
                    <span className="text-[10px] font-bold tabular-nums text-foreground">
                      {formatDateRange(event.startDate, event.endDate)}
                    </span>
                  </div>
                </div>
                
                {}
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="font-display text-2xl tracking-wide text-foreground mb-3 leading-tight">
                    {event.title}
                  </h2>
                  
                  <p className="text-sm text-foreground-secondary mb-6 flex-1 line-clamp-3">
                    {event.description}
                  </p>
                  
                  {}
                  <div className="pt-4 border-t border-border mt-auto">
                    {event.registrationInfo ? (
                      <a 
                        href={event.registrationInfo.startsWith('http') ? event.registrationInfo : `https://${event.registrationInfo}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-brand hover:text-brand/80 transition-colors"
                      >
                        Register Now <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] font-bold text-foreground-muted">
                        No Registration Required
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Calendar, CreditCard, Trophy, LogOut, Users, Menu, X } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { io } from 'socket.io-client';

export default function StudentLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [invites, setInvites] = useState([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invitesData, paymentsData] = await Promise.all([
          apiFetch('/bookings/invites'),
          apiFetch('/payments/my')
        ]);
        setInvites(invitesData.invites);
        const pending = paymentsData.payments.filter(p => p.status === 'PENDING');
        setPendingPaymentsCount(pending.length);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptInvite = async (bookingId) => {
    try {
      await apiFetch(`/bookings/${bookingId}/accept`, { method: 'POST' });
      setInvites(prev => prev.filter(i => i.id !== bookingId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeclineInvite = async (bookingId) => {
    try {
      await apiFetch(`/bookings/${bookingId}/decline`, { method: 'POST' });
      setInvites(prev => prev.filter(i => i.id !== bookingId));
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await apiFetch('/notifications');
        setNotifications(data.notifications);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifications();

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

    socket.on('connect', () => {
      socket.emit('join_room', user.id);
    });

    socket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [user.id]);

  const getCategory = (notif) => {
    const title = notif.title.toLowerCase();
    if (title.includes('event')) return 'events';
    if (title.includes('fine') || title.includes('penalty') || title.includes('payment')) return 'payments';
    if (title.includes('session') || title.includes('booking') || title.includes('approved') || title.includes('rejected') || title.includes('completed')) return 'my-bookings';
    return 'general';
  };

  const getCategoryUnreadCount = (category) => {
    let count = notifications.filter(n => !n.read && getCategory(n) === category).length;
    if (category === 'my-bookings') count += invites.length;
    if (category === 'payments') count += pendingPaymentsCount;
    return count;
  };

  useEffect(() => {
    let currentCategory = null;
    if (pathname.includes('/events')) currentCategory = 'events';
    else if (pathname.includes('/payments')) currentCategory = 'payments';
    else if (pathname.includes('/my-bookings')) currentCategory = 'my-bookings';
    else if (pathname.includes('/games')) currentCategory = 'general';

    if (currentCategory) {
      const unreadIds = notifications
        .filter(n => !n.read && getCategory(n) === currentCategory)
        .map(n => n.id);

      if (unreadIds.length > 0) {
        Promise.all(unreadIds.map(id => apiFetch(`/notifications/${id}/read`, { method: 'PUT' })))
          .then(() => {
            setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, read: true } : n));
          })
          .catch(err => console.error(err));
      }
    }
  }, [pathname, notifications]);

  const navItems = [
    { name: 'Facilities', shortName: 'Facilities', path: '/games', category: 'general', icon: <Home className="w-4 h-4" /> },
    { name: 'My Sessions', shortName: 'Sessions', path: '/my-bookings', category: 'my-bookings', icon: <Calendar className="w-4 h-4" /> },
    { name: 'My Payments', shortName: 'Payments', path: '/payments', category: 'payments', icon: <CreditCard className="w-4 h-4" /> },
    { name: 'Events', shortName: 'Events', path: '/events', category: 'events', icon: <Trophy className="w-4 h-4" /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col md:flex-row text-foreground">

      {/* Top Header for Mobile */}
      <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold tracking-tight text-foreground font-display">
            Arena<span className="text-brand">Hub</span>
          </div>
          <span className="text-[9px] bg-brand/10 text-brand px-2 py-0.5 rounded font-bold">Student</span>
        </div>

        <div className="flex items-center gap-2">
          <NavLink to="/profile" className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold text-foreground">
            {user?.name?.charAt(0).toUpperCase()}
          </NavLink>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-foreground-secondary hover:text-foreground focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-4/5 max-w-xs bg-background border-r border-border flex flex-col h-full z-10 p-6 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div>
                <div className="text-2xl font-bold text-foreground font-display">
                  Arena<span className="text-brand">Hub</span>
                </div>
                <p className="text-[10px] text-foreground-secondary font-bold">Student Portal</p>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-foreground-secondary hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {navItems.map((item) => {
                const count = getCategoryUnreadCount(item.category);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-colors ${
                        isActive
                          ? 'bg-brand/10 text-brand'
                          : 'text-foreground-secondary hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.name}
                    </div>
                    {count > 0 && (
                      <div className="bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {count}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-border mt-auto">
              <NavLink
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-white/5"
              >
                <div className="w-10 h-10 rounded-full bg-brand/20 text-brand font-bold flex items-center justify-center shrink-0">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-foreground truncate">{user?.name}</div>
                  <div className="text-xs text-foreground-secondary truncate">@{user?.username}</div>
                </div>
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-error/10 hover:bg-error/20 text-error text-xs font-bold rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-background flex-col relative z-20 shrink-0">
        <div className="p-6 border-b border-border">
          <div className="text-2xl font-bold tracking-tight text-foreground font-display">
            Arena<span className="text-brand">Hub</span>
          </div>
          <p className="text-[10px] text-foreground-secondary mt-1 font-bold">Student Portal</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const count = getCategoryUnreadCount(item.category);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 rounded text-sm font-bold transition-colors ${isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-foreground-secondary hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  {item.name}
                </div>
                {count > 0 && (
                  <div className="bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {count}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2">
            <NavLink
              to="/profile"
              className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-foreground">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground truncate">{user?.name}</div>
                <div className="text-xs text-foreground-secondary truncate">@{user?.username}</div>
              </div>
            </NavLink>

            <button
              onClick={handleLogout}
              className="p-2 text-foreground-secondary hover:text-error transition-colors rounded hover:bg-error/10 shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scrollbar-hide flex flex-col relative pb-16 md:pb-0">
        {invites.length > 0 && (
          <div className="sticky top-0 z-30 flex flex-col w-full shadow-2xl">
            {invites.map(invite => (
              <div key={invite.id} className="bg-background-elevated border-b border-border px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-border flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-foreground-secondary">
                      <strong className="font-bold text-foreground">{invite.createdBy?.name || 'Someone'}</strong> invited you to play
                    </p>
                    <p className="text-base md:text-lg font-bold font-display text-foreground">{invite.gameConfig?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleDeclineInvite(invite.id)}
                    className="flex-1 sm:flex-initial px-5 py-2 bg-transparent border border-border hover:border-error hover:text-error transition-colors text-foreground-secondary text-xs font-bold rounded"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAcceptInvite(invite.id)}
                    className="flex-1 sm:flex-initial px-6 py-2 bg-brand hover:bg-brand-light text-background transition-colors text-xs font-bold rounded shadow-lg shadow-brand/20"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 relative">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border flex items-center justify-around h-16 px-1 shadow-2xl">
        {navItems.map((item) => {
          const count = getCategoryUnreadCount(item.category);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 h-full py-1 px-0.5 rounded-lg text-[10px] font-bold transition-all relative ${
                  isActive ? 'text-brand' : 'text-foreground-secondary hover:text-foreground'
                }`
              }
            >
              <div className="relative flex items-center justify-center w-5 h-5">
                {item.icon}
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-brand text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {count}
                  </span>
                )}
              </div>
              <span className="whitespace-nowrap truncate max-w-full text-center tracking-tight">
                {item.shortName || item.name}
              </span>
            </NavLink>
          );
        })}
      </div>

    </div>
  );
}

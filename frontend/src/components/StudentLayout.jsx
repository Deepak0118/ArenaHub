import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Calendar, CreditCard, Trophy, LogOut, Users } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { io } from 'socket.io-client';

export default function StudentLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [invites, setInvites] = useState([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

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
    { name: 'Facilities', path: '/games', category: 'general', icon: <Home className="w-4 h-4" /> },
    { name: 'My Sessions', path: '/my-bookings', category: 'my-bookings', icon: <Calendar className="w-4 h-4" /> },
    { name: 'My Payments', path: '/payments', category: 'payments', icon: <CreditCard className="w-4 h-4" /> },
    { name: 'Events', path: '/events', category: 'events', icon: <Trophy className="w-4 h-4" /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex text-foreground">

      {}
      <aside className="w-64 border-r border-border bg-background flex flex-col relative z-20">
        {}
        <div className="p-6 border-b border-border">
          <div className="text-2xl font-bold tracking-tight text-foreground font-display ">
            Arena<span className="text-brand">Hub</span>
          </div>
          <p className="text-[10px] text-foreground-secondary mt-1 font-bold ">Student Portal</p>
        </div>

        {}
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

        {}
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

            {}
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

      {}
      <main className="flex-1 overflow-y-auto scrollbar-hide flex flex-col relative">
        {}
        {invites.length > 0 && (
          <div className="sticky top-0 z-50 flex flex-col w-full shadow-2xl">
            {invites.map(invite => (
              <div key={invite.id} className="bg-background-elevated border-b border-border px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-border flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground-secondary">
                      <strong className="font-bold text-foreground">{invite.createdBy?.name || 'Someone'}</strong> invited you to play
                    </p>
                    <p className="text-lg font-bold font-display text-foreground">{invite.gameConfig?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleDeclineInvite(invite.id)}
                    className="px-5 py-2.5 bg-transparent border border-border hover:border-error hover:text-error transition-colors text-foreground-secondary text-xs font-bold rounded"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAcceptInvite(invite.id)}
                    className="px-6 py-2.5 bg-brand hover:bg-brand-light text-background transition-colors text-xs font-bold rounded shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30"
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

    </div>
  );
}

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Clock, Settings, CreditCard, LogOut, ArrowLeft, Trophy, Menu, X } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { io } from 'socket.io-client';

export default function AuthorityLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const queueRes = await apiFetch('/bookings/awaiting-collection');
        setQueueCount(queueRes.bookings.length);
      } catch (err) {
        console.error('Failed to fetch queue data:', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

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
    if (title.includes('equipment') || title.includes('request') || title.includes('collection')) return '/authority/queue';
    if (title.includes('payment') || title.includes('fine')) return '/authority/payments';
    if (title.includes('event')) return '/authority/events';
    return '/authority';
  };

  const getCategoryUnreadCount = (path) => {
    let count = notifications.filter(n => !n.read && getCategory(n) === path).length;
    if (path === '/authority/queue') count += queueCount;
    return count;
  };

  const navItems = [
    { name: 'Dashboard', path: '/authority', icon: <LayoutDashboard className="w-4 h-4" />, exact: true },
    { name: 'Issue Equipment', path: '/authority/queue', icon: <Clock className="w-4 h-4" /> },
    { name: 'Session Parameters', path: '/authority/config', icon: <Settings className="w-4 h-4" /> },
    { name: 'Payments', path: '/authority/payments', icon: <CreditCard className="w-4 h-4" /> },
    { name: 'Events', path: '/authority/events', icon: <Trophy className="w-4 h-4" /> },
  ];

  useEffect(() => {
    const currentCategory = navItems.find(item => pathname === item.path || (item.path !== '/authority' && pathname.startsWith(item.path)))?.path;
    
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
          <span className="text-[9px] bg-warning/10 text-warning px-2 py-0.5 rounded font-bold">Authority</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-white font-display">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-foreground-secondary hover:text-foreground focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-4/5 max-w-xs bg-background border-r border-border flex flex-col h-full z-10 p-6 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div>
                <span className="text-[10px] text-foreground font-bold block mb-1">
                  Arena<span className="text-brand">Hub</span>
                </span>
                <h1 className="text-xl font-display text-foreground">Authority Portal</h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-foreground-secondary hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {navItems.map((item) => {
                const count = getCategoryUnreadCount(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
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
                      <span className="bg-brand text-background text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                        {count}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-border mt-auto">
              <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-white/5">
                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white font-display">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-foreground truncate">{user?.name}</div>
                  <div className="text-xs text-foreground-secondary truncate">@{user?.username}</div>
                </div>
              </div>

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
      <aside className="hidden md:flex w-64 border-r border-border bg-background flex-col shrink-0">
        <div className="p-6 border-b border-border">
          <span className="text-[10px] text-foreground font-bold block mb-1">
            Arena<span className="text-brand">Hub</span>
          </span>
          <h1 className="text-xl font-display text-foreground">Authority Portal</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const count = getCategoryUnreadCount(item.path);
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
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
                  <span className="bg-brand text-background text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                    {count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2">
            <NavLink
              to="/authority/profile"
              className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-white font-display">
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

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto scrollbar-hide pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border flex justify-around items-center py-2 px-1 shadow-2xl">
        {navItems.map((item) => {
          const count = getCategoryUnreadCount(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold transition-all relative ${
                  isActive ? 'text-brand' : 'text-foreground-secondary hover:text-foreground'
                }`
              }
            >
              <div className="relative">
                {item.icon}
                {count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-brand text-background text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {count}
                  </span>
                )}
              </div>
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

    </div>
  );
}

import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Shield, LogOut, BookOpen, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  let branch = 'N/A';
  let batchYear = 'N/A';
  if (user.email) {
    const parts = user.email.split('@')[0].split('.');
    if (parts.length > 1) {
      const match = parts[parts.length - 1].match(/^([a-z]+)(\d{2})$/i);
      if (match) {
        branch = match[1].toUpperCase();
        batchYear = '20' + match[2];
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-8 md:py-12">
        
        {}
        <div className="mb-8 border-b border-border pb-6">
          <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">
            My Profile
          </h1>
          <p className="text-foreground-secondary font-medium text-xs ">
            Manage your identity and account settings
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          
          {}
          <div>
            <div className="bg-transparent border border-border rounded-lg p-8 hover:border-brand/30 transition-colors">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                  <span className="text-4xl font-bold text-brand font-display">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-2">
                  <h2 className="text-2xl font-bold text-foreground font-display truncate mb-1">
                    {user.name}
                  </h2>
                  <div className="flex items-center gap-2 text-foreground-secondary mb-4">
                    <span className="text-sm font-medium">@{user.username}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                    <span className="text-[10px] font-bold bg-background-elevated px-2 py-0.5 rounded border border-border">
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4 pt-6 border-t border-border">
                <h3 className="text-xs font-bold text-foreground-muted mb-4">
                  Account Details
                </h3>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-background-elevated flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-foreground-secondary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-foreground-muted mb-0.5">Full Name</p>
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-background-elevated flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-foreground-secondary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-foreground-muted mb-0.5">Email Address</p>
                    <p className="text-sm font-medium text-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-background-elevated flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-foreground-secondary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-foreground-muted mb-0.5">Authentication</p>
                    <p className="text-sm font-medium text-foreground">Google SSO Connected</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-background-elevated flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-foreground-secondary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-foreground-muted mb-0.5">Branch</p>
                    <p className="text-sm font-medium text-foreground">{branch}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-background-elevated flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-foreground-secondary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-foreground-muted mb-0.5">Batch Year</p>
                    <p className="text-sm font-medium text-foreground">{batchYear}</p>
                  </div>
                </div>
              </div>
                <div className="mt-8 pt-6 border-t border-border">
                  <button 
                    onClick={handleLogout}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-error/5 hover:bg-error/10 border border-error/20 rounded transition-colors text-error group"
                  >
                    <span className="text-sm font-bold ">Sign Out</span>
                    <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

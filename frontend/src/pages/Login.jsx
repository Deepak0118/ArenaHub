import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

import { API_BASE_URL } from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/games';

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.needsUsername) {
        navigate('/register', {
          state: { tempToken: data.tempToken, email: data.user.email }
        });
      } else {
        login(data.token, data.user);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'An error occurred during sign in.');
    }
  };

  const handleLocalLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    let finalEmail = email.trim().toLowerCase();
    if (!finalEmail.includes('@')) {
      finalEmail += '@chitkara.edu.in';
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: finalEmail, password }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        login(data.token, data.user);
        navigate(data.user.role === 'AUTHORITY' ? '/authority' : '/games');
      } else {
        setError(data.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      setError("Failed to connect to the server. Please check your database connection.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none overflow-hidden">
        <h1 className="text-[20vw] leading-none font-display font-black text-foreground tracking-tighter whitespace-nowrap">
          ARENA HUB
        </h1>
      </div>

      <div className="w-full max-w-md relative z-10 bg-background/50 backdrop-blur-xl border border-border p-8 md:p-10 shadow-2xl flex flex-col items-center rounded-sm">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display text-foreground mb-3">
            Arena<span className="text-brand">Hub</span>
          </h1>
          <div className="flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>
            <p className="text-[10px] text-foreground-secondary font-bold ">
              University Authentication
            </p>
            <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>
          </div>
        </div>

        {error && (
          <div className="w-full mb-6 p-4 bg-error/10 border border-error/20 rounded flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
            <p className="text-[11px] text-error font-bold leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleLocalLogin} className="w-full mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-foreground-secondary font-bold mb-1.5">
                University Email
              </label>
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@chitkara.edu.in"
                className="w-full bg-background border border-border rounded px-4 py-3 text-sm text-foreground focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-foreground-secondary font-bold mb-1.5">
                Password
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-border rounded px-4 py-3 pr-11 text-sm text-foreground focus:outline-none focus:border-brand transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black hover:opacity-80 transition-opacity p-1 flex items-center justify-center z-10"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-black stroke-[2.25]" />
                  ) : (
                    <Eye className="w-5 h-5 text-black stroke-[2.25]" />
                  )}
                </button>
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-brand text-background font-bold text-xs py-3.5 rounded hover:bg-brand/90 transition-colors mt-2"
            >
              Sign In
            </button>
          </div>
        </form>

        <div className="w-full flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-border"></div>
          <span className="text-[10px] text-foreground-tertiary font-bold ">OR</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        <div className="w-full relative h-[46px] bg-white rounded flex items-center justify-center gap-3 overflow-hidden cursor-pointer hover:bg-gray-100 transition-colors mt-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-xs font-bold text-gray-900 ">Continue with Google</span>
          
          <div className="absolute inset-0 opacity-0 overflow-hidden flex items-center justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Sign-In failed to initialize.')}
              useOneTap
              theme="outline"
              size="large"
              text="continue_with"
              width="400"
            />
          </div>
        </div>
        
      </div>
      
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none opacity-40">
        <p className="text-[10px] text-foreground-secondary font-bold">
          Chitkara University Sports Complex
        </p>
      </div>

    </div>
  );
}

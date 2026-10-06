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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:opacity-80 transition-opacity p-1 flex items-center justify-center z-10"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-white stroke-[2.25]" />
                  ) : (
                    <Eye className="w-5 h-5 text-white stroke-[2.25]" />
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

        <div className="w-full flex items-center justify-center mt-2">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Sign-In failed to initialize. Please check Google Cloud Console credentials.')}
            useOneTap={false}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="360"
          />
        </div>
        
      </div>
      
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none opacity-40">
        <p className="text-[10px] text-foreground-secondary font-bold">
          University Sports Complex
        </p>
      </div>

    </div>
  );
}

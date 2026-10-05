import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, ArrowRight } from 'lucide-react';

import { API_BASE_URL } from '../utils/api';

export default function CompleteRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const tempToken = location.state?.tempToken;
  const email = location.state?.email || 'your account';

  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tempToken) {
      navigate('/login', { replace: true });
    }
  }, [tempToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/complete-registration`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ username: username.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to set username');
      }

      login(data.token, data.user);
      navigate('/games', { replace: true });
      
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!tempToken) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background-card border border-border rounded-2xl p-8 md:p-10 shadow-2xl">
        
        <div className="mb-10">
          <span className="text-xs text-brand font-semibold block mb-2">Step 2 of 2</span>
          <h1 className="text-3xl font-bold text-foreground mb-3">Choose Your Username</h1>
          <p className="text-foreground-tertiary text-sm leading-relaxed">
            You successfully authenticated with <strong className="text-foreground">{email}</strong>. Pick a unique username.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error shrink-0" />
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-xs font-bold text-foreground-tertiary mb-3">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-tertiary font-semibold">@</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. john_doe"
                className="w-full bg-background-elevated border border-border text-foreground rounded-xl pl-10 pr-4 py-3 focus:border-brand focus:outline-none transition-colors placeholder:text-foreground-muted"
                autoFocus
              />
            </div>
            <p className="text-xs text-foreground-tertiary mt-3">
              Alphanumeric characters, dots, and underscores only
            </p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-light text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand/20"
          >
            {loading ? 'Verifying...' : 'Complete Registration'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

      </div>
    </div>
  );
}

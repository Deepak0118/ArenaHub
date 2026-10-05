import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requireAuthority = false }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-border border-t-brand rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAuthority && user.role !== 'AUTHORITY') {
    return <Navigate to="/games" replace />;
  }

  if (!requireAuthority && user.role === 'AUTHORITY') {
    return <Navigate to="/authority" replace />;
  }

  return children;
}

import { Navigate } from 'react-router-dom';
import { useAuth, roleHome } from '../../lib/auth';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-text-secondary">Checking session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles?.length && !roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

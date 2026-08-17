import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export function RequireAuth() {
  const status = useSelector((s) => s.auth.status);

  if (status === 'checking') {
    // Silent-refresh-on-load (see App.jsx) hasn't resolved yet — render
    // nothing rather than bouncing to /login and immediately back.
    return null;
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export function RequireSuperAdmin() {
  const status = useSelector((s) => s.adminAuth.status);

  if (status !== 'authenticated') {
    return <Navigate to="/control/login" replace />;
  }
  return <Outlet />;
}

import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ session }) => {
  // If there is no session, redirect to login
  if (!session) {
    return <Navigate to="/" replace />;
  }

  // If session exists, render the child routes (the AdminLayout)
  return <Outlet />;
};

export default ProtectedRoute;
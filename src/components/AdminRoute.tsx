import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AdminRouteProps {
  children?: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-xs font-medium text-slate-500">Verifying administrative authorization...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/government/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/complaints" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  ListFilter, 
  PlusCircle, 
  MapPin, 
  ShieldCheck, 
  LogIn
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { nativeService } from '../services/nativeService';

interface MobileBottomNavProps {
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenDrawer }) => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const location = useLocation();

  const handleNavTap = () => {
    nativeService.triggerHaptic('light');
  };

  const isCurrent = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* 1. Home Tab */}
        <NavLink
          to="/"
          onClick={handleNavTap}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
            isCurrent('/') && location.pathname === '/'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className={`w-5 h-5 transition-transform ${isCurrent('/') && location.pathname === '/' ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight mt-1">Home</span>
        </NavLink>

        {/* 2. Complaints Tab */}
        <NavLink
          to={isAuthenticated ? '/complaints' : '/login'}
          onClick={handleNavTap}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
            isCurrent('/complaints')
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListFilter className={`w-5 h-5 transition-transform ${isCurrent('/complaints') ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight mt-1">Issues</span>
        </NavLink>

        {/* 3. Central Prominent Report Button */}
        <NavLink
          to={isAuthenticated ? '/report' : '/login'}
          onClick={handleNavTap}
          className="flex flex-col items-center justify-center -mt-5 group"
          aria-label="Report New Civic Issue"
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/35 border-2 border-white group-active:scale-90 transition-all duration-150">
            <PlusCircle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-blue-700 tracking-tight mt-0.5">Report</span>
        </NavLink>

        {/* 4. Map Tab */}
        <NavLink
          to={isAuthenticated ? '/map' : '/login'}
          onClick={handleNavTap}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
            isCurrent('/map')
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className={`w-5 h-5 transition-transform ${isCurrent('/map') ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight mt-1">Map</span>
        </NavLink>

        {/* 5. Admin Tab or Profile Drawer Trigger */}
        {isAdmin ? (
          <NavLink
            to="/admin"
            onClick={handleNavTap}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
              isCurrent('/admin')
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className={`w-5 h-5 transition-transform ${isCurrent('/admin') ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight mt-1">Admin</span>
          </NavLink>
        ) : (
          <button
            type="button"
            onClick={() => {
              handleNavTap();
              onOpenDrawer();
            }}
            className="flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl text-slate-500 hover:text-slate-800 transition-all duration-150 active:scale-95 cursor-pointer"
            aria-label="Open Profile and Settings Menu"
          >
            {isAuthenticated ? (
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center border border-blue-200">
                {(user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            ) : (
              <LogIn className="w-5 h-5 stroke-2" />
            )}
            <span className="text-[10px] tracking-tight mt-1">{isAuthenticated ? 'Profile' : 'Sign In'}</span>
          </button>
        )}
      </div>
    </nav>
  );
};

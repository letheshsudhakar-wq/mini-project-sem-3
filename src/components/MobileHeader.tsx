import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Menu, 
  Sparkles, 
  Check, 
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { nativeService } from '../services/nativeService';

import { CivicLogoIcon } from './CivicLogo';

interface MobileHeaderProps {
  onOpenDrawer: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onOpenDrawer,
  onRefresh,
  isRefreshing = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAdmin, isDemoMode } = useAuth();

  const isChildRoute = 
    location.pathname.startsWith('/complaints/') ||
    (location.pathname === '/report' && location.key !== 'default') ||
    location.pathname === '/login' ||
    location.pathname === '/signup';

  const getScreenTitle = () => {
    if (location.pathname === '/') return 'CivicFix';
    if (location.pathname === '/complaints') return 'My Complaints';
    if (location.pathname.startsWith('/complaints/')) return 'Grievance Details';
    if (location.pathname === '/report') return 'Report Issue';
    if (location.pathname === '/map') return 'Public Map';
    if (location.pathname === '/admin') return 'Admin Dashboard';
    if (location.pathname === '/login') return 'Sign In';
    if (location.pathname === '/signup') return 'Create Account';
    return 'CivicFix';
  };

  const handleBack = () => {
    nativeService.triggerHaptic('light');
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs pt-[env(safe-area-inset-top)]">
      <div className="h-14 px-4 flex items-center justify-between gap-2">
        {/* Left Side: Back Button or Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          {isChildRoute ? (
            <button
              type="button"
              onClick={handleBack}
              className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-90 transition cursor-pointer"
              aria-label="Go back to previous screen"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link 
              to="/" 
              className="flex items-center gap-2 font-bold text-slate-900 group shrink-0"
              aria-label="CivicFix Home"
            >
              <CivicLogoIcon size="sm" />
            </Link>
          )}

          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-extrabold text-slate-900 truncate tracking-tight">
              {getScreenTitle()}
            </h1>
            <span className="text-[10px] text-slate-400 font-medium tracking-tight -mt-0.5 truncate">
              {isAdmin ? 'Municipal Operations' : 'Civic Grievance Platform'}
            </span>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh Action if supported */}
          {onRefresh && (
            <button
              type="button"
              onClick={() => {
                nativeService.triggerHaptic('light');
                onRefresh();
              }}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition"
              aria-label="Refresh content"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}

          {/* Mode Pill Badge */}
          {isDemoMode ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
              Demo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Check className="w-2.5 h-2.5 text-emerald-600" />
              Live
            </span>
          )}

          {/* Drawer Trigger Button */}
          <button
            type="button"
            onClick={() => {
              nativeService.triggerHaptic('light');
              onOpenDrawer();
            }}
            className="p-1.5 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition flex items-center justify-center cursor-pointer"
            aria-label="Open profile drawer"
          >
            {user ? (
              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {(profile?.name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            ) : (
              <Menu className="w-5 h-5 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

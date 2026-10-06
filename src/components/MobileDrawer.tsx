import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  X, 
  User, 
  ShieldCheck, 
  ListFilter, 
  PlusCircle, 
  MapPin, 
  LogOut, 
  Sparkles, 
  Database
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { nativeService } from '../services/nativeService';
import { CivicLogo } from './CivicLogo';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const { user, profile, isAdmin, isAuthenticated, isDemoMode, isConfigured, signOut, signInAsDemo } = useAuth();
  const navigate = useNavigate();
  const { success } = useToast();

  if (!isOpen) return null;

  const handleSignOut = async () => {
    nativeService.triggerHaptic('medium');
    await signOut();
    onClose();
    success('You have been signed out.');
    navigate('/login', { replace: true });
  };

  const handleSwitchDemoRole = async (targetRole: 'citizen' | 'admin') => {
    nativeService.triggerHaptic('medium');
    await signInAsDemo(targetRole);
    onClose();
    success(`Switched to Demo ${targetRole === 'admin' ? 'Admin' : 'Citizen'} mode`);
    navigate(targetRole === 'admin' ? '/admin' : '/complaints', { replace: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Drawer Content */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 z-10 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] px-5">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <CivicLogo size="sm" tagline="Municipal Grievance App" />
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card */}
          {isAuthenticated && user ? (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white space-y-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center font-bold text-base shadow-inner">
                  {(profile?.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate text-white">
                    {profile?.name || user.email}
                  </p>
                  <p className="text-xs text-slate-300 truncate">{user.email}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-[11px] uppercase tracking-wider text-blue-300 font-bold">
                  {isAdmin ? '🛡️ Administrator' : '👤 Citizen User'}
                </span>
                {isDemoMode && (
                  <span className="text-[10px] bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-md font-semibold">
                    Demo Mode
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto font-bold text-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Welcome to CivicFix</h4>
                <p className="text-xs text-slate-500 mt-0.5">Sign in to report grievances and track resolutions</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={onClose}
                  className="py-2 px-3 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl text-center shadow-2xs"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={onClose}
                  className="py-2 px-3 bg-blue-600 text-white text-xs font-semibold rounded-xl text-center shadow-xs"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}

          {/* Quick Demo Switcher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Role Switcher
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSwitchDemoRole('citizen')}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition flex items-center gap-2 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                  C
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">Citizen</p>
                  <p className="text-[10px] text-slate-400 truncate">Report & Track</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchDemoRole('admin')}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition flex items-center gap-2 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                  A
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">Admin</p>
                  <p className="text-[10px] text-slate-400 truncate">Resolve Issues</p>
                </div>
              </button>
            </div>
          </div>

          {/* Nav Links */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Navigation
            </div>
            <Link
              to="/complaints"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              <ListFilter className="w-4 h-4 text-blue-600" />
              <span>Grievance Records</span>
            </Link>

            <Link
              to="/report"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>Report Grievance</span>
            </Link>

            <Link
              to="/map"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Public Civic Map</span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Admin Management Console</span>
              </Link>
            )}
          </div>

          {/* System Status Banner */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>System Status</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isConfigured
                ? 'Connected to live Supabase backend with Row Level Security.'
                : 'Running with local high-speed mock data store with full offline capability.'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}

          <div className="text-center text-[10px] text-slate-400">
            CivicFix Mobile App v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
};

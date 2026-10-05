import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  MapPin, 
  PlusCircle, 
  ListFilter, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Database,
  User as UserIcon,
  Layers,
  Loader2,
  Sparkles,
  Check
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { MobileDrawer } from '../components/MobileDrawer';
import { MobileHeader } from '../components/MobileHeader';

export const RootLayout: React.FC = () => {
  const { user, profile, role, isAdmin, isConfigured, isDemoMode, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };
  const displayRole = role === 'admin' ? 'Government Official' : 'Citizen';

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Logout error:', error);
      }
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout failed:', err);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Mobile Top Header */}
      <MobileHeader onOpenDrawer={() => setDrawerOpen(true)} />

      {/* Configuration notice banner if Supabase env is not set */}
      {!isConfigured && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs sm:text-sm text-amber-900 text-center flex items-center justify-center gap-2">
          <Database className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>
            <strong>Offline / Demo Mode:</strong> Using local mock database. Add Supabase keys to <code className="bg-amber-100 font-mono text-[11px] px-1 py-0.5 rounded border border-amber-300">.env</code> for live cloud sync.
          </span>
        </div>
      )}

      {/* Desktop Main Header / Navigation */}
      <header className="hidden md:block sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Branding */}
          <div className="flex items-center gap-8">
            <Link 
              to="/" 
              className="flex items-center gap-2.5 font-bold text-xl text-slate-900 tracking-tight group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:bg-blue-700 transition">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="leading-tight text-slate-900 font-extrabold">Civic<span className="text-blue-600">Fix</span></span>
                <span className="text-[10px] text-slate-500 font-medium tracking-normal -mt-0.5">Civic Grievance Platform</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {user && (
              <nav className="flex items-center gap-1.5 text-sm font-medium">
                {role === 'citizen' && (
                  <>
                    <Link
                      to="/complaints"
                      className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                        isActive('/complaints')
                          ? 'text-blue-700 bg-blue-50 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <ListFilter className="w-4 h-4" />
                      My Complaints
                    </Link>

                    <Link
                      to="/report"
                      className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                        isActive('/report')
                          ? 'text-blue-700 bg-blue-50 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <PlusCircle className="w-4 h-4" />
                      Report Issue
                    </Link>
                  </>
                )}

                {/* Admin specific link */}
                {isAdmin && (
                  <Link
                    to="/government"
                    className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                      isActive('/government') || isActive('/admin')
                        ? 'text-indigo-700 bg-indigo-50 font-bold border border-indigo-200'
                        : 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-semibold'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Government Dashboard
                  </Link>
                )}

                {/* Map View Link */}
                {role === 'citizen' && (
                  <Link
                    to="/map"
                    className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                      isActive('/map')
                        ? 'text-blue-700 bg-blue-50 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    Map
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Desktop Right User Controls */}
          <div className="flex items-center gap-3">
            {/* Live vs Demo Pill */}
            {isDemoMode ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Demo Store
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" />
                Supabase Connected
              </span>
            )}

            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                      {profile?.name || user.email}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {displayRole}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer disabled:opacity-50"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {location.pathname !== '/login' && (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                )}
                {location.pathname !== '/signup' && (
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-xs transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

      </header>

      {/* Main Page Outlet with Mobile Safe Area Padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-safe-nav md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav onOpenDrawer={() => setDrawerOpen(true)} />

      {/* Desktop Footer */}
      <footer className="hidden md:block bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>CivicFix Civic Grievance Platform • Authentication & Role System Active</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Supabase Auth + Row Level Security + Mobile Capacitor Ready
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

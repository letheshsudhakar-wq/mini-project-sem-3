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
  Menu,
  X,
  User as UserIcon,
  Layers,
  Loader2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const RootLayout: React.FC = () => {
  const { user, profile, role, isAdmin, isConfigured, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Logout error:', error);
      }
      setMobileMenuOpen(false);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout failed:', err);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Configuration notice banner if Supabase env is not set */}
      {!isConfigured && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs sm:text-sm text-amber-900 text-center flex items-center justify-center gap-2">
          <Database className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Setup Notice:</strong> Supabase environment variables are missing. Configure <code className="bg-amber-100 font-mono text-xs px-1.5 py-0.5 rounded border border-amber-300">.env</code> with your project URL & Anon Key to authenticate.
          </span>
        </div>
      )}

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Branding */}
          <div className="flex items-center gap-8">
            <Link 
              to="/" 
              onClick={closeMobileMenu}
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

            {/* Desktop Navigation Links (Visible only after logging into dashboard) */}
            {user && (
              <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
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
                    to="/admin"
                    className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                      isActive('/admin')
                        ? 'text-indigo-700 bg-indigo-50 font-bold border border-indigo-200'
                        : 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-semibold'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin Dashboard
                  </Link>
                )}

                {/* Map View Link */}
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
              </nav>
            )}
          </div>

          {/* Desktop Right User Controls */}
          <div className="hidden md:flex items-center gap-3">
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
                      {role || 'Citizen'}
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

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
            {user && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {(profile?.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">{profile?.name || user.email}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{role || 'Citizen'}</span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1 p-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}

            <nav className="flex flex-col gap-1 text-sm font-medium">
              {user && (
                <>
                  {role === 'citizen' && (
                    <>
                      <Link
                        to="/complaints"
                        onClick={closeMobileMenu}
                        className={`px-3 py-2.5 rounded-xl transition flex items-center gap-2 ${
                          isActive('/complaints') ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ListFilter className="w-4 h-4" />
                        My Complaints
                      </Link>
                      <Link
                        to="/report"
                        onClick={closeMobileMenu}
                        className={`px-3 py-2.5 rounded-xl transition flex items-center gap-2 ${
                          isActive('/report') ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <PlusCircle className="w-4 h-4" />
                        Report Issue
                      </Link>
                    </>
                  )}

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={closeMobileMenu}
                      className={`px-3 py-2.5 rounded-xl transition flex items-center gap-2 ${
                        isActive('/admin') ? 'text-indigo-700 bg-indigo-50 font-bold' : 'text-indigo-600 hover:bg-indigo-50'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  )}

                  <Link
                    to="/map"
                    onClick={closeMobileMenu}
                    className={`px-3 py-2.5 rounded-xl transition flex items-center gap-2 ${
                      isActive('/map') ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    Map
                  </Link>
                </>
              )}

              {!user && (
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="w-full py-2.5 text-center text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={closeMobileMenu}
                    className="w-full py-2.5 text-center text-sm font-semibold text-white bg-blue-600 rounded-xl"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Page Outlet */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>CivicFix Civic Grievance Platform • Authentication & Role System Active</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Supabase Auth + Row Level Security
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

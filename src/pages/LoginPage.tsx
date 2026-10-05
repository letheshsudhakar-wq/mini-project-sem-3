import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LogIn, 
  Lock, 
  Mail, 
  AlertCircle, 
  ShieldAlert,
  Loader2, 
  ShieldCheck, 
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatAuthError } from '../utils/authErrors';
import { nativeService } from '../services/nativeService';
import { useToast } from '../contexts/ToastContext';

const GoogleIcon: React.FC = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27a7.2 7.2 0 0 1 0-4.54V6.58H1.25a11.98 11.98 0 0 0 0 10.84l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isGovernmentLogin = location.pathname === '/government/login';
  const { success, error: toastError } = useToast();
  const { 
    user, 
    profile, 
    role, 
    signIn, 
    signInWithGoogle,
    signOut, 
    isAuthenticated, 
    isAdmin, 
    isConfigured, 
    isDemoMode,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getDestinationPath = (userRole?: string | null) => {
    const from = (location.state as any)?.from?.pathname;
    if (from && from !== '/login') {
      return from;
    }
    if (userRole === 'admin' || (!userRole && isAdmin)) {
      return '/government';
    }
    return '/complaints';
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    if (isGovernmentLogin) {
      if (isAdmin || role === 'admin') {
        navigate('/government', { replace: true });
      }
      return;
    }

    if (role === 'admin' || isAdmin) {
      navigate('/government', { replace: true });
      return;
    }

    navigate('/complaints', { replace: true });
  }, [isAuthenticated, isAdmin, isGovernmentLogin, navigate, role]);

  const handleGoogleSignIn = async () => {
    nativeService.triggerHaptic('light');
    setErrorMessage(null);
    setIsGoogleSubmitting(true);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(formatAuthError(error));
        toastError('Google sign in failed');
        setIsGoogleSubmitting(false);
        return;
      }

      if (isDemoMode) {
        navigate('/complaints', { replace: true });
      }
    } catch (err) {
      setErrorMessage(formatAuthError(err));
      setIsGoogleSubmitting(false);
    }
  };

  const handleSignOutCurrent = async () => {
    setIsSigningOut(true);
    nativeService.triggerHaptic('medium');
    try {
      await signOut();
      setEmail('');
      setPassword('');
      setErrorMessage(null);
      success('Signed out');
    } catch (err) {
      console.error('Failed to sign out:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    nativeService.triggerHaptic('light');

    try {
      const { profile: userProfile, error } = await signIn(trimmedEmail, password);

      if (error) {
        const friendlyError = formatAuthError(error);
        if (isConfigured && friendlyError.toLowerCase().includes('invalid')) {
          setErrorMessage(
            'Invalid credentials. If you have not created an account in your Supabase database yet, click "Create Account" below.'
          );
        } else {
          setErrorMessage(friendlyError);
        }
        toastError('Authentication failed');
        setIsSubmitting(false);
        return;
      }

      const assignedRole = userProfile?.role || (trimmedEmail.includes('admin') ? 'admin' : 'citizen');
      const dest = getDestinationPath(assignedRole);
      navigate(dest, { replace: true });
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-4 sm:py-8 px-2 sm:px-0 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 p-6 sm:p-8 text-white text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-400/30 text-blue-400 mx-auto flex items-center justify-center shadow-inner">
            <LogIn className="w-6 h-6 text-blue-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign In to CivicFix</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {isGovernmentLogin
              ? 'Access the municipal complaint operations dashboard'
              : 'Access your civic grievance reports, upvotes, and status updates'}
          </p>

          {isGovernmentLogin && (
            <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-left text-[11px] text-amber-100">
              <div className="mb-1 flex items-center gap-2 font-bold uppercase tracking-wide text-amber-200">
                <ShieldAlert className="h-3.5 w-3.5" />
                Demo Government Access
              </div>
              <div>For presentation/testing only.</div>
            </div>
          )}

          {/* Mode Pill */}
          <div className="pt-2 flex justify-center">
            {isDemoMode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 border border-amber-400/30 text-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Demo Mode Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 border border-emerald-400/30 text-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                Supabase Live Connected
              </span>
            )}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Active Session Card (if user is currently signed in) */}
          {isAuthenticated && user && (
            <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {(profile?.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {profile?.name || user.email}
                    </p>
                    <p className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                      Currently Signed In ({role || (isAdmin ? 'Admin' : 'Citizen')})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOutCurrent}
                  disabled={isSigningOut}
                  className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Sign out of current account"
                >
                  {isSigningOut ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <LogOut className="w-3 h-3" />
                  )}
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-600">Already signed in.</span>
                <button
                  type="button"
                  onClick={() => navigate(getDestinationPath(role), { replace: true })}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Go to {isAdmin ? 'Government Dashboard' : 'Complaints'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div 
              role="alert" 
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-800 flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Sign In with Google Button */}
          <div>
            <button
              type="button"
              id="btn-google-signin"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting || isSubmitting}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold rounded-2xl shadow-2xs transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
            >
              {isGoogleSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <GoogleIcon />
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2.5 text-slate-400 font-bold tracking-wider text-[10px]">
                Or email & password
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {/* Email Field */}
            <div className="space-y-1">
              <label 
                htmlFor="login-email" 
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="login-password" 
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-login-submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
                </>
              )}
            </button>
          </form>

          {/* Role Info Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Citizens are routed to <strong>Complaints</strong> and Admins are routed to <strong>Admin Console</strong> automatically.
            </span>
          </div>

          {/* Footer Link to Signup */}
          <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
            Don't have a citizen account yet?{' '}
            <Link 
              to="/signup" 
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

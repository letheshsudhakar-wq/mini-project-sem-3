import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LogIn, 
  Lock, 
  Mail, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Shield,
  Sparkles,
  Check,
  LogOut,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatAuthError } from '../utils/authErrors';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    profile, 
    role, 
    signIn, 
    signInAsDemo, 
    signOut, 
    isAuthenticated, 
    isAdmin, 
    isConfigured, 
    isDemoMode 
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState<'citizen' | 'admin' | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fillFeedback, setFillFeedback] = useState<string | null>(null);

  const getDestinationPath = (userRole?: string | null) => {
    const from = (location.state as any)?.from?.pathname;
    if (from && from !== '/login') {
      return from;
    }
    if (userRole === 'admin' || (!userRole && isAdmin)) {
      return '/admin';
    }
    return '/complaints';
  };

  const handleDemoSignIn = async (demoRole: 'citizen' | 'admin') => {
    setErrorMessage(null);
    setFillFeedback(null);
    setIsDemoSubmitting(demoRole);

    try {
      const { profile: signedInProfile, error } = await signInAsDemo(demoRole);
      if (error) {
        setErrorMessage(formatAuthError(error));
        return;
      }

      const dest = getDestinationPath(signedInProfile?.role || demoRole);
      navigate(dest, { replace: true });
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsDemoSubmitting(null);
    }
  };

  const handleFillCredentials = (demoRole: 'citizen' | 'admin') => {
    if (demoRole === 'citizen') {
      setEmail('citizen@civicfix.org');
      setPassword('citizen123');
      setFillFeedback('Citizen credentials populated. Click "Sign In" to proceed.');
    } else {
      setEmail('admin@civicfix.org');
      setPassword('admin123');
      setFillFeedback('Admin credentials populated. Click "Sign In" to proceed.');
    }
    setErrorMessage(null);
  };

  const handleSignOutCurrent = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setEmail('');
      setPassword('');
      setErrorMessage(null);
      setFillFeedback(null);
    } catch (err) {
      console.error('Failed to sign out:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFillFeedback(null);

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

    try {
      const { profile: userProfile, error } = await signIn(trimmedEmail, password);

      if (error) {
        const friendlyError = formatAuthError(error);
        if (isConfigured && friendlyError.toLowerCase().includes('invalid')) {
          setErrorMessage(
            'Invalid credentials. If you have not created an account in your Supabase database yet, click "Create Account" below or use the 1-Click Demo login.'
          );
        } else {
          setErrorMessage(friendlyError);
        }
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
    <div className="w-full max-w-md mx-auto py-8 px-4 sm:px-0">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 p-6 sm:p-8 text-white text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-400/30 text-blue-400 mx-auto flex items-center justify-center shadow-inner">
            <LogIn className="w-6 h-6 text-blue-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign In to CivicFix</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Access your civic grievance reports, upvotes, and status updates
          </p>

          {/* Mode Pill */}
          <div className="pt-2 flex justify-center">
            {isDemoMode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-400/20 border border-amber-400/30 text-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Instant Demo Mode Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-400/20 border border-emerald-400/30 text-emerald-200">
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
                  className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                <span className="text-[11px] text-slate-600">Already signed in to this account.</span>
                <button
                  type="button"
                  onClick={() => navigate(getDestinationPath(role), { replace: true })}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Go to {isAdmin ? 'Admin Console' : 'Complaints'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Quick 1-Click Demo Access Bar */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                1-Click Demo Sign In
              </span>
              <span className="text-[11px] font-normal text-slate-400">Instant Access</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="btn-citizen-demo"
                disabled={isSubmitting || isDemoSubmitting !== null}
                onClick={() => handleDemoSignIn('citizen')}
                className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-900 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                {isDemoSubmitting === 'citizen' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <User className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>Citizen Demo</span>
              </button>

              <button
                type="button"
                id="btn-admin-demo"
                disabled={isSubmitting || isDemoSubmitting !== null}
                onClick={() => handleDemoSignIn('admin')}
                className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-900 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                {isDemoSubmitting === 'admin' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-purple-600" />
                )}
                <span>Admin Demo</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Or Sign In with Email</span>
            </div>
          </div>

          {/* Quick Credential Population Chips */}
          <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              Quick Fill:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleFillCredentials('citizen')}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-blue-100/60 text-blue-800 hover:bg-blue-200 transition"
              >
                Citizen
              </button>
              <button
                type="button"
                onClick={() => handleFillCredentials('admin')}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-purple-100/60 text-purple-800 hover:bg-purple-200 transition"
              >
                Admin
              </button>
            </div>
          </div>

          {/* Feedback Info Box */}
          {fillFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{fillFeedback}</span>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div 
              role="alert" 
              className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-start gap-3 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="login-email" 
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
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
                    if (fillFeedback) setFillFeedback(null);
                  }}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="login-password" 
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
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
                    if (fillFeedback) setFillFeedback(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition"
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
              disabled={isSubmitting || isDemoSubmitting !== null}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
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
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

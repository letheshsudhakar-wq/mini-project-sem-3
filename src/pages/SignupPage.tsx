import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Check
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

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, isDemoMode } = useAuth();
  const { success, error: toastError } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ emailVerificationNeeded: boolean; email: string } | null>(null);

  const handleGoogleSignUp = async () => {
    nativeService.triggerHaptic('light');
    setErrorMessage(null);
    setIsGoogleSubmitting(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(formatAuthError(error));
        toastError('Google registration failed');
        setIsGoogleSubmitting(false);
        return;
      }
      if (isDemoMode) {
        success('Account created successfully');
        navigate('/complaints', { replace: true });
      }
    } catch (err) {
      setErrorMessage(formatAuthError(err));
      setIsGoogleSubmitting(false);
    }
  };

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Please provide your full name.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.';
    }

    if (!password) {
      return 'Please create a password.';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters in length.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match. Please re-enter identical passwords.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    nativeService.triggerHaptic('light');

    try {
      const { user, emailConfirmationRequired, error } = await signUp({
        name,
        email,
        phone,
        password,
      });

      if (error) {
        setErrorMessage(formatAuthError(error));
        toastError('Sign up error');
        setIsSubmitting(false);
        return;
      }

      nativeService.triggerHaptic('success');

      if (emailConfirmationRequired) {
        setSuccessInfo({
          emailVerificationNeeded: true,
          email: email.trim(),
        });
        success('Verification link sent');
      } else if (user) {
        success('Welcome to CivicFix! Account created.');
        navigate('/complaints', { replace: true });
      } else {
        setSuccessInfo({
          emailVerificationNeeded: true,
          email: email.trim(),
        });
      }
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
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 p-6 sm:p-8 text-white text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 text-white mx-auto flex items-center justify-center shadow-inner">
            <UserPlus className="w-6 h-6 text-blue-200" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">Create Citizen Account</h1>
          <p className="text-xs sm:text-sm text-blue-100">
            Join CivicFix to report, upvote, and track neighborhood issues
          </p>

          {/* Mode Pill */}
          <div className="pt-1 flex justify-center">
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

        {/* Body Form */}
        <div className="p-5 sm:p-8 space-y-5">
          {/* Success Email Verification Notice */}
          {successInfo?.emailVerificationNeeded && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-center animate-in fade-in">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-emerald-900">Check Your Email</h3>
              <p className="text-xs text-emerald-800 leading-relaxed">
                We sent a confirmation link to <strong>{successInfo.email}</strong>. Please verify your email to log in.
              </p>
              <Link
                to="/login"
                className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Go to Sign In
              </Link>
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

          {/* Google Sign In */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignUp}
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
                Or fill registration details
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {/* Full Name Field */}
            <div className="space-y-1">
              <label 
                htmlFor="signup-name" 
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label 
                htmlFor="signup-email" 
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="signup-email"
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

            {/* Phone Field */}
            <div className="space-y-1">
              <label 
                htmlFor="signup-phone" 
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Phone Number <span className="text-slate-400 lowercase font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="signup-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label 
                htmlFor="signup-password" 
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="At least 6 characters"
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

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <label 
                htmlFor="signup-confirm-password" 
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link to Login */}
          <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

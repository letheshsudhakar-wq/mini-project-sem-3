import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  MapPin, 
  CheckCircle2, 
  PlusCircle,
  Clock,
  ArrowRight,
  Search
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { nativeService } from '../services/nativeService';

export const HomePage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    nativeService.triggerHaptic('light');
    navigate(path);
  };

  return (
    <div className="space-y-8 sm:space-y-16 py-2 sm:py-6 max-w-6xl mx-auto px-2 sm:px-6 animate-in fade-in duration-250">
      {/* Mobile Top Welcome Card */}
      {user && (
        <div className="md:hidden p-4 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-md flex items-center justify-between">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
              Welcome back
            </span>
            <h2 className="text-base font-extrabold truncate">
              {profile?.name || user.email?.split('@')[0] || 'Citizen'}
            </h2>
            <p className="text-xs text-blue-100">
              {isAdmin ? '🛡️ Admin Operations Active' : '📍 File and track neighborhood reports'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAction('/report')}
            className="px-3.5 py-2 bg-white text-blue-700 rounded-2xl text-xs font-bold shadow-sm active:scale-95 transition shrink-0"
          >
            + Report
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6 pt-2 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/80 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          Community-Driven Grievance Resolution Platform
        </div>
        
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Report civic issues. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Track progress.
          </span> <br />
          Improve your community.
        </h1>
        
        <p className="text-xs sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          CivicFix empowers residents to flag neighborhood problems—such as potholes, broken streetlights, drainage overflows, and uncollected garbage—with real-time status tracking and transparent resolution.
        </p>

        {/* Primary and Secondary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to={user ? "/report" : "/login"}
            id="hero-primary-cta"
            onClick={() => nativeService.triggerHaptic('medium')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base px-6 sm:px-7 py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            Report an Issue
          </Link>
          <Link
            to={user ? "/complaints" : "/login"}
            id="hero-secondary-cta"
            onClick={() => nativeService.triggerHaptic('light')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm sm:text-base px-6 sm:px-7 py-3.5 rounded-2xl border border-slate-300 shadow-2xs transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <Search className="w-5 h-5 text-slate-500" />
            Track Complaints
          </Link>
        </div>

        <p className="text-[11px] sm:text-xs text-slate-400">
          CivicFix is an open community grievance management platform designed for civic transparency.
        </p>
      </section>

      {/* Quick Action Mobile Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link
          to="/report"
          onClick={() => nativeService.triggerHaptic('light')}
          className="p-4 rounded-3xl bg-blue-50/80 border border-blue-200/80 hover:bg-blue-100/70 transition flex flex-col justify-between active:scale-95 group shadow-2xs"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold mb-3 shadow-sm shadow-blue-600/20">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700 transition">
              File New Grievance
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">GPS location & photo</p>
          </div>
        </Link>

        <Link
          to="/map"
          onClick={() => nativeService.triggerHaptic('light')}
          className="p-4 rounded-3xl bg-amber-50/80 border border-amber-200/80 hover:bg-amber-100/70 transition flex flex-col justify-between active:scale-95 group shadow-2xs"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold mb-3 shadow-sm shadow-amber-500/20">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900 group-hover:text-amber-800 transition">
              Live Area Map
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">View nearby active pins</p>
          </div>
        </Link>

        <Link
          to={user ? "/complaints" : "/login"}
          onClick={() => nativeService.triggerHaptic('light')}
          className="col-span-2 sm:col-span-1 p-4 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 hover:bg-emerald-100/70 transition flex flex-col justify-between active:scale-95 group shadow-2xs"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold mb-3 shadow-sm shadow-emerald-600/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-800 transition">
              Track Status
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Real-time audit history</p>
          </div>
        </Link>
      </section>

      {/* 3-Step Process: Report -> Track -> Resolve */}
      <section className="space-y-4 sm:space-y-8">
        <div className="text-center space-y-1 sm:space-y-2">
          <h2 className="text-xl sm:text-3xl font-bold text-slate-900">How CivicFix Works</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            A transparent 3-step lifecycle ensuring neighborhood issues are heard and addressed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative">
          {/* Step 1 */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Step 1</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Report</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Pinpoint issue locations via GPS or map marker, upload proof photos, and describe the civic problem. Nearby duplicate detection prevents redundant reports.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-medium text-slate-400 flex items-center gap-1.5 border-t border-slate-100">
              <span>Geo-tagged & photo-verified</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Step 2</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Track</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Follow real-time status updates from <span className="font-semibold text-amber-600">Reported</span> to <span className="font-semibold text-blue-600">In Progress</span> with an immutable timeline and community upvotes.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-medium text-slate-400 flex items-center gap-1.5 border-t border-slate-100">
              <span>Live timeline & upvoting</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Step 3</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Resolve</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Municipal teams and administrators mark issues as <span className="font-semibold text-emerald-600">Resolved</span>, attach resolution proof photos, and provide notes for full closure accountability.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-medium text-slate-400 flex items-center gap-1.5 border-t border-slate-100">
              <span>Resolution photo verification</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Banner */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-3xl space-y-3 sm:space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-blue-400 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5" />
            Interactive Public Map
          </div>
          <h2 className="text-xl sm:text-3xl font-bold">
            Explore Open Grievances in Your Area
          </h2>
          <p className="text-slate-300 text-xs sm:text-base leading-relaxed">
            Use the interactive CivicFix map to discover active complaints within 500 meters of your location, filter by category (pothole, streetlight, drainage, garbage), and upvote issues that affect you.
          </p>
          <div className="pt-2">
            <Link
              to="/map"
              id="landing-explore-map-btn"
              onClick={() => nativeService.triggerHaptic('light')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-md text-xs sm:text-sm active:scale-95"
            >
              Open Civic Map
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Grievance Categories Section */}
      <section className="space-y-4 sm:space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Common Issue Categories</h2>
          <p className="text-xs sm:text-sm text-slate-500">Tap a category to quickly start reporting</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Link
            to="/report"
            onClick={() => nativeService.triggerHaptic('light')}
            className="p-4 rounded-3xl bg-white border border-slate-200 hover:border-orange-300 text-center space-y-1.5 transition shadow-2xs active:scale-95 block group"
          >
            <span className="text-3xl block group-hover:scale-110 transition" role="img" aria-label="Pothole">🕳️</span>
            <div className="font-bold text-slate-900 text-xs sm:text-sm">Potholes</div>
            <p className="text-[11px] text-slate-500">Road craters, damaged pavement</p>
          </Link>

          <Link
            to="/report"
            onClick={() => nativeService.triggerHaptic('light')}
            className="p-4 rounded-3xl bg-white border border-slate-200 hover:border-amber-300 text-center space-y-1.5 transition shadow-2xs active:scale-95 block group"
          >
            <span className="text-3xl block group-hover:scale-110 transition" role="img" aria-label="Streetlight">💡</span>
            <div className="font-bold text-slate-900 text-xs sm:text-sm">Streetlights</div>
            <p className="text-[11px] text-slate-500">Dark poles, flickering lamps</p>
          </Link>

          <Link
            to="/report"
            onClick={() => nativeService.triggerHaptic('light')}
            className="p-4 rounded-3xl bg-white border border-slate-200 hover:border-sky-300 text-center space-y-1.5 transition shadow-2xs active:scale-95 block group"
          >
            <span className="text-3xl block group-hover:scale-110 transition" role="img" aria-label="Drainage">🌊</span>
            <div className="font-bold text-slate-900 text-xs sm:text-sm">Drainage</div>
            <p className="text-[11px] text-slate-500">Blocked drains, waterlogging</p>
          </Link>

          <Link
            to="/report"
            onClick={() => nativeService.triggerHaptic('light')}
            className="p-4 rounded-3xl bg-white border border-slate-200 hover:border-emerald-300 text-center space-y-1.5 transition shadow-2xs active:scale-95 block group"
          >
            <span className="text-3xl block group-hover:scale-110 transition" role="img" aria-label="Garbage">🗑️</span>
            <div className="font-bold text-slate-900 text-xs sm:text-sm">Garbage</div>
            <p className="text-[11px] text-slate-500">Overflowing bins, illegal dumps</p>
          </Link>
        </div>
      </section>
    </div>
  );
};

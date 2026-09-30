import React from 'react';
import { Link } from 'react-router-dom';
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

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-16 py-6 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-6 pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/80 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          Community-Driven Grievance Resolution Platform
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Report civic issues. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Track progress.
          </span> <br />
          Improve your community.
        </h1>
        
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          CivicFix empowers residents to flag neighborhood problems—such as potholes, broken streetlights, drainage overflows, and uncollected garbage—with real-time status tracking and transparent resolution.
        </p>

        {/* Primary and Secondary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Link
            to={user ? "/report" : "/login"}
            id="hero-primary-cta"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98]"
          >
            <PlusCircle className="w-5 h-5" />
            Report an Issue
          </Link>
          <Link
            to={user ? "/complaints" : "/login"}
            id="hero-secondary-cta"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-7 py-3.5 rounded-xl border border-slate-300 shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            <Search className="w-5 h-5 text-slate-500" />
            Track Complaints
          </Link>
        </div>

        <p className="text-xs text-slate-400">
          CivicFix is an open community grievance management platform designed for civic transparency.
        </p>
      </section>

      {/* 3-Step Process: Report -> Track -> Resolve */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How CivicFix Works</h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            A transparent 3-step lifecycle ensuring neighborhood issues are heard and addressed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Step 1</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Report</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Pinpoint issue locations via GPS or map marker, upload proof photos, and describe the civic problem. Nearby duplicate detection prevents redundant reports.
              </p>
            </div>
            <div className="pt-2 text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <span>Geo-tagged & photo-verified</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Step 2</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Track</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Follow real-time status updates from <span className="font-semibold text-amber-600">Reported</span> to <span className="font-semibold text-blue-600">In Progress</span> with an immutable timeline and community upvotes.
              </p>
            </div>
            <div className="pt-2 text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <span>Live timeline & upvoting</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Step 3</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Resolve</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Municipal teams and administrators mark issues as <span className="font-semibold text-emerald-600">Resolved</span>, attach resolution proof photos, and provide notes for full closure accountability.
              </p>
            </div>
            <div className="pt-2 text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <span>Resolution photo verification</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Banner */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-blue-400 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5" />
            Interactive Public Map
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold">
            Explore Open Grievances in Your Area
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Use the interactive CivicFix map to discover active complaints within 500 meters of your location, filter by category (pothole, streetlight, drainage, garbage), and upvote issues that affect you.
          </p>
          <div className="pt-2">
            <Link
              to="/map"
              id="landing-explore-map-btn"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-md text-sm"
            >
              Open Civic Map
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Grievance Categories Section */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Common Issue Categories</h2>
          <p className="text-xs sm:text-sm text-slate-500">Quickly categorize your report for rapid routing</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2 hover:border-blue-300 transition shadow-sm">
            <span className="text-3xl" role="img" aria-label="Pothole">🕳️</span>
            <div className="font-semibold text-slate-900 text-sm">Potholes</div>
            <p className="text-xs text-slate-500">Road craters, damaged pavement, hazardous pits</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2 hover:border-blue-300 transition shadow-sm">
            <span className="text-3xl" role="img" aria-label="Streetlight">💡</span>
            <div className="font-semibold text-slate-900 text-sm">Streetlights</div>
            <p className="text-xs text-slate-500">Dark poles, flickering lamps, exposed wiring</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2 hover:border-blue-300 transition shadow-sm">
            <span className="text-3xl" role="img" aria-label="Drainage">🌊</span>
            <div className="font-semibold text-slate-900 text-sm">Drainage</div>
            <p className="text-xs text-slate-500">Blocked stormwater drains, waterlogging, sewage</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2 hover:border-blue-300 transition shadow-sm">
            <span className="text-3xl" role="img" aria-label="Garbage">🗑️</span>
            <div className="font-semibold text-slate-900 text-sm">Garbage</div>
            <p className="text-xs text-slate-500">Overflowing dumpsters, illegal dumps, litter</p>
          </div>
        </div>
      </section>
    </div>
  );
};

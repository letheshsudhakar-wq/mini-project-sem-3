import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  PlusCircle, 
  Navigation, 
  RefreshCw, 
  Loader2, 
  Info
} from 'lucide-react';
import { complaintsService } from '../services/complaints';
import { PublicCivicMap } from '../components/PublicCivicMap';
import { CategoryLegend } from '../components/CategoryLegend';
import { MapComplaintDrawer } from '../components/MapComplaintDrawer';
import { COMPLAINT_CATEGORIES } from '../utils/constants';
import { nativeService } from '../services/nativeService';
import { useToast } from '../contexts/ToastContext';
import type { Complaint, ComplaintCategory } from '../types';

type StatusFilterType = 'all' | 'reported' | 'in_progress';

export const MapPage: React.FC = () => {
  const { info, warning } = useToast();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // User Geolocation & Radius search states
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationAlert, setLocationAlert] = useState<string | null>(null);

  // Fetch Open Complaints for Public Map
  const fetchOpenComplaints = useCallback(async (isManualRefresh = false) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await complaintsService.getOpenComplaintsForMap();
      if (error) {
        setErrorMsg('Unable to load civic complaints. Please check your connection.');
      } else {
        const validList = (data || []).filter(
          (c) =>
            isFinite(c.latitude) &&
            isFinite(c.longitude) &&
            c.latitude >= -90 &&
            c.latitude <= 90 &&
            c.longitude >= -180 &&
            c.longitude <= 180
        );
        setComplaints(validList);
        if (isManualRefresh) {
          nativeService.triggerHaptic('success');
          info('Map complaints updated');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error fetching open map complaints.');
    } finally {
      setIsLoading(false);
    }
  }, [info]);

  useEffect(() => {
    fetchOpenComplaints();
  }, [fetchOpenComplaints]);

  // Handle Find Issues Near Me (500m radius) with native GPS
  const handleFindNearbyIssues = async () => {
    setIsLocating(true);
    setLocationAlert(null);
    nativeService.triggerHaptic('light');

    try {
      const pos = await nativeService.getCurrentLocation();
      const coords = { lat: pos.latitude, lng: pos.longitude };
      setUserLocation(coords);
      setIsLocating(false);

      const { data: nearby } = await complaintsService.getNearbyOpenComplaints(
        coords.lat,
        coords.lng,
        500 // 500 meters
      );

      const count = nearby?.length ?? 0;
      nativeService.triggerHaptic(count > 0 ? 'success' : 'light');

      if (count > 0) {
        const alertText = `Found ${count} open civic issue(s) within 500m of your location.`;
        setLocationAlert(alertText);
        info(alertText);
      } else {
        const alertText = 'No open civic issues found within 500m of your location.';
        setLocationAlert(alertText);
        info(alertText);
      }
    } catch (err: any) {
      setIsLocating(false);
      const msg = err?.message || 'Unable to acquire GPS location.';
      setLocationAlert(msg);
      warning(msg);
    }
  };

  // Compute category counts for active complaints
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      pothole: 0,
      streetlight: 0,
      drainage: 0,
      garbage: 0,
      other: 0,
    };
    complaints.forEach((c) => {
      if (counts[c.category] !== undefined) {
        counts[c.category]++;
      }
    });
    return counts;
  }, [complaints]);

  // Filter complaints list
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchCategory = categoryFilter === 'all' || c.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchCategory && matchStatus;
    });
  }, [complaints, categoryFilter, statusFilter]);

  const handleUpvoteUpdated = (complaintId: string, newCount: number) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, upvote_count: newCount } : c))
    );
    if (selectedComplaint && selectedComplaint.id === complaintId) {
      setSelectedComplaint({ ...selectedComplaint, upvote_count: newCount });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto pb-8 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5" />
            Civic Geographic Visualization
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Public Civic Issue Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Explore reported and in-progress civic grievances across your neighborhood in real-time.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFindNearbyIssues}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <Navigation className="w-4 h-4 text-blue-600" />
            )}
            <span>{isLocating ? 'Scanning Area...' : 'Find Near Me'}</span>
          </button>

          <Link
            to="/report"
            onClick={() => nativeService.triggerHaptic('light')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Report Issue
          </Link>
        </div>
      </div>

      {/* Geolocation Notice / Alert banner */}
      {locationAlert && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs sm:text-sm text-blue-900 flex items-center justify-between gap-3 animate-in fade-in shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">{locationAlert}</span>
          </div>
          <button
            onClick={() => setLocationAlert(null)}
            className="text-xs font-bold text-blue-700 hover:underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar with Horizontal Carousel on Mobile */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Category Pills with no-scrollbar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar text-xs font-semibold -mx-1 px-1">
          <button
            type="button"
            onClick={() => {
              nativeService.triggerHaptic('light');
              setCategoryFilter('all');
            }}
            className={`px-3 py-2 rounded-2xl transition shrink-0 cursor-pointer active:scale-95 ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            All ({complaints.length})
          </button>
          {COMPLAINT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => {
                nativeService.triggerHaptic('light');
                setCategoryFilter(cat.value);
              }}
              className={`px-3 py-2 rounded-2xl transition shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                categoryFilter === cat.value
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{cat.label.split(' ')[0]}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                categoryFilter === cat.value ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {categoryCounts[cat.value] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                nativeService.triggerHaptic('light');
                setStatusFilter('all');
              }}
              className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Open
            </button>
            <button
              type="button"
              onClick={() => {
                nativeService.triggerHaptic('light');
                setStatusFilter('reported');
              }}
              className={`px-2.5 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer ${
                statusFilter === 'reported' ? 'bg-white text-amber-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Reported
            </button>
            <button
              type="button"
              onClick={() => {
                nativeService.triggerHaptic('light');
                setStatusFilter('in_progress');
              }}
              className={`px-2.5 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer ${
                statusFilter === 'in_progress' ? 'bg-white text-blue-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              In Progress
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchOpenComplaints(true)}
            title="Refresh map complaints"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-2xl border border-slate-200 transition shrink-0 active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="space-y-4">
        {/* Error banner if fetch failed */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-3xl text-xs text-rose-800 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={() => fetchOpenComplaints(true)}
              className="text-xs font-bold text-rose-700 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Leaflet Public Map */}
        <div className="relative">
          <PublicCivicMap
            complaints={filteredComplaints}
            userLocation={userLocation}
            selectedComplaintId={selectedComplaint?.id}
            onSelectComplaint={(c) => {
              nativeService.triggerHaptic('light');
              setSelectedComplaint(c);
            }}
            className="h-[440px] sm:h-[580px]"
          />

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-xs z-[500] flex items-center justify-center rounded-3xl">
              <div className="bg-white/95 px-5 py-3 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading open civic issues...</span>
              </div>
            </div>
          )}
        </div>

        {/* Category Legend Component */}
        <CategoryLegend
          counts={categoryCounts}
          selectedCategory={categoryFilter}
          onSelectCategory={(cat) => {
            nativeService.triggerHaptic('light');
            setCategoryFilter(cat);
          }}
        />

        {/* Selected Complaint Detail Drawer / Card */}
        {selectedComplaint && (
          <div className="pt-2 animate-in slide-in-from-bottom-3 duration-200">
            <MapComplaintDrawer
              complaint={selectedComplaint}
              onClose={() => setSelectedComplaint(null)}
              onUpvoteChange={handleUpvoteUpdated}
            />
          </div>
        )}

        {/* Empty State when no open complaints match */}
        {!isLoading && filteredComplaints.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              {complaints.length === 0
                ? 'No open civic issues have been reported yet.'
                : 'No open complaints match your current filter selection.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {complaints.length === 0
                ? 'Be the first to report a pothole, broken streetlight, drainage, or garbage issue in your area.'
                : 'Try switching to "All Categories" or "All Open" to view all reported issues.'}
            </p>
            {complaints.length === 0 ? (
              <div className="pt-1">
                <Link
                  to="/report"
                  onClick={() => nativeService.triggerHaptic('light')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  Report an Issue
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  nativeService.triggerHaptic('light');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

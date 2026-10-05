import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertCircle, 
  MapPin, 
  Camera, 
  Upload, 
  X, 
  Navigation, 
  Loader2, 
  CheckCircle2, 
  ThumbsUp, 
  AlertTriangle, 
  ArrowRight,
  FileText,
  Layers,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { complaintsService } from '../services/complaints';
import { storageService } from '../services/storage';
import { reverseGeocode } from '../services/geocoding';
import { compressImage } from '../utils/imageCompressor';
import { COMPLAINT_CATEGORIES } from '../utils/constants';
import { LocationPickerMap } from '../components/LocationPickerMap';
import { LiveCameraModal } from '../components/LiveCameraModal';
import { nativeService } from '../services/nativeService';
import { aiService, type AIAssessmentResult } from '../services/aiService';
import { useToast } from '../contexts/ToastContext';
import type { ComplaintCategory, NearbyComplaint, Complaint } from '../types';

// Default initial coordinates (Fallback to a central location: e.g. New Delhi / NYC central)
const DEFAULT_LATITUDE = 28.6139;
const DEFAULT_LONGITUDE = 77.2090;

export const ReportPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError, warning, info } = useToast();

  // Form States
  const [category, setCategory] = useState<ComplaintCategory>('pothole');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number>(DEFAULT_LATITUDE);
  const [longitude, setLongitude] = useState<number>(DEFAULT_LONGITUDE);
  const [address, setAddress] = useState<string>('');

  // Photo States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // AI Assistance States
  const [aiAssessment, setAiAssessment] = useState<AIAssessmentResult | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Loading States
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState<string | null>(null);

  // Error & Status States
  const [locationError, setLocationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [nearbyDuplicates, setNearbyDuplicates] = useState<NearbyComplaint[]>([]);
  const [hasAcknowledgedDuplicates, setHasAcknowledgedDuplicates] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Success Confirmation State
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [upvoteSuccessMessage, setUpvoteSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const aiTimeoutRef = useRef<any>(null);

  // Auto-fetch reverse geocoding when coordinates change
  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    if (geocodeAbortRef.current) {
      geocodeAbortRef.current.abort();
    }
    geocodeAbortRef.current = new AbortController();

    setIsGeocoding(true);
    try {
      const result = await reverseGeocode(lat, lng, geocodeAbortRef.current.signal);
      setAddress(result.address);
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Update position manually from map
  const handleLocationChange = (coords: { lat: number; lng: number }) => {
    setLatitude(coords.lat);
    setLongitude(coords.lng);
    setLocationError(null);
    setHasAcknowledgedDuplicates(false);
    fetchAddress(coords.lat, coords.lng);
  };

  // Capture GPS Location with native & web support
  const handleGetGPSLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    nativeService.triggerHaptic('light');

    try {
      const pos = await nativeService.getCurrentLocation();
      setLatitude(pos.latitude);
      setLongitude(pos.longitude);
      setIsLocating(false);
      setHasAcknowledgedDuplicates(false);
      fetchAddress(pos.latitude, pos.longitude);
      nativeService.triggerHaptic('success');
      info('Location updated from device GPS');
    } catch (err: any) {
      setIsLocating(false);
      const msg = err?.message || 'Unable to access your location. Please place the pin manually on the map.';
      setLocationError(msg);
      warning(msg);
    }
  };

  // Initial geocoding & optional GPS check on mount
  useEffect(() => {
    fetchAddress(DEFAULT_LATITUDE, DEFAULT_LONGITUDE);
    nativeService.getCurrentLocation().then(
      (pos) => {
        setLatitude(pos.latitude);
        setLongitude(pos.longitude);
        fetchAddress(pos.latitude, pos.longitude);
      },
      () => {
        // Silent fallback on initial load
      }
    );
  }, [fetchAddress]);

  // AI-Assisted Text Analysis
  useEffect(() => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

    if (description.trim().length >= 10) {
      aiTimeoutRef.current = setTimeout(async () => {
        setIsAiAnalyzing(true);
        try {
          const res = await aiService.analyzeGrievanceText(description);
          setAiAssessment(res);
        } catch {
          // Non-blocking
        } finally {
          setIsAiAnalyzing(false);
        }
      }, 500);
    } else {
      setAiAssessment(null);
    }

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [description]);

  // Apply AI Suggestion
  const handleApplyAiCategory = () => {
    if (aiAssessment?.suggestedCategory) {
      nativeService.triggerHaptic('light');
      setCategory(aiAssessment.suggestedCategory);
      success(`Applied category: ${COMPLAINT_CATEGORIES.find(c => c.value === aiAssessment.suggestedCategory)?.label}`);
    }
  };

  // Handle Photo selection (via Native Camera or Live Web Camera Modal)
  const handleNativeCamera = async () => {
    nativeService.triggerHaptic('light');
    if (nativeService.isNative()) {
      const result = await nativeService.capturePhoto();
      if (result.file && result.dataUrl) {
        setSelectedFile(result.file);
        setPreviewUrl(result.dataUrl);
        setImageError(null);
        return;
      }
      if (result.error && result.error !== 'Photo selection cancelled') {
        setIsCameraModalOpen(true);
      }
      return;
    }
    // Launch live camera modal on web browsers
    setIsCameraModalOpen(true);
  };

  const handleLiveCameraCapture = (file: File, dataUrl: string) => {
    setSelectedFile(file);
    setPreviewUrl(dataUrl);
    setImageError(null);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError('Selected image is too large (max 10MB). Please select a smaller photo.');
      return;
    }

    try {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
      const preview = URL.createObjectURL(compressed);
      setPreviewUrl(preview);
      nativeService.triggerHaptic('light');
    } catch {
      setImageError('Failed to process image preview. Please try another file.');
    }
  };

  const handleRemovePhoto = () => {
    nativeService.triggerHaptic('light');
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upvote an existing nearby issue instead of creating duplicate
  const handleUpvoteExisting = async (complaintId: string) => {
    if (!user) {
      setFormError('Please sign in to upvote this complaint.');
      return;
    }

    setIsUpvoting(complaintId);
    setFormError(null);
    nativeService.triggerHaptic('medium');

    try {
      const { error: uvError } = await complaintsService.addUpvote(complaintId, user.id);
      if (uvError) {
        if (uvError.message?.includes('duplicate key') || (uvError as any).code === '23505') {
          setUpvoteSuccessMessage('You have already upvoted this complaint! Thank you for supporting community resolution.');
        } else {
          setFormError('Failed to record upvote. Please try again.');
          toastError('Failed to record upvote.');
        }
      } else {
        nativeService.triggerHaptic('success');
        setUpvoteSuccessMessage('Upvote recorded successfully! Priority has been increased for this issue.');
        success('Upvoted existing issue to increase resolution priority!');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Error processing upvote.');
    } finally {
      setIsUpvoting(null);
    }
  };

  // Validate and submit complaint
  const handleSubmit = async (e?: React.FormEvent, bypassDuplicateCheck = false) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!user) {
      setFormError('You must be signed in to submit a grievance report.');
      toastError('Please sign in first.');
      return;
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setFormError('Please enter a description of the issue.');
      return;
    }

    if (trimmedDesc.length < 10) {
      setFormError('Description must contain at least 10 characters detailing the problem.');
      return;
    }

    if (!latitude || !longitude) {
      setFormError('Please select a valid location on the map.');
      return;
    }

    // Nearby Duplicate Detection Check
    if (!bypassDuplicateCheck && !hasAcknowledgedDuplicates) {
      setIsCheckingDuplicates(true);
      const { data: duplicates } = await complaintsService.checkNearbyComplaints(
        latitude,
        longitude,
        category,
        100 // 100 meters radius
      );
      setIsCheckingDuplicates(false);

      if (duplicates && duplicates.length > 0) {
        setNearbyDuplicates(duplicates);
        nativeService.triggerHaptic('warning');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Submit Complaint
    setIsSubmitting(true);
    nativeService.triggerHaptic('medium');

    try {
      let photoUrl: string | null = null;

      if (selectedFile) {
        const { url, error: uploadError } = await storageService.uploadComplaintImage(
          selectedFile,
          user.id
        );

        if (uploadError || !url) {
          setIsSubmitting(false);
          setFormError(
            'Failed to upload image. Please verify your internet connection or try again without a photo.'
          );
          toastError('Photo upload failed.');
          return;
        }

        photoUrl = url;
      }

      const { data: newComplaint, error: createError } = await complaintsService.createComplaint({
        userId: user.id,
        category,
        description: trimmedDesc,
        latitude,
        longitude,
        address: address || `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        photoUrl: photoUrl || undefined,
      });

      setIsSubmitting(false);

      if (createError || !newComplaint) {
        setFormError(createError?.message || 'Failed to submit complaint. Please try again.');
        toastError('Failed to submit complaint.');
        return;
      }

      nativeService.triggerHaptic('success');
      success('Grievance registered successfully!');
      setSubmittedComplaint(newComplaint);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || 'An unexpected error occurred while submitting.');
      toastError('Submission failed.');
    }
  };

  const handleResetForm = () => {
    setDescription('');
    handleRemovePhoto();
    setNearbyDuplicates([]);
    setHasAcknowledgedDuplicates(false);
    setSubmittedComplaint(null);
    setUpvoteSuccessMessage(null);
    setFormError(null);
    setLocationError(null);
    setAiAssessment(null);
  };

  const handleCopySubmittedId = () => {
    if (!submittedComplaint) return;
    navigator.clipboard.writeText(submittedComplaint.id);
    setCopiedId(true);
    nativeService.triggerHaptic('light');
    info('Tracking ID copied');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ============================================================================
  // SUCCESS SCREEN
  // ============================================================================
  if (submittedComplaint) {
    const categoryInfo = COMPLAINT_CATEGORIES.find((c) => c.value === submittedComplaint.category);

    return (
      <div className="max-w-2xl mx-auto py-4 sm:py-6 px-2 sm:px-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Success Banner */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-6 sm:p-8 text-white text-center space-y-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-white/30">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Grievance Submitted</h1>
            <p className="text-emerald-100 text-xs sm:text-sm max-w-md mx-auto">
              Your civic report has been securely registered in the municipal database and assigned for review.
            </p>
          </div>

          {/* Details Overview */}
          <div className="p-5 sm:p-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Tracking ID
                </span>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-mono font-bold text-slate-800 truncate">
                    {submittedComplaint.id}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopySubmittedId}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                    title="Copy tracking ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Current Status
                </span>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-xl text-xs font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                    Reported
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Category
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  {categoryInfo?.label || submittedComplaint.category}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Registered Address
                </span>
                <p className="text-xs font-medium text-slate-700 leading-relaxed line-clamp-2">
                  {submittedComplaint.address || 'GPS Coordinates Recorded'}
                </p>
              </div>
            </div>

            {submittedComplaint.photo_url && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700">Uploaded Evidence Photo</span>
                <div className="w-full h-40 sm:h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={submittedComplaint.photo_url}
                    alt="Submitted complaint issue evidence"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
              <Link
                to={`/complaints/${submittedComplaint.id}`}
                onClick={() => nativeService.triggerHaptic('light')}
                className="w-full sm:flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm transition text-center flex items-center justify-center gap-2 active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>View Details & Timeline</span>
              </Link>
              <Link
                to="/complaints"
                onClick={() => nativeService.triggerHaptic('light')}
                className="w-full sm:flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-2xl transition text-center active:scale-95"
              >
                My Complaints
              </Link>
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto py-3 px-4 text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-bold rounded-2xl hover:bg-blue-50 transition text-center active:scale-95 cursor-pointer"
              >
                Report Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // UPVOTE SUCCESS SCREEN
  // ============================================================================
  if (upvoteSuccessMessage) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4 animate-in fade-in">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-3xl flex items-center justify-center mx-auto">
            <ThumbsUp className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Community Support Recorded</h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {upvoteSuccessMessage}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link
              to="/complaints"
              onClick={() => nativeService.triggerHaptic('light')}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm transition active:scale-95"
            >
              Browse Complaints
            </Link>
            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-2xl transition active:scale-95 cursor-pointer"
            >
              Report a Different Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN REPORT FORM
  // ============================================================================
  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5" />
          Civic Grievance Filing
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Report a Civic Grievance
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
          Provide issue details, pin the exact coordinates on the map, and attach photographic evidence for swift municipal action.
        </p>
      </div>

      {/* Top Form Error Alert */}
      {formError && (
        <div 
          role="alert" 
          className="p-4 bg-rose-50 border border-rose-200 rounded-3xl text-xs sm:text-sm text-rose-800 flex items-start gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{formError}</div>
        </div>
      )}

      {/* NEARBY DUPLICATE DETECTION WARNING */}
      {nearbyDuplicates.length > 0 && !hasAcknowledgedDuplicates && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 sm:p-6 space-y-4 animate-in fade-in shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-amber-900">Possible Existing Issue Nearby</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                We found <strong>{nearbyDuplicates.length}</strong> unresolved complaint(s) of the same category within 100 meters. You can upvote an existing report to boost its priority or continue filing.
              </p>
            </div>
          </div>

          {/* List of nearby matching complaints */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {nearbyDuplicates.map((dup) => (
              <div 
                key={dup.id} 
                className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
                      {dup.category}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500" /> ~{dup.distance_meters}m away
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed font-medium">
                    "{dup.description}"
                  </p>

                  {dup.photo_url && (
                    <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-100">
                      <img src={dup.photo_url} alt="Existing complaint" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span className="capitalize">Status: <strong>{dup.status.replace('_', ' ')}</strong></span>
                    <span>{dup.upvote_count} Upvote(s)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleUpvoteExisting(dup.id)}
                  disabled={isUpvoting === dup.id}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                >
                  {isUpvoting === dup.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ThumbsUp className="w-3.5 h-3.5" />
                  )}
                  <span>Upvote This Existing Issue</span>
                </button>
              </div>
            ))}
          </div>

          {/* Choice footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-amber-200/80">
            <span className="text-xs text-amber-800 font-medium">
              Is your grievance distinct from the listed issues?
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setHasAcknowledgedDuplicates(true);
                  handleSubmit(undefined, true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs active:scale-95 cursor-pointer"
              >
                Report Anyway
              </button>
              <button
                type="button"
                onClick={() => setNearbyDuplicates([])}
                className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition active:scale-95 cursor-pointer"
              >
                Adjust Location Pin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* ============================================================== */}
          {/* LEFT COLUMN: Issue Category, Description, Photo Evidence       */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6">
            <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                Issue Details & Photos
              </h2>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="report-category" 
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="report-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as ComplaintCategory);
                    setHasAcknowledgedDuplicates(false);
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition cursor-pointer"
                >
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  {COMPLAINT_CATEGORIES.find((c) => c.value === category)?.description}
                </p>
              </div>

              {/* Description Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label 
                    htmlFor="report-description" 
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[11px] ${
                    description.trim().length >= 10 ? 'text-emerald-600 font-bold' : 'text-slate-400'
                  }`}>
                    {description.trim().length}/10 min chars
                  </span>
                </div>
                <textarea
                  id="report-description"
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue, landmarks, hazard level, or relevant details for municipal workers..."
                  className="w-full p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition resize-none leading-relaxed"
                />
              </div>

              {/* AI Smart Assistant Assessment Pill */}
              {description.trim().length >= 10 && (
                <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-blue-900">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      AI Grievance Assistant
                    </span>
                    {isAiAnalyzing ? (
                      <span className="text-[11px] text-blue-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
                      </span>
                    ) : aiAssessment ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        aiAssessment.severity === 'urgent'
                          ? 'bg-rose-100 text-rose-800'
                          : aiAssessment.severity === 'high'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        Priority: {aiAssessment.severity}
                      </span>
                    ) : null}
                  </div>

                  {aiAssessment && (
                    <div className="text-xs text-slate-700 space-y-1.5">
                      {aiAssessment.suggestedCategory !== category && (
                        <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-blue-200">
                          <span className="text-[11px] text-slate-600">
                            Suggested category: <strong>{COMPLAINT_CATEGORIES.find(c => c.value === aiAssessment.suggestedCategory)?.label}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={handleApplyAiCategory}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold active:scale-95 transition"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                      {aiAssessment.safetyAdvisory && (
                        <p className="text-[11px] text-blue-800 italic">
                          💡 {aiAssessment.safetyAdvisory}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Photo Upload (Native Camera / Gallery Picker) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Photo Evidence <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>

                {imageError && (
                  <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {imageError}
                  </p>
                )}

                {previewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group">
                    <img
                      src={previewUrl}
                      alt="Selected issue preview"
                      className="w-full h-44 sm:h-52 object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        Remove Photo
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute top-2 right-2 p-1.5 bg-slate-900/70 text-white rounded-full hover:bg-rose-600 transition"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Camera Button */}
                    <button
                      type="button"
                      onClick={handleNativeCamera}
                      className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/40 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 active:scale-95"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Take Photo</span>
                      <span className="text-[10px] text-slate-400">Camera / Gallery</span>
                    </button>

                    {/* File Upload Button */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/40 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 active:scale-95"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Browse Files</span>
                      <span className="text-[10px] text-slate-400">JPEG, PNG, WebP</span>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: Location Map & Coordinates                       */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6">
            <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  Location & Map Pin
                </h2>

                {/* GPS Trigger Button */}
                <button
                  type="button"
                  onClick={handleGetGPSLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isLocating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
                </button>
              </div>

              {/* Location Error / Fallback alert */}
              {locationError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{locationError}</span>
                </div>
              )}

              {/* Interactive Leaflet Location Map */}
              <div className="space-y-2">
                <LocationPickerMap
                  latitude={latitude}
                  longitude={longitude}
                  onLocationChange={handleLocationChange}
                  className="h-56 sm:h-72"
                />
              </div>

              {/* Reverse Geocoded Address Readout */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Estimated Street Address
                  </span>
                  {isGeocoding && (
                    <span className="text-blue-600 flex items-center gap-1 normal-case text-xs">
                      <Loader2 className="w-3 h-3 animate-spin" /> Resolving...
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-800 leading-relaxed">
                  {address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
                </p>
                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono pt-0.5">
                  <span>Lat: {latitude.toFixed(5)}</span>
                  <span>Lng: {longitude.toFixed(5)}</span>
                </div>
              </div>

              {/* Submit Button Section */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isCheckingDuplicates}
                  className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md shadow-blue-500/20 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting || isCheckingDuplicates ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {isCheckingDuplicates ? 'Scanning Nearby Issues...' : 'Submitting Grievance...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Submit Grievance Report</span>
                      <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Live Camera Modal for Web & Native */}
      <LiveCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleLiveCameraCapture}
        onBrowseFiles={() => fileInputRef.current?.click()}
        title="Capture Issue Evidence"
      />
    </div>
  );
};

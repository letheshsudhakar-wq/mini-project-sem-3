import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Maximize2,
  Loader2,
  Lock,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { complaintsService } from '../services/complaints';
import { StatusBadge } from '../components/StatusBadge';
import { StatusTimeline } from '../components/StatusTimeline';
import { UpvoteButton } from '../components/UpvoteButton';
import { ImageModal } from '../components/ImageModal';
import { EditComplaintModal } from '../components/EditComplaintModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { CivicPriorityScore } from '../components/CivicPriorityScore';
import { COMPLAINT_CATEGORIES } from '../utils/constants';
import { useToast } from '../contexts/ToastContext';
import { nativeService } from '../services/nativeService';
import type { Complaint, ComplaintUpdate } from '../types';

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [updates, setUpdates] = useState<ComplaintUpdate[]>([]);
  const [similarReportCount, setSimilarReportCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Modals
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resolutionFeedback, setResolutionFeedback] = useState('');
  const [isSubmittingResolutionFeedback, setIsSubmittingResolutionFeedback] = useState(false);
  const [resolutionFeedbackError, setResolutionFeedbackError] = useState<string | null>(null);

  const fetchComplaintDetails = async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data: comp, error: compError } = await complaintsService.getComplaintById(id);
      if (compError || !comp) {
        setErrorMsg('Complaint not found or you do not have permission to view it.');
        setIsLoading(false);
        return;
      }

      setComplaint(comp);

      const { data: similarCounts } = await complaintsService.getSimilarComplaintCounts([comp]);
      setSimilarReportCount(similarCounts?.[comp.id] ?? null);

      // Fetch audit timeline updates
      const { data: updateList } = await complaintsService.getComplaintUpdates(id);
      setUpdates(updateList || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error loading complaint details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [id]);

  const handleCopyTrackingId = () => {
    if (!complaint) return;
    navigator.clipboard.writeText(complaint.id);
    setCopied(true);
    nativeService.triggerHaptic('light');
    info('Tracking ID copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDeleteComplaint = async () => {
    if (!complaint || !user) return;
    setIsDeleting(true);

    try {
      const { error: delError } = await complaintsService.deleteComplaint(complaint.id, user.id);
      setIsDeleting(false);

      if (delError) {
        error(`Failed to delete complaint: ${delError.message}`);
      } else {
        nativeService.triggerHaptic('success');
        success('Complaint successfully deleted.');
        navigate('/complaints', { replace: true });
      }
    } catch (err: any) {
      setIsDeleting(false);
      error(err?.message || 'Failed to delete complaint.');
    }
  };

  const handleComplaintUpdated = (updated: Complaint) => {
    setComplaint(updated);
    fetchComplaintDetails();
    success('Complaint updated successfully.');
  };

  const handleResolutionFeedback = async (resolved: boolean) => {
    if (!complaint || !user) return;
    setIsSubmittingResolutionFeedback(true);
    setResolutionFeedbackError(null);
    const { data, error } = await complaintsService.submitResolutionFeedback(
      complaint.id,
      user.id,
      resolved,
      resolutionFeedback,
    );
    setIsSubmittingResolutionFeedback(false);
    if (error || !data) {
      setResolutionFeedbackError(error?.message || 'Unable to submit your resolution feedback.');
      return;
    }
    setComplaint(data);
    setResolutionFeedback('');
    await fetchComplaintDetails();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading grievance details & timeline...</p>
      </div>
    );
  }

  if (errorMsg || !complaint) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Unable to Load Complaint</h2>
        <p className="text-xs text-slate-500">{errorMsg || 'The requested complaint does not exist.'}</p>
        <Link
          to="/complaints"
          onClick={() => nativeService.triggerHaptic('light')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Complaints
        </Link>
      </div>
    );
  }

  const categoryInfo = COMPLAINT_CATEGORIES.find((c) => c.value === complaint.category);
  const isOwner = user?.id === complaint.user_id;
  const isEditable = isOwner && complaint.status === 'reported' && complaint.resolution_confirmation_status !== 'disputed';

  // Status banner configuration
  const getStatusBannerConfig = () => {
    switch (complaint.status) {
      case 'reported':
        return {
          title: complaint.resolution_confirmation_status === 'disputed' ? 'Resolution disputed' : 'Reported & Pending Review',
          description: complaint.resolution_confirmation_status === 'disputed'
            ? 'You reported that the issue still exists. The government team has been notified and the complaint is reopened.'
            : 'Your grievance report has been registered and is pending municipal review and assignment.',
          bg: complaint.resolution_confirmation_status === 'disputed'
            ? 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-300'
            : 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-300',
          textColor: complaint.resolution_confirmation_status === 'disputed' ? 'text-rose-900' : 'text-amber-900',
          icon: complaint.resolution_confirmation_status === 'disputed'
            ? <AlertCircle className="w-5 h-5 text-rose-600" />
            : <Clock className="w-5 h-5 text-amber-600" />,
        };
      case 'in_progress':
        return {
          title: 'Resolution In Progress',
          description: 'A municipal maintenance unit has been assigned and is actively working on resolving this issue.',
          bg: 'bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-blue-300',
          textColor: 'text-blue-900',
          icon: <Clock className="w-5 h-5 text-blue-600" />,
        };
      case 'resolved':
        return {
          title: 'Resolution Marked Complete',
          description: 'A municipal official marked this issue as resolved. Review the resolution record and confirm whether it is fixed.',
          bg: 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-300',
          textColor: 'text-emerald-900',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        };
      case 'rejected':
        return {
          title: 'Report Rejected',
          description: 'This complaint was reviewed and closed without action (e.g. duplicate or private property).',
          bg: 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-300',
          textColor: 'text-rose-900',
          icon: <XCircle className="w-5 h-5 text-rose-600" />,
        };
    }
  };

  const statusBanner = getStatusBannerConfig();

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-8 animate-in fade-in duration-200">
      {/* Top Navigation & Action Row */}
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/complaints"
          onClick={() => nativeService.triggerHaptic('light')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>

        {/* Citizen Action Controls (Edit / Delete) */}
        {isOwner && (
          <div className="flex items-center gap-2">
            {isEditable ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    nativeService.triggerHaptic('light');
                    setIsEditModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    nativeService.triggerHaptic('warning');
                    setIsDeleteModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
                <Lock className="w-3 h-3" />
                Locked (Under Processing)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Prominent Current Status Banner */}
      <div className={`p-4 sm:p-5 rounded-3xl border-2 ${statusBanner.bg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs`}>
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="p-2.5 bg-white rounded-2xl shadow-2xs shrink-0 mt-0.5 sm:mt-0">
            {statusBanner.icon}
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Current Status
              </span>
              <StatusBadge
                status={complaint.status}
                size="sm"
                labelOverride={complaint.resolution_confirmation_status === 'disputed' ? 'Resolution disputed' : undefined}
              />
            </div>
            <h2 className={`text-base sm:text-lg font-extrabold ${statusBanner.textColor}`}>
              {statusBanner.title}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              {statusBanner.description}
            </p>
          </div>
        </div>

        {/* Upvote Button */}
        <div className="w-full sm:w-auto shrink-0">
          <UpvoteButton
            complaintId={complaint.id}
            initialUpvoteCount={complaint.upvote_count}
            onUpvoteChange={(newCount) => {
              setComplaint({ ...complaint, upvote_count: newCount });
            }}
            className="w-full sm:w-auto justify-center"
          />
        </div>
      </div>

      {complaint.status === 'resolved' && isOwner && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-4" aria-live="polite">
          <div>
            <h2 className="text-sm font-bold text-emerald-950">Your complaint has been marked as resolved.</h2>
            <p className="mt-1 text-xs text-emerald-900/80">
              {complaint.resolution_confirmation_status === 'confirmed'
                ? 'You confirmed that the issue is resolved.'
                : complaint.resolution_confirmation_status === 'disputed'
                  ? 'You reported that the issue still exists. It has been reopened for government review.'
                  : 'Please confirm whether the issue has actually been fixed.'}
            </p>
          </div>
          {complaint.resolution_confirmation_status === 'pending' || !complaint.resolution_confirmation_status ? (
            isOwner && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="resolution-feedback">
                  Feedback for the government team <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="resolution-feedback"
                  rows={2}
                  maxLength={1000}
                  value={resolutionFeedback}
                  onChange={(event) => setResolutionFeedback(event.target.value)}
                  placeholder="Add details if the issue still exists"
                  className="w-full rounded-xl border border-emerald-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {resolutionFeedbackError && <p role="alert" className="text-xs text-rose-700">{resolutionFeedbackError}</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isSubmittingResolutionFeedback}
                    onClick={() => handleResolutionFeedback(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Issue is resolved
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingResolutionFeedback}
                    onClick={() => handleResolutionFeedback(false)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <AlertCircle className="h-4 w-4" /> Issue still exists
                  </button>
                </div>
              </div>
            )
          ) : (
            <p className="text-xs font-semibold text-emerald-900">
              {complaint.resolution_confirmation_status === 'confirmed' ? 'Confirmation recorded.' : 'Your dispute has been sent to the government team.'}
            </p>
          )}
        </section>
      )}

      {(complaint.resolved_at || complaint.resolution_photo_url || complaint.resolution_note) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">Government resolution record</h2>
            <span className="text-[11px] text-slate-500">
              {complaint.resolved_at ? new Date(complaint.resolved_at).toLocaleString() : ''}
            </span>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <p><span className="font-semibold text-slate-500">Department:</span> {complaint.resolution_department || 'Not recorded'}</p>
            <p><span className="font-semibold text-slate-500">Officer:</span> {complaint.resolution_officer_name || 'Not recorded'}</p>
          </div>
          {complaint.resolution_note && <p className="text-xs leading-relaxed text-slate-700">{complaint.resolution_note}</p>}
          {complaint.resolution_photo_url && (
            <button type="button" onClick={() => setSelectedPhoto(complaint.resolution_photo_url)} className="block h-40 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:w-72">
              <img src={complaint.resolution_photo_url} alt="Government resolution evidence" className="h-full w-full object-cover" />
            </button>
          )}
        </section>
      )}

      <CivicPriorityScore complaint={complaint} similarReportCount={similarReportCount} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: Complaint Details & Photo */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
                {categoryInfo?.label || complaint.category}
              </span>
              
              <button
                type="button"
                onClick={handleCopyTrackingId}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-2.5 py-1 rounded-xl transition cursor-pointer"
                title="Click to copy full ID"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                <span>ID: {complaint.id.slice(0, 8)}...</span>
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Grievance Description
              </h3>
              <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-line font-medium">
                {complaint.description}
              </p>
            </div>

            {/* Photo Evidence */}
            {complaint.photo_url && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Photo Evidence
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(complaint.photo_url)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    Enlarge
                  </button>
                </div>
                <div 
                  onClick={() => setSelectedPhoto(complaint.photo_url)}
                  className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-44 sm:h-52 cursor-pointer group"
                >
                  <img
                    src={complaint.photo_url}
                    alt="Citizen evidence"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                    <span className="px-3 py-1.5 bg-black/60 rounded-xl text-xs font-semibold backdrop-blur flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5" /> Tap to enlarge
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Location & Metadata */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Location Address
                </span>
                <p className="font-bold text-slate-800 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{complaint.address || 'GPS Coordinates Logged'}</span>
                </p>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Timeline
                </span>
                <p className="text-slate-700 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Filed: {new Date(complaint.created_at).toLocaleDateString()}
                </p>
                <p className="text-slate-500 text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Updated: {new Date(complaint.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Status Timeline & Audit Trail */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Resolution Timeline
              </h3>
              <span className="text-[11px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                {updates.length + 1} Event(s)
              </span>
            </div>

            <StatusTimeline
              complaint={complaint}
              updates={updates}
            />
          </div>
        </div>
      </div>

      {/* Lightbox photo viewer */}
      <ImageModal
        imageUrl={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditComplaintModal
          isOpen={isEditModalOpen}
          complaint={complaint}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={handleComplaintUpdated}
        />
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          isDeleting={isDeleting}
          complaintTitle={`"${complaint.description.slice(0, 30)}..."`}
          onConfirm={handleDeleteComplaint}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}
    </div>
  );
};

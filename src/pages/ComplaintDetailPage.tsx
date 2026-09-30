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
  Lock
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { complaintsService } from '../services/complaints';
import { StatusBadge } from '../components/StatusBadge';
import { StatusTimeline } from '../components/StatusTimeline';
import { UpvoteButton } from '../components/UpvoteButton';
import { ImageModal } from '../components/ImageModal';
import { EditComplaintModal } from '../components/EditComplaintModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { COMPLAINT_CATEGORIES } from '../utils/constants';
import type { Complaint, ComplaintUpdate } from '../types';

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [updates, setUpdates] = useState<ComplaintUpdate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteComplaint = async () => {
    if (!complaint || !user) return;
    setIsDeleting(true);

    try {
      const { error } = await complaintsService.deleteComplaint(complaint.id, user.id);
      setIsDeleting(false);

      if (error) {
        alert(`Failed to delete complaint: ${error.message}`);
      } else {
        navigate('/complaints', { replace: true });
      }
    } catch (err: any) {
      setIsDeleting(false);
      alert(err?.message || 'Failed to delete complaint.');
    }
  };

  const handleComplaintUpdated = (updated: Complaint) => {
    setComplaint(updated);
    fetchComplaintDetails();
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
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Unable to Load Complaint</h2>
        <p className="text-xs text-slate-500">{errorMsg || 'The requested complaint does not exist.'}</p>
        <Link
          to="/complaints"
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
  const isEditable = isOwner && complaint.status === 'reported';

  // Status banner configuration
  const getStatusBannerConfig = () => {
    switch (complaint.status) {
      case 'reported':
        return {
          title: 'Reported & Pending Review',
          description: 'Your grievance report has been registered and is pending municipal review and assignment.',
          bg: 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-300',
          textColor: 'text-amber-900',
          icon: <Clock className="w-5 h-5 text-amber-600" />,
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
          title: 'Grievance Resolved',
          description: 'This civic issue has been officially resolved and verified by municipal administrators.',
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Complaints
        </Link>

        {/* Citizen Action Controls (Edit / Delete) */}
        {isOwner && (
          <div className="flex items-center gap-2">
            {isEditable ? (
              <>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Edit Report</span>
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                <Lock className="w-3 h-3" />
                Locked (Under Processing)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Prominent Current Status Banner */}
      <div className={`p-5 rounded-3xl border-2 ${statusBanner.bg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs`}>
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-white rounded-2xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
            {statusBanner.icon}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Current Status
              </span>
              <StatusBadge status={complaint.status} size="sm" />
            </div>
            <h2 className={`text-base sm:text-lg font-bold ${statusBanner.textColor}`}>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Complaint Details & Photo */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                {categoryInfo?.label || complaint.category}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                ID: {complaint.id.slice(0, 8)}...
              </span>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Grievance Description
              </h3>
              <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-line font-normal">
                {complaint.description}
              </p>
            </div>

            {/* Photo Evidence */}
            {complaint.photo_url && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Citizen Photo Evidence
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(complaint.photo_url)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Maximize2 className="w-3 h-3" />
                    Enlarge Photo
                  </button>
                </div>
                <div 
                  onClick={() => setSelectedPhoto(complaint.photo_url)}
                  className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-56 sm:h-64 cursor-pointer group"
                >
                  <img
                    src={complaint.photo_url}
                    alt="Citizen evidence"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                    <span className="px-3 py-1.5 bg-black/60 rounded-xl text-xs font-semibold backdrop-blur flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5" /> Click to enlarge
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Location & Metadata */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Location Address
                </span>
                <p className="font-semibold text-slate-800 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{complaint.address || 'GPS Coordinates Logged'}</span>
                </p>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Timeline Dates
                </span>
                <p className="text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Created: {new Date(complaint.created_at).toLocaleDateString()}
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
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Resolution Timeline
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">
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

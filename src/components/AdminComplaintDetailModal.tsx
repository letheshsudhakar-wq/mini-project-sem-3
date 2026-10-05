import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Maximize2, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { StatusTimeline } from './StatusTimeline';
import { ImageModal } from './ImageModal';
import { CivicPriorityScore } from './CivicPriorityScore';
import { COMPLAINT_CATEGORIES, GOVERNMENT_DEPARTMENTS } from '../utils/constants';
import { complaintsService } from '../services/complaints';
import { useAuth } from '../hooks/useAuth';
import type { Complaint, ComplaintPriority, ComplaintUpdate, Profile } from '../types';

interface AdminComplaintDetailModalProps {
  isOpen: boolean;
  complaint: Complaint | null;
  similarReportCount?: number | null;
  onClose: () => void;
  onComplaintUpdated: (updatedComplaint: Complaint) => void;
  onOpenStatusUpdateModal: (complaint: Complaint) => void;
}

export const AdminComplaintDetailModal: React.FC<AdminComplaintDetailModalProps> = ({
  isOpen,
  complaint,
  similarReportCount,
  onClose,
  onComplaintUpdated,
  onOpenStatusUpdateModal,
}) => {
  const [updates, setUpdates] = useState<ComplaintUpdate[]>([]);
  const [isLoadingUpdates, setIsLoadingUpdates] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [officers, setOfficers] = useState<Profile[]>([]);
  const [department, setDepartment] = useState('');
  const [assignedOfficerId, setAssignedOfficerId] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('normal');
  const [slaDeadline, setSlaDeadline] = useState('');
  const [officialNote, setOfficialNote] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSaved, setAssignmentSaved] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && complaint) {
      document.body.style.overflow = 'hidden';
      setIsLoadingUpdates(true);
      setDepartment(complaint.department || '');
      setAssignedOfficerId(complaint.assigned_officer_id || '');
      setPriority(complaint.priority || 'normal');
      setSlaDeadline(complaint.sla_deadline ? toLocalDateTime(complaint.sla_deadline) : '');
      setOfficialNote('');
      setAssignmentError(null);
      setAssignmentSaved(false);
      complaintsService.getComplaintUpdates(complaint.id).then(({ data }) => {
        setUpdates(data || []);
        setIsLoadingUpdates(false);
      });
      complaintsService.getAdminOfficers().then(({ data }) => setOfficers(data));
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, complaint]);

  if (!isOpen || !complaint) return null;

  const categoryInfo = COMPLAINT_CATEGORIES.find((c) => c.value === complaint.category);
  const authorName = (complaint as any).profile?.name || 'Citizen User';

  const saveAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setIsSavingAssignment(true);
    setAssignmentError(null);
    setAssignmentSaved(false);
    const { data, error } = await complaintsService.updateAdminAssignment({
      complaintId: complaint.id,
      department: department || null,
      assignedOfficerId: assignedOfficerId || null,
      priority,
      slaDeadline: slaDeadline ? new Date(slaDeadline).toISOString() : null,
      status: complaint.status,
      note: officialNote.trim() || undefined,
      updatedBy: user.id,
    });
    setIsSavingAssignment(false);
    if (error || !data) {
      setAssignmentError(error?.message || 'Unable to save complaint assignment.');
      return;
    }
    setAssignmentSaved(true);
    setOfficialNote('');
    onComplaintUpdated(data);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative max-w-3xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 my-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              {categoryInfo?.label || complaint.category}
            </span>
            <StatusBadge
              status={complaint.status}
              size="sm"
              labelOverride={complaint.resolution_confirmation_status === 'disputed' ? 'Resolution disputed' : undefined}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenStatusUpdateModal(complaint);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Update Status</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Complaint ID</span>
              <p className="font-mono font-bold text-slate-800 break-all">{complaint.id}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Citizen Author</span>
              <p className="font-semibold text-slate-800 truncate">{authorName}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Priority</span>
              <p className="font-bold text-slate-800 flex items-center gap-1 capitalize">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                {priority} priority
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Reported Date</span>
              <p className="font-semibold text-slate-800">{new Date(complaint.created_at).toLocaleString()}</p>
            </div>
          </div>

          <CivicPriorityScore complaint={complaint} similarReportCount={similarReportCount} />

          <form onSubmit={saveAssignment} className="space-y-4 p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Department Assignment & SLA</h3>
              {assignmentSaved && <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Saved</span>}
            </div>
            {assignmentError && <p role="alert" className="text-xs text-rose-700 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{assignmentError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-[10px] uppercase font-bold text-slate-500">
                Department
                <select value={department} onChange={(event) => setDepartment(event.target.value)} className="w-full mt-1 px-3 py-2 text-xs normal-case font-medium text-slate-800 bg-white border border-slate-200 rounded-lg">
                  <option value="">Unassigned</option>
                  {GOVERNMENT_DEPARTMENTS.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-[10px] uppercase font-bold text-slate-500">
                Assigned Officer
                <select value={assignedOfficerId} onChange={(event) => setAssignedOfficerId(event.target.value)} className="w-full mt-1 px-3 py-2 text-xs normal-case font-medium text-slate-800 bg-white border border-slate-200 rounded-lg">
                  <option value="">Unassigned</option>
                  {officers.map((officer) => <option key={officer.id} value={officer.id}>{officer.name}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-[10px] uppercase font-bold text-slate-500">
                Priority
                <select value={priority} onChange={(event) => setPriority(event.target.value as ComplaintPriority)} className="w-full mt-1 px-3 py-2 text-xs normal-case font-medium text-slate-800 bg-white border border-slate-200 rounded-lg">
                  <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
              </label>
              <label className="space-y-1 text-[10px] uppercase font-bold text-slate-500">
                SLA Deadline
                <input type="datetime-local" value={slaDeadline} onChange={(event) => setSlaDeadline(event.target.value)} className="w-full mt-1 px-3 py-2 text-xs normal-case font-medium text-slate-800 bg-white border border-slate-200 rounded-lg" />
              </label>
            </div>
            <label className="block space-y-1 text-[10px] uppercase font-bold text-slate-500">
              Official Note
              <textarea value={officialNote} onChange={(event) => setOfficialNote(event.target.value)} rows={2} placeholder="Add an internal assignment or progress note" className="w-full mt-1 p-3 text-xs normal-case font-medium text-slate-800 bg-white border border-slate-200 rounded-lg resize-y" />
            </label>
            <div className="flex justify-end">
              <button type="submit" disabled={isSavingAssignment} className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold">
                {isSavingAssignment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Assignment
              </button>
            </div>
          </form>

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</span>
            <p className="text-sm text-slate-900 bg-slate-50 p-4 rounded-2xl border border-slate-200 leading-relaxed whitespace-pre-line">
              {complaint.description}
            </p>
          </div>

          {(complaint.resolved_at || complaint.resolution_note || complaint.resolution_confirmation_status) && (
            <section className={`space-y-3 rounded-2xl border p-4 ${complaint.resolution_confirmation_status === 'disputed' ? 'border-rose-200 bg-rose-50/60' : 'border-emerald-200 bg-emerald-50/40'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Resolution verification</h3>
                <span className="text-[11px] font-semibold text-slate-600">
                  {complaint.resolution_confirmation_status === 'disputed'
                    ? 'Resolution disputed'
                    : complaint.resolution_confirmation_status === 'confirmed'
                      ? 'Citizen confirmed'
                      : complaint.resolution_confirmation_status === 'pending'
                        ? 'Awaiting citizen confirmation'
                        : 'No citizen response recorded'}
                </span>
              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <p><span className="font-semibold text-slate-500">Resolved:</span> {complaint.resolved_at ? new Date(complaint.resolved_at).toLocaleString() : 'Not recorded'}</p>
                <p><span className="font-semibold text-slate-500">Resolving department:</span> {complaint.resolution_department || 'Not recorded'}</p>
                <p><span className="font-semibold text-slate-500">Officer:</span> {complaint.resolution_officer_name || 'Not recorded'}</p>
              </div>
              {complaint.resolution_note && <p className="text-xs leading-relaxed text-slate-700">Official note: {complaint.resolution_note}</p>}
              {complaint.resolution_feedback && (
                <p className="rounded-xl border border-rose-200 bg-white p-3 text-xs text-rose-900">
                  Citizen feedback{complaint.resolution_feedback_at ? ` · ${new Date(complaint.resolution_feedback_at).toLocaleString()}` : ''}: {complaint.resolution_feedback}
                </p>
              )}
              {complaint.resolution_photo_url && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Resolution evidence</span>
                  <button type="button" onClick={() => setSelectedPhoto(complaint.resolution_photo_url)} className="h-32 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:w-1/2">
                    <img src={complaint.resolution_photo_url} alt="Resolution evidence" className="w-full h-full object-cover" />
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Location & Citizen Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Logged Address & Coordinates
              </span>
              <p className="font-semibold text-slate-800 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{complaint.address || 'GPS Coordinates Logged'}</span>
              </p>
              <span className="text-[10px] text-slate-400 font-mono block">
                Lat: {complaint.latitude.toFixed(5)}, Lng: {complaint.longitude.toFixed(5)}
              </span>
            </div>

            {complaint.photo_url ? (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Citizen Photo Evidence
                </span>
                <div 
                  onClick={() => setSelectedPhoto(complaint.photo_url)}
                  className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-28 cursor-pointer group"
                >
                  <img src={complaint.photo_url} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center flex items-center justify-center text-xs text-slate-400">
                No citizen photo attached
              </div>
            )}
          </div>

          {/* Chronological Audit Timeline */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Complete Resolution & Audit History
            </h3>
            <StatusTimeline complaint={complaint} updates={updates} isLoading={isLoadingUpdates} />
          </div>
        </div>
      </div>

      <ImageModal imageUrl={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </div>
  );
};

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

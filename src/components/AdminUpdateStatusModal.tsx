import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Camera, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { compressImage } from '../utils/imageCompressor';
import { storageService } from '../services/storage';
import { complaintsService } from '../services/complaints';
import { nativeService } from '../services/nativeService';
import { useAuth } from '../hooks/useAuth';
import { GOVERNMENT_DEPARTMENTS } from '../utils/constants';
import type { Complaint, ComplaintStatus } from '../types';

interface AdminUpdateStatusModalProps {
  isOpen: boolean;
  complaint: Complaint;
  onClose: () => void;
  onUpdated: (updatedComplaint: Complaint) => void;
}

export const AdminUpdateStatusModal: React.FC<AdminUpdateStatusModalProps> = ({
  isOpen,
  complaint,
  onClose,
  onUpdated,
}) => {
  const { user, profile } = useAuth();

  const [newStatus, setNewStatus] = useState<ComplaintStatus>(complaint.status);
  const [note, setNote] = useState<string>('');
  const [resolutionDepartment, setResolutionDepartment] = useState('');
  const [resolutionPhotoFile, setResolutionPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Status & Confirmation States
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewStatus(complaint.status);
      setNote('');
      setResolutionDepartment(profile?.department || complaint.department || '');
      setResolutionPhotoFile(null);
      setPhotoPreview(null);
      setStep('form');
      setErrorMsg(null);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, complaint, profile?.department]);

  const handleNativeCamera = async () => {
    nativeService.triggerHaptic('light');
    if (nativeService.isNative()) {
      const result = await nativeService.capturePhoto();
      if (result.file && result.dataUrl) {
        setResolutionPhotoFile(result.file);
        setPhotoPreview(result.dataUrl);
        setErrorMsg(null);
        return;
      }
    }
    fileInputRef.current?.click();
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid photo file (JPEG, PNG, WebP).');
      return;
    }

    try {
      const compressed = await compressImage(file);
      setResolutionPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
      nativeService.triggerHaptic('light');
    } catch {
      setErrorMsg('Failed to process image preview.');
    }
  };

  const handleRemovePhoto = () => {
    nativeService.triggerHaptic('light');
    setResolutionPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Prevent redundant submission with identical status and no note
    if (newStatus === complaint.status && !note.trim() && !resolutionPhotoFile) {
      setErrorMsg('Please select a different status or provide an official progress note.');
      return;
    }

    // Encourage notes when resolving or rejecting
    if ((newStatus === 'resolved' || newStatus === 'rejected') && !note.trim()) {
      setErrorMsg(`Please provide a brief official note explaining why this complaint is marked as ${newStatus}.`);
      return;
    }

    if (newStatus === 'resolved' && !resolutionDepartment.trim()) {
      setErrorMsg('Please select the department that completed this resolution.');
      return;
    }

    setStep('confirm');
  };

  const handleCommitStatusUpdate = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let resolutionPhotoUrl: string | undefined = undefined;

      // 1. Upload resolution proof photo to resolution-images bucket if attached
      if (resolutionPhotoFile) {
        const { url, error: uploadError } = await storageService.uploadResolutionImage(
          resolutionPhotoFile,
          user.id
        );

        if (uploadError || !url) {
          setIsSubmitting(false);
          setErrorMsg('Failed to upload resolution proof photo. Please try again.');
          return;
        }

        resolutionPhotoUrl = url;
      }

      // 2. Perform atomic status update & audit log record creation
      const { data: updated, error: updateError } = await complaintsService.adminUpdateComplaintStatus({
        complaintId: complaint.id,
        status: newStatus,
        note: note.trim() || undefined,
        photoUrl: resolutionPhotoUrl,
        resolutionDepartment: resolutionDepartment.trim() || null,
        updatedBy: user?.id || 'demo-admin-id',
      });

      setIsSubmitting(false);

      if (updateError || !updated) {
        setErrorMsg(updateError?.message || 'Failed to update complaint status.');
        return;
      }

      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Unexpected error updating status.');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
      onClick={() => !isSubmitting && onClose()}
    >
      <div 
        className="relative max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 my-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Update Resolution Status</h2>
              <p className="text-[11px] text-slate-400">Administrative workflow & audit logging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-4">
            {/* Current vs New Status */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select New Status <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'reported', label: 'Reported', color: 'border-amber-400 bg-amber-50 text-amber-900' },
                  { value: 'in_progress', label: 'In Progress', color: 'border-blue-400 bg-blue-50 text-blue-900' },
                  { value: 'resolved', label: 'Resolved', color: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
                  { value: 'rejected', label: 'Rejected', color: 'border-rose-400 bg-rose-50 text-rose-900' },
                ].map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setNewStatus(st.value as ComplaintStatus)}
                    className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      newStatus === st.value
                        ? `ring-2 ring-blue-600 border-transparent ${st.color} shadow-xs`
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{st.label}</span>
                    {newStatus === st.value && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>

            {newStatus === 'resolved' && (
              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Resolving Department <span className="text-rose-500">*</span>
                </span>
                <select
                  value={resolutionDepartment}
                  onChange={(event) => setResolutionDepartment(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Select department</option>
                  {Array.from(new Set([...GOVERNMENT_DEPARTMENTS, ...(complaint.department ? [complaint.department] : [])])).map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </label>
            )}

            {/* Official Update Note */}
            <div className="space-y-1.5">
              <label 
                htmlFor="admin-status-note" 
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Official Audit Note <span className="text-slate-400 font-normal lowercase">(visible in citizen timeline)</span>
              </label>
              <textarea
                id="admin-status-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Maintenance inspection completed; asphalt repair scheduled for tomorrow."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white resize-none leading-relaxed"
              />
            </div>

            {/* Resolution Proof Photo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Resolution Proof Photo <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-32">
                  <img src={photoPreview} alt="Resolution preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleNativeCamera}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3.5 text-center cursor-pointer bg-slate-50/50 flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-700">Attach resolution proof photo</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            {/* Next Action */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <span>Review & Confirm</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Confirmation / Preview Step */
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider block">
                Update Summary Preview
              </span>

              {/* Status Transition Row */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">CURRENT</span>
                  <StatusBadge status={complaint.status} size="sm" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">NEW</span>
                  <StatusBadge status={newStatus} size="sm" />
                </div>
              </div>

              {/* Note Preview */}
              {note.trim() ? (
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold mb-0.5">OFFICIAL NOTE</span>
                  <p className="text-slate-800 font-medium italic bg-white p-2.5 rounded-xl border border-slate-200">
                    "{note.trim()}"
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 italic">No custom update note attached.</p>
              )}

              {/* Photo Indicator */}
              {resolutionPhotoFile && (
                <div className="flex items-center gap-2 text-emerald-700 font-semibold pt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Resolution proof photo will be uploaded and archived.</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setStep('form')}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleCommitStatusUpdate}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Committing Update...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm Status Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileCheck,
  Maximize2
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ImageModal } from './ImageModal';
import type { Complaint, ComplaintUpdate } from '../types';

interface StatusTimelineProps {
  complaint: Complaint;
  updates: ComplaintUpdate[];
  isLoading?: boolean;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  complaint,
  updates,
  isLoading = false,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Format date helper
  const formatDateTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-8">
        {/* Step 1: Initial Submission Event */}
        <div className="relative group">
          {/* Timeline Dot Icon */}
          <div className="absolute -left-[31px] sm:-left-[39px] top-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 border-2 border-amber-500 text-amber-700 flex items-center justify-center shadow-xs">
            <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge status="reported" size="sm" />
                <span className="text-xs font-bold text-slate-800">Grievance Registered</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {formatDateTime(complaint.created_at)}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Complaint filed by citizen with location coordinates and preliminary description.
            </p>

            {complaint.photo_url && (
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Citizen Evidence Photo
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(complaint.photo_url)}
                  className="relative group/thumb w-24 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 block cursor-pointer"
                >
                  <img
                    src={complaint.photo_url}
                    alt="Citizen uploaded evidence"
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step 2..N: Subsequent Official Updates */}
        {updates.map((update, idx) => {
          const isResolved = update.status === 'resolved';
          const isRejected = update.status === 'rejected';
          const isCitizenFeedback = update.updater_profile?.role === 'citizen';

          const iconColor = isResolved
            ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
            : isRejected
            ? 'bg-rose-100 border-rose-500 text-rose-700'
            : isCitizenFeedback
            ? 'bg-rose-100 border-rose-500 text-rose-700'
            : 'bg-blue-100 border-blue-500 text-blue-700';

          return (
            <div key={update.id || idx} className="relative group">
              {/* Timeline Dot Icon */}
              <div className={`absolute -left-[31px] sm:-left-[39px] top-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 ${iconColor} flex items-center justify-center shadow-xs`}>
                {isResolved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : isRejected ? (
                  <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={update.status} size="sm" />
                    <span className="text-xs font-bold text-slate-800">
                      {isCitizenFeedback ? 'Citizen Resolution Feedback' : 'Official Status Update'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formatDateTime(update.created_at)}
                  </span>
                </div>

                {update.note ? (
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                    "{update.note}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Status changed to <strong className="capitalize">{update.status.replace('_', ' ')}</strong> by municipal authority.
                  </p>
                )}

                {update.photo_url && (
                  <div className="pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Municipal Resolution Proof Photo
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(update.photo_url)}
                      className="relative group/thumb w-24 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 block cursor-pointer"
                    >
                      <img
                        src={update.photo_url}
                        alt="Resolution proof"
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition">
                        <Maximize2 className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox photo viewer */}
      <ImageModal
        imageUrl={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
};

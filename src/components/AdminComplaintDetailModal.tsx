import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Maximize2, 
  ThumbsUp 
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { StatusTimeline } from './StatusTimeline';
import { ImageModal } from './ImageModal';
import { COMPLAINT_CATEGORIES } from '../utils/constants';
import { complaintsService } from '../services/complaints';
import type { Complaint, ComplaintUpdate } from '../types';

interface AdminComplaintDetailModalProps {
  isOpen: boolean;
  complaint: Complaint | null;
  onClose: () => void;
  onOpenStatusUpdateModal: (complaint: Complaint) => void;
}

export const AdminComplaintDetailModal: React.FC<AdminComplaintDetailModalProps> = ({
  isOpen,
  complaint,
  onClose,
  onOpenStatusUpdateModal,
}) => {
  const [updates, setUpdates] = useState<ComplaintUpdate[]>([]);
  const [isLoadingUpdates, setIsLoadingUpdates] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && complaint) {
      document.body.style.overflow = 'hidden';
      setIsLoadingUpdates(true);
      complaintsService.getComplaintUpdates(complaint.id).then(({ data }) => {
        setUpdates(data || []);
        setIsLoadingUpdates(false);
      });
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, complaint]);

  if (!isOpen || !complaint) return null;

  const categoryInfo = COMPLAINT_CATEGORIES.find((c) => c.value === complaint.category);
  const authorName = (complaint as any).profile?.name || 'Citizen User';

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
            <StatusBadge status={complaint.status} size="sm" />
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
              <span className="text-[10px] uppercase font-bold text-slate-400">Tracking ID</span>
              <p className="font-mono font-bold text-slate-800 truncate">{complaint.id.slice(0, 13)}...</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Citizen Author</span>
              <p className="font-semibold text-slate-800 truncate">{authorName}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Upvote Priority</span>
              <p className="font-bold text-slate-800 flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5 text-amber-500" />
                {complaint.upvote_count} Upvotes
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Reported Date</span>
              <p className="font-semibold text-slate-800">{new Date(complaint.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</span>
            <p className="text-sm text-slate-900 bg-slate-50 p-4 rounded-2xl border border-slate-200 leading-relaxed whitespace-pre-line">
              {complaint.description}
            </p>
          </div>

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

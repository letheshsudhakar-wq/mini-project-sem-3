import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  ThumbsUp, 
  Maximize2,
  FileText
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { UpvoteButton } from './UpvoteButton';
import { ImageModal } from './ImageModal';
import { COMPLAINT_CATEGORIES } from '../utils/constants';
import type { Complaint } from '../types';

interface MapComplaintDrawerProps {
  complaint: Complaint | null;
  onClose: () => void;
  onUpvoteChange?: (complaintId: string, newCount: number) => void;
}

export const MapComplaintDrawer: React.FC<MapComplaintDrawerProps> = ({
  complaint,
  onClose,
  onUpvoteChange,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!complaint) return null;

  const categoryInfo = COMPLAINT_CATEGORIES.find((c) => c.value === complaint.category);
  const formattedDate = new Date(complaint.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
      {/* Drawer Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
            {categoryInfo?.label || complaint.category}
          </span>
          <StatusBadge status={complaint.status} size="sm" />
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          aria-label="Close issue preview"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Description & Thumbnail */}
      <div className="flex flex-col sm:flex-row gap-4">
        {complaint.photo_url && (
          <div 
            onClick={() => setSelectedPhoto(complaint.photo_url)}
            className="w-full sm:w-28 h-32 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative group cursor-pointer"
          >
            <img
              src={complaint.photo_url}
              alt="Issue evidence"
              className="w-full h-full object-cover group-hover:scale-105 transition"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
              <Maximize2 className="w-4 h-4" />
            </div>
          </div>
        )}

        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-slate-900 leading-snug">
            {complaint.description}
          </p>

          <p className="text-xs text-slate-600 flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{complaint.address || `${complaint.latitude.toFixed(5)}, ${complaint.longitude.toFixed(5)}`}</span>
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <ThumbsUp className="w-3.5 h-3.5 text-amber-500" />
              {complaint.upvote_count} upvotes
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <UpvoteButton
          complaintId={complaint.id}
          initialUpvoteCount={complaint.upvote_count}
          onUpvoteChange={(newCount) => {
            if (onUpvoteChange) onUpvoteChange(complaint.id, newCount);
          }}
          className="w-full sm:w-auto"
        />

        <Link
          to={`/complaints/${complaint.id}`}
          className="w-full sm:w-auto py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 text-center"
        >
          <FileText className="w-4 h-4" />
          <span>View Full Timeline</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <ImageModal
        imageUrl={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
};

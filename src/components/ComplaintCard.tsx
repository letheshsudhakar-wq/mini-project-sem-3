import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ThumbsUp, Calendar, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { COMPLAINT_CATEGORIES } from '../utils/constants';
import { nativeService } from '../services/nativeService';
import type { Complaint } from '../types';

interface ComplaintCardProps {
  complaint: Complaint;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint }) => {
  const categoryInfo = COMPLAINT_CATEGORIES.find((c) => c.value === complaint.category);

  const formattedDate = new Date(complaint.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      to={`/complaints/${complaint.id}`}
      onClick={() => nativeService.triggerHaptic('light')}
      className="group bg-white rounded-3xl border border-slate-200 hover:border-blue-400 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3.5 active:scale-[0.98]"
    >
      {/* Top Header: Category & Status */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 px-2.5 py-1 rounded-xl transition">
          {categoryInfo?.label || complaint.category}
        </span>
        <StatusBadge status={complaint.status} size="sm" />
      </div>

      {/* Middle: Content with Thumbnail */}
      <div className="flex items-start gap-3.5">
        {/* Thumbnail */}
        {complaint.photo_url ? (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 aspect-square">
            <img
              src={complaint.photo_url}
              alt="Issue evidence thumbnail"
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-dashed border-slate-200 shrink-0 flex items-center justify-center text-slate-300 aspect-square">
            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2 leading-snug">
            {complaint.description}
          </p>

          <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
            <span className="truncate">{complaint.address || 'Location Coordinates Logged'}</span>
          </p>
        </div>
      </div>

      {/* Bottom Footer: Dates, Upvotes, View Link */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 text-[11px]">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1 font-bold text-slate-700 text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md">
            <ThumbsUp className="w-3 h-3 text-amber-600" />
            {complaint.upvote_count}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 font-bold text-xs text-blue-600 group-hover:translate-x-0.5 transition">
          View
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
};

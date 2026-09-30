import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ThumbsUp, Calendar, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { COMPLAINT_CATEGORIES } from '../utils/constants';
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
      className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
    >
      {/* Top Header: Category & Status */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 px-2.5 py-1 rounded-lg transition">
          {categoryInfo?.label || complaint.category}
        </span>
        <StatusBadge status={complaint.status} size="sm" />
      </div>

      {/* Middle: Content with Thumbnail */}
      <div className="flex items-start gap-4">
        {/* Optional Thumbnail */}
        {complaint.photo_url ? (
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
            <img
              src={complaint.photo_url}
              alt="Issue evidence thumbnail"
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-xl bg-slate-50 border border-dashed border-slate-200 shrink-0 flex items-center justify-center text-slate-300">
            <ImageIcon className="w-6 h-6" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition line-clamp-2 leading-snug">
            {complaint.description}
          </p>

          <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">{complaint.address || 'Location Coordinates Logged'}</span>
          </p>
        </div>
      </div>

      {/* Bottom Footer: Dates, Upvotes, View Link */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <ThumbsUp className="w-3.5 h-3.5 text-amber-500" />
            {complaint.upvote_count}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 font-semibold text-blue-600 group-hover:translate-x-0.5 transition">
          View Details
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
};

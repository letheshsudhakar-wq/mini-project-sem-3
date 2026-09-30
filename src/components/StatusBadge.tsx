import React from 'react';
import type { ComplaintStatus } from '../types';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const getStatusConfig = (s: ComplaintStatus) => {
    switch (s) {
      case 'reported':
        return {
          label: 'Reported',
          dotColor: 'bg-amber-500',
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200/80',
          emoji: '🟡',
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          dotColor: 'bg-blue-500',
          badgeColor: 'bg-blue-50 text-blue-800 border-blue-200/80',
          emoji: '🔵',
        };
      case 'resolved':
        return {
          label: 'Resolved',
          dotColor: 'bg-emerald-500',
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
          emoji: '🟢',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          dotColor: 'bg-rose-500',
          badgeColor: 'bg-rose-50 text-rose-800 border-rose-200/80',
          emoji: '🔴',
        };
      default:
        return {
          label: status,
          dotColor: 'bg-slate-400',
          badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
          emoji: '⚪',
        };
    }
  };

  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border ${config.badgeColor} ${sizeClasses[size]} ${className}`}
      aria-label={`Status: ${config.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} />
      <span className="capitalize">{config.label}</span>
    </span>
  );
};

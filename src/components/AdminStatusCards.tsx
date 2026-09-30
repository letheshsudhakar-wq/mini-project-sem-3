import React from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileStack
} from 'lucide-react';
import type { AdminDashboardStats, ComplaintStatus } from '../types';

interface AdminStatusCardsProps {
  stats: AdminDashboardStats;
  selectedStatusFilter?: ComplaintStatus | 'all';
  onSelectStatus?: (status: ComplaintStatus | 'all') => void;
  isLoading?: boolean;
}

export const AdminStatusCards: React.FC<AdminStatusCardsProps> = ({
  stats,
  selectedStatusFilter = 'all',
  onSelectStatus,
  isLoading = false,
}) => {
  const cards = [
    {
      key: 'all' as const,
      label: 'Total Complaints',
      count: stats.total,
      color: 'bg-slate-900 text-white',
      accentColor: 'text-slate-200',
      icon: <FileStack className="w-5 h-5 text-slate-300" />,
      border: 'border-slate-800',
    },
    {
      key: 'reported' as const,
      label: 'Pending (Reported)',
      count: stats.reported,
      color: 'bg-amber-50 text-amber-900',
      accentColor: 'text-amber-600',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      border: 'border-amber-200',
    },
    {
      key: 'in_progress' as const,
      label: 'In Progress',
      count: stats.in_progress,
      color: 'bg-blue-50 text-blue-900',
      accentColor: 'text-blue-600',
      icon: <Clock className="w-5 h-5 text-blue-600" />,
      border: 'border-blue-200',
    },
    {
      key: 'resolved' as const,
      label: 'Resolved',
      count: stats.resolved,
      color: 'bg-emerald-50 text-emerald-900',
      accentColor: 'text-emerald-600',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      border: 'border-emerald-200',
    },
    {
      key: 'rejected' as const,
      label: 'Rejected',
      count: stats.rejected,
      color: 'bg-rose-50 text-rose-900',
      accentColor: 'text-rose-600',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
      border: 'border-rose-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => {
        const isSelected = selectedStatusFilter === card.key;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelectStatus && onSelectStatus(card.key)}
            className={`p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
              card.key === 'all'
                ? isSelected
                  ? 'bg-slate-900 text-white ring-2 ring-blue-500 shadow-md'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
                : isSelected
                ? `ring-2 ring-blue-600 border-transparent shadow-sm ${card.color}`
                : `bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs`
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider line-clamp-1 ${
                card.key === 'all' ? 'text-slate-300' : 'text-slate-500'
              }`}>
                {card.label}
              </span>
              <div className={`p-1.5 rounded-xl ${card.key === 'all' ? 'bg-white/10' : 'bg-slate-100/80'}`}>
                {card.icon}
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              {isLoading ? (
                <div className="h-8 w-16 bg-slate-200/60 animate-pulse rounded-lg" />
              ) : (
                <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                  card.key === 'all' ? 'text-white' : 'text-slate-900'
                }`}>
                  {card.count}
                </span>
              )}

              {isSelected && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  card.key === 'all' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                }`}>
                  active
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

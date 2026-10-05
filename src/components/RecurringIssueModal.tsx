import React from 'react';
import { MapPin, Repeat2, AlertTriangle, X } from 'lucide-react';
import type { Complaint } from '../types';
import type { RecurringIssue } from '../utils/recurringIssues';

interface RecurringIssueModalProps {
  issue: RecurringIssue | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenComplaint: (complaint: Complaint) => void;
}

export const RecurringIssueModal: React.FC<RecurringIssueModalProps> = ({
  issue,
  isOpen,
  onClose,
  onOpenComplaint,
}) => {
  if (!isOpen || !issue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {issue.label}
            </div>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900">{issue.location}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close recurring issue"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Related complaints</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{issue.relatedComplaintCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">First reported</p>
            <p className="mt-2 text-sm font-bold text-slate-800">{new Date(issue.firstReportedDate).toLocaleDateString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Previous resolutions</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{issue.previousResolutions}</p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
              <MapPin className="h-3.5 w-3.5" />
              {issue.currentStatus}
            </span>
            {issue.repeatedResolution && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
                <Repeat2 className="h-3.5 w-3.5" />
                Repeated Resolution
              </span>
            )}
            <span className="text-slate-500">{issue.note}</span>
          </div>

          <div className="space-y-3">
            {issue.complaints.map((complaint) => (
              <button
                key={complaint.id}
                type="button"
                onClick={() => onOpenComplaint(complaint)}
                className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-700">{complaint.id}</span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-700">
                      {complaint.status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-800">{complaint.description}</p>
                  <p className="mt-2 text-[11px] text-slate-500">Reported {new Date(complaint.created_at).toLocaleString()}</p>
                </div>
                <div className="shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
                  Open
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import type { Complaint } from '../types';
import { calculateCivicPriorityScore } from '../utils/civicPriorityScore';

interface CivicPriorityScoreProps {
  complaint: Complaint;
  similarReportCount?: number | null;
  compact?: boolean;
}

const LEVEL_STYLES = {
  Low: 'border-slate-200 bg-slate-50 text-slate-700',
  Medium: 'border-sky-200 bg-sky-50 text-sky-800',
  High: 'border-amber-200 bg-amber-50 text-amber-900',
  Critical: 'border-rose-200 bg-rose-50 text-rose-800',
} as const;

export const CivicPriorityScore: React.FC<CivicPriorityScoreProps> = ({
  complaint,
  similarReportCount,
  compact = false,
}) => {
  const assessment = calculateCivicPriorityScore(complaint, similarReportCount);
  const style = LEVEL_STYLES[assessment.level];

  if (compact) {
    return (
      <span
        title={`${assessment.explanation} Limited information: affected-person and facility-proximity data are unavailable.`}
        aria-label={`CivicFix AI-assisted priority: ${assessment.level}, ${assessment.score} out of 100`}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-bold ${style}`}
      >
        {assessment.level === 'High' || assessment.level === 'Critical' ? <AlertTriangle className="h-3 w-3" /> : null}
        {assessment.score}/100 · {assessment.level}
        <span className="text-[9px] font-semibold lowercase opacity-70">limited data</span>
      </span>
    );
  }

  return (
    <section className={`space-y-3 rounded-2xl border p-4 ${style}`} aria-label="CivicFix priority score explanation">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">CivicFix AI-assisted priority score</p>
          <p className="mt-1 text-lg font-extrabold">{assessment.score}/100 · {assessment.level}</p>
        </div>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-white/80" aria-hidden="true">
          <div className="h-full rounded-full bg-current" style={{ width: `${assessment.score}%` }} />
        </div>
      </div>
      <p className="text-xs leading-relaxed">{assessment.explanation}</p>
      <div className="flex items-start gap-2 border-t border-current/10 pt-2 text-[11px] leading-relaxed">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Limited information: {assessment.limitedInformation.join(' ')} This is a CivicFix recommendation, not a government decision.
        </p>
      </div>
    </section>
  );
};
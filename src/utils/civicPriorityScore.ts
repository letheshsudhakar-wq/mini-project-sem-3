import type { Complaint } from '../types';
import { SIMILAR_REPORT_RADIUS_METERS } from './constants';

export type CivicPriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface CivicPriorityAssessment {
  score: number;
  level: CivicPriorityLevel;
  explanation: string;
  limitedInformation: string[];
}

const SIGNALS = {
  severity: [
    /\bdeep\b/i,
    /\bsevere\b/i,
    /\bmajor\b/i,
    /\bcollapsed?\b/i,
    /\bextensive\b/i,
    /\bexposed\b/i,
  ],
  safety: [
    /\bhazard(?:ous)?\b/i,
    /\bdanger(?:ous)?\b/i,
    /\bunsafe\b/i,
    /\baccident\b/i,
    /\binjur(?:y|ies|ed)\b/i,
    /\belectrocut\w*\b/i,
    /\bfire risk\b/i,
  ],
  environmental: [
    /\bsewage\b/i,
    /\boverflow\w*\b/i,
    /\bcontaminat\w*\b/i,
    /\bchemical\w*\b/i,
    /\bflood\w*\b/i,
    /\bstanding water\b/i,
    /\bwaste\b/i,
    /\bdumping\b/i,
    /\bpollut\w*\b/i,
    /\bsmoke\b/i,
    /\bwaterlogging\b/i,
  ],
} as const;

const LEVELS: { minimum: number; level: CivicPriorityLevel }[] = [
  { minimum: 80, level: 'Critical' },
  { minimum: 60, level: 'High' },
  { minimum: 30, level: 'Medium' },
  { minimum: 0, level: 'Low' },
];

function hasSignal(description: string, patterns: readonly RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

function joinReasons(reasons: string[]): string {
  if (reasons.length < 2) return reasons[0] || '';
  return `${reasons.slice(0, -1).join('; ')}; and ${reasons[reasons.length - 1]}`;
}

export function calculateCivicPriorityScore(
  complaint: Complaint,
  similarReportCount?: number | null,
  now = Date.now(),
): CivicPriorityAssessment {
  const reasons: string[] = [];
  const description = complaint.description || '';
  let score = 0;

  const severitySignal = hasSignal(description, SIGNALS.severity);
  if (severitySignal) {
    score += 16;
    reasons.push(`the description includes the severity term "${severitySignal}"`);
  }

  const safetySignal = hasSignal(description, SIGNALS.safety);
  if (safetySignal) {
    score += 28;
    reasons.push(`the description identifies a safety concern ("${safetySignal}")`);
  }

  const environmentalSignal = hasSignal(description, SIGNALS.environmental);
  if (environmentalSignal) {
    score += 24;
    reasons.push(`the description identifies an environmental concern ("${environmentalSignal}")`);
  }

  const isOpen = complaint.status === 'reported' || complaint.status === 'in_progress';
  if (isOpen) {
    const ageInDays = Math.max(0, Math.floor((now - new Date(complaint.created_at).getTime()) / 86_400_000));
    const agePoints = Math.min(25, ageInDays * 2);
    score += agePoints;
    if (ageInDays > 0) {
      reasons.push(`it has remained unresolved for ${ageInDays} ${ageInDays === 1 ? 'day' : 'days'}`);
    }
  }

  if (similarReportCount == null) {
    reasons.push('nearby repeat-report data is unavailable for this calculation');
  } else if (similarReportCount > 0) {
    score += Math.min(20, similarReportCount * 10);
    reasons.push(`${similarReportCount} same-category ${similarReportCount === 1 ? 'report exists' : 'reports exist'} within ${SIMILAR_REPORT_RADIUS_METERS} m`);
  }

  const upvotes = Math.max(0, complaint.upvote_count || 0);
  if (upvotes > 0) {
    score += Math.min(12, Math.ceil(upvotes / 2));
    reasons.push(`${upvotes} community ${upvotes === 1 ? 'upvote indicates' : 'upvotes indicate'} support`);
  }

  if (!isOpen) {
    score = Math.min(score, 29);
    reasons.push(`the complaint is already ${complaint.status}`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level = LEVELS.find(({ minimum }) => score >= minimum)?.level || 'Low';
  const explanation = reasons.length > 0
    ? `${level} priority because ${joinReasons(reasons)}.`
    : 'Low priority because the available complaint fields contain no explicit severity, safety, environmental, repeat-report, or community-support signals.';

  return {
    score,
    level,
    explanation,
    limitedInformation: [
      'Affected-person counts and public-facility proximity data are not available.',
      'Upvotes are used only as a community-support signal, not as a count of people affected.',
      ...(similarReportCount == null ? ['Nearby repeat-report comparison is unavailable.'] : []),
    ],
  };
}
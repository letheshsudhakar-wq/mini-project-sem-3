import type { Complaint, ComplaintCategory, ComplaintStatus } from '../types';

export type RecurringIssueConfidence = 'high' | 'medium' | 'low';

export interface RecurringIssue {
  id: string;
  category: ComplaintCategory;
  location: string;
  complaints: Complaint[];
  relatedComplaintCount: number;
  firstReportedDate: string;
  mostRecentReport: string;
  previousResolutions: number;
  currentStatus: ComplaintStatus;
  confidence: RecurringIssueConfidence;
  repeatedResolution: boolean;
  label: string;
  note: string;
}

const STOPWORDS = new Set([
  'the','and','for','with','from','into','near','over','under','this','that','there','been','were','have','has','more','about','same','when','where','what','which','into','across','after','before','main','road','street','lane','cross','near','at','on','of','a','an','to','is','it','in','by','as','used','causing','caused','report','reported','complaint','issue'
]);

const CATEGORY_SEMANTICS: Record<ComplaintCategory, ComplaintCategory[]> = {
  pothole: ['pothole', 'other'],
  streetlight: ['streetlight', 'other'],
  drainage: ['drainage', 'other'],
  garbage: ['garbage', 'other'],
  water_supply: ['water_supply', 'other'],
  road_damage: ['road_damage', 'other'],
  other: ['pothole', 'streetlight', 'drainage', 'garbage', 'other'],
};

function normalizeText(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function normalizeAddress(value: string | null): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/\b(road|rd|street|st|lane|ln|main|cross|crossing|avenue|ave|block|sector|junction|near|nr)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textSimilarity(first: string, second: string): number {
  const left = new Set(normalizeText(first));
  const right = new Set(normalizeText(second));
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : overlap / union;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadius = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

function isRelatedCategory(first: ComplaintCategory, second: ComplaintCategory): boolean {
  return first === second || CATEGORY_SEMANTICS[first]?.includes(second) || CATEGORY_SEMANTICS[second]?.includes(first);
}

function isLikelyRelated(first: Complaint, second: Complaint): boolean {
  const sameAddress = normalizeAddress(first.address) && normalizeAddress(first.address) === normalizeAddress(second.address);
  const distanceThreshold = 150;
  const distance = calculateDistanceMeters(first.latitude, first.longitude, second.latitude, second.longitude);
  const sameLocation = sameAddress || distance <= distanceThreshold;
  const sameCategory = isRelatedCategory(first.category, second.category);
  const descriptionSimilarity = textSimilarity(first.description, second.description);
  const hasSharedAddressStem =
    !!normalizeAddress(first.address) &&
    !!normalizeAddress(second.address) &&
    normalizeAddress(first.address).split(' ').filter(Boolean).slice(0, 3).join(' ') ===
      normalizeAddress(second.address).split(' ').filter(Boolean).slice(0, 3).join(' ');

  return sameLocation && (sameCategory || descriptionSimilarity > 0.2 || hasSharedAddressStem) && (sameCategory || descriptionSimilarity > 0.1 || hasSharedAddressStem);
}

function buildLocationLabel(complaints: Complaint[]): string {
  const preferred = [...complaints].sort((a, b) => Number(Boolean(b.address)) - Number(Boolean(a.address)))[0];
  return preferred?.address || `Lat ${complaints[0].latitude.toFixed(4)}, Lng ${complaints[0].longitude.toFixed(4)}`;
}

function resolveConfidence(complaints: Complaint[]): RecurringIssueConfidence {
  const sameAddress = complaints.every((complaint) => normalizeAddress(complaint.address) && normalizeAddress(complaints[0].address) === normalizeAddress(complaint.address));
  const sameCategory = complaints.every((complaint) => complaint.category === complaints[0].category);
  const textMatch = complaints.slice(1).some((complaint) => {
    const base = complaints[0].description;
    return textSimilarity(base, complaint.description) > 0.25;
  });

  if (sameAddress && sameCategory && textMatch) return 'high';
  if (sameAddress || sameCategory || textMatch) return 'medium';
  return 'low';
}

export function analyzeRecurringIssues(complaints: Complaint[]): RecurringIssue[] {
  if (complaints.length < 2) return [];

  const visited = new Set<string>();
  const groups: Complaint[][] = [];

  for (let index = 0; index < complaints.length; index += 1) {
    const complaint = complaints[index];
    if (visited.has(complaint.id)) continue;

    const cluster: Complaint[] = [complaint];
    visited.add(complaint.id);

    for (let compareIndex = index + 1; compareIndex < complaints.length; compareIndex += 1) {
      const candidate = complaints[compareIndex];
      if (visited.has(candidate.id)) continue;
      if (isLikelyRelated(complaint, candidate)) {
        cluster.push(candidate);
        visited.add(candidate.id);
      }
    }

    if (cluster.length > 1) {
      groups.push(cluster);
    }
  }

  return groups
    .map((cluster) => {
      const sortedCluster = [...cluster].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const lastResolved = [...sortedCluster].filter((item) => item.status === 'resolved').at(-1);
      const reopenedAfterResolution = lastResolved
        ? sortedCluster.some(
            (item) => item.created_at > lastResolved.created_at && item.status !== 'resolved' && item.status !== 'rejected'
          )
        : false;
      const latestComplaint = sortedCluster[sortedCluster.length - 1];
      const previousResolutions = sortedCluster.filter((item) => item.status === 'resolved').length;
      const confidence = resolveConfidence(sortedCluster);
      const label = confidence === 'low' ? 'Possible recurring issue' : 'Recurring Issue Detected';
      const note = reopenedAfterResolution ? 'Repeated Resolution' : confidence === 'low' ? 'Potentially related complaints' : 'Likely related civic reports';

      return {
        id: `recurring-${sortedCluster.map((item) => item.id).sort().join('-')}`,
        category: sortedCluster[0].category,
        location: buildLocationLabel(sortedCluster),
        complaints: sortedCluster,
        relatedComplaintCount: sortedCluster.length,
        firstReportedDate: sortedCluster[0].created_at,
        mostRecentReport: latestComplaint.created_at,
        previousResolutions,
        currentStatus: latestComplaint.status,
        confidence,
        repeatedResolution: reopenedAfterResolution,
        label,
        note,
      };
    })
    .sort((a, b) => new Date(b.mostRecentReport).getTime() - new Date(a.mostRecentReport).getTime());
}

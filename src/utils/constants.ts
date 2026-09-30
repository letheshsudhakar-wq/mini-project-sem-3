import type { ComplaintCategory, ComplaintStatus } from '../types';

export const COMPLAINT_CATEGORIES: { value: ComplaintCategory; label: string; description: string }[] = [
  { value: 'pothole', label: 'Pothole & Road Damage', description: 'Cracked pavement, potholes, or dangerous road depressions.' },
  { value: 'streetlight', label: 'Streetlight Issue', description: 'Non-functional, broken, or flickering public street lighting.' },
  { value: 'drainage', label: 'Drainage & Sewage', description: 'Clogged storm drains, overflowing sewers, or waterlogging.' },
  { value: 'garbage', label: 'Garbage & Waste', description: 'Uncollected waste, overflowing community bins, or illegal dumping.' },
  { value: 'other', label: 'Other Civic Grievance', description: 'Other public utility or municipal maintenance concerns.' },
];

export const COMPLAINT_STATUSES: { value: ComplaintStatus; label: string; badgeColor: string }[] = [
  { value: 'reported', label: 'Reported', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'in_progress', label: 'In Progress', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'resolved', label: 'Resolved', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'rejected', label: 'Rejected', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const STORAGE_BUCKETS = {
  COMPLAINT_IMAGES: 'complaint-images',
  RESOLUTION_IMAGES: 'resolution-images',
} as const;

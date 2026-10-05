import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { 
  Complaint, 
  ComplaintCategory, 
  ComplaintStatus, 
  ComplaintUpdate, 
  NearbyComplaint, 
  AdminDashboardStats,
  ComplaintPriority,
  Profile,
} from '../types';
import { MockCivicStore, DEMO_PROFILES } from '../utils/mockData';
import { SIMILAR_REPORT_RADIUS_METERS } from '../utils/constants';
import { DEMO_GOVERNMENT_COMPLAINTS, DEMO_GOVERNMENT_PROFILE } from '../utils/demoGovernmentData';
import { isDemoGovernmentSession } from '../utils/demoGovernmentAccess';

export interface CreateComplaintInput {
  userId: string;
  category: ComplaintCategory;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  photoUrl?: string;
}

export interface UpdateComplaintInput {
  category?: ComplaintCategory;
  description?: string;
  photo_url?: string | null;
  latitude?: number;
  longitude?: number;
  address?: string | null;
}

export interface AddComplaintUpdateInput {
  complaintId: string;
  status: ComplaintStatus;
  note?: string;
  photoUrl?: string;
  resolutionDepartment?: string | null;
  updatedBy: string;
}

export interface AdminComplaintsParams {
  category?: ComplaintCategory | 'all';
  status?: ComplaintStatus | 'all';
  department?: string | 'all';
  dateRange?: 'all' | 'today' | '7days' | '30days';
  searchQuery?: string;
  sortBy?: 'newest' | 'oldest' | 'updated' | 'upvotes';
  page?: number;
  pageSize?: number;
}

export interface AdminAssignmentInput {
  complaintId: string;
  department: string | null;
  assignedOfficerId: string | null;
  priority: ComplaintPriority;
  slaDeadline: string | null;
  status: ComplaintStatus;
  note?: string;
  updatedBy: string;
}

export interface AdminComplaintsResponse {
  data: Complaint[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: Error | null;
}

/**
 * Calculates haversine distance in meters between two coordinates (client fallback)
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getDemoGovernmentComplaints(): Complaint[] {
  let complaints = DEMO_GOVERNMENT_COMPLAINTS;
  try {
    const stored = localStorage.getItem('civicfix_demo_government_complaints_v1');
    if (stored) complaints = JSON.parse(stored) as Complaint[];
  } catch {
    complaints = DEMO_GOVERNMENT_COMPLAINTS;
  }
  return complaints.map((complaint) => ({
    ...complaint,
    assigned_officer: complaint.assigned_officer || DEMO_GOVERNMENT_PROFILE,
    profile: complaint.profile || DEMO_GOVERNMENT_PROFILE,
  }));
}

function getDemoComplaintUpdates(): Record<string, ComplaintUpdate[]> {
  const initialUpdates: Record<string, ComplaintUpdate[]> = {
    'CF-GOV-101': [
      { id: 'demo-update-101', complaint_id: 'CF-GOV-101', status: 'reported', note: 'Pending inspection by the municipal repair team.', photo_url: null, updated_by: 'demo-government-id', created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updater_profile: DEMO_GOVERNMENT_PROFILE },
    ],
    'CF-GOV-102': [
      { id: 'demo-update-102', complaint_id: 'CF-GOV-102', status: 'in_progress', note: 'Waste collection route updated for the affected market lane.', photo_url: null, updated_by: 'demo-government-id', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), updater_profile: DEMO_GOVERNMENT_PROFILE },
    ],
    'CF-GOV-104': [
      { id: 'demo-update-104', complaint_id: 'CF-GOV-104', status: 'reported', note: 'Drainage line inspection remained overdue and escalated for urgent response.', photo_url: null, updated_by: 'demo-government-id', created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), updater_profile: DEMO_GOVERNMENT_PROFILE },
    ],
    'CF-GOV-106': [
      { id: 'demo-update-106', complaint_id: 'CF-GOV-106', status: 'reported', note: 'Reopened after resurfacing failed in the same service lane.', photo_url: null, updated_by: 'demo-government-id', created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), updater_profile: DEMO_GOVERNMENT_PROFILE },
    ],
  };
  try {
    return { ...initialUpdates, ...JSON.parse(localStorage.getItem('civicfix_demo_government_updates_v1') || '{}') };
  } catch {
    return initialUpdates;
  }
}

export const complaintsService = {
  /**
   * Fetch aggregate summary stats for the Admin Dashboard
   */
  async getAdminDashboardStats(): Promise<{ data: AdminDashboardStats; error: Error | null }> {
    if (isDemoGovernmentSession()) {
      const list = getDemoGovernmentComplaints();
      const stats: AdminDashboardStats = {
        total: list.length,
        reported: list.filter((complaint) => complaint.status === 'reported').length,
        in_progress: list.filter((complaint) => complaint.status === 'in_progress').length,
        resolved: list.filter((complaint) => complaint.status === 'resolved').length,
        rejected: 0,
        critical: list.filter((complaint) => complaint.priority === 'critical').length,
        overdue: list.filter((complaint) => complaint.sla_deadline && new Date(complaint.sla_deadline).getTime() < Date.now() && complaint.status !== 'resolved').length,
        average_resolution_hours: null,
        department_counts: {},
      };

      list.forEach((complaint) => {
        if (complaint.department) {
          stats.department_counts[complaint.department] = (stats.department_counts[complaint.department] || 0) + 1;
        }
      });

      const resolvedHours = list
        .filter((complaint) => complaint.status === 'resolved')
        .map((complaint) => (new Date(complaint.updated_at).getTime() - new Date(complaint.created_at).getTime()) / 3600000);
      if (resolvedHours.length) {
        stats.average_resolution_hours = resolvedHours.reduce((sum, value) => sum + value, 0) / resolvedHours.length;
      }

      return { data: stats, error: null };
    }

    if (!isSupabaseConfigured) {
      return { data: MockCivicStore.getStats(), error: null };
    }

    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      if (!error && data) {
        return { data: data as unknown as AdminDashboardStats, error: null };
      }

      // Fallback if RPC was not applied
      const { data: allComplaints, error: selectError } = await supabase
        .from('complaints')
        .select('status, priority, sla_deadline, department, created_at, updated_at');

      if (selectError) {
        return {
          data: MockCivicStore.getStats(),
          error: null,
        };
      }

      const stats: AdminDashboardStats = {
        total: allComplaints?.length || 0,
        reported: 0,
        in_progress: 0,
        resolved: 0,
        rejected: 0,
        critical: 0,
        overdue: 0,
        average_resolution_hours: null,
        department_counts: {},
      };
      const resolutionHours: number[] = [];

      allComplaints?.forEach((c) => {
        if (c.status === 'reported') stats.reported++;
        else if (c.status === 'in_progress') stats.in_progress++;
        else if (c.status === 'resolved') stats.resolved++;
        else if (c.status === 'rejected') stats.rejected++;
        if (c.priority === 'critical') stats.critical++;
        if (c.sla_deadline && new Date(c.sla_deadline).getTime() < Date.now() && ['reported', 'in_progress'].includes(c.status)) {
          stats.overdue++;
        }
        if (c.department) stats.department_counts[c.department] = (stats.department_counts[c.department] || 0) + 1;
        if (c.status === 'resolved') {
          resolutionHours.push((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 3600000);
        }
      });
      if (resolutionHours.length) {
        stats.average_resolution_hours = resolutionHours.reduce((total, hours) => total + hours, 0) / resolutionHours.length;
      }

      return { data: stats, error: null };
    } catch (err: any) {
      return {
        data: MockCivicStore.getStats(),
        error: null,
      };
    }
  },

  /**
   * Fetch paginated complaints with filtering & searching for Admin Dashboard
   */
  async getAdminComplaints(params: AdminComplaintsParams = {}): Promise<AdminComplaintsResponse> {
    const {
      category = 'all',
      status = 'all',
      department = 'all',
      dateRange = 'all',
      searchQuery = '',
      sortBy = 'newest',
      page = 1,
      pageSize = 20,
    } = params;

    if (isDemoGovernmentSession()) {
      let list = [...getDemoGovernmentComplaints()];

      if (category && category !== 'all') {
        list = list.filter((complaint) => complaint.category === category);
      }
      if (status && status !== 'all') {
        list = list.filter((complaint) => complaint.status === status);
      }
      if (department !== 'all') {
        list = list.filter((complaint) => (department === 'Unassigned' ? !complaint.department : complaint.department === department));
      }
      if (dateRange && dateRange !== 'all') {
        const now = Date.now();
        const days = dateRange === 'today' ? 1 : dateRange === '7days' ? 7 : 30;
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        list = list.filter((complaint) => new Date(complaint.created_at).getTime() >= cutoff);
      }
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        list = list.filter((complaint) =>
          complaint.description.toLowerCase().includes(q) ||
          (complaint.address && complaint.address.toLowerCase().includes(q)) ||
          complaint.id.toLowerCase().includes(q) ||
          (complaint.department && complaint.department.toLowerCase().includes(q)) ||
          (complaint.assigned_officer?.name && complaint.assigned_officer.name.toLowerCase().includes(q))
        );
      }

      if (sortBy === 'newest') {
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortBy === 'oldest') {
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      } else if (sortBy === 'updated') {
        list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      } else if (sortBy === 'upvotes') {
        list.sort((a, b) => b.upvote_count - a.upvote_count);
      }

      const totalCount = list.length;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;
      const from = (page - 1) * pageSize;
      const paginated = list.slice(from, from + pageSize);

      return { data: paginated, totalCount, page, pageSize, totalPages, error: null };
    }

    if (!isSupabaseConfigured) {
      let list = [...MockCivicStore.getComplaints()];

      if (category && category !== 'all') {
        list = list.filter((c) => c.category === category);
      }
      if (status && status !== 'all') {
        list = list.filter((c) => c.status === status);
      }
      if (department !== 'all') {
        list = list.filter((c) => (department === 'Unassigned' ? !c.department : c.department === department));
      }
      if (dateRange && dateRange !== 'all') {
        const now = Date.now();
        const days = dateRange === 'today' ? 1 : dateRange === '7days' ? 7 : 30;
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        list = list.filter((c) => new Date(c.created_at).getTime() >= cutoff);
      }
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        list = list.filter((c) => 
          c.description.toLowerCase().includes(q) || 
          (c.address && c.address.toLowerCase().includes(q)) ||
          c.id.toLowerCase().includes(q) ||
          (c.department && c.department.toLowerCase().includes(q)) ||
          (c.assigned_officer?.name && c.assigned_officer.name.toLowerCase().includes(q))
        );
      }

      if (sortBy === 'newest') {
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortBy === 'oldest') {
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      } else if (sortBy === 'updated') {
        list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      } else if (sortBy === 'upvotes') {
        list.sort((a, b) => b.upvote_count - a.upvote_count);
      }

      const totalCount = list.length;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;
      const from = (page - 1) * pageSize;
      const paginated = list.slice(from, from + pageSize);

      return {
        data: paginated,
        totalCount,
        page,
        pageSize,
        totalPages,
        error: null,
      };
    }

    try {
      let query = supabase
        .from('complaints')
        .select('*, profile:profiles!complaints_user_id_fkey(*), assigned_officer:profiles!complaints_assigned_officer_id_fkey(*)', { count: 'exact' });

      // 1. Category Filter
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      // 2. Status Filter
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (department !== 'all') {
        query = department === 'Unassigned' ? query.is('department', null) : query.eq('department', department);
      }

      // 3. Date Range Filter
      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        if (dateRange === 'today') {
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          query = query.gte('created_at', todayStart);
        } else if (dateRange === '7days') {
          const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('created_at', past7);
        } else if (dateRange === '30days') {
          const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('created_at', past30);
        }
      }

      // 4. Search Filter
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`description.ilike.%${q}%,address.ilike.%${q}%,id.eq.${q}`);
      }

      // 5. Sorting
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'updated') {
        query = query.order('updated_at', { ascending: false });
      } else if (sortBy === 'upvotes') {
        query = query.order('upvote_count', { ascending: false });
      }

      // 6. Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;

      return {
        data: (data || []) as Complaint[],
        totalCount,
        page,
        pageSize,
        totalPages,
        error: error || null,
      };
    } catch (err: any) {
      return {
        data: [],
        totalCount: 0,
        page: 1,
        pageSize,
        totalPages: 1,
        error: err,
      };
    }
  },

  /**
   * Fetch all open complaints for Map View (status = reported | in_progress)
   */
  async getOpenComplaintsForMap(): Promise<{ data: Complaint[]; error: Error | null }> {
    if (!isSupabaseConfigured) {
      const all = MockCivicStore.getComplaints();
      const open = all.filter((c) => c.status === 'reported' || c.status === 'in_progress');
      return { data: open, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, profile:profiles!complaints_user_id_fkey(*), assigned_officer:profiles!complaints_assigned_officer_id_fkey(*)')
        .in('status', ['reported', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        return { data: MockCivicStore.getComplaints().filter((c) => c.status !== 'rejected'), error: null };
      }

      return { data: (data || []) as Complaint[], error: null };
    } catch (err: any) {
      return { data: MockCivicStore.getComplaints().filter((c) => c.status !== 'rejected'), error: null };
    }
  },

  /**
   * Fetch nearby open complaints within radius for Map View
   */
  async getNearbyOpenComplaints(
    lat: number,
    lng: number,
    radiusMeters = 5000
  ): Promise<{ data: NearbyComplaint[]; error: Error | null }> {
    const { data: openComplaints, error } = await this.getOpenComplaintsForMap();
    if (error || !openComplaints) {
      return { data: [], error };
    }

    const nearby: NearbyComplaint[] = openComplaints
      .map((c) => {
        const distance_meters = calculateDistanceMeters(lat, lng, c.latitude, c.longitude);
        return { ...c, distance_meters };
      })
      .filter((c) => c.distance_meters <= radiusMeters)
      .sort((a, b) => a.distance_meters - b.distance_meters);

    return { data: nearby, error: null };
  },

  /**
   * Fetch all complaints created by a specific user (My Complaints)
   */
  async getUserComplaints(userId: string): Promise<{ data: Complaint[]; error: Error | null }> {
    if (!isSupabaseConfigured) {
      const all = MockCivicStore.getComplaints();
      const userComplaints = all.filter((c) => c.user_id === userId || userId.startsWith('demo-'));
      return { data: userComplaints, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, profile:profiles!complaints_user_id_fkey(*), assigned_officer:profiles!complaints_assigned_officer_id_fkey(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: MockCivicStore.getComplaints(), error: null };
      }

      return { data: (data || []) as Complaint[], error: null };
    } catch (err: any) {
      return { data: MockCivicStore.getComplaints(), error: null };
    }
  },

  /**
   * Fetch a single complaint by ID with relations
   */
  async getComplaintById(id: string): Promise<{ data: Complaint | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      const all = MockCivicStore.getComplaints();
      const found = all.find((c) => c.id === id) || null;
      return { data: found, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, profile:profiles!complaints_user_id_fkey(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        const fallback = MockCivicStore.getComplaints().find((c) => c.id === id) || null;
        return { data: fallback, error: null };
      }

      return { data: data as Complaint | null, error: null };
    } catch (err: any) {
      const fallback = MockCivicStore.getComplaints().find((c) => c.id === id) || null;
      return { data: fallback, error: null };
    }
  },

  /**
   * Fetch chronological status updates for a complaint
   */
  async getComplaintUpdates(complaintId: string): Promise<{ data: ComplaintUpdate[]; error: Error | null }> {
    if (isDemoGovernmentSession()) {
      const updatesMap = getDemoComplaintUpdates();
      return { data: updatesMap[complaintId] || [], error: null };
    }

    if (!isSupabaseConfigured) {
      const updatesMap = MockCivicStore.getUpdates();
      return { data: updatesMap[complaintId] || [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('complaint_updates')
        .select('*, updater_profile:profiles!updated_by(*)')
        .eq('complaint_id', complaintId)
        .order('created_at', { ascending: true });

      if (error) {
        const updatesMap = MockCivicStore.getUpdates();
        return { data: updatesMap[complaintId] || [], error: null };
      }

      return { data: (data || []) as ComplaintUpdate[], error: null };
    } catch (err: any) {
      const updatesMap = MockCivicStore.getUpdates();
      return { data: updatesMap[complaintId] || [], error: null };
    }
  },

  async getAdminOfficers(): Promise<{ data: Profile[]; error: Error | null }> {
    if (isDemoGovernmentSession()) {
      return { data: [DEMO_GOVERNMENT_PROFILE], error: null };
    }

    if (!isSupabaseConfigured) {
      return { data: Object.values(MockCivicStore.getProfiles()).filter((profile) => profile.role === 'admin'), error: null };
    }

    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'admin').order('name');
    return { data: (data || []) as Profile[], error: error || null };
  },

  async getSimilarComplaintCounts(complaints: Complaint[]): Promise<{ data: Record<string, number> | null; error: Error | null }> {
    if (isDemoGovernmentSession()) {
      const all = getDemoGovernmentComplaints();
      const counts = Object.fromEntries(complaints.map((complaint) => [
        complaint.id,
        all.filter((candidate) =>
          candidate.id !== complaint.id &&
          candidate.category === complaint.category &&
          calculateDistanceMeters(complaint.latitude, complaint.longitude, candidate.latitude, candidate.longitude) <= SIMILAR_REPORT_RADIUS_METERS
        ).length,
      ]));
      return { data: counts, error: null };
    }

    if (complaints.length === 0) return { data: {}, error: null };

    let candidates: Array<Pick<Complaint, 'id' | 'category' | 'latitude' | 'longitude'>>;
    if (!isSupabaseConfigured) {
      candidates = MockCivicStore.getComplaints();
    } else {
      const latitudeDelta = SIMILAR_REPORT_RADIUS_METERS / 111_320;
      const bounds = complaints.map((complaint) => {
        const longitudeDelta = Math.min(
          180,
          latitudeDelta / Math.max(Math.cos((complaint.latitude * Math.PI) / 180), 0.01),
        );
        return `and(category.eq.${complaint.category},latitude.gte.${(complaint.latitude - latitudeDelta).toFixed(7)},latitude.lte.${(complaint.latitude + latitudeDelta).toFixed(7)},longitude.gte.${(complaint.longitude - longitudeDelta).toFixed(7)},longitude.lte.${(complaint.longitude + longitudeDelta).toFixed(7)})`;
      });
      const { data, error } = await supabase
        .from('complaints')
        .select('id, category, latitude, longitude')
        .or(bounds.join(','));

      if (error) return { data: null, error };
      candidates = data || [];
    }

    const counts = Object.fromEntries(complaints.map((complaint) => [
      complaint.id,
      candidates.filter((candidate) =>
        candidate.id !== complaint.id &&
        candidate.category === complaint.category &&
        calculateDistanceMeters(complaint.latitude, complaint.longitude, candidate.latitude, candidate.longitude) <= SIMILAR_REPORT_RADIUS_METERS
      ).length,
    ]));
    return { data: counts, error: null };
  },

  async getAdminAttentionComplaints(): Promise<{ data: Complaint[]; error: Error | null }> {
    if (isDemoGovernmentSession()) {
      const now = Date.now();
      const data = getDemoGovernmentComplaints()
        .filter((complaint) => ['reported', 'in_progress'].includes(complaint.status))
        .filter((complaint) => complaint.priority === 'critical' || Boolean(complaint.sla_deadline && new Date(complaint.sla_deadline).getTime() < now))
        .sort((a, b) => new Date(a.sla_deadline || a.created_at).getTime() - new Date(b.sla_deadline || b.created_at).getTime())
        .slice(0, 6);
      return { data, error: null };
    }

    if (!isSupabaseConfigured) {
      const now = Date.now();
      const data = MockCivicStore.getComplaints()
        .filter((complaint) => ['reported', 'in_progress'].includes(complaint.status))
        .filter((complaint) => complaint.resolution_confirmation_status === 'disputed' || complaint.priority === 'critical' || Boolean(complaint.sla_deadline && new Date(complaint.sla_deadline).getTime() < now))
        .sort((a, b) => new Date(a.sla_deadline || a.created_at).getTime() - new Date(b.sla_deadline || b.created_at).getTime())
        .slice(0, 6);
      return { data, error: null };
    }

    const { data, error } = await supabase
      .from('complaints')
      .select('*, profile:profiles!complaints_user_id_fkey(*), assigned_officer:profiles!complaints_assigned_officer_id_fkey(*)')
      .in('status', ['reported', 'in_progress'])
      .or(`priority.eq.critical,sla_deadline.lt.${new Date().toISOString()},resolution_confirmation_status.eq.disputed`)
      .order('sla_deadline', { ascending: true, nullsFirst: false })
      .limit(6);
    return { data: (data || []) as Complaint[], error: error || null };
  },

  async updateAdminAssignment(input: AdminAssignmentInput): Promise<{ data: Complaint | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      const complaints = MockCivicStore.getComplaints();
      const index = complaints.findIndex((complaint) => complaint.id === input.complaintId);
      if (index < 0) return { data: null, error: new Error('Complaint not found') };
      complaints[index] = {
        ...complaints[index],
        department: input.department,
        assigned_officer_id: input.assignedOfficerId,
        assigned_officer: input.assignedOfficerId ? MockCivicStore.getProfiles()[input.assignedOfficerId] || null : null,
        priority: input.priority,
        sla_deadline: input.slaDeadline,
        updated_at: new Date().toISOString(),
      };
      MockCivicStore.saveComplaints(complaints);
      if (input.note?.trim()) {
        const updates = MockCivicStore.getUpdates();
        const complaintUpdates = updates[input.complaintId] || [];
        complaintUpdates.push({
          id: `up-${Date.now()}`,
          complaint_id: input.complaintId,
          status: input.status,
          note: input.note.trim(),
          photo_url: null,
          updated_by: input.updatedBy,
          created_at: new Date().toISOString(),
          updater_profile: MockCivicStore.getProfiles()[input.updatedBy],
        });
        updates[input.complaintId] = complaintUpdates;
        MockCivicStore.saveUpdates(updates);
      }
      return { data: complaints[index], error: null };
    }

    const { data, error } = await supabase
      .from('complaints')
      .update({
        department: input.department,
        assigned_officer_id: input.assignedOfficerId,
        priority: input.priority,
        sla_deadline: input.slaDeadline,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.complaintId)
      .select('*, profile:profiles!complaints_user_id_fkey(*), assigned_officer:profiles!complaints_assigned_officer_id_fkey(*)')
      .single();

    if (error) return { data: null, error };
    if (input.note?.trim()) {
      const { error: noteError } = await supabase.from('complaint_updates').insert({
        complaint_id: input.complaintId,
        status: input.status,
        note: input.note.trim(),
        updated_by: input.updatedBy,
      });
      if (noteError) console.warn('[CivicFix Complaints] Official note could not be saved:', noteError.message);
    }
    return { data: data as Complaint, error: null };
  },

  /**
   * Create a new complaint (Report Issue)
   */
  async createComplaint(input: CreateComplaintInput): Promise<{ data: Complaint | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      const profiles = MockCivicStore.getProfiles();
      const authorProfile = profiles[input.userId] || DEMO_PROFILES['demo-citizen-id'];

      const newComplaint: Complaint = {
        id: `cf-${Date.now().toString().slice(-4)}`,
        user_id: input.userId,
        category: input.category,
        description: input.description,
        photo_url: input.photoUrl || null,
        resolution_photo_url: null,
        latitude: input.latitude,
        longitude: input.longitude,
        address: input.address || 'Reported Location',
        status: 'reported',
        upvote_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: authorProfile,
        has_upvoted: true,
      };

      const complaints = MockCivicStore.getComplaints();
      complaints.unshift(newComplaint);
      MockCivicStore.saveComplaints(complaints);

      return { data: newComplaint, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('complaints')
        .insert({
          user_id: input.userId,
          category: input.category,
          description: input.description.trim(),
          latitude: input.latitude,
          longitude: input.longitude,
          address: input.address ? input.address.trim() : null,
          photo_url: input.photoUrl || null,
          status: 'reported',
          upvote_count: 0,
        })
        .select('*, profile:profiles!complaints_user_id_fkey(*)')
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as Complaint, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Citizen updates own complaint (while still reported)
   */
  async updateComplaint(
    complaintId: string,
    userId: string,
    updates: UpdateComplaintInput
  ): Promise<{ data: Complaint | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      const complaints = MockCivicStore.getComplaints();
      const index = complaints.findIndex((c) => c.id === complaintId);
      if (index === -1) return { data: null, error: new Error('Complaint not found') };
      if (complaints[index].user_id !== userId || complaints[index].status !== 'reported' || complaints[index].resolution_confirmation_status === 'disputed') {
        return { data: null, error: new Error('This complaint cannot be edited in its current state.') };
      }

      complaints[index] = {
        ...complaints[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      MockCivicStore.saveComplaints(complaints);
      return { data: complaints[index], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('complaints')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', complaintId)
        .eq('user_id', userId)
        .eq('status', 'reported')
        .or('resolution_confirmation_status.is.null,resolution_confirmation_status.neq.disputed')
        .select('*, profile:profiles!complaints_user_id_fkey(*)')
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as Complaint, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Admin updates complaint status and appends an official resolution update
   */
  async adminUpdateComplaintStatus(
    input: AddComplaintUpdateInput
  ): Promise<{ data: Complaint | null; error: Error | null }> {
    if (isDemoGovernmentSession()) {
      const complaints = getDemoGovernmentComplaints();
      const index = complaints.findIndex((complaint) => complaint.id === input.complaintId);
      if (index < 0) return { data: null, error: new Error('Complaint not found') };

      const now = new Date().toISOString();
      const officer = DEMO_GOVERNMENT_PROFILE;
      const updatedComplaint: Complaint = {
        ...complaints[index],
        status: input.status,
        resolution_photo_url: input.status === 'resolved'
          ? input.photoUrl || null
          : input.photoUrl || complaints[index].resolution_photo_url,
        ...(input.status === 'resolved' ? {
          resolved_at: now,
          resolution_department: input.resolutionDepartment || complaints[index].department || null,
          resolution_officer_id: input.updatedBy,
          resolution_officer_name: officer?.name || 'Government Officer',
          resolution_note: input.note || null,
          resolution_confirmation_status: 'pending' as const,
          resolution_feedback: null,
          resolution_feedback_at: null,
        } : {}),
        updated_at: now,
      };
      complaints[index] = updatedComplaint;
      localStorage.setItem('civicfix_demo_government_complaints_v1', JSON.stringify(complaints));
      const demoUpdates = getDemoComplaintUpdates();
      const complaintUpdates = demoUpdates[input.complaintId] || [];
      complaintUpdates.push({
        id: `up-${Date.now()}`,
        complaint_id: input.complaintId,
        status: input.status,
        note: input.note || null,
        photo_url: input.photoUrl || null,
        updated_by: input.updatedBy,
        created_at: now,
        updater_profile: officer,
      });
      demoUpdates[input.complaintId] = complaintUpdates;
      localStorage.setItem('civicfix_demo_government_updates_v1', JSON.stringify(demoUpdates));
      return { data: updatedComplaint, error: null };
    }

    if (!isSupabaseConfigured) {
      const complaints = MockCivicStore.getComplaints();
      const index = complaints.findIndex((c) => c.id === input.complaintId);
      if (index === -1) return { data: null, error: new Error('Complaint not found') };

      const now = new Date().toISOString();
      const officer = MockCivicStore.getProfiles()[input.updatedBy] || DEMO_PROFILES['demo-admin-id'];
      const updatedComplaint: Complaint = {
        ...complaints[index],
        status: input.status,
        resolution_photo_url: input.status === 'resolved'
          ? input.photoUrl || null
          : input.photoUrl || complaints[index].resolution_photo_url,
        ...(input.status === 'resolved' ? {
          resolved_at: now,
          resolution_department: input.resolutionDepartment || complaints[index].department || null,
          resolution_officer_id: input.updatedBy,
          resolution_officer_name: officer.name,
          resolution_note: input.note?.trim() || null,
          resolution_confirmation_status: 'pending' as const,
          resolution_feedback: null,
          resolution_feedback_at: null,
        } : {}),
        updated_at: now,
      };
      complaints[index] = updatedComplaint;
      MockCivicStore.saveComplaints(complaints);

      // Add to updates list
      const updatesMap = MockCivicStore.getUpdates();
      const compUpdates = updatesMap[input.complaintId] || [];
      const newUpdate: ComplaintUpdate = {
        id: `up-${Date.now()}`,
        complaint_id: input.complaintId,
        status: input.status,
        note: input.note || null,
        photo_url: input.photoUrl || null,
        updated_by: input.updatedBy,
        created_at: now,
        updater_profile: officer,
      };
      compUpdates.push(newUpdate);
      updatesMap[input.complaintId] = compUpdates;
      MockCivicStore.saveUpdates(updatesMap);

      return { data: updatedComplaint, error: null };
    }

    try {
      const { data, error } = await supabase.rpc('admin_update_complaint_status_with_resolution', {
        p_complaint_id: input.complaintId,
        p_new_status: input.status,
        p_note: input.note?.trim() || null,
        p_photo_url: input.photoUrl || null,
        p_resolution_department: input.resolutionDepartment || null,
      });
      if (error) return { data: null, error };
      return { data: data as Complaint, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async submitResolutionFeedback(
    complaintId: string,
    userId: string,
    resolved: boolean,
    feedback?: string
  ): Promise<{ data: Complaint | null; error: Error | null }> {
    const now = new Date().toISOString();
    const status = resolved ? 'confirmed' : 'disputed';
    const note = feedback?.trim() || (resolved ? 'Citizen confirmed the issue is resolved.' : 'Citizen reports that the issue still exists.');
    if (feedback && feedback.trim().length > 1000) {
      return { data: null, error: new Error('Resolution feedback must be 1000 characters or fewer.') };
    }

    if (!isSupabaseConfigured) {
      const complaints = MockCivicStore.getComplaints();
      const index = complaints.findIndex((complaint) => complaint.id === complaintId && complaint.user_id === userId);
      if (index < 0) return { data: null, error: new Error('Complaint not found or not owned by this citizen.') };
      if (complaints[index].status !== 'resolved' || (complaints[index].resolution_confirmation_status && complaints[index].resolution_confirmation_status !== 'pending')) {
        return { data: null, error: new Error('This resolution is no longer awaiting confirmation.') };
      }
      const updatedComplaint: Complaint = {
        ...complaints[index],
        status: resolved ? 'resolved' : 'reported',
        resolution_confirmation_status: status,
        resolution_feedback: resolved ? null : note,
        resolution_feedback_at: now,
        updated_at: now,
      };
      complaints[index] = updatedComplaint;
      MockCivicStore.saveComplaints(complaints);
      const updates = MockCivicStore.getUpdates();
      const complaintUpdates = updates[complaintId] || [];
      complaintUpdates.push({
        id: `citizen-feedback-${Date.now()}`,
        complaint_id: complaintId,
        status: updatedComplaint.status,
        note,
        photo_url: null,
        updated_by: userId,
        created_at: now,
        updater_profile: MockCivicStore.getProfiles()[userId],
      });
      updates[complaintId] = complaintUpdates;
      MockCivicStore.saveUpdates(updates);
      return { data: updatedComplaint, error: null };
    }

    try {
      const { data, error } = await supabase.rpc('citizen_submit_resolution_feedback', {
        p_complaint_id: complaintId,
        p_resolved: resolved,
        p_feedback: feedback?.trim() || null,
      });
      if (error) return { data: null, error };
      return { data: data as Complaint, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Citizen deletes own complaint (only allowed when status is 'reported')
   */
  async deleteComplaint(complaintId: string, userId: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
      const complaints = MockCivicStore.getComplaints();
      const complaint = complaints.find((item) => item.id === complaintId);
      if (!complaint || complaint.user_id !== userId || complaint.status !== 'reported' || complaint.resolution_confirmation_status === 'disputed') {
        return { error: new Error('This complaint cannot be deleted in its current state.') };
      }
      const filteredComplaints = complaints.filter((c) => c.id !== complaintId);
      MockCivicStore.saveComplaints(filteredComplaints);
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', complaintId)
        .eq('user_id', userId)
        .eq('status', 'reported')
        .or('resolution_confirmation_status.is.null,resolution_confirmation_status.neq.disputed');

      return { error: error || null };
    } catch (err: any) {
      return { error: err };
    }
  },

  /**
   * Check for potential duplicate complaints in nearby proximity
   */
  async checkNearbyComplaints(
    lat: number,
    lng: number,
    category: ComplaintCategory,
    radiusMeters = 300
  ): Promise<{ data: NearbyComplaint[]; error: Error | null }> {
    const { data: openComplaints, error } = await this.getOpenComplaintsForMap();
    if (error || !openComplaints) {
      return { data: [], error };
    }

    const nearby: NearbyComplaint[] = openComplaints
      .filter((c) => c.category === category)
      .map((c) => ({
        ...c,
        distance_meters: calculateDistanceMeters(lat, lng, c.latitude, c.longitude),
      }))
      .filter((c) => c.distance_meters <= radiusMeters)
      .sort((a, b) => a.distance_meters - b.distance_meters);

    return { data: nearby, error: null };
  },

  /**
   * Add an upvote to a complaint
   */
  async addUpvote(complaintId: string, userId: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
      const upvotes = MockCivicStore.getUpvotes();
      if (!upvotes.some((u) => u.complaint_id === complaintId && u.user_id === userId)) {
        upvotes.push({
          id: `uv-${Date.now()}`,
          complaint_id: complaintId,
          user_id: userId,
          created_at: new Date().toISOString(),
        });
        MockCivicStore.saveUpvotes(upvotes);

        const complaints = MockCivicStore.getComplaints();
        const comp = complaints.find((c) => c.id === complaintId);
        if (comp) {
          comp.upvote_count = (comp.upvote_count || 0) + 1;
          comp.has_upvoted = true;
          MockCivicStore.saveComplaints(complaints);
        }
      }
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('upvotes')
        .insert({ complaint_id: complaintId, user_id: userId });

      return { error: error || null };
    } catch (err: any) {
      return { error: err };
    }
  },

  /**
   * Remove an upvote from a complaint
   */
  async removeUpvote(complaintId: string, userId: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
      let upvotes = MockCivicStore.getUpvotes();
      upvotes = upvotes.filter((u) => !(u.complaint_id === complaintId && u.user_id === userId));
      MockCivicStore.saveUpvotes(upvotes);

      const complaints = MockCivicStore.getComplaints();
      const comp = complaints.find((c) => c.id === complaintId);
      if (comp) {
        comp.upvote_count = Math.max(0, (comp.upvote_count || 1) - 1);
        comp.has_upvoted = false;
        MockCivicStore.saveComplaints(complaints);
      }
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('upvotes')
        .delete()
        .eq('complaint_id', complaintId)
        .eq('user_id', userId);

      return { error: error || null };
    } catch (err: any) {
      return { error: err };
    }
  },

  /**
   * Check if a specific user has upvoted a complaint
   */
  async checkUserUpvote(
    complaintId: string,
    userId: string
  ): Promise<{ hasUpvoted: boolean; error: Error | null }> {
    if (!isSupabaseConfigured) {
      const upvotes = MockCivicStore.getUpvotes();
      const exists = upvotes.some((u) => u.complaint_id === complaintId && u.user_id === userId);
      return { hasUpvoted: exists, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('upvotes')
        .select('id')
        .eq('complaint_id', complaintId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return { hasUpvoted: false, error };
      }

      return { hasUpvoted: Boolean(data), error: null };
    } catch (err: any) {
      return { hasUpvoted: false, error: err };
    }
  },

  /**
   * Get all complaint IDs upvoted by the user in one efficient query
   */
  async getUserUpvotedIds(userId: string): Promise<{ data: string[]; error: Error | null }> {
    if (!isSupabaseConfigured) {
      const upvotes = MockCivicStore.getUpvotes();
      const ids = upvotes.filter((u) => u.user_id === userId).map((u) => u.complaint_id);
      return { data: ids, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('upvotes')
        .select('complaint_id')
        .eq('user_id', userId);

      if (error) {
        return { data: [], error };
      }

      return { data: (data || []).map((u) => u.complaint_id), error: null };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },
};

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { 
  Complaint, 
  ComplaintCategory, 
  ComplaintStatus, 
  ComplaintUpdate, 
  NearbyComplaint, 
  AdminDashboardStats
} from '../types';
import { MockCivicStore, DEMO_PROFILES } from '../utils/mockData';

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
  updatedBy: string;
}

export interface AdminComplaintsParams {
  category?: ComplaintCategory | 'all';
  status?: ComplaintStatus | 'all';
  dateRange?: 'all' | 'today' | '7days' | '30days';
  searchQuery?: string;
  sortBy?: 'newest' | 'oldest' | 'updated' | 'upvotes';
  page?: number;
  pageSize?: number;
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

export const complaintsService = {
  /**
   * Fetch aggregate summary stats for the Admin Dashboard
   */
  async getAdminDashboardStats(): Promise<{ data: AdminDashboardStats; error: Error | null }> {
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
        .select('status');

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
      };

      allComplaints?.forEach((c) => {
        if (c.status === 'reported') stats.reported++;
        else if (c.status === 'in_progress') stats.in_progress++;
        else if (c.status === 'resolved') stats.resolved++;
        else if (c.status === 'rejected') stats.rejected++;
      });

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
      dateRange = 'all',
      searchQuery = '',
      sortBy = 'newest',
      page = 1,
      pageSize = 20,
    } = params;

    if (!isSupabaseConfigured) {
      let list = [...MockCivicStore.getComplaints()];

      if (category && category !== 'all') {
        list = list.filter((c) => c.category === category);
      }
      if (status && status !== 'all') {
        list = list.filter((c) => c.status === status);
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
          c.id.toLowerCase().includes(q)
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
        .select('*, profile:profiles(*)', { count: 'exact' });

      // 1. Category Filter
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      // 2. Status Filter
      if (status && status !== 'all') {
        query = query.eq('status', status);
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
        .select('*, profile:profiles(*)')
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
        .select('*, profile:profiles(*)')
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
        .select('*, profile:profiles(*)')
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
        .select('*, profile:profiles(*)')
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
        .select('*, profile:profiles(*)')
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
    if (!isSupabaseConfigured) {
      const complaints = MockCivicStore.getComplaints();
      const index = complaints.findIndex((c) => c.id === input.complaintId);
      if (index === -1) return { data: null, error: new Error('Complaint not found') };

      const updatedComplaint: Complaint = {
        ...complaints[index],
        status: input.status,
        resolution_photo_url: input.photoUrl || complaints[index].resolution_photo_url,
        updated_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
        updater_profile: DEMO_PROFILES['demo-admin-id'],
      };
      compUpdates.push(newUpdate);
      updatesMap[input.complaintId] = compUpdates;
      MockCivicStore.saveUpdates(updatesMap);

      return { data: updatedComplaint, error: null };
    }

    try {
      // 1. Update Complaint status and resolution photo
      const complaintUpdatePayload: any = {
        status: input.status,
        updated_at: new Date().toISOString(),
      };
      if (input.photoUrl) {
        complaintUpdatePayload.resolution_photo_url = input.photoUrl;
      }

      const { data: updatedComplaint, error: compError } = await supabase
        .from('complaints')
        .update(complaintUpdatePayload)
        .eq('id', input.complaintId)
        .select('*, profile:profiles(*)')
        .single();

      if (compError) {
        return { data: null, error: compError };
      }

      // 2. Insert audit log in complaint_updates
      const { error: updateError } = await supabase
        .from('complaint_updates')
        .insert({
          complaint_id: input.complaintId,
          status: input.status,
          note: input.note ? input.note.trim() : null,
          photo_url: input.photoUrl || null,
          updated_by: input.updatedBy,
        });

      if (updateError) {
        console.warn('[CivicFix Complaints] Warning: Audit log insert failed:', updateError.message);
      }

      return { data: updatedComplaint as Complaint, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Citizen deletes own complaint (only allowed when status is 'reported')
   */
  async deleteComplaint(complaintId: string, userId: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
      let complaints = MockCivicStore.getComplaints();
      complaints = complaints.filter((c) => c.id !== complaintId);
      MockCivicStore.saveComplaints(complaints);
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', complaintId)
        .eq('user_id', userId)
        .eq('status', 'reported');

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

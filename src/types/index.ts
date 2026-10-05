export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'citizen' | 'admin';

export type ComplaintCategory = 'pothole' | 'streetlight' | 'drainage' | 'garbage' | 'water_supply' | 'road_damage' | 'other';

export type ComplaintStatus = 'reported' | 'in_progress' | 'resolved' | 'rejected';
export type ComplaintPriority = 'low' | 'normal' | 'high' | 'critical';
export type ResolutionConfirmationStatus = 'pending' | 'confirmed' | 'disputed';

export interface Profile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  department?: string | null;
  ward?: string | null;
  created_at: string;
}

export interface Complaint {
  id: string;
  user_id: string;
  category: ComplaintCategory;
  description: string;
  photo_url: string | null;
  resolution_photo_url: string | null;
  resolved_at?: string | null;
  resolution_department?: string | null;
  resolution_officer_id?: string | null;
  resolution_officer_name?: string | null;
  resolution_note?: string | null;
  resolution_confirmation_status?: ResolutionConfirmationStatus | null;
  resolution_feedback?: string | null;
  resolution_feedback_at?: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  status: ComplaintStatus;
  upvote_count: number;
  created_at: string;
  updated_at: string;
  department?: string | null;
  assigned_officer_id?: string | null;
  assigned_officer?: Profile | null;
  priority?: ComplaintPriority;
  sla_deadline?: string | null;
  demo_status_label?: string | null;
  // Expanded relations
  profile?: Profile;
  has_upvoted?: boolean;
}

export interface ComplaintUpdate {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  note: string | null;
  photo_url: string | null;
  updated_by: string;
  created_at: string;
  // Expanded relation
  updater_profile?: Profile;
}

export interface Upvote {
  id: string;
  complaint_id: string;
  user_id: string;
  created_at: string;
}

export interface NearbyComplaint extends Complaint {
  distance_meters: number;
}

export interface AdminDashboardStats {
  total: number;
  reported: number;
  in_progress: number;
  resolved: number;
  rejected: number;
  critical: number;
  overdue: number;
  average_resolution_hours: number | null;
  department_counts: Record<string, number>;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      complaints: {
        Row: {
          id: string;
          user_id: string;
          category: ComplaintCategory;
          description: string;
          photo_url: string | null;
          resolution_photo_url: string | null;
          resolved_at: string | null;
          resolution_department: string | null;
          resolution_officer_id: string | null;
          resolution_officer_name: string | null;
          resolution_note: string | null;
          resolution_confirmation_status: ResolutionConfirmationStatus | null;
          resolution_feedback: string | null;
          resolution_feedback_at: string | null;
          latitude: number;
          longitude: number;
          address: string | null;
          status: ComplaintStatus;
          upvote_count: number;
          created_at: string;
          updated_at: string;
          department: string | null;
          assigned_officer_id: string | null;
          priority: ComplaintPriority;
          sla_deadline: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: ComplaintCategory;
          description: string;
          photo_url?: string | null;
          resolution_photo_url?: string | null;
          resolved_at?: string | null;
          resolution_department?: string | null;
          resolution_officer_id?: string | null;
          resolution_officer_name?: string | null;
          resolution_note?: string | null;
          resolution_confirmation_status?: ResolutionConfirmationStatus | null;
          resolution_feedback?: string | null;
          resolution_feedback_at?: string | null;
          latitude: number;
          longitude: number;
          address?: string | null;
          status?: ComplaintStatus;
          upvote_count?: number;
          created_at?: string;
          updated_at?: string;
          department?: string | null;
          assigned_officer_id?: string | null;
          priority?: ComplaintPriority;
          sla_deadline?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: ComplaintCategory;
          description?: string;
          photo_url?: string | null;
          resolution_photo_url?: string | null;
          resolved_at?: string | null;
          resolution_department?: string | null;
          resolution_officer_id?: string | null;
          resolution_officer_name?: string | null;
          resolution_note?: string | null;
          resolution_confirmation_status?: ResolutionConfirmationStatus | null;
          resolution_feedback?: string | null;
          resolution_feedback_at?: string | null;
          latitude?: number;
          longitude?: number;
          address?: string | null;
          status?: ComplaintStatus;
          upvote_count?: number;
          created_at?: string;
          updated_at?: string;
          department?: string | null;
          assigned_officer_id?: string | null;
          priority?: ComplaintPriority;
          sla_deadline?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "complaints_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_assigned_officer_id_fkey";
            columns: ["assigned_officer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_resolution_officer_id_fkey";
            columns: ["resolution_officer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      complaint_updates: {
        Row: {
          id: string;
          complaint_id: string;
          status: ComplaintStatus;
          note: string | null;
          photo_url: string | null;
          updated_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          complaint_id: string;
          status: ComplaintStatus;
          note?: string | null;
          photo_url?: string | null;
          updated_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          status?: ComplaintStatus;
          note?: string | null;
          photo_url?: string | null;
          updated_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complaint_updates_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaint_updates_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      upvotes: {
        Row: {
          id: string;
          complaint_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          complaint_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "upvotes_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "upvotes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: {
          user_id: string;
        };
        Returns: boolean;
      };
      find_nearby_complaints: {
        Args: {
          p_latitude: number;
          p_longitude: number;
          p_category: string;
          p_radius_meters?: number;
        };
        Returns: {
          id: string;
          user_id: string;
          category: ComplaintCategory;
          description: string;
          photo_url: string | null;
          latitude: number;
          longitude: number;
          address: string | null;
          status: ComplaintStatus;
          upvote_count: number;
          created_at: string;
          distance_meters: number;
        }[];
      };
      find_open_complaints_near_coords: {
        Args: {
          p_latitude: number;
          p_longitude: number;
          p_radius_meters?: number;
        };
        Returns: {
          id: string;
          user_id: string;
          category: ComplaintCategory;
          description: string;
          photo_url: string | null;
          latitude: number;
          longitude: number;
          address: string | null;
          status: ComplaintStatus;
          upvote_count: number;
          created_at: string;
          distance_meters: number;
        }[];
      };
      get_admin_dashboard_stats: {
        Args: Record<string, never>;
        Returns: AdminDashboardStats;
      };
      admin_update_complaint_status: {
        Args: {
          p_complaint_id: string;
          p_new_status: string;
          p_note?: string | null;
          p_photo_url?: string | null;
        };
        Returns: Complaint;
      };
      admin_update_complaint_status_with_resolution: {
        Args: {
          p_complaint_id: string;
          p_new_status: string;
          p_note?: string | null;
          p_photo_url?: string | null;
          p_resolution_department?: string | null;
        };
        Returns: Complaint;
      };
      citizen_submit_resolution_feedback: {
        Args: {
          p_complaint_id: string;
          p_resolved: boolean;
          p_feedback?: string | null;
        };
        Returns: Complaint;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

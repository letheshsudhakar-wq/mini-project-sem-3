import type { Complaint, ComplaintUpdate, Profile, AdminDashboardStats, Upvote } from '../types';

export const DEMO_PROFILES: Record<string, Profile> = {
  'demo-citizen-id': {
    id: 'demo-citizen-id',
    name: 'Arun Sharma',
    email: 'citizen@civicfix.org',
    phone: '+91 98765 43210',
    role: 'citizen',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-admin-id': {
    id: 'demo-admin-id',
    name: 'Priya Nair (City Engineer)',
    email: 'admin@civicfix.org',
    phone: '+91 91234 56789',
    role: 'admin',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

export const INITIAL_MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 'cf-101',
    user_id: 'demo-citizen-id',
    category: 'pothole',
    description: 'Deep hazardous pothole on 100 Feet Road causing sudden traffic slowdowns and bike skids.',
    photo_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    resolution_photo_url: null,
    latitude: 12.9716,
    longitude: 77.5946,
    address: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038',
    status: 'in_progress',
    upvote_count: 14,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    profile: DEMO_PROFILES['demo-citizen-id'],
    has_upvoted: false,
  },
  {
    id: 'cf-102',
    user_id: 'demo-citizen-id',
    category: 'streetlight',
    description: 'Continuous non-functioning streetlights along Sector 4 main walkway for over a week.',
    photo_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    resolution_photo_url: null,
    latitude: 12.9279,
    longitude: 77.6271,
    address: '5th Main, HSR Layout Sector 4, Bengaluru, Karnataka 560102',
    status: 'reported',
    upvote_count: 8,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    profile: DEMO_PROFILES['demo-citizen-id'],
    has_upvoted: false,
  },
  {
    id: 'cf-103',
    user_id: 'demo-citizen-id',
    category: 'garbage',
    description: 'Illegal waste dumping and uncleared bins overflowing onto the pedestrian pathway.',
    photo_url: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80',
    resolution_photo_url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
    latitude: 12.9352,
    longitude: 77.6245,
    address: 'Near Forum Mall Junction, Koramangala 7th Block, Bengaluru',
    status: 'resolved',
    upvote_count: 23,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    profile: DEMO_PROFILES['demo-citizen-id'],
    has_upvoted: true,
  },
  {
    id: 'cf-104',
    user_id: 'demo-citizen-id',
    category: 'drainage',
    description: 'Blocked storm water drain overflowing dirty water across the road during light rains.',
    photo_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
    resolution_photo_url: null,
    latitude: 12.9784,
    longitude: 77.6408,
    address: 'CMH Road near Metro Station, Indiranagar, Bengaluru',
    status: 'reported',
    upvote_count: 5,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    profile: DEMO_PROFILES['demo-citizen-id'],
    has_upvoted: false,
  },
];

export const INITIAL_MOCK_UPDATES: Record<string, ComplaintUpdate[]> = {
  'cf-101': [
    {
      id: 'up-1',
      complaint_id: 'cf-101',
      status: 'in_progress',
      note: 'Road repair team dispatched with asphalt mixing unit.',
      photo_url: null,
      updated_by: 'demo-admin-id',
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      updater_profile: DEMO_PROFILES['demo-admin-id'],
    },
  ],
  'cf-103': [
    {
      id: 'up-2',
      complaint_id: 'cf-103',
      status: 'in_progress',
      note: 'Sanitation truck assigned to clear waste dump.',
      photo_url: null,
      updated_by: 'demo-admin-id',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updater_profile: DEMO_PROFILES['demo-admin-id'],
    },
    {
      id: 'up-3',
      complaint_id: 'cf-103',
      status: 'resolved',
      note: 'Debris completely cleared and new sanitized disposal bins installed.',
      photo_url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
      updated_by: 'demo-admin-id',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updater_profile: DEMO_PROFILES['demo-admin-id'],
    },
  ],
};

const STORAGE_KEY_COMPLAINTS = 'civicfix_mock_complaints_v1';
const STORAGE_KEY_UPDATES = 'civicfix_mock_updates_v1';
const STORAGE_KEY_UPVOTES = 'civicfix_mock_upvotes_v1';
const STORAGE_KEY_PROFILES = 'civicfix_mock_profiles_v1';

export class MockCivicStore {
  private static getStored<T>(key: string, defaultVal: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private static setStored<T>(key: string, val: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  static getProfiles(): Record<string, Profile> {
    return this.getStored(STORAGE_KEY_PROFILES, DEMO_PROFILES);
  }

  static saveProfile(profile: Profile): void {
    const profiles = this.getProfiles();
    profiles[profile.id] = profile;
    this.setStored(STORAGE_KEY_PROFILES, profiles);
  }

  static getComplaints(): Complaint[] {
    return this.getStored(STORAGE_KEY_COMPLAINTS, INITIAL_MOCK_COMPLAINTS);
  }

  static saveComplaints(complaints: Complaint[]): void {
    this.setStored(STORAGE_KEY_COMPLAINTS, complaints);
  }

  static getUpdates(): Record<string, ComplaintUpdate[]> {
    return this.getStored(STORAGE_KEY_UPDATES, INITIAL_MOCK_UPDATES);
  }

  static saveUpdates(updates: Record<string, ComplaintUpdate[]>): void {
    this.setStored(STORAGE_KEY_UPDATES, updates);
  }

  static getUpvotes(): Upvote[] {
    return this.getStored(STORAGE_KEY_UPVOTES, [
      { id: 'uv-1', complaint_id: 'cf-103', user_id: 'demo-citizen-id', created_at: new Date().toISOString() },
    ]);
  }

  static saveUpvotes(upvotes: Upvote[]): void {
    this.setStored(STORAGE_KEY_UPVOTES, upvotes);
  }

  static getStats(): AdminDashboardStats {
    const list = this.getComplaints();
    const stats: AdminDashboardStats = {
      total: list.length,
      reported: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
    };
    list.forEach((c) => {
      if (c.status === 'reported') stats.reported++;
      else if (c.status === 'in_progress') stats.in_progress++;
      else if (c.status === 'resolved') stats.resolved++;
      else if (c.status === 'rejected') stats.rejected++;
    });
    return stats;
  }
}

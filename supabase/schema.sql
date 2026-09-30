-- ==============================================================================
-- CivicFix - Database Schema & Security Setup (Phase 1)
-- ==============================================================================
-- This script configures the entire database structure, RLS policies, triggers,
-- and storage configurations for the CivicFix civic grievance reporting platform.
--
-- Execute this script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLES DEFINITION
-- ==============================================================================

-- 2.1 Profiles Table (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Complaints Table
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('pothole', 'streetlight', 'drainage', 'garbage', 'other')),
  description TEXT NOT NULL,
  photo_url TEXT,
  resolution_photo_url TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'resolved', 'rejected')),
  upvote_count INTEGER NOT NULL DEFAULT 0 CHECK (upvote_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Complaint Updates (Audit Trail / Progress History)
CREATE TABLE IF NOT EXISTS public.complaint_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('reported', 'in_progress', 'resolved', 'rejected')),
  note TEXT,
  photo_url TEXT,
  updated_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Upvotes Table
CREATE TABLE IF NOT EXISTS public.upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_complaint_user_upvote UNIQUE (complaint_id, user_id)
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON public.complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON public.complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_coordinates ON public.complaints(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint_id ON public.complaint_updates(complaint_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_complaint_id ON public.upvotes(complaint_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_user_id ON public.upvotes(user_id);

-- ==============================================================================
-- 4. SECURITY & HELPER FUNCTIONS
-- ==============================================================================

-- 4.1 Admin Verification Function (Security Definer avoids RLS recursive loops)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- 4.2 Auto Updated_at Trigger Function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaints_set_updated_at ON public.complaints;
CREATE TRIGGER trg_complaints_set_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4.3 Profile Auto-Creation Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Citizen'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    'citizen' -- Force default to citizen; user cannot pass 'admin'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4.4 Profile Role Protection (Prevent users from upgrading themselves to admin)
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- 4.5 Upvote Counter Synchronization Function
CREATE OR REPLACE FUNCTION public.handle_upvote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.complaints
    SET upvote_count = upvote_count + 1
    WHERE id = NEW.complaint_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.complaints
    SET upvote_count = GREATEST(0, upvote_count - 1)
    WHERE id = OLD.complaint_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_upvote_inserted ON public.upvotes;
CREATE TRIGGER trg_upvote_inserted
  AFTER INSERT ON public.upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_upvote_change();

DROP TRIGGER IF EXISTS trg_upvote_deleted ON public.upvotes;
CREATE TRIGGER trg_upvote_deleted
  AFTER DELETE ON public.upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_upvote_change();

-- 4.6 Complaint Field Protection Trigger (Prevents citizen tampering with status/upvote_count)
CREATE OR REPLACE FUNCTION public.protect_complaint_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If not an admin, restrict modification of status and upvote_count
  IF NOT public.is_admin(auth.uid()) THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify complaint status.';
    END IF;
    -- Upvote count is managed exclusively via upvote triggers
    IF NEW.upvote_count IS DISTINCT FROM OLD.upvote_count THEN
      RAISE EXCEPTION 'Unauthorized: Direct modification of upvote_count is prohibited.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_complaint_fields ON public.complaints;
CREATE TRIGGER trg_protect_complaint_fields
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_complaint_fields();

-- 4.7 Function to find nearby unresolved complaints (Haversine calculation in meters)
CREATE OR REPLACE FUNCTION public.find_nearby_complaints(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_category TEXT,
  p_radius_meters DOUBLE PRECISION DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  category TEXT,
  description TEXT,
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  status TEXT,
  upvote_count INTEGER,
  created_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    c.id,
    c.user_id,
    c.category,
    c.description,
    c.photo_url,
    c.latitude,
    c.longitude,
    c.address,
    c.status,
    c.upvote_count,
    c.created_at,
    (
      6371000 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_latitude)) * cos(radians(c.latitude)) *
          cos(radians(c.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) * sin(radians(c.latitude))
        ))
      )
    ) AS distance_meters
  FROM public.complaints c
  WHERE c.status IN ('reported', 'in_progress')
    AND c.category = p_category
    AND (
      6371000 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_latitude)) * cos(radians(c.latitude)) *
          cos(radians(c.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) * sin(radians(c.latitude))
        ))
      )
    ) <= p_radius_meters
  ORDER BY distance_meters ASC;
$$;

-- 4.8 Function to find all open complaints near a coordinate (any category, Haversine in meters)
CREATE OR REPLACE FUNCTION public.find_open_complaints_near_coords(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_meters DOUBLE PRECISION DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  category TEXT,
  description TEXT,
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  status TEXT,
  upvote_count INTEGER,
  created_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    c.id,
    c.user_id,
    c.category,
    c.description,
    c.photo_url,
    c.latitude,
    c.longitude,
    c.address,
    c.status,
    c.upvote_count,
    c.created_at,
    (
      6371000 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_latitude)) * cos(radians(c.latitude)) *
          cos(radians(c.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) * sin(radians(c.latitude))
        ))
      )
    ) AS distance_meters
  FROM public.complaints c
  WHERE c.status IN ('reported', 'in_progress')
    AND (
      6371000 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_latitude)) * cos(radians(c.latitude)) *
          cos(radians(c.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) * sin(radians(c.latitude))
        ))
      )
    ) <= p_radius_meters
  ORDER BY distance_meters ASC;
$$;

-- 4.9 Function to fetch admin dashboard summary stats
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT json_build_object(
    'total', count(*),
    'reported', count(*) FILTER (WHERE status = 'reported'),
    'in_progress', count(*) FILTER (WHERE status = 'in_progress'),
    'resolved', count(*) FILTER (WHERE status = 'resolved'),
    'rejected', count(*) FILTER (WHERE status = 'rejected')
  )
  FROM public.complaints;
$$;

-- 4.10 Atomic function to update complaint status with audit record as Admin
CREATE OR REPLACE FUNCTION public.admin_update_complaint_status(
  p_complaint_id UUID,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS public.complaints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_updated_complaint public.complaints;
BEGIN
  v_admin_id := auth.uid();

  -- 1. Verify administrator privilege
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Access Denied: Only authenticated administrators can update complaint status.';
  END IF;

  -- 2. Validate valid status value
  IF p_new_status NOT IN ('reported', 'in_progress', 'resolved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid complaint status: %', p_new_status;
  END IF;

  -- 3. Update complaint record
  UPDATE public.complaints
  SET 
    status = p_new_status,
    resolution_photo_url = COALESCE(p_photo_url, resolution_photo_url),
    updated_at = NOW()
  WHERE id = p_complaint_id
  RETURNING * INTO v_updated_complaint;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint with ID % not found.', p_complaint_id;
  END IF;

  -- 4. Insert audit log record into complaint_updates
  INSERT INTO public.complaint_updates (
    complaint_id,
    status,
    note,
    photo_url,
    updated_by
  )
  VALUES (
    p_complaint_id,
    p_new_status,
    p_note,
    p_photo_url,
    v_admin_id
  );

  RETURN v_updated_complaint;
END;
$$;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5.1 PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Public/Authenticated users can view profiles (to display complaint authors & admin notes)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile information
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (e.g. promoting a user)
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- 5.2 COMPLAINTS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone (including public/anon if allowed) can view complaints
CREATE POLICY "Complaints are viewable by everyone"
  ON public.complaints
  FOR SELECT
  USING (true);

-- Authenticated citizens can create their own complaints
CREATE POLICY "Citizens can create complaints"
  ON public.complaints
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Citizens can update their own complaint ONLY while unresolved ('reported')
CREATE POLICY "Citizens can update their own reported complaints"
  ON public.complaints
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND status = 'reported'
  )
  WITH CHECK (
    auth.uid() = user_id AND status = 'reported'
  );

-- Citizens can delete their own complaint ONLY while unresolved ('reported')
CREATE POLICY "Citizens can delete their own reported complaints"
  ON public.complaints
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND status = 'reported'
  );

-- Admins can update any complaint (change status, add resolution photo, etc.)
CREATE POLICY "Admins can update any complaint"
  ON public.complaints
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Admins can delete any complaint
CREATE POLICY "Admins can delete any complaint"
  ON public.complaints
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- 5.3 COMPLAINT UPDATES POLICIES (AUDIT TRAIL)
-- ------------------------------------------------------------------------------
-- Everyone can view complaint update history
CREATE POLICY "Complaint updates are viewable by everyone"
  ON public.complaint_updates
  FOR SELECT
  USING (true);

-- Only admins can create complaint update records
CREATE POLICY "Only admins can insert complaint updates"
  ON public.complaint_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update complaint updates
CREATE POLICY "Only admins can modify complaint updates"
  ON public.complaint_updates
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can delete complaint updates
CREATE POLICY "Only admins can delete complaint updates"
  ON public.complaint_updates
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- 5.4 UPVOTES POLICIES
-- ------------------------------------------------------------------------------
-- Authenticated users can view upvotes
CREATE POLICY "Upvotes are viewable by authenticated users"
  ON public.upvotes
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can cast their own upvote
CREATE POLICY "Users can add their own upvote"
  ON public.upvotes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can remove their own upvote
CREATE POLICY "Users can delete their own upvote"
  ON public.upvotes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 6. STORAGE BUCKETS & POLICIES SETUP
-- ==============================================================================

-- Create buckets if they do not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resolution-images', 'resolution-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for complaint-images
CREATE POLICY "Complaint images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'complaint-images');

CREATE POLICY "Authenticated users can upload complaint images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'complaint-images');

CREATE POLICY "Users can delete their own complaint images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'complaint-images' AND (auth.uid() = owner OR public.is_admin(auth.uid())));

-- Storage Policies for resolution-images
CREATE POLICY "Resolution images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resolution-images');

CREATE POLICY "Only admins can upload resolution images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resolution-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete resolution images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'resolution-images' AND public.is_admin(auth.uid()));

-- ==============================================================================
-- 7. HELPER COMMENT: CREATING AN INITIAL ADMIN USER
-- ==============================================================================
-- After signing up your user in Supabase Auth, run the following query in the
-- SQL Editor replacing 'your-user-email@example.com' with the admin's email:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'your-user-email@example.com';
-- ==============================================================================

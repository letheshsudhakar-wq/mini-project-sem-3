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
  resolved_at TIMESTAMPTZ,
  resolution_department TEXT,
  resolution_officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_officer_name TEXT,
  resolution_note TEXT,
  resolution_confirmation_status TEXT CHECK (resolution_confirmation_status IN ('pending', 'confirmed', 'disputed')),
  resolution_feedback TEXT,
  resolution_feedback_at TIMESTAMPTZ,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'resolved', 'rejected')),
  upvote_count INTEGER NOT NULL DEFAULT 0 CHECK (upvote_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additive fields for government assignment workflows; existing citizen rows remain valid.
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS assigned_officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_department TEXT,
  ADD COLUMN IF NOT EXISTS resolution_officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution_officer_name TEXT,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT,
  ADD COLUMN IF NOT EXISTS resolution_confirmation_status TEXT CHECK (resolution_confirmation_status IN ('pending', 'confirmed', 'disputed')),
  ADD COLUMN IF NOT EXISTS resolution_feedback TEXT,
  ADD COLUMN IF NOT EXISTS resolution_feedback_at TIMESTAMPTZ;

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
CREATE INDEX IF NOT EXISTS idx_complaints_department ON public.complaints(department);
CREATE INDEX IF NOT EXISTS idx_complaints_sla_deadline ON public.complaints(sla_deadline);
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
  -- A null auth.uid() is reserved for trusted database provisioning contexts;
  -- authenticated client requests must already belong to an administrator.
  IF NEW.role IS DISTINCT FROM OLD.role
    AND auth.uid() IS NOT NULL
    AND NOT public.is_admin(auth.uid()) THEN
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
DECLARE
  v_feedback_update BOOLEAN := current_setting('civicfix.allow_resolution_feedback', true) = 'on';
BEGIN
  -- If not an admin, restrict modification of status and upvote_count
  IF NOT public.is_admin(auth.uid()) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
      AND NOT (v_feedback_update AND OLD.status = 'resolved' AND NEW.status = 'reported') THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify complaint status.';
    END IF;
    -- Upvote count is managed exclusively via upvote triggers
    IF NEW.upvote_count IS DISTINCT FROM OLD.upvote_count THEN
      RAISE EXCEPTION 'Unauthorized: Direct modification of upvote_count is prohibited.';
    END IF;
    IF NEW.department IS DISTINCT FROM OLD.department
      OR NEW.assigned_officer_id IS DISTINCT FROM OLD.assigned_officer_id
      OR NEW.priority IS DISTINCT FROM OLD.priority
      OR NEW.sla_deadline IS DISTINCT FROM OLD.sla_deadline THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify complaint assignments and priority.';
    END IF;
    IF NEW.resolution_photo_url IS DISTINCT FROM OLD.resolution_photo_url
      OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
      OR NEW.resolution_department IS DISTINCT FROM OLD.resolution_department
      OR NEW.resolution_officer_id IS DISTINCT FROM OLD.resolution_officer_id
      OR NEW.resolution_officer_name IS DISTINCT FROM OLD.resolution_officer_name
      OR NEW.resolution_note IS DISTINCT FROM OLD.resolution_note THEN
      RAISE EXCEPTION 'Unauthorized: Government resolution records cannot be modified by citizens.';
    END IF;
    IF (NEW.resolution_confirmation_status IS DISTINCT FROM OLD.resolution_confirmation_status
      OR NEW.resolution_feedback IS DISTINCT FROM OLD.resolution_feedback
      OR NEW.resolution_feedback_at IS DISTINCT FROM OLD.resolution_feedback_at)
      AND NOT v_feedback_update THEN
      RAISE EXCEPTION 'Unauthorized: Resolution feedback must be submitted through the verification workflow.';
    END IF;
  END IF;

  IF NEW.assigned_officer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.assigned_officer_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Assigned officer must have an administrator role.';
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: Government dashboard metrics require administrator authorization.';
  END IF;

  RETURN json_build_object(
    'total', (SELECT count(*) FROM public.complaints),
    'reported', (SELECT count(*) FROM public.complaints WHERE status = 'reported'),
    'in_progress', (SELECT count(*) FROM public.complaints WHERE status = 'in_progress'),
    'resolved', (SELECT count(*) FROM public.complaints WHERE status = 'resolved'),
    'rejected', (SELECT count(*) FROM public.complaints WHERE status = 'rejected'),
    'critical', (SELECT count(*) FROM public.complaints WHERE priority = 'critical'),
    'overdue', (
      SELECT count(*) FROM public.complaints
      WHERE sla_deadline < NOW() AND status IN ('reported', 'in_progress')
    ),
    'average_resolution_hours', (
      SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(resolution.resolved_at, c.updated_at) - c.created_at)) / 3600)
      FROM public.complaints c
      LEFT JOIN LATERAL (
        SELECT MIN(cu.created_at) AS resolved_at
        FROM public.complaint_updates cu
        WHERE cu.complaint_id = c.id AND cu.status = 'resolved'
      ) resolution ON true
      WHERE c.status = 'resolved'
    ),
    'department_counts', COALESCE((
      SELECT json_object_agg(department_name, complaint_count)
      FROM (
        SELECT COALESCE(department, 'Unassigned') AS department_name, count(*) AS complaint_count
        FROM public.complaints
        GROUP BY COALESCE(department, 'Unassigned')
      ) AS department_totals
    ), '{}'::json)
  );
END;
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

CREATE OR REPLACE FUNCTION public.admin_update_complaint_status_with_resolution(
  p_complaint_id UUID,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_resolution_department TEXT DEFAULT NULL
)
RETURNS public.complaints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_officer_name TEXT;
  v_updated_complaint public.complaints;
BEGIN
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can update complaint status.';
  END IF;
  IF p_new_status NOT IN ('reported', 'in_progress', 'resolved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid complaint status: %', p_new_status;
  END IF;

  SELECT name INTO v_officer_name FROM public.profiles WHERE id = v_admin_id;

  UPDATE public.complaints
  SET status = p_new_status,
      resolution_photo_url = CASE WHEN p_new_status = 'resolved' THEN p_photo_url ELSE resolution_photo_url END,
      resolved_at = CASE WHEN p_new_status = 'resolved' THEN NOW() ELSE resolved_at END,
      resolution_department = CASE WHEN p_new_status = 'resolved' THEN COALESCE(p_resolution_department, department) ELSE resolution_department END,
      resolution_officer_id = CASE WHEN p_new_status = 'resolved' THEN v_admin_id ELSE resolution_officer_id END,
      resolution_officer_name = CASE WHEN p_new_status = 'resolved' THEN v_officer_name ELSE resolution_officer_name END,
      resolution_note = CASE WHEN p_new_status = 'resolved' THEN p_note ELSE resolution_note END,
      resolution_confirmation_status = CASE WHEN p_new_status = 'resolved' THEN 'pending' ELSE resolution_confirmation_status END,
      resolution_feedback = CASE WHEN p_new_status = 'resolved' THEN NULL ELSE resolution_feedback END,
      resolution_feedback_at = CASE WHEN p_new_status = 'resolved' THEN NULL ELSE resolution_feedback_at END,
      updated_at = NOW()
  WHERE id = p_complaint_id
  RETURNING * INTO v_updated_complaint;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint with ID % not found.', p_complaint_id;
  END IF;

  INSERT INTO public.complaint_updates (complaint_id, status, note, photo_url, updated_by)
  VALUES (p_complaint_id, p_new_status, NULLIF(BTRIM(p_note), ''), p_photo_url, v_admin_id);

  RETURN v_updated_complaint;
END;
$$;

CREATE OR REPLACE FUNCTION public.citizen_submit_resolution_feedback(
  p_complaint_id UUID,
  p_resolved BOOLEAN,
  p_feedback TEXT DEFAULT NULL
)
RETURNS public.complaints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_updated_complaint public.complaints;
  v_note TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to verify a complaint resolution.';
  END IF;
  IF LENGTH(COALESCE(p_feedback, '')) > 1000 THEN
    RAISE EXCEPTION 'Resolution feedback must be 1000 characters or fewer.';
  END IF;

  SELECT * INTO v_updated_complaint
  FROM public.complaints
  WHERE id = p_complaint_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint not found or not owned by this citizen.';
  END IF;
  IF v_updated_complaint.status <> 'resolved'
    OR (v_updated_complaint.resolution_confirmation_status IS NOT NULL
      AND v_updated_complaint.resolution_confirmation_status <> 'pending') THEN
    RAISE EXCEPTION 'This resolution is no longer awaiting confirmation.';
  END IF;

  v_note := CASE
    WHEN NULLIF(BTRIM(p_feedback), '') IS NOT NULL THEN BTRIM(p_feedback)
    WHEN p_resolved THEN 'Citizen confirmed the issue is resolved.'
    ELSE 'Citizen reports that the issue still exists.'
  END;
  PERFORM set_config('civicfix.allow_resolution_feedback', 'on', true);

  UPDATE public.complaints
  SET status = CASE WHEN p_resolved THEN 'resolved' ELSE 'reported' END,
      resolution_confirmation_status = CASE WHEN p_resolved THEN 'confirmed' ELSE 'disputed' END,
      resolution_feedback = CASE WHEN p_resolved THEN NULL ELSE v_note END,
      resolution_feedback_at = NOW(),
      updated_at = NOW()
  WHERE id = p_complaint_id
  RETURNING * INTO v_updated_complaint;

  INSERT INTO public.complaint_updates (complaint_id, status, note, updated_by)
  VALUES (p_complaint_id, v_updated_complaint.status, v_note, v_user_id);

  RETURN v_updated_complaint;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_complaint_status_with_resolution(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_complaint_status_with_resolution(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.citizen_submit_resolution_feedback(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.citizen_submit_resolution_feedback(UUID, BOOLEAN, TEXT) TO authenticated;

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
    AND resolution_confirmation_status IS DISTINCT FROM 'disputed'
  )
  WITH CHECK (
    auth.uid() = user_id AND status = 'reported'
    AND resolution_confirmation_status IS DISTINCT FROM 'disputed'
  );

-- Citizens can delete their own complaint ONLY while unresolved ('reported')
CREATE POLICY "Citizens can delete their own reported complaints"
  ON public.complaints
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND status = 'reported'
    AND resolution_confirmation_status IS DISTINCT FROM 'disputed'
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

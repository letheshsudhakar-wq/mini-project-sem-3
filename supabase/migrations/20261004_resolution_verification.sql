-- Resolution verification workflow: official audit metadata and citizen feedback.

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_department TEXT,
  ADD COLUMN IF NOT EXISTS resolution_officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution_officer_name TEXT,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT,
  ADD COLUMN IF NOT EXISTS resolution_confirmation_status TEXT
    CHECK (resolution_confirmation_status IN ('pending', 'confirmed', 'disputed')),
  ADD COLUMN IF NOT EXISTS resolution_feedback TEXT,
  ADD COLUMN IF NOT EXISTS resolution_feedback_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_complaints_resolution_confirmation
  ON public.complaints(resolution_confirmation_status);

DROP POLICY IF EXISTS "Citizens can update their own reported complaints" ON public.complaints;
CREATE POLICY "Citizens can update their own reported complaints"
  ON public.complaints FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id AND status = 'reported'
    AND resolution_confirmation_status IS DISTINCT FROM 'disputed'
  )
  WITH CHECK (
    auth.uid() = user_id AND status = 'reported'
    AND resolution_confirmation_status IS DISTINCT FROM 'disputed'
  );

DROP POLICY IF EXISTS "Citizens can delete their own reported complaints" ON public.complaints;
CREATE POLICY "Citizens can delete their own reported complaints"
  ON public.complaints FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id AND status = 'reported'
    AND resolution_confirmation_status IS DISTINCT FROM 'disputed'
  );

CREATE OR REPLACE FUNCTION public.protect_complaint_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_feedback_update BOOLEAN := current_setting('civicfix.allow_resolution_feedback', true) = 'on';
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
      AND NOT (v_feedback_update AND OLD.status = 'resolved' AND NEW.status = 'reported') THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify complaint status.';
    END IF;
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
      resolution_note = CASE WHEN p_new_status = 'resolved' THEN NULLIF(BTRIM(p_note), '') ELSE resolution_note END,
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

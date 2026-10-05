-- Additive CivicFix government dashboard migration for existing deployments.

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS assigned_officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_complaints_department ON public.complaints(department);
CREATE INDEX IF NOT EXISTS idx_complaints_sla_deadline ON public.complaints(sla_deadline);

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
    AND auth.uid() IS NOT NULL
    AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_complaint_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
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
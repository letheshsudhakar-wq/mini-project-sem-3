-- Align supported complaint categories and persist each user's interface language.

ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS complaints_category_check;

ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_category_check
  CHECK (category IN ('pothole', 'streetlight', 'drainage', 'garbage', 'water_supply', 'road_damage', 'other'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_language_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_language_check
  CHECK (preferred_language IN ('en', 'hi'));

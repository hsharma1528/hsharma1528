-- ══════════════════════════════════════════════════════════════════
-- Migration: Epics 2-4 – Coach enrollment, mentee management, plans
-- ══════════════════════════════════════════════════════════════════

-- ── Coach enrollments ─────────────────────────────────────────────
-- References public.profiles so Supabase client can do FK joins
CREATE TABLE IF NOT EXISTS public.coach_enrollments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (athlete_id, coach_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_coach   ON public.coach_enrollments (coach_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_athlete ON public.coach_enrollments (athlete_id, status);

-- ── Workout plans ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Weekly Plan',
  week_start  DATE NOT NULL,
  days        JSONB DEFAULT '[]'::jsonb,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plans_athlete ON public.workout_plans (athlete_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_plans_coach   ON public.workout_plans (coach_id);

-- ── Extend workouts with plan reference ───────────────────────────
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS plan_id        UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_day_index INTEGER;

-- ── Row-Level Security ────────────────────────────────────────────
ALTER TABLE public.coach_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans     ENABLE ROW LEVEL SECURITY;

-- Enrollments
CREATE POLICY "enrollment_insert"        ON public.coach_enrollments FOR INSERT     WITH CHECK (auth.uid() = athlete_id);
CREATE POLICY "enrollment_select"        ON public.coach_enrollments FOR SELECT     USING (auth.uid() = athlete_id OR auth.uid() = coach_id);
CREATE POLICY "enrollment_update_coach"  ON public.coach_enrollments FOR UPDATE     USING (auth.uid() = coach_id);
CREATE POLICY "enrollment_delete_athlete" ON public.coach_enrollments FOR DELETE    USING (auth.uid() = athlete_id);

-- Workout plans
CREATE POLICY "plans_coach_all"      ON public.workout_plans FOR ALL    USING (auth.uid() = coach_id);
CREATE POLICY "plans_athlete_select" ON public.workout_plans FOR SELECT USING (auth.uid() = athlete_id);

-- Allow coaches to read their accepted mentees' activity
CREATE POLICY "workouts_coach_read" ON public.workouts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coach_enrollments e
    WHERE e.coach_id = auth.uid() AND e.athlete_id = workouts.user_id AND e.status = 'accepted'
  )
);

CREATE POLICY "nutrition_coach_read" ON public.nutrition_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coach_enrollments e
    WHERE e.coach_id = auth.uid() AND e.athlete_id = nutrition_logs.user_id AND e.status = 'accepted'
  )
);

CREATE POLICY "weight_coach_read" ON public.weight_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coach_enrollments e
    WHERE e.coach_id = auth.uid() AND e.athlete_id = weight_logs.user_id AND e.status = 'accepted'
  )
);

-- Allow coaches to read profile of accepted mentees (profiles already public)
-- (existing profiles_public_select policy covers this)

-- ── Triggers ──────────────────────────────────────────────────────
CREATE TRIGGER enrollments_updated_at
  BEFORE UPDATE ON public.coach_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

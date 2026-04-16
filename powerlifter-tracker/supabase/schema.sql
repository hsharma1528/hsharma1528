-- ══════════════════════════════════════════════════════════════════
-- PowerTrack – Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ══════════════════════════════════════════════════════════════════

-- ── Profiles ──────────────────────────────────────────────────────
-- Extends auth.users with powerlifting-specific data
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL,
  name            TEXT,
  age             INTEGER,
  gender          TEXT DEFAULT 'male',
  weight          DECIMAL(6,2),
  height          DECIMAL(5,2),
  weight_unit     TEXT DEFAULT 'lbs',
  phase           TEXT DEFAULT 'offseason',
  goal_weight     DECIMAL(6,2),
  meet_date       DATE,
  squat_max       DECIMAL(7,2) DEFAULT 0,
  bench_max       DECIMAL(7,2) DEFAULT 0,
  deadlift_max    DECIMAL(7,2) DEFAULT 0,
  target_calories INTEGER DEFAULT 2500,
  target_protein  INTEGER DEFAULT 180,
  target_carbs    INTEGER DEFAULT 300,
  target_fat      INTEGER DEFAULT 80,
  -- S1.1: role determines which experience the user sees
  role            TEXT DEFAULT 'athlete' CHECK (role IN ('athlete', 'coach')),
  -- S2.1: coach public profile fields
  bio                     TEXT,
  experience_years        INTEGER DEFAULT 0,
  is_available            BOOLEAN DEFAULT true,
  coaching_phases         JSONB DEFAULT '[]'::jsonb,
  coaching_weight_classes JSONB DEFAULT '[]'::jsonb,
  coaching_specialties    JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workouts ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workouts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  exercises  JSONB DEFAULT '[]'::jsonb,
  notes      TEXT,
  duration   INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts (user_id, date DESC);

-- ── Nutrition logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  meals      JSONB DEFAULT '[]'::jsonb,
  water      INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON public.nutrition_logs (user_id, date DESC);

-- ── Weight logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  weight     DECIMAL(6,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_weight_user_date ON public.weight_logs (user_id, date DESC);

-- ══════════════════════════════════════════════════════════════════
-- Row-Level Security
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs   ENABLE ROW LEVEL SECURITY;

-- Profiles: read-only for username uniqueness check; full access to own row
CREATE POLICY "profiles_public_select"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"      ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"      ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Workouts: own data only
CREATE POLICY "workouts_all_own" ON public.workouts FOR ALL USING (auth.uid() = user_id);

-- Nutrition: own data only
CREATE POLICY "nutrition_all_own" ON public.nutrition_logs FOR ALL USING (auth.uid() = user_id);

-- Weight: own data only
CREATE POLICY "weight_all_own" ON public.weight_logs FOR ALL USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════
-- Helper: auto-update updated_at on profiles
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

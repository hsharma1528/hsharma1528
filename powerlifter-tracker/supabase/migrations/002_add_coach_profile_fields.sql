-- ══════════════════════════════════════════════════════════════════
-- Migration: S2.1 – Add coach-specific profile fields
-- Run in Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio                      TEXT,
  ADD COLUMN IF NOT EXISTS experience_years         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_available             BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS coaching_phases          JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS coaching_weight_classes  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS coaching_specialties     JSONB DEFAULT '[]'::jsonb;

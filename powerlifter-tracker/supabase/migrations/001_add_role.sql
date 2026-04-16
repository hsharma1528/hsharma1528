-- ══════════════════════════════════════════════════════════════════
-- Migration: S1.1 – Add role column to profiles
-- Run this in Supabase Dashboard → SQL Editor if you already have
-- an existing profiles table from the original schema.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'athlete'
  CHECK (role IN ('athlete', 'coach'));

-- Backfill existing rows (all existing users become athletes)
UPDATE public.profiles SET role = 'athlete' WHERE role IS NULL;

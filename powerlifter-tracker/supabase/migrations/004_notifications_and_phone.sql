-- ══════════════════════════════════════════════════════════════════
-- Migration 004: Notifications table + phone number on profiles
-- Run in Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ── Feature 3: Phone number ───────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- ── Feature 2: In-app notifications ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Own rows only for SELECT / UPDATE / DELETE
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- INSERT is open to any authenticated user:
-- required so a coach can write a notification to an athlete's user_id
-- (no server/service-role key is available client-side)
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

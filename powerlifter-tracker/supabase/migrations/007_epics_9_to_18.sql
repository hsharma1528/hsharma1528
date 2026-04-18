-- ── Epic 14: Profile avatar + social links ────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url    TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url      TEXT,
  ADD COLUMN IF NOT EXISTS website_url      TEXT,
  ADD COLUMN IF NOT EXISTS notify_sms       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_whatsapp  BOOLEAN DEFAULT false;

-- ── Epic 15: Coach custom exercise library ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coach_exercises (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'other',
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_id, name)
);
CREATE INDEX IF NOT EXISTS idx_coach_exercises_coach ON public.coach_exercises(coach_id);
ALTER TABLE public.coach_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_exercises_own" ON public.coach_exercises FOR ALL USING (auth.uid() = coach_id);

-- ── Epic 9: Multi-week block templates ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.block_templates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_system       BOOLEAN DEFAULT false,
  title           TEXT NOT NULL,
  description     TEXT,
  tags            TEXT[] DEFAULT '{}',
  goal_squat      DECIMAL(7,2),
  goal_bench      DECIMAL(7,2),
  goal_deadlift   DECIMAL(7,2),
  goal_bodyweight DECIMAL(5,2),
  goal_notes      TEXT,
  duration_weeks  INTEGER,
  -- plans: [{week_offset: 0, title: 'Week 1', days: [...]}]
  plans           JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_block_templates_coach ON public.block_templates(coach_id);
ALTER TABLE public.block_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_templates_coach" ON public.block_templates FOR ALL  USING (auth.uid() = coach_id);
CREATE POLICY "block_templates_system_read" ON public.block_templates FOR SELECT USING (is_system = true);

-- ── Epic 13 + 18: Public programs & marketplace flags on plan_templates ───
ALTER TABLE public.plan_templates
  ADD COLUMN IF NOT EXISTS is_public        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_paid          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_cents      INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_price_id  TEXT;

-- Allow athletes to read public or paid templates
DROP POLICY IF EXISTS "templates_public_read" ON public.plan_templates;
CREATE POLICY "templates_public_read" ON public.plan_templates FOR SELECT
  USING (is_public = true OR is_paid = true);

-- ── Epic 13: Program subscriptions (athlete self-subscribes to free plans) ─
CREATE TABLE IF NOT EXISTS public.program_subscriptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id   UUID NOT NULL REFERENCES public.plan_templates(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, template_id)
);
ALTER TABLE public.program_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_own" ON public.program_subscriptions FOR ALL USING (auth.uid() = athlete_id);

-- ── Epic 18: Plan purchases (paid marketplace) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_purchases (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id       UUID NOT NULL REFERENCES public.plan_templates(id) ON DELETE CASCADE,
  amount_cents      INTEGER DEFAULT 0,
  stripe_session_id TEXT,
  purchased_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, template_id)
);
ALTER TABLE public.plan_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases_athlete" ON public.plan_purchases FOR ALL USING (auth.uid() = athlete_id);
CREATE POLICY "purchases_coach_read" ON public.plan_purchases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.plan_templates pt
    WHERE pt.id = template_id AND pt.coach_id = auth.uid()
  ));

-- ── Epic 17: In-app messaging ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender    ON public.messages(sender_id, created_at DESC);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_participant" ON public.messages FOR ALL
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ── Supabase Storage: avatars bucket ──────────────────────────────────────
-- NOTE: Run this in Supabase Dashboard SQL editor if it fails (requires admin)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatars publicly readable"  ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatar"    ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar"    ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar"    ON storage.objects;

CREATE POLICY "Avatars publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar"   ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar"   ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatar"   ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

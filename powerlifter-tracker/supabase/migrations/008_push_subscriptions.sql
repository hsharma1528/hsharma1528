-- Push notification subscriptions for PWA (Web Push API)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint   TEXT    NOT NULL,
  p256dh     TEXT    NOT NULL,
  auth       TEXT    NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_own" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

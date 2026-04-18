-- Personal Records (upsert: keep current best per exercise+rep_count)
CREATE TABLE IF NOT EXISTS public.personal_records (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  rep_count     INTEGER NOT NULL,
  weight        DECIMAL(7,2) NOT NULL,
  workout_id    UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  achieved_date DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_name, rep_count)
);
CREATE INDEX IF NOT EXISTS idx_pr_user ON public.personal_records(user_id, exercise_name);
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_own"    ON public.personal_records FOR ALL  USING (auth.uid() = user_id);
CREATE POLICY "pr_coach"  ON public.personal_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coach_enrollments
    WHERE coach_id = auth.uid() AND athlete_id = user_id AND status = 'accepted'
  ));

-- Workout Comments (coach leaves note on athlete session; athlete can reply)
CREATE TABLE IF NOT EXISTS public.workout_comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_workout ON public.workout_comments(workout_id, created_at ASC);
ALTER TABLE public.workout_comments ENABLE ROW LEVEL SECURITY;
-- Author can manage own comments
CREATE POLICY "comments_author" ON public.workout_comments FOR ALL USING (auth.uid() = author_id);
-- Athlete can read comments on their workouts
CREATE POLICY "comments_athlete_read" ON public.workout_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()
  ));
-- Coach can read+insert comments on enrolled athlete workouts
CREATE POLICY "comments_coach_read" ON public.workout_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workouts w
    JOIN public.coach_enrollments ce ON ce.athlete_id = w.user_id
    WHERE w.id = workout_id AND ce.coach_id = auth.uid() AND ce.status = 'accepted'
  ));
CREATE POLICY "comments_coach_insert" ON public.workout_comments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workouts w
    JOIN public.coach_enrollments ce ON ce.athlete_id = w.user_id
    WHERE w.id = workout_id AND ce.coach_id = auth.uid() AND ce.status = 'accepted'
  ) OR auth.uid() = author_id);

-- Weekly Check-ins
CREATE TABLE IF NOT EXISTS public.check_ins (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  energy       INTEGER CHECK (energy BETWEEN 1 AND 10),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
  soreness     INTEGER CHECK (soreness BETWEEN 1 AND 10),
  motivation   INTEGER CHECK (motivation BETWEEN 1 AND 10),
  notes        TEXT,
  coach_reply  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.check_ins(user_id, week_start DESC);
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins_own"   ON public.check_ins FOR ALL  USING (auth.uid() = user_id);
CREATE POLICY "checkins_coach" ON public.check_ins FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.coach_enrollments
    WHERE coach_id = auth.uid() AND athlete_id = user_id AND status = 'accepted'
  ));

-- Coach per-mentee nutrition targets
ALTER TABLE public.coach_enrollments
  ADD COLUMN IF NOT EXISTS custom_calories  INTEGER,
  ADD COLUMN IF NOT EXISTS custom_protein   INTEGER,
  ADD COLUMN IF NOT EXISTS custom_carbs     INTEGER,
  ADD COLUMN IF NOT EXISTS custom_fat       INTEGER;

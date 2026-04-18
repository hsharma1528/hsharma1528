-- Training Blocks
CREATE TABLE IF NOT EXISTS public.training_blocks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  goal_squat      DECIMAL(7,2),
  goal_bench      DECIMAL(7,2),
  goal_deadlift   DECIMAL(7,2),
  goal_bodyweight DECIMAL(5,2),
  goal_notes      TEXT,
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blocks_athlete ON public.training_blocks(athlete_id, start_date DESC);
ALTER TABLE public.training_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_coach" ON public.training_blocks FOR ALL
  USING (auth.uid() = coach_id);
CREATE POLICY "blocks_athlete_read" ON public.training_blocks FOR SELECT
  USING (auth.uid() = athlete_id);

-- Attach plans to a block
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.training_blocks(id) ON DELETE SET NULL;

-- Plan Templates
CREATE TABLE IF NOT EXISTS public.plan_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  days        JSONB DEFAULT '[]'::jsonb,
  is_system   BOOLEAN DEFAULT false,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.plan_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_coach_own" ON public.plan_templates FOR ALL
  USING (auth.uid() = coach_id);
CREATE POLICY "templates_system_read" ON public.plan_templates FOR SELECT
  USING (is_system = true);

-- Seed: 5/3/1 Week 1
INSERT INTO public.plan_templates (coach_id, title, description, is_system, tags, days) VALUES
(NULL, '5/3/1 Week 1', 'Wendler 5/3/1 first week (65/75/85%). Four days: squat, bench, deadlift, OHP.', true, ARRAY['5/3/1','wendler','intermediate'], '[
  {"id":"531-d1","day_label":"Day 1 – Squat","exercises":[
    {"id":"e1","name":"Squat","category":"squat","sets":"3","target_reps":"5","target_weight":"65%","notes":"Working sets: 65/75/85% of TM"},
    {"id":"e2","name":"Romanian Deadlift","category":"deadlift","sets":"5","target_reps":"10","target_weight":"50%","notes":""},
    {"id":"e3","name":"Leg Press","category":"other","sets":"5","target_reps":"10","target_weight":"","notes":""}
  ]},
  {"id":"531-d2","day_label":"Day 2 – Bench","exercises":[
    {"id":"e4","name":"Bench Press","category":"bench","sets":"3","target_reps":"5","target_weight":"65%","notes":"Working sets: 65/75/85% of TM"},
    {"id":"e5","name":"Dumbbell Row","category":"other","sets":"5","target_reps":"10","target_weight":"","notes":""},
    {"id":"e6","name":"Dips","category":"other","sets":"5","target_reps":"10","target_weight":"","notes":""}
  ]},
  {"id":"531-d3","day_label":"Day 3 – Deadlift","exercises":[
    {"id":"e7","name":"Deadlift","category":"deadlift","sets":"3","target_reps":"5","target_weight":"65%","notes":"Working sets: 65/75/85% of TM"},
    {"id":"e8","name":"Hanging Leg Raise","category":"other","sets":"5","target_reps":"15","target_weight":"","notes":""},
    {"id":"e9","name":"Good Morning","category":"other","sets":"3","target_reps":"10","target_weight":"","notes":""}
  ]},
  {"id":"531-d4","day_label":"Day 4 – OHP","exercises":[
    {"id":"e10","name":"Overhead Press","category":"bench","sets":"3","target_reps":"5","target_weight":"65%","notes":"Working sets: 65/75/85% of TM"},
    {"id":"e11","name":"Chin-ups","category":"other","sets":"5","target_reps":"10","target_weight":"","notes":""},
    {"id":"e12","name":"Face Pull","category":"other","sets":"5","target_reps":"15","target_weight":"","notes":""}
  ]}
]'::jsonb),

-- Texas Method
(NULL, 'Texas Method', 'Volume/Recovery/Intensity three-day split. Classic intermediate linear progression.', true, ARRAY['texas-method','intermediate','3-day'], '[
  {"id":"tx-d1","day_label":"Monday – Volume","exercises":[
    {"id":"e1","name":"Squat","category":"squat","sets":"5","target_reps":"5","target_weight":"90%","notes":"90% of Friday weight"},
    {"id":"e2","name":"Bench Press","category":"bench","sets":"5","target_reps":"5","target_weight":"90%","notes":""},
    {"id":"e3","name":"Deadlift","category":"deadlift","sets":"1","target_reps":"5","target_weight":"90%","notes":""}
  ]},
  {"id":"tx-d2","day_label":"Wednesday – Recovery","exercises":[
    {"id":"e4","name":"Squat","category":"squat","sets":"2","target_reps":"5","target_weight":"80%","notes":"Light — 80% of Monday"},
    {"id":"e5","name":"Overhead Press","category":"bench","sets":"3","target_reps":"5","target_weight":"","notes":""},
    {"id":"e6","name":"Pull-ups","category":"other","sets":"3","target_reps":"8","target_weight":"","notes":""}
  ]},
  {"id":"tx-d3","day_label":"Friday – Intensity","exercises":[
    {"id":"e7","name":"Squat","category":"squat","sets":"1","target_reps":"5","target_weight":"100%","notes":"New 5-rep PR attempt"},
    {"id":"e8","name":"Bench Press","category":"bench","sets":"1","target_reps":"5","target_weight":"100%","notes":""},
    {"id":"e9","name":"Power Clean","category":"other","sets":"5","target_reps":"3","target_weight":"","notes":""}
  ]}
]'::jsonb),

-- GZCLP
(NULL, 'GZCLP', 'Garage Gym Competitor Linear Progression — 3 tiers: T1 main lifts, T2 supplemental, T3 accessories.', true, ARRAY['gzclp','beginner','linear','3-day'], '[
  {"id":"gz-d1","day_label":"Day A","exercises":[
    {"id":"e1","name":"Squat","category":"squat","sets":"5","target_reps":"3","target_weight":"85%","notes":"T1: 5×3, add weight each session"},
    {"id":"e2","name":"Overhead Press","category":"bench","sets":"3","target_reps":"10","target_weight":"60%","notes":"T2: 3×10"},
    {"id":"e3","name":"Lat Pulldown","category":"other","sets":"3","target_reps":"15","target_weight":"","notes":"T3"}
  ]},
  {"id":"gz-d2","day_label":"Day B","exercises":[
    {"id":"e4","name":"Bench Press","category":"bench","sets":"5","target_reps":"3","target_weight":"85%","notes":"T1: 5×3"},
    {"id":"e5","name":"Deadlift","category":"deadlift","sets":"3","target_reps":"10","target_weight":"60%","notes":"T2: 3×10"},
    {"id":"e6","name":"Dumbbell Row","category":"other","sets":"3","target_reps":"15","target_weight":"","notes":"T3"}
  ]},
  {"id":"gz-d3","day_label":"Day C","exercises":[
    {"id":"e7","name":"Deadlift","category":"deadlift","sets":"5","target_reps":"3","target_weight":"85%","notes":"T1: 5×3"},
    {"id":"e8","name":"Squat","category":"squat","sets":"3","target_reps":"10","target_weight":"60%","notes":"T2: 3×10"},
    {"id":"e9","name":"Tricep Pushdown","category":"other","sets":"3","target_reps":"15","target_weight":"","notes":"T3"}
  ]}
]'::jsonb),

-- Beginner Linear
(NULL, 'Beginner Linear', 'Simple A/B alternating 3-day programme for novices. Add weight every session.', true, ARRAY['beginner','linear','novice','3-day'], '[
  {"id":"bl-a","day_label":"Day A (Mon/Fri)","exercises":[
    {"id":"e1","name":"Squat","category":"squat","sets":"3","target_reps":"5","target_weight":"","notes":"Add 2.5 kg each session"},
    {"id":"e2","name":"Bench Press","category":"bench","sets":"3","target_reps":"5","target_weight":"","notes":"Add 2.5 kg each session"},
    {"id":"e3","name":"Deadlift","category":"deadlift","sets":"1","target_reps":"5","target_weight":"","notes":"Add 5 kg each session"}
  ]},
  {"id":"bl-b","day_label":"Day B (Wed)","exercises":[
    {"id":"e4","name":"Squat","category":"squat","sets":"3","target_reps":"5","target_weight":"","notes":"Add 2.5 kg each session"},
    {"id":"e5","name":"Overhead Press","category":"bench","sets":"3","target_reps":"5","target_weight":"","notes":"Add 2.5 kg each session"},
    {"id":"e6","name":"Power Clean","category":"other","sets":"5","target_reps":"3","target_weight":"","notes":"Add 2.5 kg each session"}
  ]}
]'::jsonb),

-- Sheiko Block A
(NULL, 'Sheiko Block A', 'High-frequency Sheiko-style 4-day block. Moderate intensity, high volume on squat/bench/deadlift.', true, ARRAY['sheiko','powerlifting','intermediate','4-day'], '[
  {"id":"sh-d1","day_label":"Day 1 (Mon)","exercises":[
    {"id":"e1","name":"Squat","category":"squat","sets":"4","target_reps":"5","target_weight":"70%","notes":""},
    {"id":"e2","name":"Bench Press","category":"bench","sets":"4","target_reps":"5","target_weight":"70%","notes":""},
    {"id":"e3","name":"Romanian Deadlift","category":"deadlift","sets":"3","target_reps":"8","target_weight":"60%","notes":""}
  ]},
  {"id":"sh-d2","day_label":"Day 2 (Tue)","exercises":[
    {"id":"e4","name":"Bench Press","category":"bench","sets":"5","target_reps":"4","target_weight":"75%","notes":""},
    {"id":"e5","name":"Deadlift","category":"deadlift","sets":"4","target_reps":"4","target_weight":"70%","notes":""},
    {"id":"e6","name":"Close-Grip Bench","category":"bench","sets":"3","target_reps":"8","target_weight":"60%","notes":""}
  ]},
  {"id":"sh-d3","day_label":"Day 3 (Thu)","exercises":[
    {"id":"e7","name":"Squat","category":"squat","sets":"5","target_reps":"4","target_weight":"75%","notes":""},
    {"id":"e8","name":"Bench Press","category":"bench","sets":"4","target_reps":"5","target_weight":"70%","notes":""},
    {"id":"e9","name":"Good Morning","category":"other","sets":"3","target_reps":"8","target_weight":"","notes":""}
  ]},
  {"id":"sh-d4","day_label":"Day 4 (Fri)","exercises":[
    {"id":"e10","name":"Deadlift","category":"deadlift","sets":"5","target_reps":"4","target_weight":"75%","notes":""},
    {"id":"e11","name":"Squat","category":"squat","sets":"3","target_reps":"6","target_weight":"65%","notes":""},
    {"id":"e12","name":"Bench Press","category":"bench","sets":"3","target_reps":"8","target_weight":"65%","notes":""}
  ]}
]'::jsonb);

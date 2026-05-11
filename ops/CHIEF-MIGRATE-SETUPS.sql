-- =====================================================================
-- CHIEF — add sim_setups_parsed for AI-readable Coach Dave setup data
-- =====================================================================
-- Run once in Supabase SQL Editor.
-- After this, the AI tune-setup route can pull actual numeric values
-- (camber, toe, springs, dampers, gear ratios) instead of just filenames.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.sim_setups_parsed (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename      text NOT NULL,
  source        text DEFAULT 'coach-dave',
  -- Decoded from filename (CDA 26S1 LMST KERN R01.sto)
  season        text,
  car_code      text,
  car_name      text,
  track_code    text,
  track_name    text,
  session_type  text,        -- Practice | Qualifying | Race
  version       int,
  -- Parsed numeric setup parameters (camber, toe, springs, dampers, etc.)
  params        jsonb NOT NULL DEFAULT '{}'::jsonb,
  parse_score   real,        -- fraction of expected fields found
  ts            timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, filename)   -- one row per file per user, re-runs just upsert
);

CREATE INDEX IF NOT EXISTS idx_setups_user        ON public.sim_setups_parsed(user_id);
CREATE INDEX IF NOT EXISTS idx_setups_car_track   ON public.sim_setups_parsed(car_code, track_code);
CREATE INDEX IF NOT EXISTS idx_setups_user_ts     ON public.sim_setups_parsed(user_id, ts DESC);

ALTER TABLE public.sim_setups_parsed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "setups_select_own" ON public.sim_setups_parsed;
CREATE POLICY "setups_select_own"
  ON public.sim_setups_parsed FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "setups_insert_own" ON public.sim_setups_parsed;
CREATE POLICY "setups_insert_own"
  ON public.sim_setups_parsed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "setups_update_own" ON public.sim_setups_parsed;
CREATE POLICY "setups_update_own"
  ON public.sim_setups_parsed FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "setups_delete_own" ON public.sim_setups_parsed;
CREATE POLICY "setups_delete_own"
  ON public.sim_setups_parsed FOR DELETE
  USING (auth.uid() = user_id);

-- Verify
SELECT 'sim_setups_parsed' AS table_name,
       (SELECT count(*) FROM public.sim_setups_parsed) AS current_rows;

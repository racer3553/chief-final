-- =====================================================================
-- CHIEF — add sim_lap_traces table for per-lap telemetry storage
-- =====================================================================
-- Run once in Supabase SQL Editor for project gsxmzhvalmlzgyfbcnih.
-- After this, your sessions dashboard will have Delta-style overlays.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.sim_lap_traces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      uuid REFERENCES public.sim_session_captures(id) ON DELETE CASCADE,
  lap_number      int,
  lap_time        double precision,
  track           text,
  track_config    text,
  car             text,
  -- Full per-lap telemetry trace (array of samples).
  -- Each sample = {pct, speed, throttle, brake, steer, gear, rpm, lat, lon, yaw, t}
  samples         jsonb NOT NULL,
  -- Computed once at insert time for fast filtering / dedupe
  sample_count    int GENERATED ALWAYS AS (jsonb_array_length(samples)) STORED,
  source          text DEFAULT 'auto-capture-desktop',
  ts              timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sim_lap_traces_user        ON public.sim_lap_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_sim_lap_traces_session     ON public.sim_lap_traces(session_id);
CREATE INDEX IF NOT EXISTS idx_sim_lap_traces_track_car   ON public.sim_lap_traces(track, car);
CREATE INDEX IF NOT EXISTS idx_sim_lap_traces_user_ts     ON public.sim_lap_traces(user_id, ts DESC);

ALTER TABLE public.sim_lap_traces ENABLE ROW LEVEL SECURITY;

-- Users can only see/insert their own traces; service_role bypasses RLS
DROP POLICY IF EXISTS "lap_traces_select_own" ON public.sim_lap_traces;
CREATE POLICY "lap_traces_select_own"
  ON public.sim_lap_traces FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lap_traces_insert_own" ON public.sim_lap_traces;
CREATE POLICY "lap_traces_insert_own"
  ON public.sim_lap_traces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lap_traces_delete_own" ON public.sim_lap_traces;
CREATE POLICY "lap_traces_delete_own"
  ON public.sim_lap_traces FOR DELETE
  USING (auth.uid() = user_id);

-- Quick verify
SELECT 'sim_lap_traces' AS table_name,
       (SELECT count(*) FROM public.sim_lap_traces) AS current_rows;

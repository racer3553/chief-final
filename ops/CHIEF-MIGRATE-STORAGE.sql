-- =====================================================================
-- CHIEF — add Supabase Storage bucket for raw .sto file backup
-- =====================================================================
-- Run once in Supabase SQL Editor.
-- After this, raw .sto FILE BYTES (not just parsed values) live in the
-- cloud bucket "setup-files" — so even if you cancel Coach Dave AND lose
-- your local PC, you can re-download every paid setup you ever owned.
-- =====================================================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'setup-files',
  'setup-files',
  false,                                     -- private, RLS only
  10485760,                                  -- 10 MB per file (.sto are tiny ~2-50 KB)
  ARRAY['application/octet-stream', 'text/plain', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies — only the owner can read/write their own files.
--    File path convention: setup-files/<user_id>/<filename>.sto

DROP POLICY IF EXISTS "setup_files_select_own" ON storage.objects;
CREATE POLICY "setup_files_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'setup-files'
    AND (auth.uid()::text = (storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "setup_files_insert_own" ON storage.objects;
CREATE POLICY "setup_files_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'setup-files'
    AND (auth.uid()::text = (storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "setup_files_update_own" ON storage.objects;
CREATE POLICY "setup_files_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'setup-files'
    AND (auth.uid()::text = (storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "setup_files_delete_own" ON storage.objects;
CREATE POLICY "setup_files_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'setup-files'
    AND (auth.uid()::text = (storage.foldername(name))[1])
  );

-- 3. Add storage_path column to sim_setups_parsed so each row points
--    to its uploaded blob.
ALTER TABLE public.sim_setups_parsed
  ADD COLUMN IF NOT EXISTS storage_path  text,
  ADD COLUMN IF NOT EXISTS file_size     int,
  ADD COLUMN IF NOT EXISTS file_sha1     text;

CREATE INDEX IF NOT EXISTS idx_setups_storage_path
  ON public.sim_setups_parsed(storage_path) WHERE storage_path IS NOT NULL;

-- 4. Verify
SELECT 'bucket' AS what, id FROM storage.buckets WHERE id = 'setup-files'
UNION ALL
SELECT 'col_storage_path', column_name
  FROM information_schema.columns
  WHERE table_name = 'sim_setups_parsed' AND column_name = 'storage_path';

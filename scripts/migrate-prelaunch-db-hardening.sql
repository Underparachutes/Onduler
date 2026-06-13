-- Pre-launch DB hardening (applied to prod 2026-06-13 via Supabase migrations:
-- rls_uid_subselect, chapter_id_fk_indexes, backgrounds_scope_select_to_owner).
-- Source: Supabase security + performance advisors. Idempotent where it can be.
-- The canonical supabase-migration.sql is updated to match (RLS + indexes);
-- the storage policy below lives only here since storage RLS isn't in that file.
--
-- NOT included (do these in the dashboard / leave alone):
--   * Enable leaked-password protection: Auth → Password settings (no SQL).
--   * contact_submissions / waitlist "always true" INSERT policies: intentional
--     public forms, left as-is.

-- 1. RLS: evaluate auth.uid() once per query, not per row (perf, identical semantics).
ALTER POLICY "own chapters"       ON public.chapters       USING ((select auth.uid()) = user_id);
ALTER POLICY "own groups"         ON public.groups         USING ((select auth.uid()) = user_id);
ALTER POLICY "own logs"           ON public.logs           USING ((select auth.uid()) = user_id);
ALTER POLICY "own milestone_hits" ON public.milestone_hits USING ((select auth.uid()) = user_id);
ALTER POLICY "own milestones"     ON public.milestones     USING ((select auth.uid()) = user_id);
ALTER POLICY "own motions"        ON public.motions        USING ((select auth.uid()) = user_id);
ALTER POLICY "own reflections"    ON public.reflections    USING ((select auth.uid()) = user_id);
ALTER POLICY "own swells"         ON public.swells         USING ((select auth.uid()) = user_id);
ALTER POLICY "own user_settings"  ON public.user_settings  USING ((select auth.uid()) = user_id);
ALTER POLICY "own wave_checkins"  ON public.wave_checkins  USING ((select auth.uid()) = user_id);
ALTER POLICY "own motion_swells"  ON public.motion_swells  USING (EXISTS (
  SELECT 1 FROM public.motions
  WHERE motions.id = motion_swells.motion_id AND motions.user_id = (select auth.uid())
));

-- 2. Covering indexes for the chapter_id FKs (speeds ON DELETE CASCADE on archive/delete).
CREATE INDEX IF NOT EXISTS groups_chapter_id_idx        ON public.groups        (chapter_id);
CREATE INDEX IF NOT EXISTS logs_chapter_id_idx          ON public.logs          (chapter_id);
CREATE INDEX IF NOT EXISTS motions_chapter_id_idx       ON public.motions       (chapter_id);
CREATE INDEX IF NOT EXISTS reflections_chapter_id_idx   ON public.reflections   (chapter_id);
CREATE INDEX IF NOT EXISTS swells_chapter_id_idx        ON public.swells        (chapter_id);
CREATE INDEX IF NOT EXISTS wave_checkins_chapter_id_idx ON public.wave_checkins (chapter_id);

-- 3. Stop the public `backgrounds` bucket from being enumerable. The bucket is
-- public, so object content still serves via public URL with no SELECT RLS;
-- this only governed the LIST API. Scope SELECT to each user's own folder so
-- removeBackground (lists own folder) still works but no one can enumerate
-- other users' uploads.
DROP POLICY IF EXISTS "Public read access for backgrounds" ON storage.objects;
CREATE POLICY "Read own backgrounds" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'backgrounds'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

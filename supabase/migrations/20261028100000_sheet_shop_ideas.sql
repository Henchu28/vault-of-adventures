-- Per-character price override for general shop properties (null = general price).
ALTER TABLE public.sheet_property_locks ADD COLUMN IF NOT EXISTS cost integer;

-- Ideas players write for each skill; masters react with like/dislike.
CREATE TABLE public.sheet_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.sheet_characters(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('hab1','hab2','hab3')),
  content text NOT NULL CHECK (length(trim(content)) > 0),
  reaction text CHECK (reaction IN ('like','dislike')),
  reacted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sheet_ideas_character ON public.sheet_ideas(character_id);

ALTER TABLE public.sheet_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sheet ideas select" ON public.sheet_ideas FOR SELECT TO authenticated
  USING (public.sheet_can_access(character_id));
-- A player cannot rate their own idea: reaction must be empty unless the author is a master.
CREATE POLICY "sheet ideas insert" ON public.sheet_ideas FOR INSERT TO authenticated
  WITH CHECK (public.sheet_can_access(character_id) AND (reaction IS NULL OR public.has_role(auth.uid(), 'master')));
CREATE POLICY "sheet ideas update master" ON public.sheet_ideas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));
CREATE POLICY "sheet ideas delete" ON public.sheet_ideas FOR DELETE TO authenticated
  USING (public.sheet_can_access(character_id));

-- Live refresh for the master (same broadcast mechanism as the other tables).
CREATE TRIGGER app_sync_notify AFTER INSERT OR UPDATE OR DELETE ON public.sheet_ideas
  FOR EACH STATEMENT EXECUTE FUNCTION public.notify_app_sync();

-- Device tokens for push notifications (read with the service role by the notify-idea function).
CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_tokens_user ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push tokens own select" ON public.push_tokens FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push tokens own insert" ON public.push_tokens FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "push tokens own update" ON public.push_tokens FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "push tokens own delete" ON public.push_tokens FOR DELETE TO authenticated USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';

-- One free-text "power idea" per sheet: what the player wants their power to do. Masters read it and get notified.
CREATE TABLE public.sheet_power_ideas (
  character_id uuid PRIMARY KEY REFERENCES public.sheet_characters(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER sheet_power_ideas_updated BEFORE UPDATE ON public.sheet_power_ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sheet_power_ideas ENABLE ROW LEVEL SECURITY;

-- Owner or master can read; only the sheet's owner writes.
CREATE POLICY "sheet power ideas select" ON public.sheet_power_ideas FOR SELECT TO authenticated
  USING (public.sheet_can_access(character_id));
CREATE POLICY "sheet power ideas insert" ON public.sheet_power_ideas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sheet_characters c WHERE c.id = character_id AND c.user_id = auth.uid()));
CREATE POLICY "sheet power ideas update" ON public.sheet_power_ideas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sheet_characters c WHERE c.id = character_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sheet_characters c WHERE c.id = character_id AND c.user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';

-- Live refresh while the popup is open.
CREATE TRIGGER app_sync_notify AFTER INSERT OR UPDATE OR DELETE ON public.sheet_power_ideas
  FOR EACH STATEMENT EXECUTE FUNCTION public.notify_app_sync();

-- Marks ideas written by a master (they act as replies to the players' ideas).
ALTER TABLE public.sheet_ideas
  ADD COLUMN IF NOT EXISTS author_role text NOT NULL DEFAULT 'player' CHECK (author_role IN ('player', 'master'));

-- Set from the caller's role on insert, so a client cannot claim to be a master.
CREATE OR REPLACE FUNCTION public.sheet_ideas_set_author() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.author_role := CASE WHEN public.has_role(auth.uid(), 'master') THEN 'master' ELSE 'player' END;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sheet_ideas_set_author() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sheet_ideas_author ON public.sheet_ideas;
CREATE TRIGGER sheet_ideas_author BEFORE INSERT ON public.sheet_ideas
  FOR EACH ROW EXECUTE FUNCTION public.sheet_ideas_set_author();

NOTIFY pgrst, 'reload schema';

-- Master replies belong to one specific idea (parent_id), and players cannot delete master content.
ALTER TABLE public.sheet_ideas
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.sheet_ideas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sheet_ideas_parent ON public.sheet_ideas(parent_id);

-- On insert: the role comes from the caller; a reply must be written by a master, hangs from a top-level
-- idea, copies that idea's sheet and category, and is never rated.
CREATE OR REPLACE FUNCTION public.sheet_ideas_set_author() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.author_role := CASE WHEN public.has_role(auth.uid(), 'master') THEN 'master' ELSE 'player' END;
  IF NEW.parent_id IS NOT NULL THEN
    IF NEW.author_role <> 'master' THEN
      RAISE EXCEPTION 'Only masters can reply to ideas';
    END IF;
    SELECT p.character_id, p.category INTO NEW.character_id, NEW.category
      FROM public.sheet_ideas p WHERE p.id = NEW.parent_id AND p.parent_id IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent idea not found';
    END IF;
    NEW.reaction := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Masters delete anything. Players delete only their own ideas, and not once the master has replied to them.
-- (Deleting an idea as a master still removes its replies through the foreign key cascade.)
DROP POLICY IF EXISTS "sheet ideas delete" ON public.sheet_ideas;
CREATE POLICY "sheet ideas delete" ON public.sheet_ideas FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'master')
    OR (
      author_role = 'player'
      AND public.sheet_can_access(character_id)
      AND NOT EXISTS (SELECT 1 FROM public.sheet_ideas r WHERE r.parent_id = sheet_ideas.id)
    )
  );

NOTIFY pgrst, 'reload schema';

-- Power ideas become regular ideas (likes/dislikes and master replies) with category 'power'.
ALTER TABLE public.sheet_ideas DROP CONSTRAINT IF EXISTS sheet_ideas_category_check;
ALTER TABLE public.sheet_ideas ADD CONSTRAINT sheet_ideas_category_check CHECK (category IN ('hab1','hab2','hab3','power'));

-- Keep what players already wrote in the old single note.
DO $$
BEGIN
  IF to_regclass('public.sheet_power_ideas') IS NOT NULL THEN
    INSERT INTO public.sheet_ideas (character_id, category, content, created_at)
    SELECT character_id, 'power', content, created_at FROM public.sheet_power_ideas WHERE length(trim(content)) > 0;
    DROP TABLE public.sheet_power_ideas;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

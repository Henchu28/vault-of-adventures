CREATE TABLE public.saved_creature_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_creature_groups TO authenticated;
GRANT ALL ON public.saved_creature_groups TO service_role;
ALTER TABLE public.saved_creature_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Masters manage own groups" ON public.saved_creature_groups FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master'::app_role) AND user_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'master'::app_role) AND user_id = auth.uid());
CREATE TRIGGER update_saved_creature_groups_updated_at BEFORE UPDATE ON public.saved_creature_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.saved_creature_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.saved_creature_groups(id) ON DELETE CASCADE,
  creature_id UUID NOT NULL REFERENCES public.saved_creatures(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_creature_group_members TO authenticated;
GRANT ALL ON public.saved_creature_group_members TO service_role;
ALTER TABLE public.saved_creature_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Masters manage own group members" ON public.saved_creature_group_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.saved_creature_groups g WHERE g.id = group_id AND g.user_id = auth.uid() AND has_role(auth.uid(), 'master'::app_role)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.saved_creature_groups g WHERE g.id = group_id AND g.user_id = auth.uid() AND has_role(auth.uid(), 'master'::app_role)));
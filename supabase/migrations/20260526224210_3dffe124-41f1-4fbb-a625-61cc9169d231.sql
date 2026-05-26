
CREATE TABLE public.saved_attacks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  formula text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_attacks TO authenticated;
GRANT ALL ON public.saved_attacks TO service_role;
ALTER TABLE public.saved_attacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Masters manage own saved attacks" ON public.saved_attacks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master'::public.app_role) AND user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'master'::public.app_role) AND user_id = auth.uid());

CREATE TABLE public.saved_creatures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  hp integer NOT NULL DEFAULT 10,
  ac integer NOT NULL DEFAULT 10,
  initiative_formula text NOT NULL DEFAULT '1d20',
  alignment text NOT NULL DEFAULT 'enemy',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_creatures TO authenticated;
GRANT ALL ON public.saved_creatures TO service_role;
ALTER TABLE public.saved_creatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Masters manage own saved creatures" ON public.saved_creatures
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master'::public.app_role) AND user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'master'::public.app_role) AND user_id = auth.uid());

CREATE TRIGGER trg_saved_attacks_updated BEFORE UPDATE ON public.saved_attacks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_saved_creatures_updated BEFORE UPDATE ON public.saved_creatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

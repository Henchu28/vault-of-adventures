ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS character_name text;
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS known_by uuid[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, display_name, character_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'player'),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'character_name'), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Players only receive NPCs whose known_by contains their user id; masters receive all.
CREATE OR REPLACE FUNCTION public.get_npcs_public()
RETURNS TABLE(id bigint, name text, "Raza" text, "Arquetipo" text, "Elemento" text, "Esencia" text, "Edad" bigint, "Organización" text, "Estado" text, "ID_Campaña" bigint, alignment text, continent integer, region integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public
AS $$
SELECT n.id, n.name, n."Raza", n."Arquetipo", n."Elemento", n."Esencia", n."Edad", n."Organización", n."Estado", n."ID_Campaña", n.alignment, n.continent, n.region
FROM public.npcs n
WHERE auth.uid() IS NOT NULL
  AND (public.has_role(auth.uid(), 'master') OR auth.uid() = ANY (n.known_by));
$$;
REVOKE ALL ON FUNCTION public.get_npcs_public() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_npcs_public() TO authenticated, service_role;

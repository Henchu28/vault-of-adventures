ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS continent integer, ADD COLUMN IF NOT EXISTS region integer;
DROP TRIGGER IF EXISTS validate_character_geography ON public.characters;
CREATE TRIGGER validate_character_geography BEFORE INSERT OR UPDATE OF continent, region ON public.characters FOR EACH ROW EXECUTE FUNCTION public.validate_map_geography();
DROP FUNCTION public.get_characters_public();
CREATE FUNCTION public.get_characters_public()
RETURNS TABLE(id bigint, name text, "Raza" text, "Arquetipo" text, "Elemento" text, "Esencia" text, "Edad" bigint, "Organización" text, "Estado" text, "ID_Campaña" bigint, user_id uuid, continent integer, region integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public
AS $$
SELECT c.id, c.name, c."Raza", c."Arquetipo", c."Elemento", c."Esencia", c."Edad", c."Organización", c."Estado", c."ID_Campaña", c.user_id, c.continent, c.region
FROM public.characters c WHERE auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_characters_public() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_characters_public() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

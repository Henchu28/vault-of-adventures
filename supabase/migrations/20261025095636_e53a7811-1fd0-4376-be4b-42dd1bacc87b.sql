ALTER TABLE public.npcs ADD COLUMN continent integer, ADD COLUMN region integer;
CREATE TRIGGER validate_npc_geography BEFORE INSERT OR UPDATE OF continent, region ON public.npcs FOR EACH ROW EXECUTE FUNCTION public.validate_map_geography();
DROP FUNCTION public.get_npcs_public();
CREATE FUNCTION public.get_npcs_public()
RETURNS TABLE(id bigint, name text, "Raza" text, "Arquetipo" text, "Elemento" text, "Esencia" text, "Edad" bigint, "Organización" text, "Estado" text, "ID_Campaña" bigint, alignment text, continent integer, region integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public
AS $$
SELECT n.id, n.name, n."Raza", n."Arquetipo", n."Elemento", n."Esencia", n."Edad", n."Organización", n."Estado", n."ID_Campaña", n.alignment, n.continent, n.region
FROM public.npcs n WHERE auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_npcs_public() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_npcs_public() TO authenticated, service_role;
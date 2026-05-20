-- 1. Add new columns to characters and npcs
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS historia text DEFAULT '',
  ADD COLUMN IF NOT EXISTS apariencia text DEFAULT '',
  ADD COLUMN IF NOT EXISTS personalidad text DEFAULT '';

ALTER TABLE public.npcs
  ADD COLUMN IF NOT EXISTS historia text DEFAULT '',
  ADD COLUMN IF NOT EXISTS apariencia text DEFAULT '',
  ADD COLUMN IF NOT EXISTS personalidad text DEFAULT '';

-- 2. Drop existing permissive SELECT policies on base tables and tighten them
DROP POLICY IF EXISTS "Everyone can view characters" ON public.characters;
DROP POLICY IF EXISTS "Everyone can view npcs" ON public.npcs;

-- characters: master sees all rows, owner sees their own row, others get nothing via base table
CREATE POLICY "Master or owner can view characters"
ON public.characters
FOR SELECT
USING (
  public.has_role(auth.uid(), 'master'::public.app_role)
  OR (user_id IS NOT NULL AND user_id = auth.uid())
);

-- npcs: only master can SELECT base table (full info)
CREATE POLICY "Only master can view npcs base"
ON public.npcs
FOR SELECT
USING (public.has_role(auth.uid(), 'master'::public.app_role));

-- 3. Create public views with ONLY the main fields (no description / historia / apariencia / personalidad)
CREATE OR REPLACE VIEW public.characters_public
WITH (security_invoker=on) AS
SELECT
  id, name, "Raza", "Arquetipo", "Elemento", "Esencia",
  "Edad", "Organización", "Estado", "ID_Campaña", user_id
FROM public.characters;

CREATE OR REPLACE VIEW public.npcs_public
WITH (security_invoker=on) AS
SELECT
  id, name, "Raza", "Arquetipo", "Elemento", "Esencia",
  "Edad", "Organización", "Estado", "ID_Campaña", alignment
FROM public.npcs;

-- 4. Allow authenticated users to SELECT the views. To bypass base-table RLS for these
-- limited columns we create a SECURITY DEFINER function-based approach via a separate
-- policy that permits SELECT when the requester is authenticated AND only the public
-- columns are accessed. Simpler: create permissive SELECT policies that expose ALL rows
-- but rely on app code + views to hide sensitive columns is NOT enough.
-- Instead, expose data through SECURITY DEFINER functions that the views can call.

-- Replace views with SECURITY DEFINER table functions returning only safe columns:
DROP VIEW IF EXISTS public.characters_public;
DROP VIEW IF EXISTS public.npcs_public;

CREATE OR REPLACE FUNCTION public.get_characters_public()
RETURNS TABLE (
  id bigint, name text, "Raza" text, "Arquetipo" text, "Elemento" text,
  "Esencia" text, "Edad" bigint, "Organización" text, "Estado" text,
  "ID_Campaña" bigint, user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c."Raza", c."Arquetipo", c."Elemento",
         c."Esencia", c."Edad", c."Organización", c."Estado",
         c."ID_Campaña", c.user_id
  FROM public.characters c
  WHERE auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_npcs_public()
RETURNS TABLE (
  id bigint, name text, "Raza" text, "Arquetipo" text, "Elemento" text,
  "Esencia" text, "Edad" bigint, "Organización" text, "Estado" text,
  "ID_Campaña" bigint, alignment text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.id, n.name, n."Raza", n."Arquetipo", n."Elemento",
         n."Esencia", n."Edad", n."Organización", n."Estado",
         n."ID_Campaña", n.alignment
  FROM public.npcs n
  WHERE auth.uid() IS NOT NULL;
$$;

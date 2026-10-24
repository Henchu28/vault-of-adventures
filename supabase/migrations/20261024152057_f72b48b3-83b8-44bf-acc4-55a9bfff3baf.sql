ALTER TABLE public.maps ADD COLUMN continent integer, ADD COLUMN region integer;

CREATE OR REPLACE FUNCTION public.validate_map_geography()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.continent IS NULL THEN
    NEW.region := NULL;
  ELSE
    IF NEW.continent < 1 OR NEW.continent > 4 THEN
      RAISE EXCEPTION 'Continent must be between 1 and 4';
    END IF;
    IF NEW.region IS NOT NULL AND (NEW.region < 1 OR NEW.region > CASE WHEN NEW.continent = 4 THEN 12 ELSE 9 END) THEN
      RAISE EXCEPTION 'Invalid region for continent';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_map_geography BEFORE INSERT OR UPDATE ON public.maps FOR EACH ROW EXECUTE FUNCTION public.validate_map_geography();

CREATE TYPE public.rumor_status AS ENUM ('unknown', 'cold', 'warm', 'hot', 'proven');

CREATE TABLE public.campaign_rumors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id bigint NOT NULL,
  text text NOT NULL,
  status public.rumor_status NOT NULL DEFAULT 'unknown',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_rumors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view rumors"
  ON public.campaign_rumors FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can create rumors"
  ON public.campaign_rumors FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update rumors"
  ON public.campaign_rumors FOR UPDATE
  TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete rumors"
  ON public.campaign_rumors FOR DELETE
  TO authenticated USING (auth.uid() IS NOT NULL);

-- Trigger: only masters can set/change status
CREATE OR REPLACE FUNCTION public.enforce_rumor_status_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'unknown'::public.rumor_status
       AND NOT public.has_role(auth.uid(), 'master'::public.app_role) THEN
      NEW.status := 'unknown'::public.rumor_status;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT public.has_role(auth.uid(), 'master'::public.app_role) THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_rumor_status_permission_trigger
  BEFORE INSERT OR UPDATE ON public.campaign_rumors
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rumor_status_permission();

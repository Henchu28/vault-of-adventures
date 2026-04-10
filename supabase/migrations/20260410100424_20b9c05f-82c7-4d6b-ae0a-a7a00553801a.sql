
-- Add alignment to npcs
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS alignment text NOT NULL DEFAULT 'Unknown';

-- Add description to characters and npcs
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Character photos table
CREATE TABLE public.character_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  image_url text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.character_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view character photos"
  ON public.character_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Masters can create character photos"
  ON public.character_photos FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can update character photos"
  ON public.character_photos FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can delete character photos"
  ON public.character_photos FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'master'::app_role));

-- Campaign inventory table
CREATE TABLE public.campaign_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id bigint NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inventory"
  ON public.campaign_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create inventory"
  ON public.campaign_inventory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update inventory"
  ON public.campaign_inventory FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete inventory"
  ON public.campaign_inventory FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_campaign_inventory_updated_at
  BEFORE UPDATE ON public.campaign_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for character photos
INSERT INTO storage.buckets (id, name, public) VALUES ('character-photos', 'character-photos', true);

CREATE POLICY "Anyone can view character photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'character-photos');

CREATE POLICY "Masters can upload character photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'character-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Masters can delete character photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'character-photos' AND auth.uid() IS NOT NULL);

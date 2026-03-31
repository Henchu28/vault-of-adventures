
-- Create storage bucket for map images
INSERT INTO storage.buckets (id, name, public) VALUES ('maps', 'maps', true);

-- Allow everyone to read map images
CREATE POLICY "Everyone can read maps" ON storage.objects FOR SELECT USING (bucket_id = 'maps');

-- Allow authenticated users to upload map images
CREATE POLICY "Authenticated users can upload maps" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'maps');

-- Allow authenticated users to delete map images
CREATE POLICY "Authenticated users can delete maps" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'maps');

-- Add image_url column to maps table
ALTER TABLE public.maps ADD COLUMN image_url text DEFAULT NULL;

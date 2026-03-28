
-- Create storage bucket for song audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('songs', 'songs', true);

-- Allow everyone to read song files
CREATE POLICY "Everyone can read songs" ON storage.objects FOR SELECT USING (bucket_id = 'songs');

-- Allow authenticated users to upload song files
CREATE POLICY "Authenticated users can upload songs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'songs');

-- Allow authenticated users to delete song files
CREATE POLICY "Authenticated users can delete songs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'songs');

-- Change songs.file from bytea to text to store the storage URL
ALTER TABLE public.songs ALTER COLUMN file TYPE text USING null;

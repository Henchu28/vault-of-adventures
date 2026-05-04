-- Allow any authenticated user to add/edit/delete maps and character_photos

-- character_photos: replace master-only policies with authenticated-user policies
DROP POLICY IF EXISTS "Masters can create character photos" ON public.character_photos;
DROP POLICY IF EXISTS "Masters can update character photos" ON public.character_photos;
DROP POLICY IF EXISTS "Masters can delete character photos" ON public.character_photos;

CREATE POLICY "Authenticated can create character photos"
ON public.character_photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update character photos"
ON public.character_photos FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete character photos"
ON public.character_photos FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

-- maps: replace master-only ALL policy with granular authenticated policies
DROP POLICY IF EXISTS "Masters can modify maps" ON public.maps;

CREATE POLICY "Authenticated can create maps"
ON public.maps FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update maps"
ON public.maps FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete maps"
ON public.maps FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

-- Storage buckets policies for maps and character-photos
-- Allow any authenticated user to upload/delete in these public buckets
DROP POLICY IF EXISTS "Authenticated can upload maps" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete maps" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update maps" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload character photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete character photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update character photos" ON storage.objects;

CREATE POLICY "Authenticated can upload maps"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'maps');

CREATE POLICY "Authenticated can update maps"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'maps');

CREATE POLICY "Authenticated can delete maps"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'maps');

CREATE POLICY "Authenticated can upload character photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'character-photos');

CREATE POLICY "Authenticated can update character photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'character-photos');

CREATE POLICY "Authenticated can delete character photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'character-photos');
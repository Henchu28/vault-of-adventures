
-- Playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view playlists"
ON public.playlists FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create playlists"
ON public.playlists FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
ON public.playlists FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists"
ON public.playlists FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Junction table: playlist <-> songs
CREATE TABLE public.playlist_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id BIGINT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view playlist songs"
ON public.playlist_songs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Playlist owners can manage songs"
ON public.playlist_songs FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND user_id = auth.uid())
);

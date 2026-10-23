import { useAppSync } from '@/hooks/useAppSync';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Search, Music as MusicIcon, Play, Pause, Upload, ListMusic, Edit2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MusicPlayer from '@/components/music/MusicPlayer';

interface Song {
  id: number;
  name: string;
  file: string | null;
}

interface Playlist {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  songIds: number[];
}

export default function Music() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [playingSongId, setPlayingSongId] = useState<number | null>(null);
  const [playerSongs, setPlayerSongs] = useState<Song[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<number[]>([]);

  useEffect(() => { fetchSongs(); fetchPlaylists(); }, []);
  useAppSync(['songs', 'playlists', 'playlist_songs'], () => { fetchSongs(); fetchPlaylists(); });

  const fetchSongs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('songs').select('*').order('name', { ascending: true });
    if (error) {
      toast({ title: "Error", description: "Failed to fetch songs", variant: "destructive" });
    } else {
      setSongs(data || []);
    }
    setLoading(false);
  };

  const fetchPlaylists = async () => {
    const { data: playlistData, error } = await supabase
      .from('playlists')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching playlists:', error);
      return;
    }

    const { data: psData } = await supabase
      .from('playlist_songs')
      .select('*')
      .order('position', { ascending: true });

    const mapped: Playlist[] = (playlistData || []).map((p: any) => ({
      ...p,
      songIds: (psData || [])
        .filter((ps: any) => ps.playlist_id === p.id)
        .map((ps: any) => ps.song_id),
    }));
    setPlaylists(mapped);
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    setUploading(true);
    let fileUrl: string | null = null;
    if (formFile) {
      const fileExt = formFile.name.split('.').pop();
      const fileName = `${Date.now()}-${formName.trim().replace(/\s+/g, '_')}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('songs').upload(fileName, formFile, { contentType: formFile.type });
      if (uploadError) {
        toast({ title: "Error", description: "No se pudo subir el archivo de audio", variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('songs').getPublicUrl(fileName);
      fileUrl = urlData.publicUrl;
    }
    const { error } = await supabase.from('songs').insert({ name: formName.trim(), file: fileUrl });
    if (error) {
      toast({ title: "Error", description: "No se pudo añadir la canción", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Canción añadida correctamente" });
      setFormName('');
      setFormFile(null);
      setIsDialogOpen(false);
      fetchSongs();
    }
    setUploading(false);
  };

  const handleDelete = async (song: Song) => {
    if (song.file) {
      const path = song.file.split('/songs/').pop();
      if (path) await supabase.storage.from('songs').remove([path]);
    }
    const { error } = await supabase.from('songs').delete().eq('id', song.id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete song", variant: "destructive" });
    } else {
      if (playingSongId === song.id) setPlayingSongId(null);
      toast({ title: "Success", description: "Song deleted successfully" });
      fetchSongs();
      fetchPlaylists();
    }
  };

  const handlePlaySong = (song: Song, songsContext?: Song[]) => {
    if (!song.file) {
      toast({ title: "Sin archivo", description: "Esta canción no tiene archivo de audio", variant: "destructive" });
      return;
    }
    const ctx = songsContext || songs;
    setPlayerSongs(ctx);
    setPlayingSongId(playingSongId === song.id ? null : song.id);
  };

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    if (!user) return;

    const { data, error } = await supabase
      .from('playlists')
      .insert({ name: playlistName.trim(), user_id: user.id })
      .select()
      .single();

    if (error || !data) {
      toast({ title: "Error", description: "No se pudo crear la playlist", variant: "destructive" });
      return;
    }

    if (selectedSongIds.length > 0) {
      const rows = selectedSongIds.map((song_id, i) => ({
        playlist_id: data.id,
        song_id,
        position: i,
      }));
      await supabase.from('playlist_songs').insert(rows);
    }

    toast({ title: "¡Éxito!", description: "Playlist creada correctamente" });
    setPlaylistName('');
    setSelectedSongIds([]);
    setIsPlaylistDialogOpen(false);
    fetchPlaylists();
  };

  const handleUpdatePlaylist = async () => {
    if (!editingPlaylist || !playlistName.trim()) return;

    await supabase.from('playlists').update({ name: playlistName.trim() }).eq('id', editingPlaylist.id);
    await supabase.from('playlist_songs').delete().eq('playlist_id', editingPlaylist.id);

    if (selectedSongIds.length > 0) {
      const rows = selectedSongIds.map((song_id, i) => ({
        playlist_id: editingPlaylist.id,
        song_id,
        position: i,
      }));
      await supabase.from('playlist_songs').insert(rows);
    }

    toast({ title: "¡Éxito!", description: "Playlist actualizada" });
    setEditingPlaylist(null);
    setPlaylistName('');
    setSelectedSongIds([]);
    setIsPlaylistDialogOpen(false);
    fetchPlaylists();
  };

  const handleDeletePlaylist = async (playlist: Playlist) => {
    const { error } = await supabase.from('playlists').delete().eq('id', playlist.id);
    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar la playlist", variant: "destructive" });
    } else {
      if (activePlaylistId === playlist.id) setActivePlaylistId(null);
      toast({ title: "Success", description: "Playlist eliminada" });
      fetchPlaylists();
    }
  };

  const openEditPlaylist = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setPlaylistName(playlist.name);
    setSelectedSongIds(playlist.songIds);
    setIsPlaylistDialogOpen(true);
  };

  const toggleSongSelection = (songId: number) => {
    setSelectedSongIds(prev =>
      prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId]
    );
  };

  const playPlaylist = (playlist: Playlist) => {
    const playlistSongs = playlist.songIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => !!s && !!s.file);
    
    if (playlistSongs.length === 0) {
      toast({ title: "Sin canciones", description: "Esta playlist no tiene canciones con audio", variant: "destructive" });
      return;
    }
    setPlayerSongs(playlistSongs);
    setPlayingSongId(playlistSongs[0].id);
    setActivePlaylistId(playlist.id);
  };

  const filteredSongs = songs.filter(song =>
    song.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPlaylists = playlists.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading music...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Music Library</h1>
      </div>

      <div className="flex items-center space-x-2 p-4 bg-card rounded-lg">
        <Search className="w-4 h-4" />
        <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Now Playing */}
      {playingSongId && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur shadow-lg"><div className="container mx-auto max-w-3xl px-2 py-1"><MusicPlayer
          songs={playerSongs.length > 0 ? playerSongs : songs}
          currentSongId={playingSongId}
          onSongChange={setPlayingSongId}
          onStop={() => { setPlayingSongId(null); setActivePlaylistId(null); }}
        /></div></div>,
        document.body
      )}

      <Tabs defaultValue="songs">
        <TabsList>
          <TabsTrigger value="songs"><MusicIcon className="w-4 h-4 mr-2" />Canciones</TabsTrigger>
          <TabsTrigger value="playlists"><ListMusic className="w-4 h-4 mr-2" />Playlists</TabsTrigger>
        </TabsList>

        <TabsContent value="songs" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setFormName(''); setFormFile(null); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Add Song</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva Canción</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nombre de la canción" />
                  </div>
                  <div>
                    <Label>Archivo de audio</Label>
                    <Input type="file" accept=".mp3,.mp4,.aac,audio/mpeg,audio/mp4,audio/aac" onChange={(e) => setFormFile(e.target.files?.[0] || null)} className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Formatos: MP3, MP4, AAC</p>
                  </div>
                  <Button onClick={handleCreate} className="w-full" disabled={uploading}>
                    {uploading ? (<><Upload className="w-4 h-4 mr-2 animate-spin" />Subiendo...</>) : 'Añadir Canción'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSongs.map((song) => (
              <Card key={song.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MusicIcon className="w-5 h-5" />
                      <span className="truncate">{song.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(song)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    {song.file ? (
                      <Button variant={playingSongId === song.id ? "secondary" : "default"} onClick={() => handlePlaySong(song)}>
                        {playingSongId === song.id ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {playingSongId === song.id ? 'Playing' : 'Play'}
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin archivo de audio</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSongs.length === 0 && (
            <div className="text-center py-12">
              <MusicIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No songs found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms.' : 'Add your first song to get started!'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="playlists" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={isPlaylistDialogOpen} onOpenChange={(open) => {
              setIsPlaylistDialogOpen(open);
              if (!open) { setPlaylistName(''); setSelectedSongIds([]); setEditingPlaylist(null); }
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Nueva Playlist</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPlaylist ? 'Editar Playlist' : 'Nueva Playlist'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="Nombre de la playlist" />
                  </div>
                  <div>
                    <Label>Canciones</Label>
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                      {songs.map(song => (
                        <label key={song.id} className="flex items-center space-x-3 cursor-pointer hover:bg-accent/50 rounded p-1.5">
                          <Checkbox
                            checked={selectedSongIds.includes(song.id)}
                            onCheckedChange={() => toggleSongSelection(song.id)}
                          />
                          <MusicIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm truncate">{song.name}</span>
                          {!song.file && <span className="text-xs text-muted-foreground">(sin audio)</span>}
                        </label>
                      ))}
                      {songs.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">No hay canciones disponibles</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selectedSongIds.length} canción(es) seleccionada(s)</p>
                  </div>
                  <Button
                    onClick={editingPlaylist ? handleUpdatePlaylist : handleCreatePlaylist}
                    className="w-full"
                  >
                    {editingPlaylist ? 'Guardar Cambios' : 'Crear Playlist'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlaylists.map((playlist) => (
              <Card key={playlist.id} className={`hover:shadow-lg transition-shadow ${activePlaylistId === playlist.id ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ListMusic className="w-5 h-5" />
                      <span className="truncate">{playlist.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {user?.id === playlist.user_id && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEditPlaylist(playlist)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePlaylist(playlist)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{playlist.songIds.length} canción(es)</p>
                  <Button
                    variant={activePlaylistId === playlist.id ? "secondary" : "default"}
                    onClick={() => playPlaylist(playlist)}
                    className="w-full"
                  >
                    {activePlaylistId === playlist.id ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {activePlaylistId === playlist.id ? 'Reproduciendo' : 'Reproducir'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPlaylists.length === 0 && (
            <div className="text-center py-12">
              <ListMusic className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No playlists found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms.' : '¡Crea tu primera playlist!'}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

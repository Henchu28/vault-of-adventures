import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Search, Music as MusicIcon, Play, Pause, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MusicPlayer from '@/components/music/MusicPlayer';

interface Song {
  id: number;
  name: string;
  file: string | null;
}

export default function Music() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [playingSongId, setPlayingSongId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formName, setFormName] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);

  useEffect(() => { fetchSongs(); }, []);

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
    }
  };

  const handlePlaySong = (song: Song) => {
    if (!song.file) {
      toast({ title: "Sin archivo", description: "Esta canción no tiene archivo de audio", variant: "destructive" });
      return;
    }
    setPlayingSongId(playingSongId === song.id ? null : song.id);
  };

  const filteredSongs = songs.filter(song =>
    song.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading music...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Music Library</h1>
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

      <div className="flex items-center space-x-2 p-4 bg-card rounded-lg">
        <Search className="w-4 h-4" />
        <Input placeholder="Search songs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Now Playing - Spotify-style player */}
      {playingSongId && (
        <MusicPlayer
          songs={songs}
          currentSongId={playingSongId}
          onSongChange={setPlayingSongId}
          onStop={() => setPlayingSongId(null)}
        />
      )}

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
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Search, Music as MusicIcon, Play, Pause } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Song {
  id: number;
  name: string;
  file: any;
}

export default function Music() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [playingSong, setPlayingSong] = useState<number | null>(null);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch songs",
        variant: "destructive",
      });
    } else {
      setSongs(data || []);
    }
    
    setLoading(false);
  };

  const handleDelete = async (song: Song) => {
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', song.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete song",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Song deleted successfully",
      });
      fetchSongs();
    }
  };

  const togglePlay = (songId: number) => {
    if (playingSong === songId) {
      setPlayingSong(null);
    } else {
      setPlayingSong(songId);
      // Here you would implement actual audio playback
      toast({
        title: "Playing",
        description: "Audio playback would be implemented here",
      });
    }
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Song
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Song</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">Song upload form would go here</div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2 p-4 bg-card rounded-lg">
        <Search className="w-4 h-4" />
        <Input
          placeholder="Search songs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Music Player Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MusicIcon className="w-5 h-5" />
            <span>Now Playing</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            {playingSong ? (
              <div className="text-center">
                <p className="text-lg font-medium mb-2">
                  {songs.find(s => s.id === playingSong)?.name}
                </p>
                <Button onClick={() => setPlayingSong(null)}>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">No song playing</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Songs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSongs.map((song) => (
          <Card key={song.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MusicIcon className="w-5 h-5" />
                  <span className="truncate">{song.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(song)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <Button
                  variant={playingSong === song.id ? "secondary" : "default"}
                  onClick={() => togglePlay(song.id)}
                >
                  {playingSong === song.id ? (
                    <Pause className="w-4 h-4 mr-2" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  {playingSong === song.id ? 'Pause' : 'Play'}
                </Button>
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
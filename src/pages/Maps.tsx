import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Search, Map } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MapData {
  id: number;
  name: string;
  description: string;
  campaing_id: number;
}

export default function Maps() {
  const { isMaster } = useAuth();
  const { toast } = useToast();
  
  const [maps, setMaps] = useState<MapData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<MapData | null>(null);

  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch maps",
        variant: "destructive",
      });
    } else {
      setMaps(data || []);
    }
    
    setLoading(false);
  };

  const handleDelete = async (map: MapData) => {
    if (!isMaster) return;
    
    const { error } = await supabase
      .from('maps')
      .delete()
      .eq('id', map.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete map",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Map deleted successfully",
      });
      fetchMaps();
    }
  };

  const filteredMaps = maps.filter(map => 
    map.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    map.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading maps...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Maps</h1>
        {isMaster && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Map
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Map</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-muted-foreground">Map form would go here</div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2 p-4 bg-card rounded-lg">
        <Search className="w-4 h-4" />
        <Input
          placeholder="Search maps..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Maps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaps.map((map) => (
          <Card key={map.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Map className="w-5 h-5" />
                  <span>{map.name}</span>
                </div>
                {isMaster && (
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingMap(map)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(map)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {map.description || 'No description available'}
                </p>
                <div className="bg-muted rounded-lg h-32 flex items-center justify-center">
                  <Map className="w-8 h-8 text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Map Preview</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMaps.length === 0 && (
        <div className="text-center py-12">
          <Map className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No maps found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms.' : 'Add your first map to get started!'}
          </p>
        </div>
      )}
    </div>
  );
}
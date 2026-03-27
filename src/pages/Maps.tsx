import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Search, Map } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MapData {
  id: number;
  name: string;
  description: string;
  campaing_id: number;
}

interface Campaign {
  id: number;
  name: string;
}

export default function Maps() {
  const { isMaster } = useAuth();
  const { toast } = useToast();
  
  const [maps, setMaps] = useState<MapData[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<MapData | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCampaignId, setFormCampaignId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [mapsResult, campaignsResult] = await Promise.all([
      supabase.from('maps').select('*').order('name', { ascending: true }),
      supabase.from('campaigns').select('id, name'),
    ]);
    if (mapsResult.data) setMaps(mapsResult.data);
    if (campaignsResult.data) setCampaigns(campaignsResult.data);
    setLoading(false);
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormCampaignId('');
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('maps').insert({
      name: formName.trim(),
      description: formDescription.trim() || null,
      campaing_id: formCampaignId && formCampaignId !== 'none' ? Number(formCampaignId) : null,
    });
    if (error) {
      toast({ title: "Error", description: "No se pudo crear el mapa", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Mapa creado correctamente" });
      resetForm();
      setIsDialogOpen(false);
      fetchData();
    }
  };

  const handleDelete = async (map: MapData) => {
    if (!isMaster) return;
    const { error } = await supabase.from('maps').delete().eq('id', map.id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete map", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Map deleted successfully" });
      fetchData();
    }
  };

  const filteredMaps = maps.filter(map => 
    map.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (map.description && map.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading maps...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Maps</h1>
        {isMaster && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Map
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Mapa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nombre del mapa" />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descripción del mapa" />
                </div>
                <div>
                  <Label>Campaña</Label>
                  <Select value={formCampaignId} onValueChange={setFormCampaignId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar campaña" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguna</SelectItem>
                      {campaigns.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full">Crear Mapa</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center space-x-2 p-4 bg-card rounded-lg">
        <Search className="w-4 h-4" />
        <Input placeholder="Search maps..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

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
                    <Button variant="ghost" size="sm" onClick={() => setEditingMap(map)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(map)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{map.description || 'No description available'}</p>
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

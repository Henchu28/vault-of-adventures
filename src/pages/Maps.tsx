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
import { Plus, Edit, Trash2, Search, Map, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MapData {
  id: number;
  name: string;
  description: string;
  campaing_id: number;
  image_url: string | null;
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
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCampaignId, setFormCampaignId] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);

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
    setFormImage(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage.from('maps').upload(fileName, file, { contentType: file.type });
    if (error) {
      toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from('maps').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    setUploading(true);
    let imageUrl: string | null = null;
    if (formImage) {
      imageUrl = await uploadImage(formImage);
      if (!imageUrl) { setUploading(false); return; }
    }

    const { error } = await supabase.from('maps').insert({
      name: formName.trim(),
      description: formDescription.trim() || null,
      campaing_id: formCampaignId && formCampaignId !== 'none' ? Number(formCampaignId) : null,
      image_url: imageUrl,
    });
    if (error) {
      toast({ title: "Error", description: "No se pudo crear el mapa", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Mapa creado correctamente" });
      resetForm();
      setIsDialogOpen(false);
      fetchData();
    }
    setUploading(false);
  };

  const handleEdit = async () => {
    if (!editingMap || !formName.trim()) return;
    setUploading(true);
    let imageUrl = editingMap.image_url;

    if (formImage) {
      // Delete old image if exists
      if (imageUrl) {
        const path = imageUrl.split('/maps/').pop();
        if (path) await supabase.storage.from('maps').remove([path]);
      }
      imageUrl = await uploadImage(formImage);
      if (!imageUrl) { setUploading(false); return; }
    }

    const { error } = await supabase.from('maps').update({
      name: formName.trim(),
      description: formDescription.trim() || null,
      campaing_id: formCampaignId && formCampaignId !== 'none' ? Number(formCampaignId) : null,
      image_url: imageUrl,
    }).eq('id', editingMap.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar el mapa", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Mapa actualizado correctamente" });
      resetForm();
      setEditingMap(null);
      fetchData();
    }
    setUploading(false);
  };

  const handleDelete = async (map: MapData) => {
    if (!isMaster) return;
    if (map.image_url) {
      const path = map.image_url.split('/maps/').pop();
      if (path) await supabase.storage.from('maps').remove([path]);
    }
    const { error } = await supabase.from('maps').delete().eq('id', map.id);
    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar el mapa", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Mapa eliminado correctamente" });
      fetchData();
    }
  };

  const openEdit = (map: MapData) => {
    setEditingMap(map);
    setFormName(map.name);
    setFormDescription(map.description || '');
    setFormCampaignId(map.campaing_id ? String(map.campaing_id) : '');
    setFormImage(null);
  };

  const filteredMaps = maps.filter(map => 
    map.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (map.description && map.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading maps...</div>;
  }

  const mapFormJSX = (isEdit: boolean) => (
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
      <div>
        <Label>Imagen del mapa</Label>
        <Input 
          type="file" 
          accept="image/*"
          onChange={(e) => setFormImage(e.target.files?.[0] || null)}
        />
        {isEdit && editingMap?.image_url && !formImage && (
          <p className="text-xs text-muted-foreground mt-1">Ya tiene imagen. Sube otra para reemplazarla.</p>
        )}
      </div>
      <Button onClick={isEdit ? handleEdit : handleCreate} className="w-full" disabled={uploading}>
        {uploading ? (
          <><Upload className="w-4 h-4 mr-2 animate-spin" />Subiendo...</>
        ) : (
          isEdit ? 'Guardar Cambios' : 'Crear Mapa'
        )}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Maps</h1>
        {isMaster && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Map</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo Mapa</DialogTitle></DialogHeader>
              {mapFormJSX(false)}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingMap} onOpenChange={(open) => { if (!open) { setEditingMap(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Mapa</DialogTitle></DialogHeader>
          {mapFormJSX(true)}
        </DialogContent>
      </Dialog>

      <div className="flex items-center space-x-2 p-4 bg-card rounded-lg">
        <Search className="w-4 h-4" />
        <Input placeholder="Buscar mapas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaps.map((map) => (
          <Card key={map.id} className="hover:shadow-lg transition-shadow overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Map className="w-5 h-5" />
                  <span>{map.name}</span>
                </div>
                {isMaster && (
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(map)}>
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
                <p className="text-sm text-muted-foreground">{map.description || 'Sin descripción'}</p>
                {map.image_url ? (
                  <img src={map.image_url} alt={map.name} className="w-full h-48 object-cover rounded-lg" />
                ) : (
                  <div className="bg-muted rounded-lg h-32 flex items-center justify-center">
                    <Map className="w-8 h-8 text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Sin imagen</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMaps.length === 0 && (
        <div className="text-center py-12">
          <Map className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No se encontraron mapas</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Prueba con otros términos de búsqueda.' : '¡Añade tu primer mapa!'}
          </p>
        </div>
      )}
    </div>
  );
}

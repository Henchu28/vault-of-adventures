import { useAppSync } from '@/hooks/useAppSync';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, ImageIcon, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CharacterPhoto {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
}

export function GalleryPhotos() {
  const { isMaster, user } = useAuth();
  const { toast } = useToast();

  const [photos, setPhotos] = useState<CharacterPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<CharacterPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formName, setFormName] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);

  useEffect(() => { fetchPhotos(); }, []);
  useAppSync(['character_photos'], () => fetchPhotos());

  const fetchPhotos = async () => {
    setLoading(true);
    const { data } = await supabase.from('character_photos').select('*').order('name');
    if (data) setPhotos(data as CharacterPhoto[]);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!formName.trim() || !formImage || !user) return;
    setUploading(true);
    const fileName = `${Date.now()}-${formImage.name.replace(/\s+/g, '_')}`;
    const { error: uploadError } = await supabase.storage.from('character-photos').upload(fileName, formImage, { contentType: formImage.type });
    if (uploadError) { toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('character-photos').getPublicUrl(fileName);
    const { error } = await supabase.from('character_photos').insert({ name: formName.trim(), image_url: urlData.publicUrl, user_id: user.id });
    if (error) toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "Foto subida" }); setFormName(''); setFormImage(null); setIsDialogOpen(false); fetchPhotos(); }
    setUploading(false);
  };

  const handleDelete = async (photo: CharacterPhoto) => {
    const path = photo.image_url.split('/character-photos/').pop();
    if (path) await supabase.storage.from('character-photos').remove([path]);
    const { error } = await supabase.from('character_photos').delete().eq('id', photo.id);
    if (error) toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "Foto eliminada" }); fetchPhotos(); }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[200px]">Loading photos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Subir Foto</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Subir Foto de Personaje</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nombre *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre del personaje" /></div>
              <div><Label>Imagen *</Label><Input type="file" accept="image/*" onChange={e => setFormImage(e.target.files?.[0] || null)} /></div>
              <Button onClick={handleUpload} className="w-full" disabled={uploading || !formName.trim() || !formImage}>
                {uploading ? 'Subiendo...' : 'Subir Foto'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Photo viewer */}
      <Dialog open={!!viewingPhoto} onOpenChange={(open) => { if (!open) setViewingPhoto(null); }}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-lg font-bold">{viewingPhoto?.name}</h2>
            {viewingPhoto && <img src={viewingPhoto.image_url} alt={viewingPhoto.name} className="max-h-[75vh] max-w-full object-contain rounded-lg" />}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map(photo => (
          <Card key={photo.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group relative" onClick={() => setViewingPhoto(photo)}>
            <CardContent className="p-0">
              <img src={photo.image_url} alt={photo.name} className="w-full h-48 object-cover" />
              <div className="p-3 flex items-center justify-between">
                <span className="font-medium text-sm truncate">{photo.name}</span>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No hay fotos de personajes</h3>
        </div>
      )}
    </div>
  );
}

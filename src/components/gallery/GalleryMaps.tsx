import { useAppSync } from '@/hooks/useAppSync';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Search, Map, Upload, ZoomIn, ZoomOut, Pen, Eraser, Undo2 } from 'lucide-react';
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

export function GalleryMaps() {
  const { isMaster } = useAuth();
  const { toast } = useToast();

  const [maps, setMaps] = useState<MapData[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<MapData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingMap, setViewingMap] = useState<MapData | null>(null);
  const [zoom, setZoom] = useState(1);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#ff0000');
  const [drawSize, setDrawSize] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<Array<{points: {x: number; y: number}[]; color: string; size: number}>>([]);
  const [currentPath, setCurrentPath] = useState<{x: number; y: number}[]>([]);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCampaignId, setFormCampaignId] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);

  useEffect(() => { fetchData(); }, []);
  useAppSync(['maps', 'campaigns'], () => fetchData());

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

  const resetForm = () => { setFormName(''); setFormDescription(''); setFormCampaignId(''); setFormImage(null); };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage.from('maps').upload(fileName, file, { contentType: file.type });
    if (error) { toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" }); return null; }
    const { data: urlData } = supabase.storage.from('maps').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setUploading(true);
    let imageUrl: string | null = null;
    if (formImage) { imageUrl = await uploadImage(formImage); if (!imageUrl) { setUploading(false); return; } }
    const { error } = await supabase.from('maps').insert({ name: formName.trim(), description: formDescription.trim() || null, campaing_id: formCampaignId && formCampaignId !== 'none' ? Number(formCampaignId) : null, image_url: imageUrl });
    if (error) toast({ title: "Error", description: "No se pudo crear el mapa", variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "Mapa creado" }); resetForm(); setIsDialogOpen(false); fetchData(); }
    setUploading(false);
  };

  const handleEdit = async () => {
    if (!editingMap || !formName.trim()) return;
    setUploading(true);
    let imageUrl = editingMap.image_url;
    if (formImage) {
      if (imageUrl) { const path = imageUrl.split('/maps/').pop(); if (path) await supabase.storage.from('maps').remove([path]); }
      imageUrl = await uploadImage(formImage); if (!imageUrl) { setUploading(false); return; }
    }
    const { error } = await supabase.from('maps').update({ name: formName.trim(), description: formDescription.trim() || null, campaing_id: formCampaignId && formCampaignId !== 'none' ? Number(formCampaignId) : null, image_url: imageUrl }).eq('id', editingMap.id);
    if (error) toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "Mapa actualizado" }); resetForm(); setEditingMap(null); fetchData(); }
    setUploading(false);
  };

  const handleDelete = async (map: MapData) => {
    if (map.image_url) { const path = map.image_url.split('/maps/').pop(); if (path) await supabase.storage.from('maps').remove([path]); }
    const { error } = await supabase.from('maps').delete().eq('id', map.id);
    if (error) toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "Mapa eliminado" }); fetchData(); }
  };

  const openEdit = (map: MapData) => { setEditingMap(map); setFormName(map.name); setFormDescription(map.description || ''); setFormCampaignId(map.campaing_id ? String(map.campaing_id) : ''); setFormImage(null); };

  // Drawing functions
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const path of paths) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    }
  }, [paths]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawMode) return;
    setIsDrawing(true);
    setCurrentPath([getCanvasPoint(e)]);
  };

  const moveDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawMode) return;
    const point = getCanvasPoint(e);
    setCurrentPath(prev => [...prev, point]);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || currentPath.length < 1) return;
    redrawCanvas();
    ctx.beginPath();
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const allPoints = [...currentPath, point];
    ctx.moveTo(allPoints[0].x, allPoints[0].y);
    for (let i = 1; i < allPoints.length; i++) ctx.lineTo(allPoints[i].x, allPoints[i].y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      setPaths(prev => [...prev, { points: currentPath, color: drawColor, size: drawSize }]);
    }
    setCurrentPath([]);
  };

  const undoLastPath = () => setPaths(prev => prev.slice(0, -1));
  const clearDrawing = () => setPaths([]);

  const filteredMaps = maps.filter(map =>
    map.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (map.description && map.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="flex justify-center items-center min-h-[200px]">Loading maps...</div>;

  const mapFormJSX = (isEdit: boolean) => (
    <div className="space-y-4">
      <div><Label>Nombre *</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nombre del mapa" /></div>
      <div><Label>Descripción</Label><Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descripción del mapa" /></div>
      <div>
        <Label>Campaña</Label>
        <Select value={formCampaignId} onValueChange={setFormCampaignId}>
          <SelectTrigger><SelectValue placeholder="Seleccionar campaña" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unknown</SelectItem>
            {campaigns.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Imagen del mapa</Label>
        <Input type="file" accept="image/*" onChange={(e) => setFormImage(e.target.files?.[0] || null)} />
      </div>
      <Button onClick={isEdit ? handleEdit : handleCreate} className="w-full" disabled={uploading}>
        {uploading ? 'Subiendo...' : isEdit ? 'Guardar Cambios' : 'Crear Mapa'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Map</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Nuevo Mapa</DialogTitle></DialogHeader>{mapFormJSX(false)}</DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingMap} onOpenChange={(open) => { if (!open) { setEditingMap(null); resetForm(); } }}>
        <DialogContent><DialogHeader><DialogTitle>Editar Mapa</DialogTitle></DialogHeader>{mapFormJSX(true)}</DialogContent>
      </Dialog>

      {/* Map Viewer with Drawing */}
      <Dialog open={!!viewingMap} onOpenChange={(open) => { if (!open) { setViewingMap(null); setZoom(1); setPaths([]); setDrawMode(false); } }}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] p-0 overflow-hidden">
          <div className="relative">
            <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur-sm rounded-md px-3 py-1">
              <span className="font-semibold text-sm">{viewingMap?.name}</span>
            </div>
            <div className="absolute top-3 right-3 z-10 flex gap-2 flex-wrap">
              <Button variant={drawMode ? "default" : "secondary"} size="icon" onClick={() => setDrawMode(!drawMode)} title="Draw">
                <Pen className="w-4 h-4" />
              </Button>
              {drawMode && (
                <>
                  <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                  <Button variant="secondary" size="icon" onClick={undoLastPath} title="Undo"><Undo2 className="w-4 h-4" /></Button>
                  <Button variant="secondary" size="icon" onClick={clearDrawing} title="Clear"><Eraser className="w-4 h-4" /></Button>
                </>
              )}
              <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.min(z + 0.25, 4))}><ZoomIn className="w-4 h-4" /></Button>
              <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}><ZoomOut className="w-4 h-4" /></Button>
              <Button variant="secondary" size="icon" onClick={() => setZoom(1)}>1:1</Button>
            </div>
            <div className="overflow-auto h-[calc(98vh-4rem)] w-full flex items-center justify-center bg-black/90" ref={containerRef}>
              {viewingMap?.image_url && (
                <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
                  <img src={viewingMap.image_url} alt={viewingMap.name} onLoad={(e) => {
                    const img = e.currentTarget;
                    if (canvasRef.current) {
                      canvasRef.current.width = img.naturalWidth;
                      canvasRef.current.height = img.naturalHeight;
                      redrawCanvas();
                    }
                  }} />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ cursor: drawMode ? 'crosshair' : 'default' }}
                    onMouseDown={startDraw}
                    onMouseMove={moveDraw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center space-x-2 p-3 bg-card rounded-lg">
        <Search className="w-4 h-4" />
        <Input placeholder="Buscar mapas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaps.map((map) => (
          <Card key={map.id} className="hover:shadow-lg transition-shadow overflow-hidden cursor-pointer" onClick={() => map.image_url && setViewingMap(map)}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2"><Map className="w-5 h-5" /><span>{map.name}</span></div>
                <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(map)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(map)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{map.description || 'Sin descripción'}</p>
              {map.image_url ? (
                <img src={map.image_url} alt={map.name} className="w-full h-48 object-cover rounded-lg" />
              ) : (
                <div className="bg-muted rounded-lg h-32 flex items-center justify-center">
                  <Map className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMaps.length === 0 && (
        <div className="text-center py-12">
          <Map className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No se encontraron mapas</h3>
        </div>
      )}
    </div>
  );
}

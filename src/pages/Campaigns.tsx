import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Sword, Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import campaignsImg from '@/assets/campaigns-card.jpg';

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  drive_folder_id: string | null;
}

interface Session {
  name: string;
  content: string;
  sessionNumber: number;
}

export default function Campaigns() {
  const { isMaster } = useAuth();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDriveFolderId, setFormDriveFolderId] = useState('');

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('campaigns').select('*').order('id', { ascending: true });
    if (error) {
      toast({ title: "Error", description: "Failed to fetch campaigns", variant: "destructive" });
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  };

  const extractFolderId = (input: string): string => {
    const match = input.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : input.trim();
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormDriveFolderId('');
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    const folderId = formDriveFolderId.trim() ? extractFolderId(formDriveFolderId) : null;
    const { error } = await supabase.from('campaigns').insert({
      name: formName.trim(),
      description: formDescription.trim() || null,
      drive_folder_id: folderId,
    });
    if (error) {
      toast({ title: "Error", description: "No se pudo crear la campaña", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Campaña creada correctamente" });
      resetForm();
      setIsDialogOpen(false);
      fetchCampaigns();
    }
  };

  const handleEdit = async () => {
    if (!editingCampaign || !formName.trim()) return;
    const folderId = formDriveFolderId.trim() ? extractFolderId(formDriveFolderId) : null;
    const { error } = await supabase.from('campaigns').update({
      name: formName.trim(),
      description: formDescription.trim() || null,
      drive_folder_id: folderId,
    }).eq('id', editingCampaign.id);
    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar la campaña", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Campaña actualizada correctamente" });
      resetForm();
      setEditingCampaign(null);
      fetchCampaigns();
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!isMaster) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', campaign.id);
    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar la campaña", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Campaña eliminada correctamente" });
      fetchCampaigns();
    }
  };

  const openEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormName(campaign.name);
    setFormDescription(campaign.description || '');
    setFormDriveFolderId(campaign.drive_folder_id || '');
  };

  const handleSelectCampaign = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSessions([]);
    if (!campaign.drive_folder_id) return;
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase.functions.invoke('drive-sessions', {
        body: { folderId: campaign.drive_folder_id },
      });
      if (error) {
        toast({ title: "Error", description: "No se pudieron cargar las sesiones", variant: "destructive" });
      } else if (data?.success) {
        setSessions(data.sessions || []);
      } else {
        toast({ title: "Error", description: data?.error || "Error desconocido", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error al conectar con Drive", variant: "destructive" });
    }
    setLoadingSessions(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const CampaignForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-4">
      <div><Label>Nombre *</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nombre de la campaña" /></div>
      <div><Label>Descripción</Label><Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descripción (opcional)" /></div>
      <div><Label>Carpeta de Google Drive</Label><Input value={formDriveFolderId} onChange={(e) => setFormDriveFolderId(e.target.value)} placeholder="Enlace o ID de carpeta" /></div>
      <Button onClick={isEdit ? handleEdit : handleCreate} className="w-full">{isEdit ? 'Guardar Cambios' : 'Crear'}</Button>
    </div>
  );

  if (selectedCampaign) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCampaign(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{selectedCampaign.name}</h1>
            {selectedCampaign.description && <p className="text-muted-foreground italic mt-1">"{selectedCampaign.description}"</p>}
          </div>
        </div>
        {!selectedCampaign.drive_folder_id ? (
          <div className="text-center py-12">
            <Sword className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Sin carpeta de Drive asociada</h3>
          </div>
        ) : loadingSessions ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando sesiones desde Drive...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <Sword className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No se encontraron sesiones</h3>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-2">
            {sessions.map((session, idx) => (
              <AccordionItem key={idx} value={`session-${idx}`} className="border border-border rounded-lg bg-card px-4">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">{session.name}</AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none overflow-auto" dangerouslySetInnerHTML={{ __html: session.content }} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Campañas</h1>
        {isMaster && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Nueva Campaña</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear Nueva Campaña</DialogTitle></DialogHeader>
              <CampaignForm isEdit={false} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit Campaign Dialog */}
      <Dialog open={!!editingCampaign} onOpenChange={(open) => { if (!open) { setEditingCampaign(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Campaña</DialogTitle></DialogHeader>
          <CampaignForm isEdit={true} />
        </DialogContent>
      </Dialog>

      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <Sword className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No hay campañas</h3>
          <p className="text-sm text-muted-foreground">¡Crea tu primera aventura!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden border-2 border-accent/20 cursor-pointer relative"
              onClick={() => handleSelectCampaign(campaign)}
            >
              <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: `url(${campaignsImg})` }}>
                <div className="absolute inset-0 bg-primary/40" />
                <div className="absolute top-4 left-4"><Shield className="w-8 h-8 text-primary-foreground" /></div>
                {isMaster && (
                  <div className="absolute top-4 right-4 flex space-x-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(campaign)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(campaign)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <CardHeader><CardTitle>{campaign.name}</CardTitle></CardHeader>
              <CardContent><CardDescription>{campaign.description || 'Sin descripción'}</CardDescription></CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

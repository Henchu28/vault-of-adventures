import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Plus, Sword, Shield, ArrowLeft, Loader2 } from 'lucide-react';
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
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDriveFolderId, setNewDriveFolderId] = useState('');

  // Selected campaign state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch campaigns", variant: "destructive" });
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  };

  const extractFolderId = (input: string): string => {
    // Extract folder ID from a full Google Drive URL or return as-is
    const match = input.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : input.trim();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const folderId = newDriveFolderId.trim() ? extractFolderId(newDriveFolderId) : null;
    const { error } = await supabase
      .from('campaigns')
      .insert({ name: newName.trim(), description: newDescription.trim() || null, drive_folder_id: folderId });

    if (error) {
      toast({ title: "Error", description: "Failed to create campaign", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Campaña creada correctamente" });
      setNewName('');
      setNewDescription('');
      setNewDriveFolderId('');
      setIsDialogOpen(false);
      fetchCampaigns();
    }
  };

  const handleSelectCampaign = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSessions([]);

    if (!campaign.drive_folder_id) {
      return;
    }

    setLoadingSessions(true);
    try {
      const { data, error } = await supabase.functions.invoke('drive-sessions', {
        body: { folderId: campaign.drive_folder_id },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({ title: "Error", description: "No se pudieron cargar las sesiones", variant: "destructive" });
      } else if (data?.success) {
        setSessions(data.sessions || []);
      } else {
        toast({ title: "Error", description: data?.error || "Error desconocido", variant: "destructive" });
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      toast({ title: "Error", description: "Error al conectar con Drive", variant: "destructive" });
    }
    setLoadingSessions(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Campaign detail view with sessions
  if (selectedCampaign) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCampaign(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{selectedCampaign.name}</h1>
            {selectedCampaign.description && (
              <p className="text-muted-foreground italic mt-1">"{selectedCampaign.description}"</p>
            )}
          </div>
        </div>

        {!selectedCampaign.drive_folder_id ? (
          <div className="text-center py-12">
            <Sword className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Sin carpeta de Drive asociada</h3>
            <p className="text-sm text-muted-foreground">Edita la campaña para añadir un enlace de carpeta de Google Drive.</p>
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
            <p className="text-sm text-muted-foreground">Asegúrate de que la carpeta contiene archivos de sesión.</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-2">
            {sessions.map((session, idx) => (
              <AccordionItem
                key={idx}
                value={`session-${idx}`}
                className="border border-border rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  {session.name}
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none overflow-auto"
                    dangerouslySetInnerHTML={{ __html: session.content }}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    );
  }

  // Campaign selector (widget cards)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Campañas</h1>
        {isMaster && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Campaña
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Campaña</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nombre de la campaña"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  placeholder="Descripción (opcional)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                <Input
                  placeholder="Enlace o ID de carpeta de Google Drive"
                  value={newDriveFolderId}
                  onChange={(e) => setNewDriveFolderId(e.target.value)}
                />
                <Button onClick={handleCreate} className="w-full">Crear</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

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
              className="hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden border-2 border-accent/20 cursor-pointer"
              onClick={() => handleSelectCampaign(campaign)}
            >
              <div
                className="h-48 bg-cover bg-center relative"
                style={{ backgroundImage: `url(${campaignsImg})` }}
              >
                <div className="absolute inset-0 bg-primary/40" />
                <div className="absolute top-4 left-4">
                  <Shield className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <CardHeader>
                <CardTitle>{campaign.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {campaign.description || 'Sin descripción'}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

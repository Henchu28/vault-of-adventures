import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Sword, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Campaign {
  id: number;
  name: string;
  description: string | null;
}

export default function Campaigns() {
  const { isMaster } = useAuth();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

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

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase
      .from('campaigns')
      .insert({ name: newName.trim(), description: newDescription.trim() || null });

    if (error) {
      toast({ title: "Error", description: "Failed to create campaign", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Campaña creada correctamente" });
      setNewName('');
      setNewDescription('');
      setIsDialogOpen(false);
      fetchCampaigns();
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading campaigns...</div>;
  }

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
        <Tabs defaultValue={String(campaigns[0].id)} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-2 bg-transparent p-0">
            {campaigns.map((campaign) => (
              <TabsTrigger
                key={campaign.id}
                value={String(campaign.id)}
                className="relative flex-1 min-w-[140px] h-20 rounded-lg border border-border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all"
              >
                <div className="flex flex-col items-center gap-1">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm font-medium truncate max-w-[120px]">{campaign.name}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {campaigns.map((campaign) => (
            <TabsContent key={campaign.id} value={String(campaign.id)}>
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4 py-12">
                <Sword className="w-20 h-20 text-muted-foreground animate-pulse" />
                <h2 className="text-2xl font-bold text-muted-foreground">
                  Página en desarrollo
                </h2>
                <p className="text-lg text-muted-foreground">
                  ¡Vuelva más tarde aventurero!
                </p>
                {campaign.description && (
                  <p className="text-sm text-muted-foreground/70 max-w-md mt-4 italic">
                    "{campaign.description}"
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
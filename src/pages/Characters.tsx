import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Search, User, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Character {
  id: number;
  name: string;
  Raza: string | null;
  Arquetipo: string | null;
  Elemento: string | null;
  Esencia: string | null;
  Organización: string;
  Edad: number | null;
  Estado: string | null;
  ID_Campaña: number | null;
}

interface NPC {
  id: number;
  name: string;
  Raza: string | null;
  Arquetipo: string | null;
  Elemento: string | null;
  Esencia: string | null;
  Edad: number;
  Estado: string | null;
  Alignment: string | null;
  ID_Campaña: number | null;
}

interface Campaign {
  id: number;
  name: string;
}

const ARQUETIPOS = ['Emisor', 'Modulador', 'Canalizador', 'Invocador', 'Focalizador', 'Compuesto'];
const ELEMENTOS = ['Fuego', 'Hielo', 'Tierra', 'Planta', 'Luz', 'Oscuridad', 'Viento', 'Electricidad', 'Espiritual'];
const ESENCIAS = ['Nominancia', 'Transmutación', 'Distorsión', 'Cronomancia', 'Dimensiología', 'Sincronimia', 'Emblemancia', 'Vacío'];
const ALIGNMENTS = ['Legal Bueno', 'Neutral Bueno', 'Caótico Bueno', 'Legal Neutral', 'Neutral', 'Caótico Neutral', 'Legal Malvado', 'Neutral Malvado', 'Caótico Malvado'];

export default function Characters() {
  const { isMaster } = useAuth();
  const { toast } = useToast();
  
  const [characters, setCharacters] = useState<Character[]>([]);
  const [npcs, setNPCs] = useState<NPC[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArchetype, setFilterArchetype] = useState('all');
  const [filterElement, setFilterElement] = useState('all');
  const [filterEssence, setFilterEssence] = useState('all');
  const [filterOrg, setFilterOrg] = useState('all');
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false);
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null);

  // Character form state
  const [charForm, setCharForm] = useState({
    name: '', Raza: '', Arquetipo: '', Elemento: '', Esencia: '',
    Organización: 'Unknown', Edad: 0, Estado: 'Unknown', ID_Campaña: ''
  });

  // NPC form state
  const [npcForm, setNpcForm] = useState({
    name: '', Raza: '', Arquetipo: '', Elemento: '', Esencia: '',
    Edad: 0, Estado: 'Unknown', Alignment: 'Neutral', ID_Campaña: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [charactersResult, npcsResult, orgsResult, campaignsResult] = await Promise.all([
      supabase.from('characters').select('*'),
      supabase.from('npcs').select('*'),
      supabase.from('organizations').select('org_name'),
      supabase.from('campaigns').select('id, name'),
    ]);

    if (charactersResult.data) setCharacters(charactersResult.data);
    if (npcsResult.data) setNPCs(npcsResult.data);
    if (orgsResult.data) setOrganizations(orgsResult.data.map(o => o.org_name));
    if (campaignsResult.data) setCampaigns(campaignsResult.data);
    
    setLoading(false);
  };

  const resetCharForm = () => setCharForm({
    name: '', Raza: '', Arquetipo: '', Elemento: '', Esencia: '',
    Organización: 'Unknown', Edad: 0, Estado: 'Unknown', ID_Campaña: ''
  });

  const resetNpcForm = () => setNpcForm({
    name: '', Raza: '', Arquetipo: '', Elemento: '', Esencia: '',
    Edad: 0, Estado: 'Unknown', Alignment: 'Neutral', ID_Campaña: ''
  });

  const handleCreateCharacter = async () => {
    if (!charForm.name.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('characters').insert({
      name: charForm.name.trim(),
      Raza: charForm.Raza || null,
      Arquetipo: charForm.Arquetipo || null,
      Elemento: charForm.Elemento || null,
      Esencia: charForm.Esencia || null,
      Organización: charForm.Organización || 'Unknown',
      Edad: charForm.Edad || 0,
      Estado: charForm.Estado || 'Unknown',
      ID_Campaña: charForm.ID_Campaña ? Number(charForm.ID_Campaña) : null,
    });
    if (error) {
      toast({ title: "Error", description: "No se pudo crear el personaje", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Personaje creado correctamente" });
      resetCharForm();
      setIsCharacterDialogOpen(false);
      fetchData();
    }
  };

  const handleCreateNPC = async () => {
    if (!npcForm.name.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('npcs').insert({
      name: npcForm.name.trim(),
      Raza: npcForm.Raza || null,
      Arquetipo: npcForm.Arquetipo || null,
      Elemento: npcForm.Elemento || null,
      Esencia: npcForm.Esencia || null,
      Edad: npcForm.Edad || 0,
      Estado: npcForm.Estado || 'Unknown',
      Alignment: npcForm.Alignment || 'Neutral',
      ID_Campaña: npcForm.ID_Campaña ? Number(npcForm.ID_Campaña) : null,
    });
    if (error) {
      toast({ title: "Error", description: "No se pudo crear el NPC", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "NPC creado correctamente" });
      resetNpcForm();
      setIsNPCDialogOpen(false);
      fetchData();
    }
  };

  const handleDeleteCharacter = async (character: Character) => {
    if (!isMaster) return;
    const { error } = await supabase.from('characters').delete().eq('name', character.name);
    if (error) {
      toast({ title: "Error", description: "Failed to delete character", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Character deleted successfully" });
      fetchData();
    }
  };

  const handleDeleteNPC = async (npc: NPC) => {
    if (!isMaster) return;
    const { error } = await supabase.from('npcs').delete().eq('name', npc.name);
    if (error) {
      toast({ title: "Error", description: "Failed to delete NPC", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "NPC deleted successfully" });
      fetchData();
    }
  };

  const filteredCharacters = characters
    .filter(char => 
      char.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterArchetype === 'all' || char.Arquetipo === filterArchetype) &&
      (filterElement === 'all' || char.Elemento === filterElement) &&
      (filterEssence === 'all' || char.Esencia === filterEssence) &&
      (filterOrg === 'all' || char.Organización === filterOrg)
    );

  const filteredNPCs = npcs
    .filter(npc => 
      npc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterArchetype === 'all' || npc.Arquetipo === filterArchetype) &&
      (filterElement === 'all' || String(npc.Elemento) === filterElement) &&
      (filterEssence === 'all' || npc.Esencia === filterEssence)
    );

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading characters...</div>;
  }

  const CharacterForm = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label>Nombre *</Label>
        <Input value={charForm.name} onChange={(e) => setCharForm({...charForm, name: e.target.value})} placeholder="Nombre del personaje" />
      </div>
      <div>
        <Label>Raza</Label>
        <Input value={charForm.Raza} onChange={(e) => setCharForm({...charForm, Raza: e.target.value})} placeholder="Ej: Humano, Elfo..." />
      </div>
      <div>
        <Label>Edad</Label>
        <Input type="number" value={charForm.Edad} onChange={(e) => setCharForm({...charForm, Edad: Number(e.target.value)})} />
      </div>
      <div>
        <Label>Arquetipo</Label>
        <Select value={charForm.Arquetipo} onValueChange={(v) => setCharForm({...charForm, Arquetipo: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            {ARQUETIPOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Elemento</Label>
        <Select value={charForm.Elemento} onValueChange={(v) => setCharForm({...charForm, Elemento: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            {ELEMENTOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Esencia</Label>
        <Select value={charForm.Esencia} onValueChange={(v) => setCharForm({...charForm, Esencia: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            {ESENCIAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Organización</Label>
        <Select value={charForm.Organización} onValueChange={(v) => setCharForm({...charForm, Organización: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Unknown">Sin organización</SelectItem>
            {organizations.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Estado</Label>
        <Input value={charForm.Estado} onChange={(e) => setCharForm({...charForm, Estado: e.target.value})} placeholder="Ej: Vivo, Muerto..." />
      </div>
      <div>
        <Label>Campaña</Label>
        <Select value={charForm.ID_Campaña} onValueChange={(v) => setCharForm({...charForm, ID_Campaña: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ninguna</SelectItem>
            {campaigns.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Button onClick={handleCreateCharacter} className="w-full">Crear Personaje</Button>
      </div>
    </div>
  );

  const NPCForm = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label>Nombre *</Label>
        <Input value={npcForm.name} onChange={(e) => setNpcForm({...npcForm, name: e.target.value})} placeholder="Nombre del NPC" />
      </div>
      <div>
        <Label>Raza</Label>
        <Input value={npcForm.Raza} onChange={(e) => setNpcForm({...npcForm, Raza: e.target.value})} placeholder="Ej: Humano, Elfo..." />
      </div>
      <div>
        <Label>Edad</Label>
        <Input type="number" value={npcForm.Edad} onChange={(e) => setNpcForm({...npcForm, Edad: Number(e.target.value)})} />
      </div>
      <div>
        <Label>Arquetipo</Label>
        <Select value={npcForm.Arquetipo} onValueChange={(v) => setNpcForm({...npcForm, Arquetipo: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            {ARQUETIPOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Elemento</Label>
        <Select value={npcForm.Elemento} onValueChange={(v) => setNpcForm({...npcForm, Elemento: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            {ELEMENTOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Esencia</Label>
        <Select value={npcForm.Esencia} onValueChange={(v) => setNpcForm({...npcForm, Esencia: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            {ESENCIAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Alineamiento</Label>
        <Select value={npcForm.Alignment} onValueChange={(v) => setNpcForm({...npcForm, Alignment: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            {ALIGNMENTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Estado</Label>
        <Input value={npcForm.Estado} onChange={(e) => setNpcForm({...npcForm, Estado: e.target.value})} placeholder="Ej: Vivo, Muerto..." />
      </div>
      <div>
        <Label>Campaña</Label>
        <Select value={npcForm.ID_Campaña} onValueChange={(v) => setNpcForm({...npcForm, ID_Campaña: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ninguna</SelectItem>
            {campaigns.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Button onClick={handleCreateNPC} className="w-full">Crear NPC</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Characters & NPCs</h1>
        {isMaster && (
          <div className="flex space-x-2">
            <Dialog open={isCharacterDialogOpen} onOpenChange={(open) => { setIsCharacterDialogOpen(open); if (!open) resetCharForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Character
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo Personaje</DialogTitle>
                </DialogHeader>
                <CharacterForm />
              </DialogContent>
            </Dialog>
            
            <Dialog open={isNPCDialogOpen} onOpenChange={(open) => { setIsNPCDialogOpen(open); if (!open) resetNpcForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add NPC
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo NPC</DialogTitle>
                </DialogHeader>
                <NPCForm />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={filterArchetype} onValueChange={setFilterArchetype}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Arquetipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="pl-2">Arquetipos</SelectItem>
            {ARQUETIPOS.map(a => <SelectItem key={a} value={a} className="pl-2">{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterElement} onValueChange={setFilterElement}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Elementos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="pl-2">Elementos</SelectItem>
            {ELEMENTOS.map(e => <SelectItem key={e} value={e} className="pl-2">{e}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterEssence} onValueChange={setFilterEssence}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Esencias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="pl-2">Esencias</SelectItem>
            {ESENCIAS.map(e => <SelectItem key={e} value={e} className="pl-2">{e}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Organizaciones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="pl-2">Organizaciones</SelectItem>
            {organizations.map(org => (
              <SelectItem key={org} value={org} className="pl-2">{org}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="characters" className="w-full">
        <TabsList>
          <TabsTrigger value="characters" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Player Characters ({filteredCharacters.length})</span>
          </TabsTrigger>
          <TabsTrigger value="npcs" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>NPCs ({filteredNPCs.length})</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="characters">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharacters.map((character, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{character.name}</span>
                    {isMaster && (
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingCharacter(character)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCharacter(character)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Raza:</span> {character.Raza}</p>
                    <p><span className="font-medium">Arquetipo:</span> {character.Arquetipo}</p>
                    <p><span className="font-medium">Elemento:</span> {character.Elemento}</p>
                    <p><span className="font-medium">Esencia:</span> {character.Esencia}</p>
                    <p><span className="font-medium">Edad:</span> {character.Edad}</p>
                    <p><span className="font-medium">Organización:</span> {character.Organización}</p>
                    <p><span className="font-medium">Estado:</span> {character.Estado}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="npcs">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNPCs.map((npc, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{npc.name}</span>
                    {isMaster && (
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingNPC(npc)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteNPC(npc)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Raza:</span> {npc.Raza}</p>
                    <p><span className="font-medium">Arquetipo:</span> {npc.Arquetipo}</p>
                    <p><span className="font-medium">Elemento:</span> {npc.Elemento}</p>
                    <p><span className="font-medium">Esencia:</span> {npc.Esencia}</p>
                    <p><span className="font-medium">Edad:</span> {npc.Edad}</p>
                    <p><span className="font-medium">Alineamiento:</span> {npc.Alignment}</p>
                    <p><span className="font-medium">Estado:</span> {npc.Estado}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

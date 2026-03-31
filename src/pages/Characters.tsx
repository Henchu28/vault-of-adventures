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
  Organización: string | null;
  Edad: number;
  Estado: string | null;
  ID_Campaña: number | null;
}

interface Campaign {
  id: number;
  name: string;
}

const ARQUETIPOS = ['Emisor', 'Modulador', 'Canalizador', 'Invocador', 'Focalizador', 'Compuesto'];
const ELEMENTOS = ['Fuego', 'Hielo', 'Tierra', 'Planta', 'Luz', 'Oscuridad', 'Viento', 'Electricidad', 'Espiritual'];
const ESENCIAS = ['Nominancia', 'Transmutación', 'Distorsión', 'Cronomancia', 'Dimensiología', 'Sincronimia', 'Emblemancia', 'Vacío'];

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

  const defaultCharForm = {
    name: '', Raza: '', Arquetipo: '', Elemento: '', Esencia: '',
    Organización: 'Unknown', Edad: 0, Estado: 'Unknown', ID_Campaña: ''
  };
  const defaultNpcForm = {
    name: '', Raza: '', Arquetipo: '', Elemento: '', Esencia: '',
    Organización: 'Unknown', Edad: 0, Estado: 'Unknown', ID_Campaña: ''
  };

  const [charForm, setCharForm] = useState(defaultCharForm);
  const [npcForm, setNpcForm] = useState(defaultNpcForm);

  useEffect(() => { fetchData(); }, []);

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

  const resetCharForm = () => setCharForm(defaultCharForm);
  const resetNpcForm = () => setNpcForm(defaultNpcForm);

  const buildCharPayload = () => ({
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

  const buildNpcPayload = () => ({
    name: npcForm.name.trim(),
    Raza: npcForm.Raza || null,
    Arquetipo: npcForm.Arquetipo || null,
    Elemento: npcForm.Elemento || null,
    Esencia: npcForm.Esencia || null,
    Organización: npcForm.Organización || 'Unknown',
    Edad: npcForm.Edad || 0,
    Estado: npcForm.Estado || 'Unknown',
    ID_Campaña: npcForm.ID_Campaña ? Number(npcForm.ID_Campaña) : null,
  });

  const handleCreateCharacter = async () => {
    if (!charForm.name.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('characters').insert(buildCharPayload());
    if (error) {
      toast({ title: "Error", description: "No se pudo crear el personaje", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Personaje creado correctamente" });
      resetCharForm();
      setIsCharacterDialogOpen(false);
      fetchData();
    }
  };

  const handleEditCharacter = async () => {
    if (!editingCharacter || !charForm.name.trim()) return;
    const { error } = await supabase.from('characters').update(buildCharPayload()).eq('id', editingCharacter.id);
    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar el personaje", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Personaje actualizado correctamente" });
      resetCharForm();
      setEditingCharacter(null);
      fetchData();
    }
  };

  const handleCreateNPC = async () => {
    if (!npcForm.name.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('npcs').insert(buildNpcPayload());
    if (error) {
      toast({ title: "Error", description: "No se pudo crear el NPC", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "NPC creado correctamente" });
      resetNpcForm();
      setIsNPCDialogOpen(false);
      fetchData();
    }
  };

  const handleEditNPC = async () => {
    if (!editingNPC || !npcForm.name.trim()) return;
    const { error } = await supabase.from('npcs').update(buildNpcPayload()).eq('id', editingNPC.id);
    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar el NPC", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "NPC actualizado correctamente" });
      resetNpcForm();
      setEditingNPC(null);
      fetchData();
    }
  };

  const handleDeleteCharacter = async (character: Character) => {
    if (!isMaster) return;
    const { error } = await supabase.from('characters').delete().eq('id', character.id);
    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar el personaje", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "Personaje eliminado correctamente" });
      fetchData();
    }
  };

  const handleDeleteNPC = async (npc: NPC) => {
    if (!isMaster) return;
    const { error } = await supabase.from('npcs').delete().eq('id', npc.id);
    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar el NPC", variant: "destructive" });
    } else {
      toast({ title: "¡Éxito!", description: "NPC eliminado correctamente" });
      fetchData();
    }
  };

  const openEditCharacter = (char: Character) => {
    setEditingCharacter(char);
    setCharForm({
      name: char.name,
      Raza: char.Raza || '',
      Arquetipo: char.Arquetipo || '',
      Elemento: char.Elemento || '',
      Esencia: char.Esencia || '',
      Organización: char.Organización || 'Unknown',
      Edad: char.Edad || 0,
      Estado: char.Estado || 'Unknown',
      ID_Campaña: char.ID_Campaña ? String(char.ID_Campaña) : '',
    });
  };

  const openEditNPC = (npc: NPC) => {
    setEditingNPC(npc);
    setNpcForm({
      name: npc.name,
      Raza: npc.Raza || '',
      Arquetipo: npc.Arquetipo || '',
      Elemento: npc.Elemento || '',
      Esencia: npc.Esencia || '',
      Organización: npc.Organización || 'Unknown',
      Edad: npc.Edad || 0,
      Estado: npc.Estado || 'Unknown',
      ID_Campaña: npc.ID_Campaña ? String(npc.ID_Campaña) : '',
    });
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

  const EntityForm = ({ form, setForm, onSubmit, isEdit, type }: {
    form: typeof defaultCharForm;
    setForm: (f: typeof defaultCharForm) => void;
    onSubmit: () => void;
    isEdit: boolean;
    type: 'character' | 'npc';
  }) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label>Nombre *</Label>
        <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder={`Nombre del ${type === 'character' ? 'personaje' : 'NPC'}`} />
      </div>
      <div>
        <Label>Raza</Label>
        <Input value={form.Raza} onChange={(e) => setForm({...form, Raza: e.target.value})} placeholder="Ej: Humano, Elfo..." />
      </div>
      <div>
        <Label>Edad</Label>
        <Input type="number" value={form.Edad} onChange={(e) => setForm({...form, Edad: Number(e.target.value)})} />
      </div>
      <div>
        <Label>Arquetipo</Label>
        <Select value={form.Arquetipo} onValueChange={(v) => setForm({...form, Arquetipo: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            {ARQUETIPOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Elemento</Label>
        <Select value={form.Elemento} onValueChange={(v) => setForm({...form, Elemento: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            {ELEMENTOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Esencia</Label>
        <Select value={form.Esencia} onValueChange={(v) => setForm({...form, Esencia: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            {ESENCIAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Organización</Label>
        <Select value={form.Organización} onValueChange={(v) => setForm({...form, Organización: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Unknown">Sin organización</SelectItem>
            {organizations.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Estado</Label>
        <Input value={form.Estado} onChange={(e) => setForm({...form, Estado: e.target.value})} placeholder="Ej: Vivo, Muerto..." />
      </div>
      <div>
        <Label>Campaña</Label>
        <Select value={form.ID_Campaña} onValueChange={(v) => setForm({...form, ID_Campaña: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ninguna</SelectItem>
            {campaigns.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Button onClick={onSubmit} className="w-full">
          {isEdit ? 'Guardar Cambios' : `Crear ${type === 'character' ? 'Personaje' : 'NPC'}`}
        </Button>
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
                <Button><Plus className="w-4 h-4 mr-2" />Add Character</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Nuevo Personaje</DialogTitle></DialogHeader>
                <EntityForm form={charForm} setForm={setCharForm} onSubmit={handleCreateCharacter} isEdit={false} type="character" />
              </DialogContent>
            </Dialog>
            
            <Dialog open={isNPCDialogOpen} onOpenChange={(open) => { setIsNPCDialogOpen(open); if (!open) resetNpcForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="w-4 h-4 mr-2" />Add NPC</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Nuevo NPC</DialogTitle></DialogHeader>
                <EntityForm form={npcForm} setForm={setNpcForm} onSubmit={handleCreateNPC} isEdit={false} type="npc" />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Edit Character Dialog */}
      <Dialog open={!!editingCharacter} onOpenChange={(open) => { if (!open) { setEditingCharacter(null); resetCharForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar Personaje</DialogTitle></DialogHeader>
          <EntityForm form={charForm} setForm={setCharForm} onSubmit={handleEditCharacter} isEdit={true} type="character" />
        </DialogContent>
      </Dialog>

      {/* Edit NPC Dialog */}
      <Dialog open={!!editingNPC} onOpenChange={(open) => { if (!open) { setEditingNPC(null); resetNpcForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar NPC</DialogTitle></DialogHeader>
          <EntityForm form={npcForm} setForm={setNpcForm} onSubmit={handleEditNPC} isEdit={true} type="npc" />
        </DialogContent>
      </Dialog>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4" />
          <Input placeholder="Buscar por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterArchetype} onValueChange={setFilterArchetype}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Arquetipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="pl-2">Arquetipos</SelectItem>
            {ARQUETIPOS.map(a => <SelectItem key={a} value={a} className="pl-2">{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterElement} onValueChange={setFilterElement}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Elementos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="pl-2">Elementos</SelectItem>
            {ELEMENTOS.map(e => <SelectItem key={e} value={e} className="pl-2">{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEssence} onValueChange={setFilterEssence}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Esencias" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="pl-2">Esencias</SelectItem>
            {ESENCIAS.map(e => <SelectItem key={e} value={e} className="pl-2">{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Organizaciones" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="pl-2">Organizaciones</SelectItem>
            {organizations.map(org => <SelectItem key={org} value={org} className="pl-2">{org}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="characters" className="w-full">
        <TabsList>
          <TabsTrigger value="characters" className="flex items-center space-x-2">
            <User className="w-4 h-4" /><span>Player Characters ({filteredCharacters.length})</span>
          </TabsTrigger>
          <TabsTrigger value="npcs" className="flex items-center space-x-2">
            <Users className="w-4 h-4" /><span>NPCs ({filteredNPCs.length})</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="characters">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharacters.map((character) => (
              <Card key={character.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{character.name}</span>
                    {isMaster && (
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditCharacter(character)}>
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
            {filteredNPCs.map((npc) => (
              <Card key={npc.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{npc.name}</span>
                    {isMaster && (
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditNPC(npc)}>
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
                    <p><span className="font-medium">Organización:</span> {npc.Organización}</p>
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

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
import { Textarea } from '@/components/ui/textarea';
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
  Elemento: number | null;
  Esencia: string | null;
  Edad: number;
  Estado: string | null;
  Alignment: string | null;
  ID_Campaña: number | null;
}

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
  const [loading, setLoading] = useState(true);
  
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false);
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [charactersResult, npcsResult, orgsResult] = await Promise.all([
      supabase.from('characters').select('*'),
      supabase.from('npcs').select('*'),
      supabase.from('organizations').select('org_name')
    ]);

    if (charactersResult.data) setCharacters(charactersResult.data);
    if (npcsResult.data) setNPCs(npcsResult.data);
    if (orgsResult.data) setOrganizations(orgsResult.data.map(o => o.org_name));
    
    setLoading(false);
  };

  const handleDeleteCharacter = async (character: Character) => {
    if (!isMaster) return;
    
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('name', character.name);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete character",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Character deleted successfully",
      });
      fetchData();
    }
  };

  const handleDeleteNPC = async (npc: NPC) => {
    if (!isMaster) return;
    
    const { error } = await supabase
      .from('npcs')
      .delete()
      .eq('name', npc.name);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete NPC",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "NPC deleted successfully",
      });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Characters & NPCs</h1>
        {isMaster && (
          <div className="flex space-x-2">
            <Dialog open={isCharacterDialogOpen} onOpenChange={setIsCharacterDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Character
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Character</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground">Character form would go here</div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isNPCDialogOpen} onOpenChange={setIsNPCDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add NPC
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New NPC</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground">NPC form would go here</div>
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
            <SelectItem value="Emisor" className="pl-2">Emisor</SelectItem>
            <SelectItem value="Modulador" className="pl-2">Modulador</SelectItem>
            <SelectItem value="Canalizador" className="pl-2">Canalizador</SelectItem>
            <SelectItem value="Invocador" className="pl-2">Invocador</SelectItem>
            <SelectItem value="Focalizador" className="pl-2">Focalizador</SelectItem>
            <SelectItem value="Compuesto" className="pl-2">Compuesto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterElement} onValueChange={setFilterElement}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Elementos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="pl-2">Elementos</SelectItem>
            <SelectItem value="Fuego" className="pl-2">Fuego</SelectItem>
            <SelectItem value="Hielo" className="pl-2">Hielo</SelectItem>
            <SelectItem value="Tierra" className="pl-2">Tierra</SelectItem>
            <SelectItem value="Planta" className="pl-2">Planta</SelectItem>
            <SelectItem value="Luz" className="pl-2">Luz</SelectItem>
            <SelectItem value="Oscuridad" className="pl-2">Oscuridad</SelectItem>
            <SelectItem value="Viento" className="pl-2">Viento</SelectItem>
            <SelectItem value="Electricidad" className="pl-2">Electricidad</SelectItem>
            <SelectItem value="Espiritual" className="pl-2">Espiritual</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterEssence} onValueChange={setFilterEssence}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Esencias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="pl-2">Esencias</SelectItem>
            <SelectItem value="Nominancia" className="pl-2">Nominancia</SelectItem>
            <SelectItem value="Transmutación" className="pl-2">Transmutación</SelectItem>
            <SelectItem value="Distorsión" className="pl-2">Distorsión</SelectItem>
            <SelectItem value="Cronomancia" className="pl-2">Cronomancia</SelectItem>
            <SelectItem value="Dimensiología" className="pl-2">Dimensiología</SelectItem>
            <SelectItem value="Sincronimia" className="pl-2">Sincronimia</SelectItem>
            <SelectItem value="Emblemancia" className="pl-2">Emblemancia</SelectItem>
            <SelectItem value="Vacío" className="pl-2">Vacío</SelectItem>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCharacter(character)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCharacter(character)}
                        >
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNPC(npc)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNPC(npc)}
                        >
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
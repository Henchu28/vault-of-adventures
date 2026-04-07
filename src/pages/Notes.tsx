import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, BookOpen, Folder, FileText, ArrowLeft, Loader2, ExternalLink, ChevronRight, FileSpreadsheet, FileType } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DocumentEditor } from '@/components/notes/DocumentEditor';

const ROOT_FOLDER_ID = '1djoI4FuTcUO2lzEH1y6TQ6OebsA4j51F';

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface Document {
  id: string;
  title: string;
  content: string;
  file_type: string;
  folder_path: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const mimeIcons: Record<string, string> = {
  'application/vnd.google-apps.document': '📄',
  'application/vnd.google-apps.spreadsheet': '📊',
  'application/vnd.google-apps.presentation': '📽️',
  'application/vnd.google-apps.drawing': '🎨',
  'application/pdf': '📕',
  'image/png': '🖼️',
  'image/jpeg': '🖼️',
};

function getIcon(mimeType: string) {
  return mimeIcons[mimeType] || '📎';
}

const fileTypeConfig = {
  docx: { label: 'Word', icon: FileText, color: 'text-blue-500' },
  xlsx: { label: 'Excel', icon: FileSpreadsheet, color: 'text-green-500' },
  txt: { label: 'Texto', icon: FileType, color: 'text-muted-foreground' },
};

export default function Notes() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: ROOT_FOLDER_ID, name: 'Universo AcoZ' }]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFileType, setNewFileType] = useState<string>('docx');

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;
  const currentFolderPath = '/' + breadcrumbs.map(b => b.name).join('/');

  const fetchDriveFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('drive-browser', {
        body: { folderId },
      });
      if (error) {
        toast({ title: 'Error', description: 'No se pudo cargar la carpeta de Drive', variant: 'destructive' });
      } else if (data?.success) {
        setFolders(data.folders || []);
        setFiles(data.files || []);
      }
    } catch {
      toast({ title: 'Error', description: 'Error al conectar con Drive', variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('folder_path', currentFolderPath)
      .order('title', { ascending: true });
    if (!error) setDocuments((data as Document[]) || []);
  }, [user, currentFolderPath]);

  useEffect(() => {
    fetchDriveFolder(currentFolderId);
    fetchDocuments();
  }, [currentFolderId, fetchDriveFolder, fetchDocuments]);

  const navigateToFolder = (folder: DriveItem) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSearchTerm('');
  };

  const navigateToBreadcrumb = (index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    setSearchTerm('');
  };

  const handleCreateDocument = async () => {
    if (!user || !newTitle.trim()) return;
    const { data, error } = await supabase.from('documents').insert({
      title: newTitle.trim(),
      content: '',
      file_type: newFileType,
      folder_path: currentFolderPath,
      user_id: user.id,
    }).select().single();
    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear el documento', variant: 'destructive' });
    } else {
      toast({ title: '¡Creado!', description: 'Documento creado correctamente' });
      setNewTitle('');
      setIsCreateOpen(false);
      setEditingDoc(data as Document);
    }
  };

  // If editing a document, show the editor
  if (editingDoc) {
    return (
      <div className="space-y-6">
        <DocumentEditor
          document={editingDoc}
          onBack={() => { setEditingDoc(null); fetchDocuments(); }}
          onDeleted={() => { setEditingDoc(null); fetchDocuments(); }}
          onSaved={() => fetchDocuments()}
        />
      </div>
    );
  }

  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredDocs = documents.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notas de Campaña</h1>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setNewTitle(''); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nuevo Documento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear Documento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Nombre del documento..." />
              </div>
              <div>
                <Label>Formato</Label>
                <Select value={newFileType} onValueChange={setNewFileType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docx">📄 Word (texto enriquecido)</SelectItem>
                    <SelectItem value="xlsx">📊 Excel (hoja de cálculo)</SelectItem>
                    <SelectItem value="txt">📝 Texto plano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateDocument} disabled={!newTitle.trim()}>Crear y Editar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            <button
              onClick={() => navigateToBreadcrumb(i)}
              className={`hover:underline ${i === breadcrumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar archivos y documentos..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 p-0 h-auto"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando archivos de Drive...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {breadcrumbs.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => navigateToBreadcrumb(breadcrumbs.length - 2)}>
              <ArrowLeft className="w-4 h-4 mr-2" />Volver
            </Button>
          )}

          {/* Folders */}
          {filteredFolders.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-muted-foreground">Carpetas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFolders.map(folder => (
                  <Card key={folder.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => navigateToFolder(folder)}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <Folder className="w-8 h-8 text-accent shrink-0" />
                      <span className="font-medium truncate">{folder.name}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Drive Files (read-only) */}
          {filteredFiles.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-muted-foreground">Archivos de Drive (solo lectura)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFiles.map(file => (
                  <Card key={file.id} className="hover:shadow-md transition-all">
                    <CardContent className="flex items-center gap-3 p-4">
                      <span className="text-2xl shrink-0">{getIcon(file.mimeType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        {file.modifiedTime && (
                          <p className="text-xs text-muted-foreground">{new Date(file.modifiedTime).toLocaleDateString('es-ES')}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Local Documents */}
          {filteredDocs.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-muted-foreground">Documentos Locales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDocs.map(doc => {
                  const config = fileTypeConfig[doc.file_type as keyof typeof fileTypeConfig] || fileTypeConfig.txt;
                  const Icon = config.icon;
                  return (
                    <Card key={doc.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setEditingDoc(doc)}>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Icon className={`w-6 h-6 shrink-0 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{config.label} · {new Date(doc.updated_at).toLocaleDateString('es-ES')}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredFolders.length === 0 && filteredFiles.length === 0 && filteredDocs.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                {searchTerm ? 'No se encontraron resultados' : 'Carpeta vacía'}
              </h3>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

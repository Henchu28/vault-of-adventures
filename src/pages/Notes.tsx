import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, BookOpen, Folder, FileText, ArrowLeft, Loader2, ChevronRight, FileSpreadsheet, FileType, FolderPlus, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DocumentEditor } from '@/components/notes/DocumentEditor';
import { DriveFileViewer } from '@/components/notes/DriveFileViewer';

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

  const [documents, setDocuments] = useState<Document[]>([]);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [viewingDriveFile, setViewingDriveFile] = useState<DriveItem | null>(null);

  // Create document dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFileType, setNewFileType] = useState<string>('docx');

  // Create folder dialog
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Upload file dialog
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');

  // Local folders
  const [localFolders, setLocalFolders] = useState<string[]>([]);

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;
  const currentFolderPath = '/' + breadcrumbs.map(b => b.name).join('/');

  const fetchDriveFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('drive-browser', { body: { folderId } });
      if (!error && data?.success) {
        setFolders(data.folders || []);
        setFiles(data.files || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('folder_path', currentFolderPath)
      .order('title', { ascending: true });
    if (data) setDocuments((data as Document[]) || []);
  }, [user, currentFolderPath]);

  const fetchLocalFolders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('documents')
      .select('folder_path');
    if (data) {
      const subfolders = new Set<string>();
      data.forEach(d => {
        const path = d.folder_path || '/';
        if (path.startsWith(currentFolderPath) && path !== currentFolderPath) {
          const rest = path.slice(currentFolderPath.length).replace(/^\//, '');
          const nextFolder = rest.split('/')[0];
          if (nextFolder) subfolders.add(nextFolder);
        }
      });
      setLocalFolders(Array.from(subfolders).sort());
    }
  }, [user, currentFolderPath]);

  useEffect(() => {
    fetchDriveFolder(currentFolderId);
    fetchDocuments();
    fetchLocalFolders();
  }, [currentFolderId, fetchDriveFolder, fetchDocuments, fetchLocalFolders]);

  const navigateToFolder = (folder: DriveItem) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSearchTerm('');
  };

  const navigateToLocalFolder = (folderName: string) => {
    setBreadcrumbs(prev => [...prev, { id: 'local-' + folderName, name: folderName }]);
    setSearchTerm('');
  };

  const navigateToBreadcrumb = (index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    setSearchTerm('');
  };

  const handleCreateDocument = async () => {
    if (!user || !newTitle.trim()) return;
    const { data, error } = await supabase.from('documents').insert({
      title: newTitle.trim(), content: '', file_type: newFileType,
      folder_path: currentFolderPath, user_id: user.id,
    }).select().single();
    if (error) toast({ title: 'Error', description: 'No se pudo crear el documento', variant: 'destructive' });
    else { toast({ title: '¡Creado!' }); setNewTitle(''); setIsCreateOpen(false); setEditingDoc(data as Document); }
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    // Create a placeholder document in the new folder to make it exist
    const folderPath = currentFolderPath + '/' + newFolderName.trim();
    const { error } = await supabase.from('documents').insert({
      title: '.folder', content: '', file_type: 'txt',
      folder_path: folderPath, user_id: user.id,
    });
    if (error) toast({ title: 'Error', description: 'No se pudo crear la carpeta', variant: 'destructive' });
    else { toast({ title: '¡Carpeta creada!' }); setNewFolderName(''); setIsFolderDialogOpen(false); fetchLocalFolders(); }
  };

  const handleUploadFile = async () => {
    if (!user || !uploadFile || !uploadTitle.trim()) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      const ext = uploadFile.name.split('.').pop()?.toLowerCase();
      let fileType = 'txt';
      if (ext === 'html' || ext === 'htm') fileType = 'docx';
      else if (ext === 'csv' || ext === 'tsv') fileType = 'xlsx';
      
      const { data, error } = await supabase.from('documents').insert({
        title: uploadTitle.trim(), content, file_type: fileType,
        folder_path: currentFolderPath, user_id: user.id,
      }).select().single();
      if (error) toast({ title: 'Error', description: 'No se pudo subir', variant: 'destructive' });
      else { toast({ title: '¡Subido!' }); setUploadFile(null); setUploadTitle(''); setIsUploadOpen(false); setEditingDoc(data as Document); }
    };
    reader.readAsText(uploadFile);
  };

  if (viewingDriveFile) {
    return (
      <div className="space-y-6">
        <DriveFileViewer fileId={viewingDriveFile.id} fileName={viewingDriveFile.name} mimeType={viewingDriveFile.mimeType} onBack={() => setViewingDriveFile(null)} />
      </div>
    );
  }

  if (editingDoc) {
    return (
      <div className="space-y-6">
        <DocumentEditor document={editingDoc} onBack={() => { setEditingDoc(null); fetchDocuments(); }} onDeleted={() => { setEditingDoc(null); fetchDocuments(); }} onSaved={() => fetchDocuments()} />
      </div>
    );
  }

  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredDocs = documents.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()) && d.title !== '.folder');
  const filteredLocalFolders = localFolders.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">Notas de Campaña</h1>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
            <DialogTrigger asChild><Button variant="outline"><FolderPlus className="w-4 h-4 mr-2" />Nueva Carpeta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear Carpeta</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nombre</Label><Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nombre de la carpeta..." /></div>
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="w-full">Crear Carpeta</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild><Button variant="outline"><Upload className="w-4 h-4 mr-2" />Subir Archivo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Subir Archivo</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nombre</Label><Input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Nombre del documento..." /></div>
                <div><Label>Archivo (.txt, .html, .csv)</Label><Input type="file" accept=".txt,.html,.htm,.csv,.tsv" onChange={e => { setUploadFile(e.target.files?.[0] || null); if (!uploadTitle && e.target.files?.[0]) setUploadTitle(e.target.files[0].name.replace(/\.[^.]+$/, '')); }} /></div>
                <Button onClick={handleUploadFile} disabled={!uploadFile || !uploadTitle.trim()} className="w-full">Subir y Editar</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setNewTitle(''); }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nuevo Documento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear Documento</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nombre</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Nombre del documento..." /></div>
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
                <Button onClick={handleCreateDocument} disabled={!newTitle.trim()} className="w-full">Crear y Editar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            <button onClick={() => navigateToBreadcrumb(i)} className={`hover:underline ${i === breadcrumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar archivos y documentos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border-0 bg-transparent focus-visible:ring-0 p-0 h-auto" />
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

          {/* Drive Folders */}
          {filteredFolders.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-muted-foreground">Carpetas (Drive)</h2>
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

          {/* Local Folders */}
          {filteredLocalFolders.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-muted-foreground">Carpetas Locales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredLocalFolders.map(folder => (
                  <Card key={folder} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => navigateToLocalFolder(folder)}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <Folder className="w-8 h-8 text-primary shrink-0" />
                      <span className="font-medium truncate">{folder}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Drive Files */}
          {filteredFiles.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-muted-foreground">Archivos de Drive (solo lectura)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFiles.map(file => (
                  <Card key={file.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setViewingDriveFile(file)}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <span className="text-2xl shrink-0">{getIcon(file.mimeType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        {file.modifiedTime && <p className="text-xs text-muted-foreground">{new Date(file.modifiedTime).toLocaleDateString('es-ES')}</p>}
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

          {filteredFolders.length === 0 && filteredFiles.length === 0 && filteredDocs.length === 0 && filteredLocalFolders.length === 0 && (
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

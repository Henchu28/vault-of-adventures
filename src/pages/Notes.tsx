import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, BookOpen, Folder, FileText, ArrowLeft, Loader2, ExternalLink, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ROOT_FOLDER_ID = '1djoI4FuTcUO2lzEH1y6TQ6OebsA4j51F';

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
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
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📄',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
};

function getIcon(mimeType: string) {
  return mimeIcons[mimeType] || '📎';
}

export default function Notes() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: ROOT_FOLDER_ID, name: 'Universo AcoZ' }]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Local notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

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
      } else {
        toast({ title: 'Error', description: data?.error || 'Error desconocido', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error al conectar con Drive', variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('folder_path', currentFolderPath)
      .order('title', { ascending: true });
    if (!error) setNotes(data || []);
  }, [user, currentFolderPath]);

  useEffect(() => {
    fetchDriveFolder(currentFolderId);
    fetchNotes();
  }, [currentFolderId, fetchDriveFolder, fetchNotes]);

  const navigateToFolder = (folder: DriveItem) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSearchTerm('');
  };

  const navigateToBreadcrumb = (index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    setSearchTerm('');
  };

  const handleCreateNote = async () => {
    if (!user || !noteTitle.trim()) return;
    const { error } = await supabase.from('notes').insert({
      title: noteTitle,
      content: noteContent,
      folder_path: currentFolderPath,
      user_id: user.id,
    });
    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear la nota', variant: 'destructive' });
    } else {
      toast({ title: '¡Éxito!', description: 'Nota creada correctamente' });
      setNoteTitle('');
      setNoteContent('');
      setIsNoteDialogOpen(false);
      fetchNotes();
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote) return;
    const { error } = await supabase.from('notes').update({
      title: noteTitle,
      content: noteContent,
    }).eq('id', editingNote.id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la nota', variant: 'destructive' });
    } else {
      toast({ title: '¡Éxito!', description: 'Nota actualizada' });
      setEditingNote(null);
      setNoteTitle('');
      setNoteContent('');
      fetchNotes();
    }
  };

  const handleDeleteNote = async (note: Note) => {
    const { error } = await supabase.from('notes').delete().eq('id', note.id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar la nota', variant: 'destructive' });
    } else {
      toast({ title: '¡Éxito!', description: 'Nota eliminada' });
      fetchNotes();
    }
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content || '');
  };

  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notas de Campaña</h1>
        <Dialog open={isNoteDialogOpen} onOpenChange={(open) => { setIsNoteDialogOpen(open); if (!open) { setNoteTitle(''); setNoteContent(''); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nueva Nota</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Crear Nota</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Título</Label><Input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Título de la nota..." /></div>
              <div><Label>Contenido</Label><Textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Escribe tu nota..." rows={10} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateNote}>Crear</Button>
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
          placeholder="Buscar archivos y notas..."
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
          {/* Back button */}
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
                  <Card
                    key={folder.id}
                    className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                    onClick={() => navigateToFolder(folder)}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <Folder className="w-8 h-8 text-accent shrink-0" />
                      <span className="font-medium truncate">{folder.name}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Drive Files */}
          {filteredFiles.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-muted-foreground">Archivos de Drive</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFiles.map(file => (
                  <Card key={file.id} className="hover:shadow-md transition-all">
                    <CardContent className="flex items-center gap-3 p-4">
                      <span className="text-2xl shrink-0">{getIcon(file.mimeType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        {file.modifiedTime && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(file.modifiedTime).toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                      {file.webViewLink && (
                        <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                          <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Local Notes */}
          {filteredNotes.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-muted-foreground">Notas Locales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredNotes.map(note => (
                  <Card key={note.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{note.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {note.content ? note.content.substring(0, 100) + '...' : 'Sin contenido'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(note.updated_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => openEditNote(note)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteNote(note)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredFolders.length === 0 && filteredFiles.length === 0 && filteredNotes.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                {searchTerm ? 'No se encontraron resultados' : 'Carpeta vacía'}
              </h3>
            </div>
          )}
        </div>
      )}

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNote} onOpenChange={open => { if (!open) { setEditingNote(null); setNoteTitle(''); setNoteContent(''); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar Nota</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} /></div>
            <div><Label>Contenido</Label><Textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={10} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditingNote(null); setNoteTitle(''); setNoteContent(''); }}>Cancelar</Button>
              <Button onClick={handleUpdateNote}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

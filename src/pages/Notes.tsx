import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Search, BookOpen, Folder, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Note {
  id: string;
  title: string;
  content: string;
  folder_path: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function Notes() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolder, setCurrentFolder] = useState('/');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, currentFolder]);

  const fetchNotes = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('folder_path', currentFolder)
      .order('title', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch notes",
        variant: "destructive",
      });
    } else {
      setNotes(data || []);
    }
    
    setLoading(false);
  };

  const handleCreateNote = async () => {
    if (!user || !newNoteTitle.trim()) return;

    const { error } = await supabase
      .from('notes')
      .insert({
        title: newNoteTitle,
        content: newNoteContent,
        folder_path: currentFolder,
        user_id: user.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Note created successfully",
      });
      setNewNoteTitle('');
      setNewNoteContent('');
      setIsDialogOpen(false);
      fetchNotes();
    }
  };

  const handleUpdateNote = async (note: Note) => {
    const { error } = await supabase
      .from('notes')
      .update({
        title: note.title,
        content: note.content,
      })
      .eq('id', note.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Note updated successfully",
      });
      setEditingNote(null);
      fetchNotes();
    }
  };

  const handleDelete = async (note: Note) => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', note.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
      fetchNotes();
    }
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const folders = Array.from(new Set(notes.map(note => note.folder_path.split('/')[1]).filter(Boolean)));

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading notes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Campaign Notes</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Enter note title..."
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Write your note content..."
                  rows={10}
                />
              </div>
              <div className="flex space-x-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNote}>
                  Create Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Breadcrumb and Search */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          <span>Notes</span>
          {currentFolder !== '/' && (
            <>
              <span>/</span>
              <span>{currentFolder.replace('/', '')}</span>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2 p-4 bg-card rounded-lg">
          <Search className="w-4 h-4" />
          <Input
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Folders */}
      {folders.length > 0 && currentFolder === '/' && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Folders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {folders.map((folder) => (
              <Card key={folder} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentFolder(`/${folder}`)}>
                <CardContent className="flex items-center space-x-2 p-4">
                  <Folder className="w-8 h-8 text-primary" />
                  <span className="font-medium">{folder}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Notes Grid */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Notes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span className="truncate">{note.title}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingNote(note)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(note)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {note.content ? note.content.substring(0, 150) + '...' : 'No content'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(note.updated_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No notes found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms.' : 'Create your first note to get started!'}
          </p>
        </div>
      )}

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({...editingNote, title: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-content">Content</Label>
                <Textarea
                  id="edit-content"
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({...editingNote, content: e.target.value})}
                  rows={10}
                />
              </div>
              <div className="flex space-x-2 justify-end">
                <Button variant="outline" onClick={() => setEditingNote(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateNote(editingNote)}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
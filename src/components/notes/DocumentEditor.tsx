import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Download, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { RichTextEditor } from './RichTextEditor';
import { SpreadsheetEditor } from './SpreadsheetEditor';
import { saveAs } from 'file-saver';

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

interface DocumentEditorProps {
  document: Document;
  onBack: () => void;
  onDeleted: () => void;
  onSaved: () => void;
}

export function DocumentEditor({ document, onBack, onDeleted, onSaved }: DocumentEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setTitle(document.title);
    setContent(document.content || '');
    setHasChanges(false);
  }, [document]);

  const handleContentChange = useCallback((val: string) => {
    setContent(val);
    setHasChanges(true);
  }, []);

  const handleTitleChange = useCallback((val: string) => {
    setTitle(val);
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('documents').update({
      title,
      content,
    }).eq('id', document.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo guardar el documento', variant: 'destructive' });
    } else {
      toast({ title: '¡Guardado!', description: 'Documento guardado correctamente' });
      setHasChanges(false);
      onSaved();
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) return;
    const { error } = await supabase.from('documents').delete().eq('id', document.id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    } else {
      toast({ title: '¡Eliminado!', description: 'Documento eliminado' });
      onDeleted();
    }
  };

  const handleDownload = () => {
    let blob: Blob;
    let ext: string;

    if (document.file_type === 'txt') {
      blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      ext = 'txt';
    } else if (document.file_type === 'xlsx') {
      // Export as TSV for spreadsheet data
      blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
      ext = 'tsv';
    } else {
      // docx - export as HTML
      const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${content}</body></html>`;
      blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
      ext = 'html';
    }

    saveAs(blob, `${title}.${ext}`);
  };

  const fileTypeLabel = document.file_type === 'docx' ? 'Word' : document.file_type === 'xlsx' ? 'Excel' : 'Texto';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />Volver
          </Button>
          <span className="text-xs bg-muted px-2 py-1 rounded font-medium">{fileTypeLabel}</span>
          {hasChanges && <span className="text-xs text-amber-500 font-medium">● Sin guardar</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />Descargar
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1" />Eliminar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Guardar
          </Button>
        </div>
      </div>

      <Input
        value={title}
        onChange={e => handleTitleChange(e.target.value)}
        className="text-xl font-bold border-0 border-b border-border rounded-none px-0 focus-visible:ring-0"
        placeholder="Título del documento..."
      />

      {document.file_type === 'docx' && (
        <RichTextEditor content={content} onChange={handleContentChange} />
      )}
      {document.file_type === 'xlsx' && (
        <SpreadsheetEditor content={content} onChange={handleContentChange} />
      )}
      {document.file_type === 'txt' && (
        <Textarea
          value={content}
          onChange={e => { setContent(e.target.value); setHasChanges(true); }}
          className="min-h-[400px] font-mono text-sm"
          placeholder="Escribe aquí..."
        />
      )}
    </div>
  );
}

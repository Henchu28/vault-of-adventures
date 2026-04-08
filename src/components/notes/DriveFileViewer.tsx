import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface DriveFileViewerProps {
  fileId: string;
  fileName: string;
  mimeType: string;
  onBack: () => void;
}

export function DriveFileViewer({ fileId, fileName, mimeType, onBack }: DriveFileViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('drive-file-content', {
          body: { fileId, mimeType },
        });
        if (fnError || !data?.success) {
          setError(data?.error || fnError?.message || 'Error al cargar el archivo');
        } else {
          setContent(data.content);
          setContentType(data.contentType);
        }
      } catch (e) {
        setError('Error de conexión');
      }
      setLoading(false);
    };
    fetchContent();
  }, [fileId, mimeType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
        <h2 className="text-xl font-bold truncate">{fileName}</h2>
        <span className="text-xs bg-muted px-2 py-1 rounded font-medium text-muted-foreground">Drive · Solo lectura</span>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando contenido...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-16">
          <p className="text-destructive font-medium">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">No se pudo cargar el contenido de este archivo.</p>
        </div>
      )}

      {!loading && !error && content && (
        <div className="border border-border rounded-lg overflow-hidden bg-background">
          {contentType === 'html' && (
            <div
              className="prose prose-sm max-w-none p-6 min-h-[400px] [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
          {contentType === 'text' && (
            <pre className="p-6 text-sm font-mono whitespace-pre-wrap min-h-[400px]">{content}</pre>
          )}
          {contentType === 'image' && (
            <div className="flex justify-center p-6">
              <img src={`data:image/png;base64,${content}`} alt={fileName} className="max-w-full max-h-[600px] object-contain" />
            </div>
          )}
          {contentType === 'pdf' && (
            <iframe
              src={`data:application/pdf;base64,${content}`}
              className="w-full min-h-[600px]"
              title={fileName}
            />
          )}
        </div>
      )}
    </div>
  );
}

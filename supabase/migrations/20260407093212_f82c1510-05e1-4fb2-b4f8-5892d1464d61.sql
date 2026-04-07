
-- Create documents table for storing campaign documents
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  file_type TEXT NOT NULL CHECK (file_type IN ('docx', 'xlsx', 'txt')),
  folder_path TEXT DEFAULT '/',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Only masters can view documents
CREATE POLICY "Masters can view documents"
  ON public.documents FOR SELECT
  USING (has_role(auth.uid(), 'master'::app_role));

-- Only masters can create documents
CREATE POLICY "Masters can create documents"
  ON public.documents FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'master'::app_role) AND auth.uid() = user_id);

-- Only masters can update documents
CREATE POLICY "Masters can update documents"
  ON public.documents FOR UPDATE
  USING (has_role(auth.uid(), 'master'::app_role) AND auth.uid() = user_id);

-- Only masters can delete documents
CREATE POLICY "Masters can delete documents"
  ON public.documents FOR DELETE
  USING (has_role(auth.uid(), 'master'::app_role) AND auth.uid() = user_id);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

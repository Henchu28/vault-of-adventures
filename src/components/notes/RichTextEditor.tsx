import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import FontFamily from '@tiptap/extension-font-family';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Highlighter, Undo, Redo,
  Link as LinkIcon, Unlink, Table as TableIcon,
  Heading1, Heading2, Heading3, Palette, Type, Minus, Quote,
  Plus, Trash2,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'Inter, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'JetBrains Mono, monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times', value: 'Times New Roman, serif' },
  { label: 'Courier', value: 'Courier New, monospace' },
];

const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#a855f7',
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb',
];

export function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline cursor-pointer' } }),
      Color,
      TextStyle,
      FontFamily,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: 'Empieza a escribir...' }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setLinkUrl('');
  }, [editor, linkUrl]);

  if (!editor) return null;

  const ToolbarButton = ({ onClick, active, children, title, disabled }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string; disabled?: boolean }) => (
    <Button
      type="button"
      variant={active ? 'default' : 'ghost'}
      size="sm"
      className="h-7 w-7 p-0"
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  );

  const currentHeading = editor.isActive('heading', { level: 1 }) ? '1'
    : editor.isActive('heading', { level: 2 }) ? '2'
    : editor.isActive('heading', { level: 3 }) ? '3'
    : '0';

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {editable && (
        <div className="border-b border-border bg-muted/30">
          {/* Row 1: Text style */}
          <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-border/50">
            {/* Font family */}
            <Select
              value={editor.getAttributes('textStyle').fontFamily || 'Inter, sans-serif'}
              onValueChange={(val) => editor.chain().focus().setFontFamily(val).run()}
            >
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map(f => (
                  <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Heading level */}
            <Select
              value={currentHeading}
              onValueChange={(val) => {
                if (val === '0') editor.chain().focus().setParagraph().run();
                else editor.chain().focus().toggleHeading({ level: parseInt(val) as 1 | 2 | 3 }).run();
              }}
            >
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue placeholder="Párrafo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Párrafo</SelectItem>
                <SelectItem value="1">Título 1</SelectItem>
                <SelectItem value="2">Título 2</SelectItem>
                <SelectItem value="3">Título 3</SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Text color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Color de texto">
                  <Palette className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => editor.chain().focus().setColor(color).run()}
                    />
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => editor.chain().focus().unsetColor().run()}>
                  Sin color
                </Button>
              </PopoverContent>
            </Popover>

            {/* Highlight color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={editor.isActive('highlight') ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" title="Resaltar">
                  <Highlighter className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa', '#cffafe', '#fce7f3', '#d9f99d', '#f5f5f4'].map(color => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                    />
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => editor.chain().focus().unsetHighlight().run()}>
                  Sin resaltado
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          {/* Row 2: Formatting */}
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita">
              <Bold className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva">
              <Italic className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Subrayado">
              <UnderlineIcon className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado">
              <Strikethrough className="w-3.5 h-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Izquierda">
              <AlignLeft className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrar">
              <AlignCenter className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Derecha">
              <AlignRight className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justificar">
              <AlignJustify className="w-3.5 h-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
              <List className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
              <ListOrdered className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Cita">
              <Quote className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Línea horizontal">
              <Minus className="w-3.5 h-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Link */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={editor.isActive('link') ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" title="Enlace">
                  <LinkIcon className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    className="h-8 text-xs"
                    onKeyDown={e => e.key === 'Enter' && setLink()}
                  />
                  <Button size="sm" className="h-8" onClick={setLink}>OK</Button>
                </div>
              </PopoverContent>
            </Popover>
            {editor.isActive('link') && (
              <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} title="Quitar enlace">
                <Unlink className="w-3.5 h-3.5" />
              </ToolbarButton>
            )}

            {/* Table */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={editor.isActive('table') ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" title="Tabla">
                  <TableIcon className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 space-y-1">
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                  <Plus className="w-3 h-3 mr-1" /> Insertar tabla 3×3
                </Button>
                {editor.isActive('table') && (
                  <>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                      Añadir columna
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => editor.chain().focus().addRowAfter().run()}>
                      Añadir fila
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-destructive" onClick={() => editor.chain().focus().deleteTable().run()}>
                      <Trash2 className="w-3 h-3 mr-1" /> Eliminar tabla
                    </Button>
                  </>
                )}
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Deshacer" disabled={!editor.can().undo()}>
              <Undo className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Rehacer" disabled={!editor.can().redo()}>
              <Redo className="w-3.5 h-3.5" />
            </ToolbarButton>
          </div>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-6 min-h-[400px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-muted [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_.is-empty]:before:content-[attr(data-placeholder)] [&_.ProseMirror_.is-empty]:before:text-muted-foreground [&_.ProseMirror_.is-empty]:before:float-left [&_.ProseMirror_.is-empty]:before:pointer-events-none"
      />
    </div>
  );
}

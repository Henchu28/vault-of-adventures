import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle, Pencil, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useHelpTexts } from "@/lib/sheet/help-texts-context";

const DEFAULT_FALLBACK = (field: string) => `Texto de ayuda para campo ${field}`;

export function HelpIcon({ field }: { field: string }) {
  const { texts, isAdmin, saveText } = useHelpTexts();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const content = texts[field] ?? DEFAULT_FALLBACK(field);

  if (!isAdmin) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Ayuda ${field}`}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs whitespace-pre-wrap">
            {content}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const startEdit = () => {
    setDraft(texts[field] ?? "");
    setEditing(true);
  };

  const onSave = async () => {
    setSaving(true);
    await saveText(field, draft);
    setSaving(false);
    setEditing(false);
  };

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) setEditing(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Ayuda ${field}`}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-sm w-80 text-xs space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-primary">{field}</div>
        {editing ? (
          <>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="text-xs"
            />
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="h-7" disabled={saving} onClick={onSave}>
                <Check className="h-3.5 w-3.5 mr-1" /> Guardar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="whitespace-pre-wrap">{content}</div>
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" className="h-7" onClick={startEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

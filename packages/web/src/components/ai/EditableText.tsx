import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string;
  onSave: (value: string) => void;
  isSaving?: boolean;
  className?: string;
}

/**
 * Click-to-edit text component for AI-generated fields.
 * Displays text in read mode; clicking activates a textarea with save/cancel.
 */
export function EditableText({ value, onSave, isSaving, className = "" }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  const handleSave = () => {
    if (draft !== value) {
      onSave(draft);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={className}>
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          className="text-sm"
        />
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
          click to edit
        </span>
      </div>
      <p
        onClick={() => setEditing(true)}
        className="text-sm leading-relaxed whitespace-pre-wrap cursor-text rounded-md p-2 -m-2 hover:bg-muted/40 hover:ring-1 hover:ring-border transition-all"
        title="Click to edit"
      >
        {value}
      </p>
    </div>
  );
}

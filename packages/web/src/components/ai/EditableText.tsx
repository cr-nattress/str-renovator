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
    <p
      onClick={() => setEditing(true)}
      className={`text-sm leading-relaxed whitespace-pre-wrap cursor-pointer rounded-md p-1.5 -m-1.5 hover:bg-muted/50 transition-colors ${className}`}
      title="Click to edit"
    >
      {value}
    </p>
  );
}

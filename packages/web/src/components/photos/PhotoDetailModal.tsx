import { useState } from "react";
import { X } from "lucide-react";
import type { DbPhoto, UpdatePhotoMetadataDto } from "@str-renovator/shared";
import { DownloadButton } from "@/components/ui/download-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type PhotoWithUrl = DbPhoto & { url?: string };

interface Props {
  photo: PhotoWithUrl;
  onSave: (data: UpdatePhotoMetadataDto) => void;
  onClose: () => void;
  isSaving: boolean;
}

export function PhotoDetailModal({ photo, onSave, onClose, isSaving }: Props) {
  const [displayName, setDisplayName] = useState(photo.display_name ?? "");
  const [description, setDescription] = useState(photo.description ?? "");
  const [tags, setTags] = useState<string[]>(photo.tags ?? []);
  const [constraints, setConstraints] = useState<string[]>(photo.constraints ?? []);
  const [tagInput, setTagInput] = useState("");
  const [constraintInput, setConstraintInput] = useState("");

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const value = tagInput.trim();
      if (!tags.includes(value)) setTags([...tags, value]);
      setTagInput("");
    }
  }

  function handleConstraintKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && constraintInput.trim()) {
      e.preventDefault();
      const value = constraintInput.trim();
      if (!constraints.includes(value)) setConstraints([...constraints, value]);
      setConstraintInput("");
    }
  }

  function handleSave() {
    const finalTags = tagInput.trim() && !tags.includes(tagInput.trim())
      ? [...tags, tagInput.trim()]
      : tags;
    const finalConstraints = constraintInput.trim() && !constraints.includes(constraintInput.trim())
      ? [...constraints, constraintInput.trim()]
      : constraints;
    onSave({
      display_name: displayName || null,
      description: description || null,
      tags: finalTags,
      constraints: finalConstraints,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Photo preview */}
        <div className="aspect-video bg-muted overflow-hidden rounded-t-lg relative group">
          <img
            src={photo.url ?? ""}
            alt={photo.display_name ?? photo.filename}
            className="w-full h-full object-cover"
          />
          {photo.url && (
            <DownloadButton
              url={photo.url}
              filename={photo.display_name ?? photo.filename}
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            />
          )}
        </div>

        <div className="p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="sr-only">Edit Photo Details</DialogTitle>
          </DialogHeader>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={photo.filename}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="photoDesc">Description</Label>
            <Textarea
              id="photoDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's in this photo..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type a tag and press Enter"
            />
          </div>

          {/* Constraints */}
          <div className="space-y-2">
            <Label>Constraints</Label>
            <p className="text-xs text-muted-foreground">
              Things the AI should not change when analyzing or editing this photo.
            </p>
            {constraints.length > 0 && (
              <ul className="divide-y divide-amber-100 border border-amber-200 rounded-lg overflow-hidden">
                {constraints.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between bg-amber-50 px-3 py-2"
                  >
                    <span className="text-sm text-amber-900 truncate">{c}</span>
                    <button
                      onClick={() => setConstraints(constraints.filter((_, idx) => idx !== i))}
                      className="ml-2 flex-shrink-0 text-amber-400 hover:text-amber-700 transition-colors duration-150"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Input
              value={constraintInput}
              onChange={(e) => setConstraintInput(e.target.value)}
              onKeyDown={handleConstraintKeyDown}
              placeholder="e.g. Wall paint color will not change"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

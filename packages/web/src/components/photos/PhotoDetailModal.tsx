import { useState, useEffect, useRef } from "react";
import type { DbPhoto, UpdatePhotoMetadataDto } from "@str-renovator/shared";

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
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

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
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Photo preview */}
        <div className="aspect-video bg-gray-100 rounded-t-xl overflow-hidden">
          <img
            src={photo.url ?? ""}
            alt={photo.display_name ?? photo.filename}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-5 space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={photo.filename}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's in this photo..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      className="ml-1.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-blue-200 text-blue-600 hover:text-blue-800"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type a tag and press Enter"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Constraints */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Constraints
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Things the AI should not change when analyzing or editing this photo.
            </p>
            {constraints.length > 0 && (
              <ul className="mb-2 divide-y divide-amber-100 border border-amber-200 rounded-lg overflow-hidden">
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              type="text"
              value={constraintInput}
              onChange={(e) => setConstraintInput(e.target.value)}
              onKeyDown={handleConstraintKeyDown}
              placeholder="e.g. Wall paint color will not change"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

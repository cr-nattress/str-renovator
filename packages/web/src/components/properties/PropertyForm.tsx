import { useState } from "react";
import type { CreatePropertyDto } from "@str-renovator/shared";

interface Props {
  initialValues?: Partial<CreatePropertyDto>;
  onSubmit: (data: CreatePropertyDto) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function PropertyForm({
  initialValues,
  onSubmit,
  isLoading,
  submitLabel = "Save",
}: Props) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [listingUrl, setListingUrl] = useState(
    initialValues?.listing_url ?? "",
  );
  const [context, setContext] = useState(initialValues?.context ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description: description || undefined,
      listing_url: listingUrl || undefined,
      context: context || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Property Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g. Mountain View Cabin"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Brief description of the property..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Listing URL
        </label>
        <input
          type="url"
          value={listingUrl}
          onChange={(e) => setListingUrl(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://airbnb.com/rooms/..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Context
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Any specific goals, style preferences, budget constraints..."
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !name.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

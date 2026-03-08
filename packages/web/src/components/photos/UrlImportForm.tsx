import { useState } from "react";
import { useStartScrape } from "../../api/scrape";
import { ScrapeStatus } from "./ScrapeStatus";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  propertyId: string;
  onSuccess: () => void;
}

export function UrlImportForm({ propertyId, onSuccess }: Props) {
  const [url, setUrl] = useState("");
  const [activeScrapeJobId, setActiveScrapeJobId] = useState<string | null>(null);
  const startScrape = useStartScrape(propertyId);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    startScrape.mutate(url, {
      onSuccess: (data) => {
        setActiveScrapeJobId(data.scrape_job_id);
        setUrl("");
      },
    });
  };

  const handleDone = () => {
    setActiveScrapeJobId(null);
    // Refresh photos list
    queryClient.invalidateQueries({ queryKey: ["photos", propertyId] });
    queryClient.invalidateQueries({ queryKey: ["properties", propertyId] });
    onSuccess();
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste listing URL to import photos..."
          disabled={!!activeScrapeJobId}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={startScrape.isPending || !url.trim() || !!activeScrapeJobId}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50"
        >
          {startScrape.isPending ? "Starting..." : "Import"}
        </button>
      </form>

      {startScrape.isError && (
        <p className="text-xs text-red-600">
          {startScrape.error instanceof Error
            ? startScrape.error.message
            : "Failed to start import"}
        </p>
      )}

      {activeScrapeJobId && (
        <ScrapeStatus jobId={activeScrapeJobId} onDone={handleDone} />
      )}
    </div>
  );
}

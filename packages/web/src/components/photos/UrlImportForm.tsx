import { useState } from "react";
import { useStartScrape } from "../../api/scrape";
import { ScrapeStatus } from "./ScrapeStatus";
import { ErrorAlert } from "../ErrorAlert";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    queryClient.invalidateQueries({ queryKey: ["photos", propertyId] });
    queryClient.invalidateQueries({ queryKey: ["properties", propertyId] });
    onSuccess();
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste listing URL to import photos..."
          disabled={!!activeScrapeJobId}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={startScrape.isPending || !url.trim() || !!activeScrapeJobId}
        >
          {startScrape.isPending ? "Starting..." : "Import"}
        </Button>
      </form>

      {startScrape.isError && (
        <ErrorAlert
          error={startScrape.error}
          onRetry={() => startScrape.mutate(url)}
        />
      )}

      {activeScrapeJobId && (
        <ScrapeStatus jobId={activeScrapeJobId} onDone={handleDone} />
      )}
    </div>
  );
}

import { Download } from "lucide-react";
import { useState } from "react";

interface Props {
  url: string;
  filename?: string;
  className?: string;
}

export function DownloadButton({ url, filename, className = "" }: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (downloading || !url) return;

    setDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename ?? "image.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className={`p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors ${downloading ? "opacity-50" : ""} ${className}`}
      title="Download image"
    >
      <Download className="w-4 h-4" />
    </button>
  );
}

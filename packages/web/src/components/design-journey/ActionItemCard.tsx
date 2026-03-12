import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ImageIcon } from "lucide-react";
import { DownloadButton } from "@/components/ui/download-button";
import type {
  JourneyStatus,
  UpdateJourneyItemDto,
} from "@str-renovator/shared";
import type { JourneyItemWithImage } from "../../api/journey";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PRIORITY_BADGE_VARIANT } from "../properties/shared-renderers";

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

function formatEstimatedCost(
  min: number | null,
  max: number | null,
  fallback: string | null,
): string {
  if (min != null && max != null) {
    return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  }
  return fallback || "N/A";
}

const STATUS_OPTIONS: { value: JourneyStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
];

interface Props {
  item: JourneyItemWithImage;
  onUpdate: (id: string, data: UpdateJourneyItemDto) => void;
  isSaving?: boolean;
}

export function ActionItemCard({ item, onUpdate, isSaving }: Props) {
  const [status, setStatus] = useState<JourneyStatus>(item.status);
  const [actualCost, setActualCost] = useState(
    item.actual_cost?.toString() ?? "",
  );
  const [notes, setNotes] = useState(item.notes ?? "");
  const [dirty, setDirty] = useState(false);

  const handleSave = () => {
    onUpdate(item.id, {
      status,
      actual_cost: actualCost ? Number(actualCost) : undefined,
      notes: notes || undefined,
    });
    setDirty(false);
  };

  return (
    <Card className="overflow-hidden">
      {item.image_status === "completed" && item.image_url && (
        <div className="relative group">
          <Link to={`/journey/${item.id}`} className="block aspect-video w-full overflow-hidden bg-muted hover:opacity-90 transition-opacity">
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-contain"
            />
          </Link>
          <DownloadButton
            url={item.image_url}
            filename={`${item.title}.png`}
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          />
        </div>
      )}
      {(item.image_status === "pending" || item.image_status === "processing") && (
        <div className="aspect-video w-full bg-muted animate-pulse flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Generating image...</span>
        </div>
      )}
      {item.image_status === "failed" && (
        <div className="aspect-video w-full bg-destructive/10 flex flex-col items-center justify-center gap-1">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          <span className="text-sm text-destructive">Image generation failed</span>
        </div>
      )}
      {item.image_status === "skipped" && (
        <div className="aspect-video w-full bg-muted flex flex-col items-center justify-center gap-1">
          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
          <span className="text-sm text-muted-foreground">No source photo available</span>
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
            {item.priority}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/journey/${item.id}`} className="font-semibold hover:text-primary transition-colors">
                {item.title}
              </Link>
              <Badge variant={PRIORITY_BADGE_VARIANT[item.impact]}>
                {item.impact} impact
              </Badge>
            </div>

            {item.description && (
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            )}

            <div className="flex flex-wrap gap-1 mt-2">
              {item.rooms_affected.map((room, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {room}
                </Badge>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as JourneyStatus);
                    setDirty(true);
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Est. Cost</Label>
                <p className="text-sm text-muted-foreground py-1.5">
                  {formatEstimatedCost(item.estimated_cost_min, item.estimated_cost_max, item.estimated_cost)}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Actual Cost ($)</Label>
                <Input
                  type="number"
                  value={actualCost}
                  onChange={(e) => {
                    setActualCost(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setDirty(true);
                }}
                rows={2}
                placeholder="Add notes..."
              />
            </div>

            {dirty && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                className="mt-2"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

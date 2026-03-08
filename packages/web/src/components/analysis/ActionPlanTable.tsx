import { Link } from "react-router-dom";
import { ImageIcon, Loader2, AlertTriangle } from "lucide-react";
import type { ActionItem, Priority } from "@str-renovator/shared";
import type { JourneyItemWithImage } from "../../api/journey";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const IMPACT_VARIANT: Record<Priority, "default" | "secondary" | "destructive"> = {
  high: "destructive",
  medium: "secondary",
  low: "default",
};

interface Props {
  actionPlan: ActionItem[];
  journeyItems?: JourneyItemWithImage[];
}

function findMatchingImage(
  item: ActionItem,
  journeyItems?: JourneyItemWithImage[]
): string | null {
  if (!journeyItems) return null;
  const match = journeyItems.find(
    (ji) => ji.priority === item.priority && ji.title === item.item
  );
  return match?.image_url ?? null;
}

export function ActionPlanTable({ actionPlan, journeyItems }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Action Plan</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-16">Preview</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Est. Cost</TableHead>
              <TableHead>Impact</TableHead>
              <TableHead>Rooms</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actionPlan.map((item) => {
              const imageUrl = findMatchingImage(item, journeyItems);
              const matchingItem = journeyItems?.find(
                (ji) => ji.priority === item.priority && ji.title === item.item
              );
              const imageStatus = matchingItem?.image_status;

              return (
                <TableRow key={item.priority}>
                  <TableCell className="text-muted-foreground font-medium">
                    {item.priority}
                  </TableCell>
                  <TableCell>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.item}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : imageStatus === "pending" || imageStatus === "processing" ? (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                      </div>
                    ) : imageStatus === "failed" ? (
                      <div className="w-12 h-12 rounded bg-destructive/10 flex items-center justify-center" title={`${item.item} — image generation failed`}>
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {matchingItem ? (
                      <Link to={`/journey/${matchingItem.id}`} className="hover:text-primary transition-colors">
                        {item.item}
                      </Link>
                    ) : (
                      item.item
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.estimated_cost}
                  </TableCell>
                  <TableCell>
                    <Badge variant={IMPACT_VARIANT[item.impact]}>
                      {item.impact}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.rooms_affected.map((room, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {room}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

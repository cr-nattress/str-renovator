import { Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  BedDouble,
  Bath,
  DollarSign,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ActionBar } from "@/components/ui/action-bar";
import type { DbProperty, AvailableAction } from "@str-renovator/shared";

interface Props {
  property: DbProperty;
  availableActions?: AvailableAction[];
  onAction: (action: AvailableAction) => void;
}

function extractQuickStats(property: DbProperty) {
  const scraped = property.scraped_data as Record<string, unknown> | null;
  const profile = property.property_profile as Record<string, unknown> | null;
  const capacity = profile?.capacity as Record<string, unknown> | undefined;
  const pricing = profile?.pricing as Record<string, unknown> | undefined;
  const reputation = profile?.reputation as Record<string, unknown> | undefined;

  return {
    propertyType: (scraped?.property_type ?? profile?.property_type) as string | undefined,
    bedrooms: (scraped?.bedrooms ?? capacity?.bedrooms) as number | undefined,
    bathrooms: (scraped?.bathrooms ?? capacity?.bathrooms) as number | undefined,
    nightlyRate: (scraped?.nightly_rate ?? pricing?.nightly_rate) as number | undefined,
    rating: (scraped?.rating ?? reputation?.rating) as number | undefined,
    areaType: (profile?.area_type) as string | undefined,
  };
}

function buildLocationString(property: DbProperty): string | null {
  const parts = [property.city, property.state].filter(Boolean);
  if (parts.length === 0) return null;
  let loc = parts.join(", ");
  if (property.zip_code) loc += ` ${property.zip_code}`;
  return loc;
}

export function PropertyDetailHeader({
  property,
  availableActions,
  onAction,
}: Props) {
  const stats = extractQuickStats(property);
  const location = buildLocationString(property);

  // Filter to header-relevant actions (exclude upload-photos, delete, import)
  const headerActions = (availableActions ?? []).filter((a) =>
    ["edit-property", "run-analysis", "view-journey"].includes(a.command),
  );

  return (
    <div className="mb-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{property.name}</h1>
        <ActionBar actions={headerActions} onAction={onAction} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
        {location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </span>
        )}
        {stats.propertyType && (
          <span className="capitalize">{String(stats.propertyType)}</span>
        )}
        {stats.bedrooms != null && (
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" />
            {stats.bedrooms}BR
          </span>
        )}
        {stats.bathrooms != null && (
          <span className="inline-flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" />
            {stats.bathrooms}BA
          </span>
        )}
        {stats.nightlyRate != null && (
          <span className="inline-flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            {stats.nightlyRate}/night
          </span>
        )}
        {stats.rating != null && (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {stats.rating}
          </span>
        )}
        {stats.areaType && (
          <Badge variant="secondary" className="text-xs">
            {stats.areaType}
          </Badge>
        )}
      </div>

      <Separator className="mt-4" />
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import {
  MapPin,
  BedDouble,
  Bath,
  DollarSign,
  Star,
  Camera,
  ExternalLink,
  ImageIcon,
  FlaskConical,
} from "lucide-react";
import type { PropertyWithSummary } from "../../api/properties";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadButton } from "@/components/ui/download-button";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  completed: { label: "Completed", variant: "default" },
  partially_completed: { label: "Partial", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  pending: { label: "Pending", variant: "secondary" },
  analyzing: { label: "Analyzing", variant: "secondary" },
  generating_images: { label: "Generating", variant: "secondary" },
};

interface Props {
  property: PropertyWithSummary;
}

export function PropertyCard({ property }: Props) {
  const navigate = useNavigate();
  const scraped = property.scraped_data as Record<string, unknown> | null;

  const city = property.city;
  const state = property.state;
  const location = [city, state].filter(Boolean).join(", ");

  const bedrooms = scraped?.bedrooms as number | undefined;
  const bathrooms = scraped?.bathrooms as number | undefined;
  const propertyType = scraped?.property_type as string | undefined;
  const nightlyRate = scraped?.nightly_rate as string | undefined;
  const rating = scraped?.rating as number | undefined;
  const reviewCount = scraped?.review_count as number | undefined;

  const analysis = property.latest_analysis;
  const analysisStatus = analysis
    ? STATUS_LABELS[analysis.status] ?? { label: analysis.status, variant: "secondary" as const }
    : null;

  const thumbnails = property.thumbnail_urls ?? [];
  const photoCount = property.photo_count ?? 0;

  return (
    <Card
      onClick={() => navigate(`/properties/${property.id}`)}
      className="cursor-pointer hover:shadow-md transition-shadow duration-150 overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Photo mosaic */}
        <div className="flex-shrink-0 sm:w-72 md:w-80 lg:w-96">
          {thumbnails.length > 0 ? (
            <div className="grid grid-cols-3 grid-rows-2 h-48 sm:h-full gap-0.5">
              {/* Main large photo */}
              <div className="col-span-2 row-span-2 relative group overflow-hidden">
                <img
                  src={thumbnails[0]}
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
                <DownloadButton
                  url={thumbnails[0]}
                  filename={`${property.name}-1.png`}
                  className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                />
              </div>
              {/* Secondary thumbnails */}
              {[1, 2, 3, 4].map((idx) =>
                idx < thumbnails.length ? (
                  <div key={idx} className="relative overflow-hidden">
                    <img
                      src={thumbnails[idx]}
                      alt={`${property.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === (thumbnails.length > 4 ? 3 : thumbnails.length - 1) &&
                      photoCount > thumbnails.length && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            +{photoCount - thumbnails.length}
                          </span>
                        </div>
                      )}
                  </div>
                ) : (
                  <div
                    key={idx}
                    className="bg-muted flex items-center justify-center"
                  >
                    <ImageIcon className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="h-48 sm:h-full min-h-[10rem] bg-muted flex flex-col items-center justify-center gap-2">
              <Camera className="w-8 h-8 text-muted-foreground/30" />
              <span className="text-sm text-muted-foreground/50">
                No photos yet
              </span>
            </div>
          )}
        </div>

        {/* Property info */}
        <div className="flex-1 p-5 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {property.name}
              </h3>
              {location && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  {location}
                  {property.zip_code && ` ${property.zip_code}`}
                </p>
              )}
            </div>
            {property.listing_url && (
              <a
                href={property.listing_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="View listing"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Property details */}
          {(propertyType || bedrooms || bathrooms) && (
            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              {propertyType && (
                <span className="capitalize">{propertyType}</span>
              )}
              {propertyType && (bedrooms || bathrooms) && (
                <span className="text-border">|</span>
              )}
              {bedrooms != null && (
                <span className="flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5" />
                  {bedrooms} {bedrooms === 1 ? "bed" : "beds"}
                </span>
              )}
              {bathrooms != null && (
                <span className="flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5" />
                  {bathrooms} {bathrooms === 1 ? "bath" : "baths"}
                </span>
              )}
            </div>
          )}

          {/* Rate and rating */}
          {(nightlyRate || rating != null) && (
            <div className="flex items-center gap-3 mt-2 text-sm">
              {nightlyRate && (
                <span className="flex items-center gap-0.5 font-medium">
                  <DollarSign className="w-3.5 h-3.5" />
                  {nightlyRate}
                  <span className="text-muted-foreground font-normal">
                    /night
                  </span>
                </span>
              )}
              {rating != null && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {rating}
                  {reviewCount != null && (
                    <span>
                      ({reviewCount})
                    </span>
                  )}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {property.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {property.description}
            </p>
          )}

          {/* Footer stats */}
          <div className="mt-auto pt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {photoCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Camera className="w-3 h-3 mr-1" />
                {photoCount} {photoCount === 1 ? "photo" : "photos"}
              </Badge>
            )}
            {analysis && analysisStatus && (
              <Badge variant={analysisStatus.variant} className="text-xs">
                <FlaskConical className="w-3 h-3 mr-1" />
                {analysisStatus.label}{" "}
                {new Date(analysis.created_at).toLocaleDateString()}
              </Badge>
            )}
            {!analysis && !photoCount && (
              <span className="text-muted-foreground/60 italic">
                Add photos to get started
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

import { useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useProperty, useUpdateProperty, useDeleteProperty } from "../api/properties";
import { usePhotos, useUploadPhotos, useDeletePhoto, useUpdatePhotoMetadata } from "../api/photos";
import { useAnalyses, useCreateAnalysis, useArchiveAnalysis } from "../api/analyses";
import { ScrapedDataDisplay } from "../components/properties/ScrapedDataDisplay";
import { LocationProfileDisplay } from "../components/properties/LocationProfileDisplay";
import { PropertyProfileDisplay } from "../components/properties/PropertyProfileDisplay";
import { ReviewAnalysisDisplay } from "../components/properties/ReviewAnalysisDisplay";
import { PropertyDetailHeader } from "../components/properties/PropertyDetailHeader";
import { EditPropertyDialog } from "../components/properties/EditPropertyDialog";
import { PhotoUploader } from "../components/photos/PhotoUploader";
import { PhotoGrid } from "../components/photos/PhotoGrid";
import { PhotoDetailModal } from "../components/photos/PhotoDetailModal";
import { UrlImportForm } from "../components/photos/UrlImportForm";
import { useResearchLocation } from "../api/scrape";
import { PropertyDetailSkeleton } from "../components/skeletons";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, X } from "lucide-react";
import type { DbPhoto, AvailableAction } from "@str-renovator/shared";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  failed: "destructive",
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<(DbPhoto & { url?: string }) | null>(null);

  const { data: property, isLoading } = useProperty(id!);
  const updateProperty = useUpdateProperty(id!);
  const deleteProperty = useDeleteProperty();
  const { data: photos } = usePhotos(id!);
  const uploadPhotos = useUploadPhotos(id!);
  const deletePhoto = useDeletePhoto(id!);
  const { data: analyses } = useAnalyses(id!);
  const createAnalysis = useCreateAnalysis(id!);
  const archiveAnalysis = useArchiveAnalysis(id!);
  const updatePhotoMetadata = useUpdatePhotoMetadata(id!);
  const researchLocation = useResearchLocation(id!);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  /** Update a field within a JSONB column (e.g. property_profile.property_summary) */
  const createFieldUpdater = useCallback(
    (jsonbColumn: string) =>
      async (fieldPath: string, value: string) => {
        const currentData = (property as Record<string, unknown>)?.[jsonbColumn] as Record<string, unknown> | null;
        const updated = { ...currentData, [fieldPath]: value };
        await updateProperty.mutateAsync({ [jsonbColumn]: updated } as any);
        showToast("Field updated");
      },
    [property, updateProperty, showToast],
  );

  const handlePropertyAction = useCallback(
    (action: AvailableAction) => {
      switch (action.command) {
        case "edit-property":
          setIsEditDialogOpen(true);
          break;
        case "run-analysis":
          createAnalysis.mutate(undefined, {
            onSuccess: (analysis) => navigate(`/analyses/${analysis.id}`),
          });
          break;
        case "view-journey":
          navigate(`/properties/${id}/journey`);
          break;
        case "research-location":
          researchLocation.mutate(undefined, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ["properties", id] });
            },
          });
          break;
        case "delete-property":
          deleteProperty.mutate(id!, {
            onSuccess: () => navigate("/"),
          });
          break;
      }
    },
    [id, createAnalysis, researchLocation, deleteProperty, navigate, queryClient],
  );

  if (isLoading || !property) {
    return <PropertyDetailSkeleton />;
  }

  const handleRefreshLocation = () => {
    researchLocation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["properties", id] });
      },
    });
  };

  return (
    <div>
      <PropertyDetailHeader
        property={property}
        availableActions={property.availableActions}
        onAction={handlePropertyAction}
      />

      <Tabs defaultValue="photos">
        <TabsList>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="analyses">Analyses</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="mt-6">
          <div className="space-y-6">
            <PhotoUploader
              onUpload={(files) => uploadPhotos.mutate(files)}
              isUploading={uploadPhotos.isPending}
            />
            <UrlImportForm
              propertyId={id!}
              onSuccess={() => {
                /* photos query will refetch */
              }}
            />
            <PhotoGrid
              photos={photos ?? []}
              onDelete={(photoId) => deletePhoto.mutate(photoId)}
              onPhotoClick={(photo) => setSelectedPhoto(photo)}
            />
          </div>
        </TabsContent>

        <TabsContent value="analyses" className="mt-6">
          <div className="space-y-4">
            {analyses && analyses.length > 0 ? (
              <div className="space-y-3">
                {analyses.map((analysis) => (
                  <Link
                    key={analysis.id}
                    to={`/analyses/${analysis.id}`}
                    className="block bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Analysis{" "}
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {analysis.total_photos} photos
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={STATUS_VARIANT[analysis.status] ?? "secondary"}
                        >
                          {statusLabel(analysis.status)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-500"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm("Remove this analysis from the list? The data will be preserved.")) {
                              archiveAnalysis.mutate(analysis.id);
                            }
                          }}
                          title="Archive analysis"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">
                No analyses yet. Upload photos first, then run an analysis.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="overview" className="mt-6">
          <div className="space-y-6">
            {property.property_profile && (
              <PropertyProfileDisplay
                profile={property.property_profile as Record<string, unknown>}
                onFieldUpdate={createFieldUpdater("property_profile")}
                isSaving={updateProperty.isPending}
              />
            )}

            {property.review_analysis && (
              <ReviewAnalysisDisplay
                data={property.review_analysis as Record<string, unknown>}
                onFieldUpdate={createFieldUpdater("review_analysis")}
                isSaving={updateProperty.isPending}
              />
            )}

            {property.location_profile && (
              <LocationProfileDisplay
                profile={property.location_profile as Record<string, unknown>}
                isRefreshing={researchLocation.isPending}
                onRefresh={handleRefreshLocation}
                onFieldUpdate={createFieldUpdater("location_profile")}
                isSaving={updateProperty.isPending}
              />
            )}

            {property.scraped_data && (
              <ScrapedDataDisplay
                data={property.scraped_data as Record<string, unknown>}
                onFieldUpdate={createFieldUpdater("scraped_data")}
                isSaving={updateProperty.isPending}
              />
            )}

            {(property.city || property.state) && !property.location_profile && (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Location Intelligence Available
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Generate insights for {[property.city, property.state].filter(Boolean).join(", ")}
                </p>
                <Button
                  variant="secondary"
                  onClick={handleRefreshLocation}
                  disabled={researchLocation.isPending}
                >
                  <Search className="h-4 w-4 mr-1.5" />
                  {researchLocation.isPending ? "Researching..." : "Research Location"}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <EditPropertyDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        property={property}
        onSubmit={(data) => updateProperty.mutate(data)}
        isLoading={updateProperty.isPending}
      />

      {selectedPhoto && (
        <PhotoDetailModal
          photo={selectedPhoto}
          isSaving={updatePhotoMetadata.isPending}
          onClose={() => setSelectedPhoto(null)}
          onSave={(data) =>
            updatePhotoMetadata.mutate(
              { photoId: selectedPhoto.id, data },
              { onSuccess: () => setSelectedPhoto(null) }
            )
          }
        />
      )}
    </div>
  );
}

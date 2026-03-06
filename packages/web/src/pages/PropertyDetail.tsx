import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useProperty, useUpdateProperty } from "../api/properties";
import { usePhotos, useUploadPhotos, useDeletePhoto } from "../api/photos";
import { useAnalyses, useCreateAnalysis } from "../api/analyses";
import { PropertyForm } from "../components/properties/PropertyForm";
import { PhotoUploader } from "../components/photos/PhotoUploader";
import { PhotoGrid } from "../components/photos/PhotoGrid";
import { UrlImportForm } from "../components/photos/UrlImportForm";
import type { AnalysisStatus } from "@str-renovator/shared";

const STATUS_STYLES: Record<AnalysisStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  analyzing: "bg-blue-100 text-blue-800",
  generating_images: "bg-purple-100 text-purple-800",
  generating_reports: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

type Tab = "photos" | "analyses" | "overview";

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("photos");

  const { data: property, isLoading } = useProperty(id!);
  const updateProperty = useUpdateProperty(id!);
  const { data: photos } = usePhotos(id!);
  const uploadPhotos = useUploadPhotos(id!);
  const deletePhoto = useDeletePhoto(id!);
  const { data: analyses } = useAnalyses(id!);
  const createAnalysis = useCreateAnalysis(id!);

  if (isLoading || !property) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "photos", label: "Photos" },
    { key: "analyses", label: "Analyses" },
    { key: "overview", label: "Overview" },
  ];

  return (
    <div>
      <Link
        to="/"
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        &larr; Back to Dashboard
      </Link>

      <div className="flex items-center justify-between mt-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
        <Link
          to={`/properties/${id}/journey`}
          className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
        >
          Design Journey
        </Link>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium transition-colors duration-150 border-b-2 ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "photos" && (
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
          />
        </div>
      )}

      {tab === "analyses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() =>
                createAnalysis.mutate(undefined, {
                  onSuccess: (analysis) =>
                    navigate(`/analyses/${analysis.id}`),
                })
              }
              disabled={createAnalysis.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-150 disabled:opacity-50"
            >
              {createAnalysis.isPending
                ? "Starting..."
                : "Run New Analysis"}
            </button>
          </div>

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
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[analysis.status]}`}
                    >
                      {analysis.status.replace(/_/g, " ")}
                    </span>
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
      )}

      {tab === "overview" && (
        <div className="max-w-lg">
          <PropertyForm
            initialValues={{
              name: property.name,
              description: property.description ?? undefined,
              listing_url: property.listing_url ?? undefined,
              context: property.context ?? undefined,
            }}
            onSubmit={(data) => updateProperty.mutate(data)}
            isLoading={updateProperty.isPending}
            submitLabel="Update Property"
          />
        </div>
      )}
    </div>
  );
}

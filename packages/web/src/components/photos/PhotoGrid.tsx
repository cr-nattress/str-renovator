import type { DbPhoto } from "@str-renovator/shared";
import { DownloadButton } from "@/components/ui/download-button";

type PhotoWithUrl = DbPhoto & { url?: string };

interface Props {
  photos: PhotoWithUrl[];
  onDelete?: (photoId: string) => void;
  onPhotoClick?: (photo: PhotoWithUrl) => void;
}

export function PhotoGrid({ photos, onDelete, onPhotoClick }: Props) {
  if (photos.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No photos uploaded yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className={`relative group aspect-square${onPhotoClick ? " cursor-pointer" : ""}`}
          onClick={() => onPhotoClick?.(photo)}
        >
          <img
            src={photo.url ?? ""}
            alt={photo.display_name ?? photo.filename}
            className="w-full h-full object-cover rounded-lg"
          />
          {/* Metadata badges */}
          <div className="absolute top-1 left-1 flex gap-1">
            {photo.tags?.length > 0 && (
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                T
              </span>
            )}
            {photo.constraints?.length > 0 && (
              <span className="w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                C
              </span>
            )}
          </div>
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {photo.url && (
              <DownloadButton
                url={photo.url}
                filename={photo.display_name ?? photo.filename}
              />
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(photo.id);
                }}
                className="w-6 h-6 bg-red-600 text-white rounded-full text-xs font-bold flex items-center justify-center"
              >
                X
              </button>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent rounded-b-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <p className="text-xs text-white truncate">
              {photo.display_name ?? photo.filename}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

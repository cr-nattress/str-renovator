import type { DbPhoto } from "@str-renovator/shared";

type PhotoWithUrl = DbPhoto & { url?: string };

interface Props {
  photos: PhotoWithUrl[];
  onDelete?: (photoId: string) => void;
}

export function PhotoGrid({ photos, onDelete }: Props) {
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
        <div key={photo.id} className="relative group aspect-square">
          <img
            src={photo.url ?? ""}
            alt={photo.filename}
            className="w-full h-full object-cover rounded-lg"
          />
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(photo.id);
              }}
              className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center"
            >
              X
            </button>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent rounded-b-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <p className="text-xs text-white truncate">{photo.filename}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

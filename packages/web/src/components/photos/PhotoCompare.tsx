import { useState, useRef, useCallback } from "react";

interface Props {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function PhotoCompare({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
}: Props) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current || !isDragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-lg overflow-hidden select-none cursor-col-resize"
      onMouseDown={() => {
        isDragging.current = true;
      }}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={() => {
        isDragging.current = false;
      }}
      onMouseLeave={() => {
        isDragging.current = false;
      }}
      onTouchStart={() => {
        isDragging.current = true;
      }}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={() => {
        isDragging.current = false;
      }}
    >
      {/* After image (full width, behind) */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: containerRef.current?.offsetWidth || "100%" }}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 text-xs font-bold">
          &lt;&gt;
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {afterLabel}
      </span>
    </div>
  );
}

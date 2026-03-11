import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { MoveHorizontal } from "lucide-react";
import { DownloadButton } from "@/components/ui/download-button";

interface Props {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

/**
 * Before/after photo comparison slider with animated reveal.
 * The hero component of the product — showcases AI renovation transformations.
 */
export function PhotoCompare({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
}: Props) {
  const [position, setPosition] = useState(0);
  const [hasRevealed, setHasRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Animated reveal: sweep slider from 0% to 50% on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasRevealed(true);
      setPosition(50);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current || !isDragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative w-full aspect-video rounded-xl overflow-hidden select-none cursor-col-resize shadow-lg ring-1 ring-border/50 bg-muted"
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
        style={{
          width: `${position}%`,
          transition: !isDragging.current && hasRevealed ? "width 0.6s cubic-bezier(0.16,1,0.3,1)" : "none",
        }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: containerRef.current?.offsetWidth || "100%" }}
        />
      </div>

      {/* Divider line with glow */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/90"
        style={{
          left: `${position}%`,
          transition: !isDragging.current && hasRevealed ? "left 0.6s cubic-bezier(0.16,1,0.3,1)" : "none",
          boxShadow: "0 0 8px rgba(255,255,255,0.5)",
        }}
      >
        {/* Grab handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
          <MoveHorizontal className="w-4 h-4 text-foreground/70" />
        </div>
      </div>

      {/* Before label */}
      <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium">
        {beforeLabel}
      </span>

      {/* After label + AI badge */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
          <span className="text-[10px]">&#10022;</span>
          AI Renovated
        </span>
      </div>

      {/* Download buttons */}
      <DownloadButton
        url={beforeSrc}
        filename={`${beforeLabel}.png`}
        className="absolute bottom-3 left-3"
      />
      <DownloadButton
        url={afterSrc}
        filename={`${afterLabel}.png`}
        className="absolute bottom-3 right-3"
      />
    </motion.div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import type { ServiceImage } from "../../content/site";

interface ImageSlideshowProps {
  images: ServiceImage[];
}

const SWIPE_THRESHOLD = 50;
const AUTO_ADVANCE_MS = 5000;

export default function ImageSlideshow({ images }: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const touchStartRef = useRef<number | null>(null);
  const touchDeltaRef = useRef(0);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevIndexRef = useRef<number>(0);

  const count = images.length;

  const markLoaded = useCallback((index: number) => {
    setLoadedImages(prev => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const hasMultiple = count > 1;

  const changeSlide = useCallback((newIndex: number) => {
    setCurrentIndex(prev => {
      prevIndexRef.current = prev;
      return ((newIndex % count) + count) % count;
    });
    // Reset auto-advance timer via brief pause/unpause
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 50);
  }, [count]);

  const goNext = useCallback(() => changeSlide(currentIndex + 1), [changeSlide, currentIndex]);
  const goPrev = useCallback(() => changeSlide(currentIndex - 1), [changeSlide, currentIndex]);

  // Auto-advance
  useEffect(() => {
    if (!hasMultiple || isPaused) {
      if (autoAdvanceRef.current) {
        clearInterval(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
      return;
    }

    autoAdvanceRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        prevIndexRef.current = prev;
        return (prev + 1) % count;
      });
    }, AUTO_ADVANCE_MS);

    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  }, [hasMultiple, isPaused, count]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    touchDeltaRef.current = 0;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    touchDeltaRef.current = e.touches[0].clientX - touchStartRef.current;
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaRef.current) > SWIPE_THRESHOLD) {
      // Directly change the slide without the pause/unpause in changeSlide,
      // since touch handlers manage their own pause timing
      const next = touchDeltaRef.current < 0 ? currentIndex + 1 : currentIndex - 1;
      setCurrentIndex(prev => {
        prevIndexRef.current = prev;
        return ((next % count) + count) % count;
      });
    }
    touchStartRef.current = null;
    touchDeltaRef.current = 0;
    setTimeout(() => setIsPaused(false), AUTO_ADVANCE_MS);
  };

  if (count === 0) return null;

  return (
    <div
      className="relative flex flex-col bg-neutral-950 h-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image container — object-cover on mobile (fills space, crops edges),
           object-contain on desktop (shows full image in side panel) */}
      <div className="relative flex-1 min-h-[280px] md:min-h-[400px]">
        {/* Shimmer placeholder — shows until active image loads */}
        {!loadedImages.has(currentIndex) && (
          <div className="absolute inset-0 z-[15] bg-neutral-800 overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
          </div>
        )}
        {images.map((image, index) => {
          // Render current slide and ±2 neighbors (5 max) for preloading
          const distance = Math.min(
            Math.abs(index - currentIndex),
            Math.abs(index - currentIndex + count),
            Math.abs(index - currentIndex - count)
          );
          if (distance > 2) return null;

          const isActive = index === currentIndex;
          const isPrev = index === prevIndexRef.current && index !== currentIndex;
          const focusPoint = image.focusPoint || "center center";
          return (
            <div
              key={image.src}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive
                  ? `z-20 ${loadedImages.has(index) ? "opacity-100" : "opacity-0"}`
                  : isPrev
                    ? "z-10 opacity-0"
                    : "z-0 opacity-0"
              }`}
              aria-hidden={!isActive}
            >
              <picture>
                <source
                  srcSet={`/images/services/${image.src}.webp`}
                  type="image/webp"
                />
                <img
                  ref={(el) => {
                    if (el && el.complete && el.naturalWidth > 0) {
                      markLoaded(index);
                    }
                  }}
                  src={`/images/services/${image.src}.jpg`}
                  alt={image.alt}
                  width="960"
                  height="720"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: focusPoint }}
                  loading="eager"
                  decoding="async"
                  onLoad={() => markLoaded(index)}
                  draggable={false}
                />
              </picture>
            </div>
          );
        })}

        {/* Arrow buttons — only if multiple images */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/10 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/10 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              aria-label="Next image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}

        {/* Bottom gradient + counter */}
        {hasMultiple && (
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/60 to-transparent h-[60px] flex items-end justify-center pb-2">
            <span className="text-sm font-medium text-white/70 tracking-wide tabular-nums">
              {currentIndex + 1} / {count}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

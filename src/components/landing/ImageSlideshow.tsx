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
  const touchStartRef = useRef<number | null>(null);
  const touchDeltaRef = useRef(0);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = images.length;
  const hasMultiple = count > 1;

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(((index % count) + count) % count);
    },
    [count]
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

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
      setCurrentIndex((prev) => (prev + 1) % count);
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
      if (touchDeltaRef.current < 0) goNext();
      else goPrev();
    }
    touchStartRef.current = null;
    touchDeltaRef.current = 0;
    setTimeout(() => setIsPaused(false), AUTO_ADVANCE_MS);
  };

  if (count === 0) return null;

  return (
    <div
      className="relative flex flex-col bg-black h-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image container — fills available height, object-contain for no cropping */}
      <div className="relative flex-1 min-h-[280px] md:min-h-[400px]">
        {images.map((image, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={image.src}
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
              aria-hidden={!isActive}
            >
              <picture>
                <source
                  srcSet={`/images/services/${image.src}.webp`}
                  type="image/webp"
                />
                <img
                  src={`/images/services/${image.src}.jpg`}
                  alt={image.alt}
                  className="absolute inset-0 w-full h-full object-contain"
                  loading={index === 0 ? "eager" : "lazy"}
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
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              aria-label="Next image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Photo counter — "3 / 20" format */}
      {hasMultiple && (
        <div className="flex-shrink-0 py-2 text-center">
          <span className="text-sm text-neutral-400 tabular-nums">
            {currentIndex + 1} / {count}
          </span>
        </div>
      )}
    </div>
  );
}

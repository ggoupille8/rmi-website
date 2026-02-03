import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSliderProps {
  images: string[];
  interval?: number; // Auto-advance interval in ms (default 5000)
  showArrows?: boolean;
  showDots?: boolean;
}

export default function HeroSlider({
  images,
  interval = 5000,
  showArrows = true,
  showDots = true,
}: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(goToNext, interval);
    return () => clearInterval(timer);
  }, [goToNext, interval, images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev]);

  if (images.length === 0) return null;

  return (
    <div className="hero-slider" role="region" aria-label="Hero image slider">
      {/* Slides */}
      {images.map((image, index) => (
        <div
          key={image}
          className={`hero-slider__slide ${
            index === currentIndex ? "hero-slider__slide--active" : ""
          }`}
          aria-hidden={index !== currentIndex}
        >
          <img
            src={image}
            alt={`Mechanical insulation work ${index + 1}`}
            className="w-full h-full object-cover object-[right_top]"
            loading={index === 0 ? "eager" : "lazy"}
            width="1920"
            height="1080"
          />
        </div>
      ))}

      {/* Navigation Arrows */}
      {showArrows && images.length > 1 && (
        <>
          <button
            className="hero-slider__nav hero-slider__nav--prev"
            onClick={goToPrev}
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="hero-slider__nav hero-slider__nav--next"
            onClick={goToNext}
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dot Navigation */}
      {showDots && images.length > 1 && (
        <div className="hero-slider__dots" role="tablist" aria-label="Slide navigation">
          {images.map((_, index) => (
            <button
              key={index}
              className={`hero-slider__dot ${
                index === currentIndex ? "hero-slider__dot--active" : ""
              }`}
              onClick={() => goToSlide(index)}
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

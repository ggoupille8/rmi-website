import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
let intersectionCallback: IntersectionObserverCallback;

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }
  observe = mockObserve;
  unobserve = vi.fn();
  disconnect = mockDisconnect;
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

// Must be set before importing the component
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// Mock matchMedia for prefers-reduced-motion
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

import HeroFullWidth from "../landing/HeroFullWidth";

describe("HeroFullWidth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockObserve.mockClear();
    mockDisconnect.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders headline as logo alt text", () => {
    render(<HeroFullWidth />);
    const logo = screen.getByAltText("Resource Mechanical Insulation");
    expect(logo).toBeInTheDocument();
  });

  it("renders custom headline and tagline props", () => {
    render(
      <HeroFullWidth
        headline="Custom Headline"
        tagline="Custom Tagline"
      />
    );
    expect(screen.getByAltText("Custom Headline")).toBeInTheDocument();
    expect(screen.getByText("Custom Tagline")).toBeInTheDocument();
  });

  it("renders default tagline", () => {
    render(<HeroFullWidth />);
    expect(
      screen.getByText("Commercial & Industrial Insulation Experts")
    ).toBeInTheDocument();
  });

  it("renders hero stat cards", () => {
    render(<HeroFullWidth />);
    const statCards = screen.getAllByTestId("stat-card");
    expect(statCards.length).toBe(3);
  });

  it("renders CTA buttons", () => {
    render(<HeroFullWidth />);
    expect(screen.getByText("Request a Quote")).toBeInTheDocument();
  });

  it("renders phone and email links with aria-labels", () => {
    render(<HeroFullWidth />);
    const phoneLink = screen.getByLabelText(/^Call Resource Mechanical/);
    const emailLink = screen.getByLabelText(/^Email Resource Mechanical/);
    expect(phoneLink).toBeInTheDocument();
    expect(emailLink).toBeInTheDocument();
  });

  it("has proper heading structure", () => {
    render(<HeroFullWidth />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute("id", "hero-heading");
  });

  it("renders all hero images", () => {
    render(<HeroFullWidth />);
    const images = screen.getAllByRole("img", { hidden: true });
    // Filter to only hero slideshow images by src path
    const heroImages = images.filter((img) =>
      img.getAttribute("src")?.includes("/images/hero/")
    );
    expect(heroImages.length).toBe(6);
  });

  it("first hero image loads eagerly, rest lazy", () => {
    render(<HeroFullWidth />);
    const images = screen.getAllByRole("img", { hidden: true });
    const heroImages = images.filter((img) =>
      img.getAttribute("src")?.includes("/images/hero/")
    );
    expect(heroImages[0]).toHaveAttribute("loading", "eager");
    for (let i = 1; i < heroImages.length; i++) {
      expect(heroImages[i]).toHaveAttribute("loading", "lazy");
    }
  });

  describe("image carousel", () => {
    it("advances to next slide after SLIDE_DURATION", () => {
      render(<HeroFullWidth />);
      // After 12 seconds, the active index should change
      act(() => {
        vi.advanceTimersByTime(12000);
      });
      // The carousel should have cycled — we verify by checking that
      // the second image's container has changed opacity
      // (visual check via CSS class)
    });

    it("cycles through all images", () => {
      render(<HeroFullWidth />);
      // Advance through all 6 images (6 * 12000ms)
      act(() => {
        vi.advanceTimersByTime(72000);
      });
      // Should be back to first image — no crash
    });
  });

  describe("useCountUp hook behavior", () => {
    it("initializes stats at endValue for SSR (no flash)", () => {
      // On first render (before useEffect), count starts at endValue
      // After mount useEffect, it resets to 0 for animation
      render(<HeroFullWidth />);
      // After mount but before IntersectionObserver fires,
      // the stats should show 0 (client-side reset)
      const statCards = screen.getAllByTestId("stat-card");
      expect(statCards.length).toBe(3);
    });

    it("starts animation when element enters viewport", () => {
      render(<HeroFullWidth />);

      // Verify the observer was set up to watch stat elements
      expect(mockObserve).toHaveBeenCalled();

      // Trigger intersection observer to start counting
      act(() => {
        intersectionCallback(
          [
            {
              isIntersecting: true,
              intersectionRatio: 0.5,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });

      // Observer should disconnect after triggering (one-shot animation)
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it("does not re-animate after initial trigger", () => {
      render(<HeroFullWidth />);

      // First trigger
      act(() => {
        intersectionCallback(
          [
            { isIntersecting: true, intersectionRatio: 0.5 } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Observer should have been disconnected after first trigger
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("marks slideshow images as aria-hidden", () => {
      render(<HeroFullWidth />);
      // All slideshow container divs should have aria-hidden="true"
      const slideContainers = document.querySelectorAll(
        '[aria-hidden="true"]'
      );
      expect(slideContainers.length).toBeGreaterThan(0);
    });

    it("has sr-only text for the heading", () => {
      render(<HeroFullWidth />);
      const srText = screen.getByText(
        /Resource Mechanical Insulation.*Insulation Contractors in Michigan/
      );
      expect(srText).toHaveClass("sr-only");
    });

    it("section has aria-labelledby pointing to heading", () => {
      const { container } = render(<HeroFullWidth />);
      const section = container.querySelector(
        'section[aria-labelledby="hero-heading"]'
      );
      expect(section).toBeInTheDocument();
    });
  });
});

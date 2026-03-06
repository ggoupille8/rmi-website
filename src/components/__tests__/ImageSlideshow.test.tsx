import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ServiceImage } from "../../content/site";

vi.mock("../../lib/media-loader", () => ({
  getMediaOverrides: vi.fn().mockResolvedValue({}),
}));

import ImageSlideshow from "../landing/ImageSlideshow";

const mockImages: ServiceImage[] = [
  { src: "pipe-insulation/pipe-1", alt: "First pipe insulation image" },
  { src: "pipe-insulation/pipe-2", alt: "Second pipe insulation image", focusPoint: "center 30%" },
  { src: "pipe-insulation/pipe-3", alt: "Third pipe insulation image" },
];

const singleImage: ServiceImage[] = [
  { src: "single/image-1", alt: "Single image" },
];

describe("ImageSlideshow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when images array is empty", () => {
    const { container } = render(<ImageSlideshow images={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders a single image without navigation controls", () => {
    render(<ImageSlideshow images={singleImage} />);

    expect(screen.getByAltText("Single image")).toBeInTheDocument();
    expect(screen.queryByLabelText("Previous image")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next image")).not.toBeInTheDocument();
    // No counter for single image
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
  });

  it("renders all images", () => {
    render(<ImageSlideshow images={mockImages} />);

    for (const image of mockImages) {
      expect(screen.getByAltText(image.alt)).toBeInTheDocument();
    }
  });

  it("shows navigation arrows for multiple images", () => {
    render(<ImageSlideshow images={mockImages} />);

    expect(screen.getByLabelText("Previous image")).toBeInTheDocument();
    expect(screen.getByLabelText("Next image")).toBeInTheDocument();
  });

  it("shows photo counter", () => {
    render(<ImageSlideshow images={mockImages} />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("advances to next image on Next button click", () => {
    render(<ImageSlideshow images={mockImages} />);

    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Next image"));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("goes to previous image on Previous button click", () => {
    render(<ImageSlideshow images={mockImages} />);

    // Go to second image first
    fireEvent.click(screen.getByLabelText("Next image"));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Previous image"));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("wraps around from last to first image", () => {
    render(<ImageSlideshow images={mockImages} />);

    fireEvent.click(screen.getByLabelText("Next image"));
    fireEvent.click(screen.getByLabelText("Next image"));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Next image"));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("wraps around from first to last image on Previous", () => {
    render(<ImageSlideshow images={mockImages} />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Previous image"));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  describe("auto-advance", () => {
    it("auto-advances after 5 seconds", () => {
      render(<ImageSlideshow images={mockImages} />);
      expect(screen.getByText("1 / 3")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText("2 / 3")).toBeInTheDocument();
    });

    it("pauses auto-advance on mouse enter", () => {
      const { container } = render(<ImageSlideshow images={mockImages} />);
      const wrapper = container.firstElementChild!;

      fireEvent.mouseEnter(wrapper);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Should still be on first image
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    it("resumes auto-advance on mouse leave", () => {
      const { container } = render(<ImageSlideshow images={mockImages} />);
      const wrapper = container.firstElementChild!;

      fireEvent.mouseEnter(wrapper);
      fireEvent.mouseLeave(wrapper);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText("2 / 3")).toBeInTheDocument();
    });
  });

  describe("touch swipe", () => {
    it("advances on left swipe (swipe distance > threshold)", () => {
      const { container } = render(<ImageSlideshow images={mockImages} />);
      const wrapper = container.firstElementChild!;

      // Simulate swipe left
      fireEvent.touchStart(wrapper, {
        touches: [{ clientX: 200 }],
      });
      fireEvent.touchMove(wrapper, {
        touches: [{ clientX: 100 }],
      });
      fireEvent.touchEnd(wrapper);

      expect(screen.getByText("2 / 3")).toBeInTheDocument();
    });

    it("goes back on right swipe", () => {
      const { container } = render(<ImageSlideshow images={mockImages} />);
      const wrapper = container.firstElementChild!;

      // Go to image 2 first
      fireEvent.click(screen.getByLabelText("Next image"));

      // Swipe right
      fireEvent.touchStart(wrapper, {
        touches: [{ clientX: 100 }],
      });
      fireEvent.touchMove(wrapper, {
        touches: [{ clientX: 200 }],
      });
      fireEvent.touchEnd(wrapper);

      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    it("does not advance on small swipe (below threshold)", () => {
      const { container } = render(<ImageSlideshow images={mockImages} />);
      const wrapper = container.firstElementChild!;

      // Small swipe (less than 50px threshold)
      fireEvent.touchStart(wrapper, {
        touches: [{ clientX: 200 }],
      });
      fireEvent.touchMove(wrapper, {
        touches: [{ clientX: 180 }],
      });
      fireEvent.touchEnd(wrapper);

      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });
  });

  describe("image loading", () => {
    it("first image loads eagerly, rest lazy", () => {
      render(<ImageSlideshow images={mockImages} />);

      const images = screen.getAllByRole("img", { hidden: true });
      expect(images[0]).toHaveAttribute("loading", "eager");
      expect(images[1]).toHaveAttribute("loading", "lazy");
      expect(images[2]).toHaveAttribute("loading", "lazy");
    });

    it("images are not draggable", () => {
      render(<ImageSlideshow images={mockImages} />);

      const images = screen.getAllByRole("img", { hidden: true });
      for (const img of images) {
        expect(img).toHaveAttribute("draggable", "false");
      }
    });

    it("generates webp source and jpg fallback", () => {
      render(<ImageSlideshow images={mockImages} />);

      const sources = document.querySelectorAll("source[type='image/webp']");
      expect(sources.length).toBe(mockImages.length);

      // Check that src paths are built correctly
      const firstImg = screen.getByAltText("First pipe insulation image");
      expect(firstImg.getAttribute("src")).toBe(
        "/images/services/pipe-insulation/pipe-1.jpg"
      );
    });
  });

  describe("responsive image display", () => {
    it("uses object-cover on mobile and object-contain on desktop", () => {
      render(<ImageSlideshow images={mockImages} />);

      const firstImg = screen.getByAltText("First pipe insulation image");
      expect(firstImg.className).toContain("object-cover");
      expect(firstImg.className).toContain("md:object-contain");
    });

    it("applies default focus point when none specified", () => {
      render(<ImageSlideshow images={mockImages} />);

      const firstImg = screen.getByAltText("First pipe insulation image");
      expect(firstImg.style.objectPosition).toBe("center center");
    });

    it("applies custom focus point when specified", () => {
      render(<ImageSlideshow images={mockImages} />);

      const secondImg = screen.getByAltText("Second pipe insulation image");
      expect(secondImg.style.objectPosition).toBe("center 30%");
    });
  });

  describe("accessibility", () => {
    it("marks inactive images as aria-hidden", () => {
      render(<ImageSlideshow images={mockImages} />);

      const containers = document.querySelectorAll("[aria-hidden]");
      const hiddenContainers = Array.from(containers).filter(
        (el) => el.getAttribute("aria-hidden") === "true"
      );
      // All images except the active one should be hidden
      expect(hiddenContainers.length).toBeGreaterThanOrEqual(
        mockImages.length - 1
      );
    });

    it("navigation buttons meet minimum touch target size", () => {
      render(<ImageSlideshow images={mockImages} />);

      const prevButton = screen.getByLabelText("Previous image");
      const nextButton = screen.getByLabelText("Next image");

      // Buttons should have w-11 h-11 classes (44px)
      expect(prevButton.className).toContain("w-11");
      expect(prevButton.className).toContain("h-11");
      expect(nextButton.className).toContain("w-11");
      expect(nextButton.className).toContain("h-11");
    });
  });
});

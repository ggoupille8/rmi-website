import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ClientShowcase from "../landing/ClientShowcase";

describe("ClientShowcase", () => {
  describe("initial rendering", () => {
    it("renders section with id='clients'", () => {
      const { container } = render(<ClientShowcase />);
      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
    });

    it("renders 'Trusted by Industry Leaders' label", () => {
      render(<ClientShowcase />);
      expect(
        screen.getByText("Trusted by Industry Leaders"),
      ).toBeInTheDocument();
    });

    it("renders 'Clients We Serve' heading", () => {
      render(<ClientShowcase />);
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });

    it("renders subtitle text", () => {
      render(<ClientShowcase />);
      expect(
        screen.getByText(
          /Michigan.*commercial.*industrial facilities trust RMI/,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("CSS grid layout", () => {
    it("renders logo slots in a responsive grid container", () => {
      const { container } = render(<ClientShowcase />);
      const grid = container.querySelector(".grid");
      expect(grid).not.toBeNull();
      expect(grid?.className).toContain("grid-cols-3");
      expect(grid?.className).toContain("md:grid-cols-6");
    });

    it("renders all 30 client logos", () => {
      render(<ClientShowcase />);
      const images = screen.getAllByRole("img");
      expect(images.length).toBe(30);
    });

    it("section has proper padding and background classes", () => {
      const { container } = render(<ClientShowcase />);
      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
      expect(section?.className).toContain("bg-neutral-900");
    });

    it("content is constrained to max-w-6xl", () => {
      const { container } = render(<ClientShowcase />);
      const inner = container.querySelector(".max-w-6xl.mx-auto");
      expect(inner).not.toBeNull();
    });
  });

  describe("logo display", () => {
    it("renders images with alt text matching client names", () => {
      render(<ClientShowcase />);
      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img.getAttribute("alt")).toBeTruthy();
      }
    });

    it("applies invert filter classes to logos that need it", () => {
      render(<ClientShowcase />);
      const images = screen.getAllByRole("img");
      const invertedImages = images.filter((img) =>
        img.className.includes("brightness-0"),
      );
      // Stellantis, Amazon, BASF, Flagstar, Target, Shake Shack, Five Below = 7
      expect(invertedImages.length).toBe(7);
      for (const img of invertedImages) {
        expect(img.className).toContain("invert");
      }
    });

    it("sets loading='lazy' on all images", () => {
      render(<ClientShowcase />);
      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img).toHaveAttribute("loading", "lazy");
      }
    });

    it("sets explicit width and height on images", () => {
      render(<ClientShowcase />);
      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img).toHaveAttribute("width", "130");
        expect(img).toHaveAttribute("height", "40");
      }
    });

    it("uses static /images/clients/ paths for all logos", () => {
      render(<ClientShowcase />);
      const images = screen.getAllByRole("img");
      for (const img of images) {
        const src = img.getAttribute("src");
        expect(src).toMatch(/^\/images\/clients\/.+\.svg$/);
      }
    });
  });

  describe("specific clients", () => {
    it("includes Ford Motor Company", () => {
      render(<ClientShowcase />);
      expect(screen.getByAltText("Ford Motor Company")).toBeInTheDocument();
    });

    it("includes General Motors", () => {
      render(<ClientShowcase />);
      expect(screen.getByAltText("General Motors")).toBeInTheDocument();
    });

    it("includes FedEx", () => {
      render(<ClientShowcase />);
      expect(screen.getByAltText("FedEx")).toBeInTheDocument();
    });

    it("includes Toyota", () => {
      render(<ClientShowcase />);
      expect(screen.getByAltText("Toyota")).toBeInTheDocument();
    });

    it("includes Apple", () => {
      render(<ClientShowcase />);
      expect(screen.getByAltText("Apple")).toBeInTheDocument();
    });

    it("includes Audi", () => {
      render(<ClientShowcase />);
      expect(screen.getByAltText("Audi")).toBeInTheDocument();
    });

    it("includes Cartier", () => {
      render(<ClientShowcase />);
      expect(screen.getByAltText("Cartier")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("renders heading with proper hierarchy (h2)", () => {
      render(<ClientShowcase />);
      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Clients We Serve");
    });

    it("renders as a <section> element", () => {
      const { container } = render(<ClientShowcase />);
      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
    });

    it("logo images have meaningful alt text", () => {
      render(<ClientShowcase />);
      const images = screen.getAllByRole("img");
      for (const img of images) {
        const alt = img.getAttribute("alt");
        expect(alt).toBeTruthy();
        expect(alt!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("text content", () => {
    it("label uses uppercase tracking and blue-400 color", () => {
      render(<ClientShowcase />);
      const label = screen.getByText("Trusted by Industry Leaders");
      expect(label.className).toContain("uppercase");
      expect(label.className).toContain("tracking-widest");
      expect(label.className).toContain("text-blue-400");
    });

    it("heading uses bold white text", () => {
      render(<ClientShowcase />);
      const heading = screen.getByText("Clients We Serve");
      expect(heading.className).toContain("font-bold");
      expect(heading.className).toContain("text-white");
    });

    it("subtitle uses neutral-300 color", () => {
      render(<ClientShowcase />);
      const subtitle = screen.getByText(
        /Michigan.*commercial.*industrial facilities trust RMI/,
      );
      expect(subtitle.className).toContain("text-neutral-300");
    });
  });

  describe("no runtime dependencies", () => {
    it("does not call fetch", () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      render(<ClientShowcase />);
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("renders synchronously without loading state", () => {
      const { container } = render(<ClientShowcase />);
      // No placeholder, no loading — section renders immediately
      expect(container.querySelector("section#clients")).not.toBeNull();
      expect(container.querySelector("[aria-hidden]")).toBeNull();
      expect(container.querySelector(".animate-pulse")).toBeNull();
    });
  });
});

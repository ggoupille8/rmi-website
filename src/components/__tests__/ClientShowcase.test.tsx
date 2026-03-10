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
      expect(grid?.className).toContain("sm:grid-cols-4");
      expect(grid?.className).toContain("lg:grid-cols-6");
    });

    it("renders all 11 client logos", () => {
      render(<ClientShowcase />);
      const images = screen.getAllByRole("img");
      expect(images.length).toBe(11);
    });

    it("section has proper padding and background classes", () => {
      const { container } = render(<ClientShowcase />);
      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
      expect(section?.className).toContain("bg-neutral-950");
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

    it("applies monochrome filter classes to images", () => {
      render(<ClientShowcase />);
      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img.className).toContain("brightness-0");
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
        expect(img).toHaveAttribute("width", "120");
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

    it("applies opacity-60 hover transition on logo containers", () => {
      const { container } = render(<ClientShowcase />);
      const logoContainers = container.querySelectorAll("[title]");
      expect(logoContainers.length).toBe(11);
      for (const el of logoContainers) {
        expect(el.className).toContain("opacity-60");
        expect(el.className).toContain("hover:opacity-100");
        expect(el.className).toContain("transition-opacity");
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

    it("includes University of Michigan", () => {
      render(<ClientShowcase />);
      expect(screen.getByAltText("University of Michigan")).toBeInTheDocument();
    });

    it("includes Detroit Metro Airport", () => {
      render(<ClientShowcase />);
      expect(screen.getByAltText("Detroit Metro Airport")).toBeInTheDocument();
    });

    it("includes Corewell Health (formerly Beaumont)", () => {
      render(<ClientShowcase />);
      expect(screen.getByAltText("Corewell Health")).toBeInTheDocument();
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

    it("subtitle uses neutral-400 color", () => {
      render(<ClientShowcase />);
      const subtitle = screen.getByText(
        /Michigan.*commercial.*industrial facilities trust RMI/,
      );
      expect(subtitle.className).toContain("text-neutral-400");
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

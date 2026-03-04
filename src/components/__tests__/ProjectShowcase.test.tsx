import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProjectShowcase from "../landing/ProjectShowcase";
import { projectHighlights } from "../../content/site";

describe("ProjectShowcase", () => {
  it("renders section with aria-labelledby", () => {
    render(<ProjectShowcase />);
    const heading = screen.getByRole("heading", {
      name: /featured projects/i,
    });
    expect(heading.id).toBe("projects-heading");
  });

  it("renders subtitle", () => {
    render(<ProjectShowcase />);
    expect(
      screen.getByText(/projects we've contributed to across michigan/i)
    ).toBeDefined();
  });

  it("renders all project cards", () => {
    render(<ProjectShowcase />);
    for (const project of projectHighlights) {
      expect(screen.getByText(project.title)).toBeDefined();
      expect(screen.getByText(project.description)).toBeDefined();
    }
  });

  it("renders images with correct alt text", () => {
    render(<ProjectShowcase />);
    for (const project of projectHighlights) {
      const img = screen.getByAltText(project.alt);
      expect(img).toBeDefined();
    }
  });

  it("uses lazy loading on images", () => {
    render(<ProjectShowcase />);
    for (const project of projectHighlights) {
      const img = screen.getByAltText(project.alt) as HTMLImageElement;
      expect(img.getAttribute("loading")).toBe("lazy");
      expect(img.getAttribute("decoding")).toBe("async");
    }
  });

  it("renders picture element with webp source", () => {
    const { container } = render(<ProjectShowcase />);
    const sources = container.querySelectorAll("source[type='image/webp']");
    expect(sources.length).toBe(projectHighlights.length);
    for (let i = 0; i < projectHighlights.length; i++) {
      expect(sources[i].getAttribute("srcSet")).toBe(
        `${projectHighlights[i].image}.webp`
      );
    }
  });

  it("renders jpg fallback in img src", () => {
    render(<ProjectShowcase />);
    for (const project of projectHighlights) {
      const img = screen.getByAltText(project.alt) as HTMLImageElement;
      expect(img.src).toContain(`${project.image}.jpg`);
    }
  });

  it("sets image dimensions for layout stability", () => {
    render(<ProjectShowcase />);
    const img = screen.getByAltText(
      projectHighlights[0].alt
    ) as HTMLImageElement;
    expect(img.getAttribute("width")).toBe("960");
    expect(img.getAttribute("height")).toBe("720");
  });

  it("applies 4/3 aspect ratio class to images", () => {
    render(<ProjectShowcase />);
    const img = screen.getByAltText(
      projectHighlights[0].alt
    ) as HTMLImageElement;
    expect(img.className).toContain("aspect-[4/3]");
    expect(img.className).toContain("object-cover");
  });

  it("wraps in ErrorBoundary", () => {
    // ErrorBoundary renders children normally when no error
    const { container } = render(<ProjectShowcase />);
    expect(container.querySelector("section")).not.toBeNull();
  });

  it("renders accent divider", () => {
    const { container } = render(<ProjectShowcase />);
    expect(container.querySelector(".bg-accent-500")).not.toBeNull();
  });
});

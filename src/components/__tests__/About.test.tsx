import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import About from "../landing/About";

describe("About", () => {
  it("renders section with aria-labelledby", () => {
    render(<About />);
    const section = screen.getByRole("region", { name: /why choose/i });
    expect(section).toBeDefined();
  });

  it("renders heading with correct id", () => {
    render(<About />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.id).toBe("about-heading");
  });

  it("renders all 4 feature cards", () => {
    render(<About />);
    const titles = [
      "Safety-First Culture",
      "Emergency Response",
      "Proven Track Record",
      "Union-Trained Workforce",
    ];
    for (const title of titles) {
      expect(screen.getByText(title)).toBeDefined();
    }
  });

  it("renders feature descriptions", () => {
    render(<About />);
    expect(screen.getByText(/OSHA-tracked man-hours/)).toBeDefined();
    expect(screen.getByText(/dual 12-hour shifts/)).toBeDefined();
    expect(screen.getByText(/Henry Ford Hospital/)).toBeDefined();
    expect(screen.getByText(/Local 25 insulators/)).toBeDefined();
  });

  it("renders icons as aria-hidden", () => {
    const { container } = render(<About />);
    // 4 lucide icons + heading decorative span
    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBe(4);
  });

  it("renders subtitle text", () => {
    render(<About />);
    expect(
      screen.getByText(/what sets us apart from other insulation contractors/)
    ).toBeDefined();
  });

  it("has accent divider bar", () => {
    const { container } = render(<About />);
    const divider = container.querySelector(".bg-accent-500");
    expect(divider).not.toBeNull();
  });
});

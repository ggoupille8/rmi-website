import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MaterialsMarquee from "../landing/MaterialsMarquee";
import { materials } from "../../content/site";

describe("MaterialsMarquee", () => {
  it("renders section heading", () => {
    render(<MaterialsMarquee />);
    expect(
      screen.getByRole("heading", { name: /materials we work with/i })
    ).toBeDefined();
  });

  it("renders subtitle", () => {
    render(<MaterialsMarquee />);
    expect(
      screen.getByText(/insulation, jacketing, accessories/i)
    ).toBeDefined();
  });

  it("renders accent divider", () => {
    const { container } = render(<MaterialsMarquee />);
    expect(container.querySelector(".bg-accent-500")).not.toBeNull();
  });

  it("duplicates materials in both rows for seamless loop", () => {
    const { container } = render(<MaterialsMarquee />);
    const tracks = container.querySelectorAll(".service-ticker__track");
    // Each track has 2x materials (duplicated for seamless loop)
    const row1Pills = tracks[0].querySelectorAll("span");
    const row2Pills = tracks[1].querySelectorAll("span");
    expect(row1Pills.length).toBe(materials.length * 2);
    expect(row2Pills.length).toBe(materials.length * 2);
  });

  it("applies reverse animation direction to row 2", () => {
    const { container } = render(<MaterialsMarquee />);
    const tracks = container.querySelectorAll(".service-ticker__track");
    expect(tracks.length).toBe(2);
    // Second track has reversed animation via Tailwind utility class
    expect(tracks[1].className).toContain("[animation-direction:reverse]");
  });

  it("renders screen-reader accessible list of all materials", () => {
    render(<MaterialsMarquee />);
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(materials.length);
    for (const material of materials) {
      expect(screen.getByText(material, { selector: "li" })).toBeDefined();
    }
  });

  it("hides visual marquee rows from screen readers", () => {
    const { container } = render(<MaterialsMarquee />);
    const marquees = container.querySelectorAll('[aria-hidden="true"]');
    // Both marquee rows are aria-hidden
    expect(marquees.length).toBeGreaterThanOrEqual(2);
  });

  it("applies mask-image CSS for fade effect on rows", () => {
    const { container } = render(<MaterialsMarquee />);
    // The mask-image is on the overflow-hidden wrapper divs around each ticker row
    const tickers = container.querySelectorAll(".service-ticker");
    expect(tickers.length).toBe(2);
    for (const ticker of tickers) {
      const wrapper = ticker.parentElement as HTMLElement;
      expect(wrapper.style.maskImage).toContain("linear-gradient");
    }
  });

  it("offsets row 2 materials for visual variety", () => {
    const { container } = render(<MaterialsMarquee />);
    const tracks = container.querySelectorAll(".service-ticker__track");
    const row1First = tracks[0].querySelector("span")?.textContent;
    const row2First = tracks[1].querySelector("span")?.textContent;
    // Row 2 starts from midpoint, so should differ from row 1
    expect(row2First).not.toBe(row1First);
  });
});

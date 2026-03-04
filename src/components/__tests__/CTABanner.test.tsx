import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CTABanner from "../landing/CTABanner";
import {
  ctaBannerHeading,
  ctaBannerSubtitle,
  ctaBannerButton,
} from "../../content/site";

describe("CTABanner", () => {
  it("renders with id cta-banner", () => {
    const { container } = render(<CTABanner />);
    expect(container.querySelector("#cta-banner")).not.toBeNull();
  });

  it("renders heading with correct id and text", () => {
    render(<CTABanner />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.id).toBe("cta-heading");
    expect(heading.textContent).toBe(ctaBannerHeading);
  });

  it("renders subtitle", () => {
    render(<CTABanner />);
    expect(screen.getByText(ctaBannerSubtitle)).toBeDefined();
  });

  it("renders CTA link pointing to #contact", () => {
    render(<CTABanner />);
    const link = screen.getByRole("link", { name: ctaBannerButton });
    expect(link.getAttribute("href")).toBe("#contact");
  });

  it("has aria-labelledby pointing to heading", () => {
    const { container } = render(<CTABanner />);
    const section = container.querySelector("section");
    expect(section?.getAttribute("aria-labelledby")).toBe("cta-heading");
  });

  it("applies btn-primary class to CTA link", () => {
    render(<CTABanner />);
    const link = screen.getByRole("link", { name: ctaBannerButton });
    expect(link.className).toContain("btn-primary");
  });
});

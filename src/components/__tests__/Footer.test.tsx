import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Footer from "../landing/Footer";
import {
  companyNameFull,
  phoneDisplay,
  phoneTel,
  email,
  address,
} from "../../content/site";

describe("Footer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders footer element with id", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector("#footer")).not.toBeNull();
  });

  it("renders aria-label on footer", () => {
    render(<Footer />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.getAttribute("aria-label")).toBe("Site footer");
  });

  it("renders company name heading", () => {
    render(<Footer />);
    expect(screen.getByText(companyNameFull)).toBeDefined();
  });

  it("renders current year in copyright", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`${year}.*${companyNameFull}`))
    ).toBeDefined();
  });

  it("renders phone link with correct href and aria-label", () => {
    render(<Footer />);
    const phoneLink = screen.getByLabelText(/Call.*at/);
    expect(phoneLink.getAttribute("href")).toBe(phoneTel);
    expect(phoneLink.textContent).toContain(phoneDisplay);
  });

  it("renders email link with correct href", () => {
    render(<Footer />);
    const emailLink = screen.getByLabelText(/Email.*at/);
    expect(emailLink.getAttribute("href")).toBe(`mailto:${email}`);
    expect(emailLink.textContent).toContain(email);
  });

  it("renders full address", () => {
    render(<Footer />);
    expect(screen.getByText(address.full)).toBeDefined();
  });

  describe("quick links", () => {
    it("renders footer navigation", () => {
      render(<Footer />);
      const nav = screen.getByRole("navigation", {
        name: "Footer navigation",
      });
      expect(nav).toBeDefined();
    });

    it("has links to all main sections", () => {
      render(<Footer />);
      const links = [
        { text: "Services", href: "#services" },
        { text: "About", href: "#about" },
        { text: "Projects", href: "#projects" },
        { text: "Request a Quote", href: "#contact" },
      ];
      for (const { text, href } of links) {
        const link = screen.getByRole("link", { name: text });
        expect(link.getAttribute("href")).toBe(href);
      }
    });

    it("has minimum 44px touch targets on nav links", () => {
      render(<Footer />);
      const link = screen.getByRole("link", { name: "Services" });
      expect(link.className).toContain("min-w-[44px]");
      expect(link.className).toContain("min-h-[44px]");
    });
  });

  describe("social links", () => {
    it("renders LinkedIn link with correct attributes", () => {
      render(<Footer />);
      const link = screen.getByLabelText("Visit our LinkedIn page");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      expect(link.getAttribute("href")).toContain("linkedin.com");
    });

    it("renders Facebook link with correct attributes", () => {
      render(<Footer />);
      const link = screen.getByLabelText("Visit our Facebook page");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      expect(link.getAttribute("href")).toContain("facebook.com");
    });

    it("has 44px touch targets on social links", () => {
      render(<Footer />);
      const link = screen.getByLabelText("Visit our LinkedIn page");
      expect(link.className).toContain("min-w-[44px]");
      expect(link.className).toContain("min-h-[44px]");
    });
  });

  describe("back to top buttons", () => {
    it("renders inline and floating back to top buttons", () => {
      render(<Footer />);
      const buttons = screen.getAllByRole("button", { name: "Back to top" });
      expect(buttons.length).toBe(2);
    });

    it("calls window.scrollTo on click", () => {
      const scrollToSpy = vi.fn();
      vi.stubGlobal("scrollTo", scrollToSpy);

      render(<Footer />);
      const buttons = screen.getAllByRole("button", { name: "Back to top" });
      fireEvent.click(buttons[0]);

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });
    });

    it("inline button has minimum 44px touch target", () => {
      render(<Footer />);
      const buttons = screen.getAllByRole("button", { name: "Back to top" });
      const inlineButton = buttons[0];
      expect(inlineButton.className).toContain("min-h-[44px]");
    });

    it("both buttons have focus-visible ring styles", () => {
      render(<Footer />);
      const buttons = screen.getAllByRole("button", { name: "Back to top" });
      for (const button of buttons) {
        expect(button.className).toContain("focus-visible:ring-2");
      }
    });
  });

  it("renders icons as aria-hidden", () => {
    const { container } = render(<Footer />);
    const hiddenSvgs = container.querySelectorAll('svg[aria-hidden="true"]');
    // Phone, Mail, MapPin icons + 2x ArrowUp + LinkedIn SVG + Facebook SVG
    expect(hiddenSvgs.length).toBeGreaterThanOrEqual(6);
  });
});

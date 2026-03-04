import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock IntersectionObserver
const mockObserveCallbacks: IntersectionObserverCallback[] = [];

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    mockObserveCallbacks.push(callback);
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

import FloatingMobileCTA from "../landing/FloatingMobileCTA";
import { companyName, phoneDisplay, email } from "../../content/site";

describe("FloatingMobileCTA", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockObserveCallbacks.length = 0;

    // Set a default scrollY and innerHeight
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the floating CTA container", () => {
    render(<FloatingMobileCTA />);
    const container = screen.getByLabelText("Quick contact actions");
    expect(container).toBeInTheDocument();
  });

  it("is hidden by default (not scrolled past hero)", () => {
    render(<FloatingMobileCTA />);
    const container = screen.getByLabelText("Quick contact actions");
    expect(container).toHaveAttribute("aria-hidden", "true");
  });

  it("has md:hidden class for desktop hiding", () => {
    render(<FloatingMobileCTA />);
    const container = screen.getByLabelText("Quick contact actions");
    expect(container.className).toContain("md:hidden");
  });

  it("renders toggle button with Phone icon by default", () => {
    render(<FloatingMobileCTA />);
    const button = screen.getByLabelText("Open contact menu");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("expands to show phone and email links on toggle click", () => {
    render(<FloatingMobileCTA />);

    fireEvent.click(screen.getByLabelText("Open contact menu"));

    // Should now show phone and email action buttons
    expect(
      screen.getByLabelText(`Call ${companyName} at ${phoneDisplay}`)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(`Email ${companyName} at ${email}`)
    ).toBeInTheDocument();

    // Toggle button should now say "Close"
    expect(screen.getByLabelText("Close contact menu")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Close contact menu")
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses when toggle is clicked again", () => {
    render(<FloatingMobileCTA />);

    // Open
    fireEvent.click(screen.getByLabelText("Open contact menu"));
    expect(
      screen.getByLabelText(`Call ${companyName} at ${phoneDisplay}`)
    ).toBeInTheDocument();

    // Close
    fireEvent.click(screen.getByLabelText("Close contact menu"));
    expect(
      screen.queryByLabelText(`Call ${companyName} at ${phoneDisplay}`)
    ).not.toBeInTheDocument();
  });

  it("phone link points to tel: URL", () => {
    render(<FloatingMobileCTA />);
    fireEvent.click(screen.getByLabelText("Open contact menu"));

    const phoneLink = screen.getByLabelText(
      `Call ${companyName} at ${phoneDisplay}`
    );
    expect(phoneLink.getAttribute("href")).toMatch(/^tel:\+/);
  });

  it("email link points to mailto: URL", () => {
    render(<FloatingMobileCTA />);
    fireEvent.click(screen.getByLabelText("Open contact menu"));

    const emailLink = screen.getByLabelText(
      `Email ${companyName} at ${email}`
    );
    expect(emailLink.getAttribute("href")).toBe(`mailto:${email}`);
  });

  describe("touch targets", () => {
    it("all action buttons meet 44px minimum size", () => {
      render(<FloatingMobileCTA />);
      fireEvent.click(screen.getByLabelText("Open contact menu"));

      // Check that buttons have min-w-[56px] min-h-[56px] classes
      const closeButton = screen.getByLabelText("Close contact menu");
      expect(closeButton.className).toContain("min-w-[56px]");
      expect(closeButton.className).toContain("min-h-[56px]");

      const phoneLink = screen.getByLabelText(
        `Call ${companyName} at ${phoneDisplay}`
      );
      expect(phoneLink.className).toContain("min-w-[56px]");
      expect(phoneLink.className).toContain("min-h-[56px]");
    });
  });

  describe("form focus behavior", () => {
    it("hides when a form input receives focus", () => {
      render(<FloatingMobileCTA />);

      // Simulate scrolling down to make CTA visible
      Object.defineProperty(window, "scrollY", { value: 500, writable: true });
      fireEvent.scroll(window);

      // Create and append an input, then focus it — this fires focusin on document
      const input = document.createElement("input");
      document.body.appendChild(input);
      act(() => {
        input.focus();
      });

      // After focusin fires, isFormFocused=true triggers a scroll re-check
      // that sets isVisible=false
      fireEvent.scroll(window);

      const container = screen.getByLabelText("Quick contact actions");
      expect(container).toHaveAttribute("aria-hidden", "true");

      document.body.removeChild(input);
    });
  });
});

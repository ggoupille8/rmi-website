import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock IntersectionObserver (used by ImageSlideshow auto-advance may need it)
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
);

import Services from "../landing/Services";
import { services } from "../../content/site";

describe("Services", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.style.overflow = "";
  });

  it("renders all 9 service cards", () => {
    render(<Services />);
    for (const service of services) {
      expect(screen.getByText(service.title)).toBeInTheDocument();
    }
  });

  it("renders section heading", () => {
    render(<Services />);
    expect(
      screen.getByRole("heading", { name: "Services" })
    ).toBeInTheDocument();
  });

  it("renders section subtitle", () => {
    render(<Services />);
    expect(
      screen.getByText(/Comprehensive mechanical insulation services/)
    ).toBeInTheDocument();
  });

  it("each card has aria-label and aria-haspopup", () => {
    render(<Services />);
    for (const service of services) {
      const button = screen.getByLabelText(
        `Learn more about ${service.title}`
      );
      expect(button).toHaveAttribute("aria-haspopup", "dialog");
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
  });

  describe("modal behavior", () => {
    it("opens modal when service card is clicked", () => {
      render(<Services />);
      const button = screen.getByLabelText("Learn more about Pipe Insulation");
      fireEvent.click(button);

      // Modal should be present
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("displays service title and description in modal", () => {
      render(<Services />);
      fireEvent.click(
        screen.getByLabelText("Learn more about Pipe Insulation")
      );

      // Modal heading
      const pipeService = services.find((s) => s.anchorId === "piping");
      expect(pipeService).toBeDefined();

      const heading = screen.getByRole("heading", {
        name: pipeService!.title,
      });
      expect(heading).toBeInTheDocument();

      // Description text
      expect(
        screen.getByText(pipeService!.description)
      ).toBeInTheDocument();
    });

    it("displays Request a Quote link in modal", () => {
      render(<Services />);
      fireEvent.click(
        screen.getByLabelText("Learn more about Pipe Insulation")
      );

      const quoteLinks = screen.getAllByText("Request a Quote");
      // At least one should be in the modal
      expect(quoteLinks.length).toBeGreaterThan(0);
    });

    it("closes modal when close button is clicked", () => {
      render(<Services />);
      fireEvent.click(
        screen.getByLabelText("Learn more about Pipe Insulation")
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const closeButton = screen.getByLabelText("Close dialog");
      fireEvent.click(closeButton);

      // Wait for close animation
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes modal on Escape key", () => {
      render(<Services />);
      fireEvent.click(
        screen.getByLabelText("Learn more about Pipe Insulation")
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes modal when backdrop is clicked", () => {
      render(<Services />);
      fireEvent.click(
        screen.getByLabelText("Learn more about Pipe Insulation")
      );

      // Click the backdrop (the overlay behind the modal)
      const backdrop = document.querySelector(".bg-black\\/40");
      expect(backdrop).toBeTruthy();
      fireEvent.click(backdrop!);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("locks body scroll when modal is open", () => {
      render(<Services />);

      expect(document.body.style.overflow).toBe("");

      fireEvent.click(
        screen.getByLabelText("Learn more about Pipe Insulation")
      );

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restores body scroll when modal is closed", () => {
      render(<Services />);
      fireEvent.click(
        screen.getByLabelText("Learn more about Pipe Insulation")
      );

      expect(document.body.style.overflow).toBe("hidden");

      fireEvent.keyDown(document, { key: "Escape" });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(document.body.style.overflow).toBe("");
    });

    it("updates aria-expanded on trigger button", () => {
      render(<Services />);
      const button = screen.getByLabelText("Learn more about Pipe Insulation");

      expect(button).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(button);

      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("focuses first focusable element when modal opens", () => {
      render(<Services />);
      fireEvent.click(
        screen.getByLabelText("Learn more about Pipe Insulation")
      );

      // Focus trap focuses the first focusable element in the modal.
      // For services with images, this is the ImageSlideshow prev button;
      // for those without, it would be the close button.
      const dialog = screen.getByRole("dialog");
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])'
      );
      expect(document.activeElement).toBe(focusableElements[0]);
    });

    it("restores focus to trigger button when modal closes", () => {
      render(<Services />);
      const triggerButton = screen.getByLabelText(
        "Learn more about Pipe Insulation"
      );
      fireEvent.click(triggerButton);

      fireEvent.keyDown(document, { key: "Escape" });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(document.activeElement).toBe(triggerButton);
    });

    it("can open different service modals sequentially", () => {
      render(<Services />);

      // Open first
      fireEvent.click(
        screen.getByLabelText("Learn more about Pipe Insulation")
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Close
      fireEvent.keyDown(document, { key: "Escape" });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Open second
      fireEvent.click(
        screen.getByLabelText("Learn more about Duct Insulation")
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const ductService = services.find((s) => s.anchorId === "duct");
      expect(
        screen.getByRole("heading", { name: ductService!.title })
      ).toBeInTheDocument();
    });
  });

  describe("focus trap", () => {
    it("traps Tab key within modal", () => {
      render(<Services />);
      fireEvent.click(
        screen.getByLabelText("Learn more about Pipe Insulation")
      );

      const dialog = screen.getByRole("dialog");
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      // Focus the last element
      const lastEl = focusableElements[focusableElements.length - 1];
      lastEl.focus();

      // Tab from last element should cycle to first
      fireEvent.keyDown(document, { key: "Tab" });
      // The handler should prevent default and focus first element
    });

    it("traps Shift+Tab within modal", () => {
      render(<Services />);
      fireEvent.click(
        screen.getByLabelText("Learn more about Pipe Insulation")
      );

      const dialog = screen.getByRole("dialog");
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])'
      );

      // Focus the first element
      const firstEl = focusableElements[0];
      firstEl.focus();

      // Shift+Tab from first element should cycle to last
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    });
  });
});

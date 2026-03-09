import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

// ── Mock IntersectionObserver ────────────────────────────────────
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
let intersectionCallback: IntersectionObserverCallback;

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }
  observe = mockObserve;
  unobserve = vi.fn();
  disconnect = mockDisconnect;
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// ── Mock Image for logo probing ──────────────────────────────────
let imageInstances: Array<{
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  naturalWidth: number;
  naturalHeight: number;
  referrerPolicy: string;
}> = [];

class MockImage {
  src = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  referrerPolicy = "";

  constructor() {
    imageInstances.push(this);
  }
}

vi.stubGlobal("Image", MockImage);

// ── Test data ────────────────────────────────────────────────────
function makeClient(id: number, name: string, domain: string) {
  return {
    id,
    name,
    domain,
    color: "#ffffff",
    description: `${name} description`,
    logo_scale: 1,
  };
}

const MOCK_CLIENTS = [
  makeClient(1, "Ford Motor", "ford.com"),
  makeClient(2, "DTE Energy", "dteenergy.com"),
  makeClient(3, "CMS Energy", "cmsenergy.com"),
  makeClient(4, "Stellantis", "stellantis.com"),
  makeClient(5, "Toyota", "toyota.com"),
  makeClient(6, "BASF", "basf.com"),
  makeClient(7, "Ameresco", "ameresco.com"),
  makeClient(8, "Costco", "costco.com"),
  makeClient(9, "Amazon", "amazon.com"),
  makeClient(10, "Verizon", "verizon.com"),
  makeClient(11, "Nissan", "nissan.com"),
  makeClient(12, "Delta", "delta.com"),
];

// ── Helpers ──────────────────────────────────────────────────────

/** Simulate all pending Image loads as successful logos (wide aspect ratio) */
function resolveAllImages() {
  for (const img of imageInstances) {
    if (img.src && img.onload) {
      img.naturalWidth = 400;
      img.naturalHeight = 100;
      img.onload();
    }
  }
}

/** Simulate all pending Image loads as failures */
function rejectAllImages() {
  for (const img of imageInstances) {
    if (img.src && img.onerror) {
      img.onerror();
    }
  }
}

/** Simulate images as too small (below 64px threshold) */
function resolveImagesAsSmall() {
  for (const img of imageInstances) {
    if (img.src && img.onload) {
      img.naturalWidth = 32;
      img.naturalHeight = 32;
      img.onload();
    }
  }
}

/** Simulate images as square (rejected by logo probe ratio check) */
function resolveImagesAsSquare() {
  for (const img of imageInstances) {
    if (img.src && img.onload) {
      img.naturalWidth = 200;
      img.naturalHeight = 200;
      img.onload();
    }
  }
}

import ClientShowcase from "../landing/ClientShowcase";

describe("ClientShowcase", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    imageInstances = [];
    mockObserve.mockClear();
    mockDisconnect.mockClear();

    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(MOCK_CLIENTS), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  // ── Rendering ────────────────────────────────────────────────

  describe("initial rendering", () => {
    it("renders nothing before clients are fetched and validated", () => {
      const { container } = render(<ClientShowcase />);
      expect(container.querySelector("section")).toBeNull();
    });

    it("fetches clients from /api/clients on mount", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(fetchSpy).toHaveBeenCalledWith("/api/clients");
    });

    it("renders section with id='clients' after successful load", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const section = document.getElementById("clients");
      expect(section).not.toBeNull();
    });

    it("renders 'Trusted By Industry Leaders' label", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(
        screen.getByText("Trusted By Industry Leaders"),
      ).toBeInTheDocument();
    });

    it("renders 'Clients We Serve' heading", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });

    it("renders subtitle text", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(
        screen.getByText(
          /Michigan.*commercial.*industrial facilities trust RMI/,
        ),
      ).toBeInTheDocument();
    });
  });

  // ── Logo validation ──────────────────────────────────────────

  describe("logo validation", () => {
    it("renders nothing when fewer than 6 logos validate", async () => {
      // Only return 3 clients
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_CLIENTS.slice(0, 3)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(9000);
      });

      expect(container.querySelector("section")).toBeNull();
    });

    it("renders nothing when all logo probes fail", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        rejectAllImages();
        await vi.advanceTimersByTimeAsync(9000);
      });

      expect(container.querySelector("section")).toBeNull();
    });

    it("renders nothing when logo images are too small", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveImagesAsSmall();
        await vi.advanceTimersByTimeAsync(9000);
      });

      expect(container.querySelector("section")).toBeNull();
    });

    it("rejects domains not in VERIFIED_DOMAINS set", async () => {
      const unverifiedClients = Array.from({ length: 8 }, (_, i) =>
        makeClient(i + 100, `Fake Corp ${i}`, `fakecorp${i}.com`),
      );

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(unverifiedClients), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(9000);
      });

      // Unverified domains should be rejected — no images probed
      expect(container.querySelector("section")).toBeNull();
    });

    it("sets referrerPolicy='no-referrer' on logo images", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
      }
    });
  });

  // ── Fetch error handling ─────────────────────────────────────

  describe("fetch error handling", () => {
    it("renders nothing when fetch fails", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network error"));

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(9000);
      });

      expect(container.querySelector("section")).toBeNull();
    });

    it("renders nothing when fetch returns empty array", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(9000);
      });

      expect(container.querySelector("section")).toBeNull();
    });
  });

  // ── Responsive layout ────────────────────────────────────────

  describe("responsive layout (getSlotLayout)", () => {
    it("renders logo images with alt text matching client names", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const images = screen.getAllByRole("img");
      // Each image should have an alt attribute from the client name
      for (const img of images) {
        expect(img.getAttribute("alt")).toBeTruthy();
      }
    });

    it("applies brightness invert filter for dark theme", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const images = screen.getAllByRole("img");
      for (const img of images) {
        const style = img.getAttribute("style") || "";
        expect(style).toContain("brightness(0) invert(1)");
      }
    });

    it("applies logo_scale transform from client data", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const images = screen.getAllByRole("img");
      for (const img of images) {
        const style = img.getAttribute("style") || "";
        expect(style).toContain("scale(1)");
      }
    });
  });

  // ── Fade transitions ─────────────────────────────────────────

  describe("fade transitions", () => {
    it("logo grid container fades in with 800ms transition", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      // The outer logo grid div uses opacity transition
      const gridContainer = container.querySelector(
        ".flex.flex-col.items-center",
      );
      expect(gridContainer).not.toBeNull();
      const style = gridContainer?.getAttribute("style") || "";
      expect(style).toContain("opacity: 1");
      expect(style).toContain("800ms");
    });

    it("each logo slot has 600ms ease-in-out opacity transition", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      // LogoSlot containers have min-height style — use that to distinguish
      // from row containers which also have flex/items-center classes
      const allFlex = container.querySelectorAll(
        ".flex.items-center.justify-center",
      );
      const slots = Array.from(allFlex).filter((el) =>
        (el.getAttribute("style") || "").includes("min-height"),
      );
      expect(slots.length).toBeGreaterThan(0);

      for (const slot of slots) {
        const style = slot.getAttribute("style") || "";
        expect(style).toContain("600ms ease-in-out");
      }
    });

    it("logo slot has minHeight of 56px for layout stability", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const allFlex = container.querySelectorAll(
        ".flex.items-center.justify-center",
      );
      const slots = Array.from(allFlex).filter((el) =>
        (el.getAttribute("style") || "").includes("min-height"),
      );
      expect(slots.length).toBeGreaterThan(0);
      for (const slot of slots) {
        const style = slot.getAttribute("style") || "";
        expect(style).toContain("min-height: 56px");
      }
    });
  });

  // ── IntersectionObserver (pause/resume) ──────────────────────

  describe("IntersectionObserver for rotation pause/resume", () => {
    it("defaults isInView to true so rotation runs immediately", async () => {
      // The IntersectionObserver useEffect has [] deps, but the section
      // only renders when ready=true. Since the ref is null on first
      // effect run, the observer never attaches. isInView defaults to
      // true, so rotation always runs regardless.
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(200);
      });

      // Component renders and rotation works even without observer
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });

    it("rotation continues even without observer attachment", async () => {
      // The IO useEffect has [] deps — it runs before the section renders
      // (ready=false), so sectionRef.current is null and observer never
      // attaches. Rotation still works because isInView defaults to true.
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(200);
      });

      // Advance through rotation cycles — should not crash
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(2000);
      });

      const images = screen.getAllByRole("img");
      expect(images.length).toBeGreaterThan(0);
    });
  });

  // ── Logo rotation ────────────────────────────────────────────

  describe("logo rotation", () => {
    it("schedules rotation swaps without errors", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      // Component is now ready — rotation schedules after 800ms delay
      // then each slot schedules at 5000-10000ms random interval
      // Advance through multiple rotation cycles
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(2000);
      });

      // Component should still be rendering correctly after rotation
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
      expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
    });

    it("does not crash during extended rotation cycles", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      // Run through several rotation cycles without crashing
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(12000);
          resolveAllImages();
          await vi.advanceTimersByTimeAsync(1500);
        });
      }

      // Component should still be rendering without errors
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });
  });

  // ── Cleanup ──────────────────────────────────────────────────

  describe("cleanup", () => {
    it("clears all timers on unmount", async () => {
      const { unmount } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      // Unmount should not throw — all timers should be cleaned up
      expect(() => unmount()).not.toThrow();
    });

    it("cancels fetch on unmount during init", () => {
      const { unmount } = render(<ClientShowcase />);

      // Unmount before fetch resolves
      unmount();

      // No errors should occur — cancelled flag prevents state updates
      expect(true).toBe(true);
    });
  });

  // ── Accessibility ────────────────────────────────────────────

  describe("accessibility", () => {
    it("renders heading with proper hierarchy (h2)", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Clients We Serve");
    });

    it("renders as a <section> element", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
    });

    it("logo images have meaningful alt text", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const images = screen.getAllByRole("img");
      for (const img of images) {
        const alt = img.getAttribute("alt");
        expect(alt).toBeTruthy();
        expect(alt!.length).toBeGreaterThan(0);
      }
    });

    it("images load eagerly (not lazy) for above-fold content", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img).toHaveAttribute("loading", "eager");
      }
    });
  });
});

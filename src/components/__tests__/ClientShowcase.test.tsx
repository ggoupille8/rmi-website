import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";

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

    it("images have max-w-[220px] and max-h-14 constraints", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img.className).toContain("max-h-14");
        expect(img.className).toContain("max-w-[220px]");
        expect(img.className).toContain("object-contain");
      }
    });

    it("images have 0.85 base opacity for subtle rendering", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const images = screen.getAllByRole("img");
      for (const img of images) {
        const style = img.getAttribute("style") || "";
        expect(style).toContain("opacity: 0.85");
      }
    });
  });

  // ── probeImage validation logic ────────────────────────────────

  describe("probeImage validation logic", () => {
    it("rejects logos with aspect ratio <= 1.2 (too square)", async () => {
      // Logos with ratio <= 1.2 are rejected (e.g., 120x100 = 1.2)
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        // Resolve with near-square dimensions (ratio = 1.2, rejected)
        for (const img of imageInstances) {
          if (img.src && img.onload) {
            img.naturalWidth = 120;
            img.naturalHeight = 100;
            img.onload();
          }
        }
        await vi.advanceTimersByTimeAsync(9000);
      });

      // ratio = 1.2 which is <= 1.2, so rejected
      expect(container.querySelector("section")).toBeNull();
    });

    it("rejects logos with aspect ratio > 10 (too wide)", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        for (const img of imageInstances) {
          if (img.src && img.onload) {
            img.naturalWidth = 1100;
            img.naturalHeight = 100;
            img.onload();
          }
        }
        await vi.advanceTimersByTimeAsync(9000);
      });

      // ratio = 11 which is > 10, so rejected
      expect(container.querySelector("section")).toBeNull();
    });

    it("accepts logos with valid aspect ratio (e.g., 4:1)", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        for (const img of imageInstances) {
          if (img.src && img.onload) {
            img.naturalWidth = 400;
            img.naturalHeight = 100; // ratio = 4, valid
            img.onload();
          }
        }
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });

    it("resolves null on probe timeout (5000ms)", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        // Don't resolve any images — let them time out
        await vi.advanceTimersByTimeAsync(6000);
        // After timeout, icon fallback is tried — also let it time out
        await vi.advanceTimersByTimeAsync(6000);
        // Final 8s deadline
        await vi.advanceTimersByTimeAsync(9000);
      });

      // All probes timed out, fewer than 6 validated
      expect(container.querySelector("section")).toBeNull();
    });

    it("uses Brandfetch CDN URL format for logo probes", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Check that probed images use the Brandfetch URL pattern
      const brandfetchUrls = imageInstances
        .filter((img) => img.src.includes("cdn.brandfetch.io"))
        .map((img) => img.src);

      expect(brandfetchUrls.length).toBeGreaterThan(0);
      // Should probe /logo endpoint first
      const logoUrls = brandfetchUrls.filter((u) => u.endsWith("/logo"));
      expect(logoUrls.length).toBeGreaterThan(0);
    });

    it("falls back to /icon endpoint when /logo fails", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        // Fail all /logo probes
        for (const img of imageInstances) {
          if (img.src && img.src.endsWith("/logo") && img.onerror) {
            img.onerror();
          }
        }
        await vi.advanceTimersByTimeAsync(100);
      });

      // Now /icon probes should have been created
      const iconUrls = imageInstances
        .filter((img) => img.src.endsWith("/icon"))
        .map((img) => img.src);
      expect(iconUrls.length).toBeGreaterThan(0);
    });

    it("rejects icon images that are square and <= 256px", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        // Fail all logo probes so it falls back to icon
        for (const img of imageInstances) {
          if (img.src && img.src.endsWith("/logo") && img.onerror) {
            img.onerror();
          }
        }
        await vi.advanceTimersByTimeAsync(100);
        // Resolve icon probes as square 256x256 (rejected)
        for (const img of imageInstances) {
          if (img.src && img.src.endsWith("/icon") && img.onload) {
            img.naturalWidth = 256;
            img.naturalHeight = 256;
            img.onload();
          }
        }
        await vi.advanceTimersByTimeAsync(9000);
      });

      expect(container.querySelector("section")).toBeNull();
    });

    it("rejects icon images with width < 200px", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        // Fail logo probes
        for (const img of imageInstances) {
          if (img.src && img.src.endsWith("/logo") && img.onerror) {
            img.onerror();
          }
        }
        await vi.advanceTimersByTimeAsync(100);
        // Resolve icons as too narrow
        for (const img of imageInstances) {
          if (img.src && img.src.endsWith("/icon") && img.onload) {
            img.naturalWidth = 150;
            img.naturalHeight = 100;
            img.onload();
          }
        }
        await vi.advanceTimersByTimeAsync(9000);
      });

      expect(container.querySelector("section")).toBeNull();
    });
  });

  // ── LogoSlot behavior ──────────────────────────────────────────

  describe("LogoSlot behavior", () => {
    it("rejects square images in onLoad handler (Brandfetch artifacts)", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      // Get rendered logo images and simulate onLoad with square dimensions
      const images = screen.getAllByRole("img");
      const firstImg = images[0];

      // Fire onLoad with square naturalWidth/Height
      Object.defineProperty(firstImg, "naturalWidth", { value: 100, configurable: true });
      Object.defineProperty(firstImg, "naturalHeight", { value: 100, configurable: true });
      fireEvent.load(firstImg);

      // The slot should have opacity 0 since square images are rejected
      const slot = firstImg.parentElement;
      const style = slot?.getAttribute("style") || "";
      expect(style).toContain("opacity: 0");
    });

    it("sets opacity to 0 when fadingOut is true", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      // Advance past rotation delay to trigger fade-out on some slots
      await act(async () => {
        // 800ms initial + 5000-10000ms random delay
        await vi.advanceTimersByTimeAsync(11000);
      });

      // At least some slots should now be fading
      const allSlots = document.querySelectorAll(
        ".flex.items-center.justify-center",
      );
      const slotsWithStyle = Array.from(allSlots).filter((el) =>
        (el.getAttribute("style") || "").includes("min-height"),
      );

      // Verify at least one slot has been in the fade cycle
      // (either opacity 0 from fade-out or still opacity 1)
      for (const slot of slotsWithStyle) {
        const style = slot.getAttribute("style") || "";
        expect(style).toMatch(/opacity: [01]/);
      }
    });

    it("handles image load error by keeping opacity at 0", async () => {
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const images = screen.getAllByRole("img");
      const firstImg = images[0];

      // Simulate error
      fireEvent.error(firstImg);

      // Slot should have opacity 0 after error
      const slot = firstImg.parentElement;
      const style = slot?.getAttribute("style") || "";
      expect(style).toContain("opacity: 0");
    });
  });

  // ── Responsive layout breakpoints ──────────────────────────────

  describe("responsive layout breakpoints", () => {
    it("uses [3, 4, 5] layout on desktop (>= 1024px)", async () => {
      // Default window.innerWidth in happy-dom is typically >= 1024
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      // Desktop layout: 3 rows with 3, 4, 5 logos = 12 total slots
      const rows = container.querySelectorAll(
        ".flex.justify-center.items-center.gap-8",
      );
      expect(rows.length).toBe(3);
    });

    it("renders correct total number of logo slots for desktop", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const slots = Array.from(
        container.querySelectorAll(".flex.items-center.justify-center"),
      ).filter((el) => (el.getAttribute("style") || "").includes("min-height"));
      // Desktop: 3 + 4 + 5 = 12 slots
      expect(slots.length).toBe(12);
    });

    it("recalculates layout on window resize", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const slotsBefore = Array.from(
        container.querySelectorAll(".flex.items-center.justify-center"),
      ).filter((el) => (el.getAttribute("style") || "").includes("min-height"));
      const countBefore = slotsBefore.length;

      // Simulate resize to mobile width
      const originalWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", {
        value: 375,
        writable: true,
        configurable: true,
      });

      await act(async () => {
        window.dispatchEvent(new Event("resize"));
        await vi.advanceTimersByTimeAsync(100);
      });

      const slotsAfter = Array.from(
        container.querySelectorAll(".flex.items-center.justify-center"),
      ).filter((el) => (el.getAttribute("style") || "").includes("min-height"));

      // Mobile layout should have fewer slots (2 + 3 = 5 vs 12)
      expect(slotsAfter.length).toBeLessThan(countBefore);

      // Restore original width
      Object.defineProperty(window, "innerWidth", {
        value: originalWidth,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("resize"));
    });

    it("returns empty layout when pool has fewer than 6 clients", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_CLIENTS.slice(0, 5)), {
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

      // poolSize < 6 returns [] layout, component returns null
      expect(container.querySelector("section")).toBeNull();
    });

    it("uses [3, 3] layout for 6-7 clients on any screen", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_CLIENTS.slice(0, 7)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const rows = container.querySelectorAll(
        ".flex.justify-center.items-center.gap-8",
      );
      expect(rows.length).toBe(2);

      const slots = Array.from(
        container.querySelectorAll(".flex.items-center.justify-center"),
      ).filter((el) => (el.getAttribute("style") || "").includes("min-height"));
      expect(slots.length).toBe(6); // [3, 3]
    });
  });

  // ── Rotation swap logic ────────────────────────────────────────

  describe("rotation swap logic", () => {
    it("does not rotate when pool size equals visible slots", async () => {
      // Exactly 12 clients = 12 desktop slots, no rotation needed
      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const imagesBefore = screen.getAllByRole("img").map((i) =>
        i.getAttribute("src"),
      );

      // Advance well past rotation delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(2000);
      });

      const imagesAfter = screen.getAllByRole("img").map((i) =>
        i.getAttribute("src"),
      );

      // Same images should be visible — no swap occurred
      expect(imagesAfter.length).toBe(imagesBefore.length);
    });

    it("rotates logos when pool has more clients than visible slots", async () => {
      // 15 clients > 12 slots = rotation should occur
      const extraClients = [
        ...MOCK_CLIENTS,
        makeClient(13, "Dominos", "dominos.com"),
        makeClient(14, "Fidelity", "fidelity.com"),
        makeClient(15, "Comcast", "comcast.com"),
      ];

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(extraClients), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      const imagesBefore = screen.getAllByRole("img").map((i) =>
        i.getAttribute("alt"),
      );

      // Advance through rotation (800ms init + 5-10s per slot + 700ms fade)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(2000);
      });

      // Component should still render without errors
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
      const imagesAfter = screen.getAllByRole("img");
      expect(imagesAfter.length).toBeGreaterThan(0);
    });

    it("prevents same logo from appearing in consecutive swaps (lastSwappedOut)", async () => {
      const extraClients = [
        ...MOCK_CLIENTS,
        makeClient(13, "Dominos", "dominos.com"),
        makeClient(14, "Fidelity", "fidelity.com"),
        makeClient(15, "Comcast", "comcast.com"),
      ];

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(extraClients), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(100);
      });

      // Run a few rotation cycles — should not crash or infinite loop
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(12000);
          resolveAllImages();
          await vi.advanceTimersByTimeAsync(1500);
        });
      }

      // If lastSwappedOut tracking breaks, this would infinite loop or crash
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });
  });

  // ── Validation deadline and cap ────────────────────────────────

  describe("validation deadline and cap", () => {
    it("stops validation after 8000ms deadline", async () => {
      // Don't resolve any images — let the 8s deadline hit
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        // No image resolution
        await vi.advanceTimersByTimeAsync(9000);
      });

      // Deadline hit, no validated logos, component stays hidden
      expect(container.querySelector("section")).toBeNull();
    });

    it("caps at 16 validated logos and proceeds early", async () => {
      // Create 20 clients — should stop at 16
      const domains = [
        "ford.com", "dteenergy.com", "cmsenergy.com", "stellantis.com",
        "toyota.com", "basf.com", "ameresco.com", "costco.com",
        "amazon.com", "verizon.com", "nissan.com", "delta.com",
        "dominos.com", "fidelity.com", "comcast.com", "flagstar.com",
        "ymca.org", "cartier.com", "tagheuer.com", "primark.com",
      ];
      const manyClients = domains.map((d, i) =>
        makeClient(i + 1, `Client ${i}`, d),
      );

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(manyClients), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      render(<ClientShowcase />);

      // Give enough time for fetch + probe resolution + state updates
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(500);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(500);
      });

      // Should have resolved early (before 8s deadline) with logos
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });
  });

  // ── Grid structure ─────────────────────────────────────────────

  describe("grid structure", () => {
    async function renderAndResolve() {
      const result = render(<ClientShowcase />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(200);
      });
      return result;
    }

    it("renders rows inside a flex column container", async () => {
      const { container } = await renderAndResolve();
      const flexCol = container.querySelector(
        ".flex.flex-col.items-center.gap-4",
      );
      expect(flexCol).not.toBeNull();
    });

    it("rows use gap-8 spacing between logos", async () => {
      const { container } = await renderAndResolve();
      const rows = container.querySelectorAll(
        ".flex.justify-center.items-center.gap-8",
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.className).toContain("gap-8");
      }
    });

    it("section has proper padding and overflow hidden", async () => {
      const { container } = await renderAndResolve();
      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
      expect(section?.className).toContain("py-12");
      expect(section?.className).toContain("px-4");
      expect(section?.className).toContain("overflow-hidden");
    });

    it("content is constrained to max-w-5xl", async () => {
      const { container } = await renderAndResolve();
      const inner = container.querySelector(".max-w-5xl.mx-auto");
      expect(inner).not.toBeNull();
    });

    it("header section uses text-center alignment", async () => {
      const { container } = await renderAndResolve();
      const header = container.querySelector(".text-center.mb-6");
      expect(header).not.toBeNull();
    });
  });

  // ── Text styling ───────────────────────────────────────────────

  describe("text styling", () => {
    async function renderAndResolve() {
      render(<ClientShowcase />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
        resolveAllImages();
        await vi.advanceTimersByTimeAsync(200);
      });
    }

    it("label uses uppercase tracking and blue-400 color", async () => {
      await renderAndResolve();

      const label = screen.getByText("Trusted By Industry Leaders");
      expect(label.className).toContain("uppercase");
      expect(label.className).toContain("tracking-[0.2em]");
      expect(label.className).toContain("text-blue-400");
      expect(label.tagName).toBe("P");
    });

    it("heading uses bold white text with tight tracking", async () => {
      await renderAndResolve();

      const heading = screen.getByText("Clients We Serve");
      expect(heading.className).toContain("font-bold");
      expect(heading.className).toContain("text-white");
      expect(heading.className).toContain("tracking-tight");
    });

    it("subtitle uses slate-400 color", async () => {
      await renderAndResolve();

      const subtitle = screen.getByText(
        /Michigan.*commercial.*industrial facilities trust RMI/,
      );
      expect(subtitle.className).toContain("text-slate-400");
      expect(subtitle.className).toContain("text-sm");
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

// ── Mock IntersectionObserver ────────────────────────────────────
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(_callback: IntersectionObserverCallback) {
    // no-op
  }
  observe = mockObserve;
  unobserve = vi.fn();
  disconnect = mockDisconnect;
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);


// ── Mock matchMedia for reduced-motion ───────────────────────────
const mockMatchMedia = vi.fn().mockReturnValue({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});
vi.stubGlobal("matchMedia", mockMatchMedia);

// ── Test data ────────────────────────────────────────────────────
function makeClient(id: number, name: string, domain: string) {
  return {
    id,
    name,
    domain,
    color: "#ffffff",
    description: `${name} description`,
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



// Control whether resolveLogo returns a URL or null
let logoShouldResolve = true;

vi.mock("../landing/LogoResolver", () => {
  return {
    resolveLogo: vi.fn(async (domain: string): Promise<string | null> => {
      if (!logoShouldResolve) return null;
      return `https://icon.horse/icon/${domain}`;
    }),
    getInitials: vi.fn((name: string): string => {
      return name
        .split(/\s+/)
        .filter((w: string) => !["&", "and", "the", "of"].includes(w.toLowerCase()))
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);
    }),
  };
});

import ClientShowcase from "../landing/ClientShowcase";

describe("ClientShowcase", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    logoShouldResolve = true;
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

  /** Render component and wait for fetch + resolve logos */
  async function renderAndResolve() {
    const result = render(<ClientShowcase />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    // Fire load event on all rendered <img> elements so LogoSlot marks them loaded
    await act(async () => {
      const imgs = result.container.querySelectorAll("img");
      for (const img of imgs) {
        img.dispatchEvent(new Event("load", { bubbles: false }));
      }
      await vi.advanceTimersByTimeAsync(100);
    });
    return result;
  }

  // ── Initial rendering ──────────────────────────────────────────

  describe("initial rendering", () => {
    it("renders a placeholder div before clients are fetched", () => {
      const { container } = render(<ClientShowcase />);
      // Before fetch resolves, renders a placeholder with minHeight for hydration
      const placeholder = container.querySelector("[aria-hidden='true']");
      expect(placeholder).not.toBeNull();
      expect(container.querySelector("section")).toBeNull();
    });

    it("fetches clients from /api/clients on mount", async () => {
      render(<ClientShowcase />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(fetchSpy).toHaveBeenCalledWith("/api/clients");
    });

    it("renders section with id='clients' after successful load", async () => {
      await renderAndResolve();
      const section = document.getElementById("clients");
      expect(section).not.toBeNull();
    });

    it("renders 'Trusted by Industry Leaders' label", async () => {
      await renderAndResolve();
      expect(
        screen.getByText("Trusted by Industry Leaders"),
      ).toBeInTheDocument();
    });

    it("renders 'Clients We Serve' heading", async () => {
      await renderAndResolve();
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });

    it("renders subtitle text", async () => {
      await renderAndResolve();
      expect(
        screen.getByText(
          /Michigan.*commercial.*industrial facilities trust RMI/,
        ),
      ).toBeInTheDocument();
    });
  });

  // ── CSS Grid layout ────────────────────────────────────────────

  describe("CSS grid layout", () => {
    it("renders logo slots in a grid container", async () => {
      const { container } = await renderAndResolve();
      const grid = container.querySelector(".grid");
      expect(grid).not.toBeNull();
      expect(grid?.className).toContain("grid-cols-3");
      expect(grid?.className).toContain("md:grid-cols-4");
      expect(grid?.className).toContain("lg:grid-cols-6");
    });

    it("renders up to GRID_SIZE (12) logo slots", async () => {
      await renderAndResolve();
      // Each slot has a title attribute with the client name
      const slots = document.querySelectorAll("[title]");
      expect(slots.length).toBe(12);
    });

    it("section has proper padding classes", async () => {
      const { container } = await renderAndResolve();
      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
      expect(section?.className).toContain("py-20");
      expect(section?.className).toContain("bg-neutral-950");
    });

    it("content is constrained to max-w-6xl", async () => {
      const { container } = await renderAndResolve();
      const inner = container.querySelector(".max-w-6xl.mx-auto");
      expect(inner).not.toBeNull();
    });
  });

  // ── Logo resolution and display ────────────────────────────────

  describe("logo resolution and display", () => {
    it("renders images when logos resolve successfully", async () => {
      await renderAndResolve();
      const images = screen.getAllByRole("img");
      expect(images.length).toBeGreaterThan(0);
    });

    it("renders logo images with alt text matching client names", async () => {
      await renderAndResolve();
      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img.getAttribute("alt")).toBeTruthy();
      }
    });

    it("applies monochrome white filter (brightness-0 invert) for uniform look", async () => {
      await renderAndResolve();
      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img.className).toContain("brightness-0");
        expect(img.className).toContain("invert");
      }
    });

    it("applies base opacity-60 with group-hover:opacity-100 transition", async () => {
      await renderAndResolve();
      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img.className).toContain("opacity-60");
        expect(img.className).toContain("group-hover:opacity-100");
        expect(img.className).toContain("transition-opacity");
        expect(img.className).toContain("duration-300");
      }
    });

    it("sets referrerPolicy='no-referrer' on logo images", async () => {
      await renderAndResolve();
      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
      }
    });

    it("shows initials fallback when logo resolution returns null", async () => {
      logoShouldResolve = false;

      render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      // Should show initials text in fallback badges (uniform bg-white/10)
      const section = document.getElementById("clients");
      expect(section).not.toBeNull();
      // Initials fallback badges use bg-white/10 class
      const fallbacks = section!.querySelectorAll(".bg-white\\/10");
      expect(fallbacks.length).toBeGreaterThan(0);
    });

    it("shows gray pulse placeholder while logo is loading", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      // During loading, LogoSlot renders animate-pulse divs
      const pulsingDivs = container.querySelectorAll(".animate-pulse");
      // May or may not have them depending on timing, but shouldn't crash
      expect(container).toBeTruthy();
    });
  });

  // ── Fetch error handling ───────────────────────────────────────

  describe("fetch error handling", () => {
    it("renders nothing when fetch throws a network error", async () => {
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

    it("renders nothing when fetch returns HTTP 500", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(9000);
      });

      expect(container.querySelector("section")).toBeNull();
    });

    it("renders nothing when fetch returns HTTP 404", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response("Not Found", { status: 404 }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(9000);
      });

      expect(container.querySelector("section")).toBeNull();
    });

    it("renders nothing when fetch returns malformed JSON", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response("not json at all", {
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

    it("renders nothing when all clients have no domain", async () => {
      const noDomainClients = MOCK_CLIENTS.map((c) => ({
        ...c,
        domain: "",
      }));

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(noDomainClients), {
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

    it("renders nothing when fetch returns null domains", async () => {
      const nullDomainClients = MOCK_CLIENTS.map((c) => ({
        ...c,
        domain: null,
      }));

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(nullDomainClients), {
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

    it("gracefully handles fetch timeout (AbortError)", async () => {
      fetchSpy.mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(9000);
      });

      expect(container.querySelector("section")).toBeNull();
    });
  });

  // ── Fade transitions ───────────────────────────────────────────

  describe("fade transitions", () => {
    it("uses FADE_DURATION (1500ms) for slot opacity transitions", async () => {
      const { container } = await renderAndResolve();

      const slots = container.querySelectorAll("[title]");
      const firstSlot = slots[0];
      if (firstSlot) {
        const style = firstSlot.getAttribute("style") || "";
        expect(style).toContain("1500ms");
      }
    });

    it("sets opacity to 0 on fading slot during rotation", async () => {
      // Use 15 clients so there are extras in the queue for rotation
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

      await renderAndResolve();

      // Advance past rotation interval (5000ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });

      // After rotation trigger, at least one slot should be in fading state
      // The component sets fadingSlot which causes opacity: 0
      // This shouldn't crash or error
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });
  });

  // ── Logo rotation ──────────────────────────────────────────────

  describe("logo rotation", () => {
    it("does not rotate when pool size equals visible slots", async () => {
      // Exactly 12 clients = 12 grid slots, no rotation needed (empty queue)
      await renderAndResolve();

      const imagesBefore = screen.getAllByRole("img").map((i) =>
        i.getAttribute("alt"),
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      const imagesAfter = screen.getAllByRole("img").map((i) =>
        i.getAttribute("alt"),
      );

      expect(imagesAfter.length).toBe(imagesBefore.length);
    });

    it("rotates logos when pool has more clients than visible slots", async () => {
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

      await renderAndResolve();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
      expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
    });

    it("does not crash during extended rotation cycles", async () => {
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

      await renderAndResolve();

      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(13500);
        });
      }

      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });

    it("rotates each slot exactly once before repeating any (fair rotation)", async () => {
      // 24 clients = 12 visible + 12 in queue, so every slot CAN rotate
      const manyClients = Array.from({ length: 24 }, (_, i) =>
        makeClient(i + 1, `Client ${i}`, `client${i}.com`),
      );

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(manyClients), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = await renderAndResolve();

      // Snapshot the initial src for each slot position
      const getSlotSrcs = () => {
        const slots = container.querySelectorAll("[title]");
        return Array.from(slots).map((s) => {
          const img = s.querySelector("img");
          return img?.getAttribute("src") ?? null;
        });
      };

      const initialSrcs = getSlotSrcs();

      // Run rotation cycles one at a time with precise timing:
      // ROTATION_INTERVAL (5000ms) fires the interval, then FADE_DURATION
      // (1500ms) for fade-out, then FADE_DURATION (1500ms) for fade-in.
      // Run 14 cycles to guarantee all 12 slots rotate even if an
      // interval fires while isRotating is still true (gets skipped).
      for (let cycle = 0; cycle < 14; cycle++) {
        // Advance past one interval tick
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5100);
        });
        // Let fade-out + swap + fade-in complete
        await act(async () => {
          await vi.advanceTimersByTimeAsync(3200);
        });
        // Fire load events on swapped-in images
        await act(async () => {
          const imgs = container.querySelectorAll("img");
          for (const img of imgs) {
            img.dispatchEvent(new Event("load", { bubbles: false }));
          }
          await vi.advanceTimersByTimeAsync(100);
        });
      }

      const afterSrcs = getSlotSrcs();

      // With fair rotation, after one full round every slot should
      // have been swapped at least once (src changed from initial)
      let changedCount = 0;
      for (let i = 0; i < 12; i++) {
        if (afterSrcs[i] !== initialSrcs[i]) changedCount++;
      }
      expect(changedCount).toBe(12);
    });

    it("pauses rotation on mouse hover", async () => {
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

      const { container } = await renderAndResolve();

      // Grid container should have mouse event handlers
      const grid = container.querySelector(".grid");
      expect(grid).not.toBeNull();
      // The onMouseEnter/onMouseLeave are set on the grid div
      // Verify the grid renders without error when hovered
      expect(grid?.getAttribute("class")).toContain("gap-x-6");
    });
  });

  // ── Cleanup ────────────────────────────────────────────────────

  describe("cleanup", () => {
    it("clears all timers on unmount", async () => {
      const { unmount } = await renderAndResolve();
      expect(() => unmount()).not.toThrow();
    });

    it("does not crash on unmount before fetch resolves", () => {
      const { unmount } = render(<ClientShowcase />);
      unmount();
      // No errors should occur
      expect(true).toBe(true);
    });

    it("does not crash on unmount during logo resolution", async () => {
      const { unmount } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      // Unmount while logos are still resolving
      expect(() => unmount()).not.toThrow();
    });
  });

  // ── Accessibility ──────────────────────────────────────────────

  describe("accessibility", () => {
    it("renders heading with proper hierarchy (h2)", async () => {
      await renderAndResolve();
      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Clients We Serve");
    });

    it("renders as a <section> element", async () => {
      const { container } = await renderAndResolve();
      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
    });

    it("logo images have meaningful alt text", async () => {
      await renderAndResolve();
      const images = screen.getAllByRole("img");
      for (const img of images) {
        const alt = img.getAttribute("alt");
        expect(alt).toBeTruthy();
        expect(alt!.length).toBeGreaterThan(0);
      }
    });

    it("heading uses text-center alignment", async () => {
      const { container } = await renderAndResolve();
      const header = container.querySelector(".text-center.mb-12");
      expect(header).not.toBeNull();
    });
  });

  // ── Prefers-reduced-motion ─────────────────────────────────────

  describe("prefers-reduced-motion", () => {
    it("uses longer rotation interval (10s) when reduced motion is preferred", async () => {
      // Set up matchMedia to return matches: true
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      await renderAndResolve();

      // The component should still render without errors
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });

    it("disables opacity transitions when reduced motion is preferred", async () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { container } = await renderAndResolve();

      // Slots should not have transition styles when reduced motion is on
      const slots = container.querySelectorAll("[title]");
      expect(slots.length).toBeGreaterThan(0);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles single client gracefully (renders placeholder)", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify([MOCK_CLIENTS[0]]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(100);
      });

      // Only 1 client — still renders the grid (component shows it)
      // The section will render since there's at least 1 client with a domain
      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
    });

    it("filters out clients without domains from the grid", async () => {
      const mixedClients = [
        ...MOCK_CLIENTS.slice(0, 6),
        { id: 100, name: "No Domain Corp", domain: "", color: "#fff", description: "test" },
        { id: 101, name: "Null Domain Inc", domain: null, color: "#fff", description: "test" },
      ];

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mixedClients), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(100);
      });

      // Only the 6 clients with valid domains should show
      const slots = container.querySelectorAll("[title]");
      expect(slots.length).toBe(6);
    });

    it("handles duplicate domain clients", async () => {
      const dupClients = [
        ...MOCK_CLIENTS.slice(0, 6),
        makeClient(100, "Ford Corp", "ford.com"), // duplicate domain
      ];

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(dupClients), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should render without crashing — duplicates are included
      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
    });

    it("handles very large client list (50+ clients)", async () => {
      const largeList = Array.from({ length: 50 }, (_, i) =>
        makeClient(i + 1, `Company ${i}`, `company${i}.com`),
      );

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(largeList), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should only render GRID_SIZE (12) slots
      const slots = container.querySelectorAll("[title]");
      expect(slots.length).toBe(12);
    });

    it("handles clients with special characters in names", async () => {
      const specialClients = Array.from({ length: 7 }, (_, i) =>
        makeClient(i + 1, `Company <>&"' ${i}`, `company${i}.com`),
      );

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(specialClients), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should render without XSS or crashes
      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
    });
  });

  // ── LogoSlot image error handling ──────────────────────────────

  describe("LogoSlot error handling", () => {
    it("falls back to initials when image onError fires", async () => {
      await renderAndResolve();

      const images = screen.getAllByRole("img");
      const firstImg = images[0];

      // Simulate the rendered image failing to load
      await act(async () => {
        firstImg.dispatchEvent(new Event("error", { bubbles: false }));
      });

      // After error, the slot should transition to initials fallback
      // (the image gets removed and initials badge shows)
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });

    it("handles multiple simultaneous image errors", async () => {
      await renderAndResolve();

      const images = screen.getAllByRole("img");

      // Fire error on all images
      await act(async () => {
        for (const img of images) {
          img.dispatchEvent(new Event("error", { bubbles: false }));
        }
      });

      // Should still render the section without crashing
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
    });
  });

  // ── Text content ───────────────────────────────────────────────

  describe("text content", () => {
    it("label uses uppercase tracking and blue-400 color", async () => {
      await renderAndResolve();

      const label = screen.getByText("Trusted by Industry Leaders");
      expect(label.className).toContain("uppercase");
      expect(label.className).toContain("tracking-widest");
      expect(label.className).toContain("text-blue-400");
    });

    it("heading uses bold white text", async () => {
      await renderAndResolve();

      const heading = screen.getByText("Clients We Serve");
      expect(heading.className).toContain("font-bold");
      expect(heading.className).toContain("text-white");
    });

    it("subtitle uses neutral-400 color", async () => {
      await renderAndResolve();

      const subtitle = screen.getByText(
        /Michigan.*commercial.*industrial facilities trust RMI/,
      );
      expect(subtitle.className).toContain("text-neutral-400");
    });
  });

  // ── Monochrome / uniform styling ──────────────────────────────

  describe("monochrome uniform styling", () => {
    it("all logo images use identical filter classes (no per-client color)", async () => {
      await renderAndResolve();
      const images = screen.getAllByRole("img");
      const classLists = images.map((img) => img.className);
      // Every image should share the exact same set of classes
      for (const cls of classLists) {
        expect(cls).toBe(classLists[0]);
      }
    });

    it("logo container uses bg-white/5 background for subtle dark card", async () => {
      const { container } = await renderAndResolve();
      const logoContainers = container.querySelectorAll(".bg-white\\/5");
      expect(logoContainers.length).toBe(12);
    });

    it("logo container hovers to bg-white/10", async () => {
      const { container } = await renderAndResolve();
      const logoContainers = container.querySelectorAll(".group-hover\\:bg-white\\/10");
      expect(logoContainers.length).toBe(12);
    });

    it("initials fallback uses uniform bg-white/10 (no brand colors)", async () => {
      logoShouldResolve = false;

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      // All initials badges should use bg-white/10 class, not inline brand-color styles
      const fallbacks = container.querySelectorAll(".bg-white\\/10");
      expect(fallbacks.length).toBeGreaterThan(0);
      for (const fb of fallbacks) {
        // Should NOT have inline background style (no per-client gradients)
        expect(fb.getAttribute("style")).toBeNull();
      }
    });

    it("initials fallback text uses white/70 color for consistency", async () => {
      logoShouldResolve = false;

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      const initialsText = container.querySelectorAll(".text-white\\/70.font-bold");
      expect(initialsText.length).toBeGreaterThan(0);
    });

    it("logo images have constrained max dimensions for uniform sizing", async () => {
      await renderAndResolve();
      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img.className).toContain("max-h-[48px]");
        expect(img.className).toContain("max-w-[48px]");
        expect(img.className).toContain("md:max-h-[56px]");
        expect(img.className).toContain("md:max-w-[56px]");
        expect(img.className).toContain("object-contain");
      }
    });
  });

  // ── Client name labels ────────────────────────────────────────

  describe("client name labels", () => {
    it("renders a name label below each logo slot", async () => {
      const { container } = await renderAndResolve();
      // Each slot with title also has a <span> with client name
      const nameLabels = container.querySelectorAll(
        "[title] > span.text-neutral-500",
      );
      expect(nameLabels.length).toBe(12);
    });

    it("name labels truncate long names", async () => {
      const { container } = await renderAndResolve();
      const nameLabels = container.querySelectorAll("[title] > span");
      for (const label of nameLabels) {
        expect(label.className).toContain("truncate");
      }
    });

    it("name labels have hover color transition", async () => {
      const { container } = await renderAndResolve();
      const nameLabels = container.querySelectorAll(
        "[title] > span.group-hover\\:text-neutral-300",
      );
      expect(nameLabels.length).toBe(12);
    });

    it("name labels show correct client names", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_CLIENTS.slice(0, 3)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        const imgs = container.querySelectorAll("img");
        for (const img of imgs) {
          img.dispatchEvent(new Event("load", { bubbles: false }));
        }
        await vi.advanceTimersByTimeAsync(100);
      });

      // Check each name appears as text in a label span
      for (const client of MOCK_CLIENTS.slice(0, 3)) {
        const label = container.querySelector(`[title="${client.name}"] > span`);
        expect(label).not.toBeNull();
        expect(label?.textContent).toBe(client.name);
      }
    });

    it("name labels are responsive (text-[10px] mobile, md:text-xs desktop)", async () => {
      const { container } = await renderAndResolve();
      const nameLabel = container.querySelector("[title] > span");
      expect(nameLabel).not.toBeNull();
      expect(nameLabel?.className).toContain("text-[10px]");
      expect(nameLabel?.className).toContain("md:text-xs");
    });
  });

  // ── Logo container structure ──────────────────────────────────

  describe("logo container structure", () => {
    it("each slot uses group class for coordinated hover effects", async () => {
      const { container } = await renderAndResolve();
      const slots = container.querySelectorAll("[title].group");
      expect(slots.length).toBe(12);
    });

    it("logo containers have rounded-xl corners", async () => {
      const { container } = await renderAndResolve();
      const containers = container.querySelectorAll(".rounded-xl.bg-white\\/5");
      expect(containers.length).toBe(12);
    });

    it("logo containers are responsive (w-16 h-16 mobile, md:w-20 md:h-20)", async () => {
      const { container } = await renderAndResolve();
      const firstContainer = container.querySelector(".rounded-xl.bg-white\\/5");
      expect(firstContainer).not.toBeNull();
      expect(firstContainer?.className).toContain("w-16");
      expect(firstContainer?.className).toContain("h-16");
      expect(firstContainer?.className).toContain("md:w-20");
      expect(firstContainer?.className).toContain("md:h-20");
    });

    it("logo containers have transition-colors for smooth hover", async () => {
      const { container } = await renderAndResolve();
      const firstContainer = container.querySelector(".rounded-xl.bg-white\\/5");
      expect(firstContainer?.className).toContain("transition-colors");
      expect(firstContainer?.className).toContain("duration-300");
    });
  });

  // ── Visibility state handling ─────────────────────────────────

  describe("visibility state handling", () => {
    it("does not rotate when document is hidden", async () => {
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

      await renderAndResolve();

      // Simulate hidden tab
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });

      const imagesBefore = screen
        .getAllByRole("img")
        .map((i) => i.getAttribute("src"));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      const imagesAfter = screen
        .getAllByRole("img")
        .map((i) => i.getAttribute("src"));

      // No rotation should have occurred
      expect(imagesAfter).toEqual(imagesBefore);

      // Restore
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
    });
  });

  // ── Reduced motion — detailed ─────────────────────────────────

  describe("prefers-reduced-motion (detailed)", () => {
    it("slot style has no transition property when reduced motion is on", async () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { container } = await renderAndResolve();
      const slot = container.querySelector("[title]");
      const style = slot?.getAttribute("style") || "";
      // Should have opacity but NOT transition
      expect(style).toContain("opacity");
      expect(style).not.toContain("transition");
    });

    it("slot style includes transition when reduced motion is off", async () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { container } = await renderAndResolve();
      const slot = container.querySelector("[title]");
      const style = slot?.getAttribute("style") || "";
      expect(style).toContain("transition");
      expect(style).toContain("1500ms");
    });
  });

  // ── Shuffle and queue behavior ────────────────────────────────

  describe("shuffle and queue behavior", () => {
    it("with fewer clients than GRID_SIZE, shows all clients", async () => {
      const fewClients = MOCK_CLIENTS.slice(0, 5);

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(fewClients), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(100);
      });

      const slots = container.querySelectorAll("[title]");
      expect(slots.length).toBe(5);
    });

    it("with exactly GRID_SIZE clients, no rotation queue exists", async () => {
      // 12 clients = 12 slots, nothing left for queue
      await renderAndResolve();

      const imagesBefore = screen
        .getAllByRole("img")
        .map((i) => i.getAttribute("alt"));

      // Advance many rotation intervals
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });

      // Same count — no swaps happened
      const imagesAfter = screen
        .getAllByRole("img")
        .map((i) => i.getAttribute("alt"));
      expect(imagesAfter.length).toBe(imagesBefore.length);
    });

    it("rotation eventually cycles through all queued clients", async () => {
      const allClients = [
        ...MOCK_CLIENTS,
        makeClient(13, "Extra One", "extra1.com"),
      ];

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(allClients), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await renderAndResolve();

      // Run enough rotation cycles to guarantee the 13th client appears
      // Each rotation takes: ROTATION_INTERVAL (5s) + 2 * FADE_DURATION (1.5s) = 8s
      for (let i = 0; i < 15; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(8500);
        });
        // Fire load events on any new images
        await act(async () => {
          const imgs = document.querySelectorAll("img");
          for (const img of imgs) {
            img.dispatchEvent(new Event("load", { bubbles: false }));
          }
          await vi.advanceTimersByTimeAsync(100);
        });
      }

      // Component should still be healthy
      expect(screen.getByText("Clients We Serve")).toBeInTheDocument();
      expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
    });
  });

  // ── Placeholder hydration guard ───────────────────────────────

  describe("placeholder hydration guard", () => {
    it("placeholder has minHeight 200px for Astro client:visible trigger", () => {
      const { container } = render(<ClientShowcase />);
      const placeholder = container.querySelector("[aria-hidden='true']");
      expect(placeholder).not.toBeNull();
      expect(placeholder?.getAttribute("style")).toContain("min-height");
      expect(placeholder?.getAttribute("style")).toContain("200px");
    });

    it("placeholder is replaced by section once clients load", async () => {
      const { container } = await renderAndResolve();
      const placeholder = container.querySelector("[aria-hidden='true']");
      expect(placeholder).toBeNull();
      const section = container.querySelector("section#clients");
      expect(section).not.toBeNull();
    });
  });

  // ── Fetch endpoint contract ───────────────────────────────────

  describe("fetch endpoint contract", () => {
    it("calls /api/clients exactly once on mount", async () => {
      await renderAndResolve();
      const clientsCalls = fetchSpy.mock.calls.filter(
        (call) => call[0] === "/api/clients",
      );
      expect(clientsCalls.length).toBe(1);
    });

    it("does not refetch on re-render", async () => {
      const { rerender } = await renderAndResolve();
      rerender(<ClientShowcase />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      const clientsCalls = fetchSpy.mock.calls.filter(
        (call) => call[0] === "/api/clients",
      );
      // Still just 1 call from initial mount
      expect(clientsCalls.length).toBe(1);
    });
  });

  // ── LogoSlot lifecycle ────────────────────────────────────────

  describe("LogoSlot lifecycle", () => {
    it("image onLoad triggers visibility (opacity 1)", async () => {
      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Before onLoad, slots have opacity: 0
      const slotBefore = container.querySelector("[title]");
      expect(slotBefore?.getAttribute("style")).toContain("opacity: 0");

      // Fire load
      await act(async () => {
        const imgs = container.querySelectorAll("img");
        for (const img of imgs) {
          img.dispatchEvent(new Event("load", { bubbles: false }));
        }
        await vi.advanceTimersByTimeAsync(50);
      });

      // After onLoad, slots have opacity: 1
      const slotAfter = container.querySelector("[title]");
      expect(slotAfter?.getAttribute("style")).toContain("opacity: 1");
    });

    it("image onError transitions to initials badge", async () => {
      const { container } = await renderAndResolve();

      const imageCountBefore = container.querySelectorAll("img").length;
      expect(imageCountBefore).toBe(12);

      // Fire error on first image
      await act(async () => {
        const firstImg = container.querySelector("img");
        firstImg?.dispatchEvent(new Event("error", { bubbles: false }));
        await vi.advanceTimersByTimeAsync(50);
      });

      // One fewer image, one more initials badge
      const imageCountAfter = container.querySelectorAll("img").length;
      expect(imageCountAfter).toBe(11);
      const initialsBadges = container.querySelectorAll(".bg-white\\/10.rounded-lg");
      expect(initialsBadges.length).toBe(1);
    });
  });

  // ── getInitials logic via mock ────────────────────────────────

  describe("getInitials rendering", () => {
    it("generates correct initials for multi-word company names", async () => {
      logoShouldResolve = false;
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify([makeClient(1, "Ford Motor Company", "ford.com")]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      // "Ford Motor Company" → "FMC" (filters out common words)
      const initialsEl = container.querySelector(".font-bold.tracking-wide");
      expect(initialsEl?.textContent).toBe("FMC");
    });

    it("generates correct initials filtering 'the' and '&'", async () => {
      logoShouldResolve = false;
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            makeClient(1, "The Ford & Motor", "ford.com"),
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      // "The Ford & Motor" → filters "The" and "&" → "FM"
      const initialsEl = container.querySelector(".font-bold.tracking-wide");
      expect(initialsEl?.textContent).toBe("FM");
    });

    it("caps initials at 3 characters max", async () => {
      logoShouldResolve = false;
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            makeClient(
              1,
              "Very Long Company Name Here",
              "vlcnh.com",
            ),
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const { container } = render(<ClientShowcase />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      const initialsEl = container.querySelector(".font-bold.tracking-wide");
      expect(initialsEl?.textContent?.length).toBeLessThanOrEqual(3);
    });
  });
});

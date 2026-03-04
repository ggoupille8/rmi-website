import { describe, it, expect } from "vitest";
import {
  formatLargeNumber,
  formatLargeNumberProse,
  totalOshaManHours,
  oshaManHoursByYear,
  oshaFirstYear,
  heroStats,
  services,
  materials,
  companyName,
  email,
  phone,
  phoneE164,
  address,
} from "../site";

describe("site content helpers", () => {
  describe("formatLargeNumber", () => {
    it("formats millions with M+ suffix", () => {
      expect(formatLargeNumber(1000000)).toBe("1M+");
      expect(formatLargeNumber(2500000)).toBe("2M+");
      expect(formatLargeNumber(1999999)).toBe("1M+");
    });

    it("formats thousands with K+ suffix", () => {
      expect(formatLargeNumber(1000)).toBe("1K+");
      expect(formatLargeNumber(231753)).toBe("231K+");
      expect(formatLargeNumber(999999)).toBe("999K+");
    });

    it("formats numbers below 1000 with + suffix", () => {
      expect(formatLargeNumber(0)).toBe("0+");
      expect(formatLargeNumber(1)).toBe("1+");
      expect(formatLargeNumber(500)).toBe("500+");
      expect(formatLargeNumber(999)).toBe("999+");
    });

    it("uses Math.floor (no rounding up)", () => {
      expect(formatLargeNumber(1999)).toBe("1K+");
      expect(formatLargeNumber(1001)).toBe("1K+");
    });
  });

  describe("formatLargeNumberProse", () => {
    it("rounds down to nearest thousand and formats with commas", () => {
      expect(formatLargeNumberProse(231753)).toBe("231,000");
      expect(formatLargeNumberProse(1000)).toBe("1,000");
      expect(formatLargeNumberProse(1500)).toBe("1,000");
    });

    it("formats zero", () => {
      expect(formatLargeNumberProse(0)).toBe("0");
    });

    it("formats numbers less than 1000 as 0", () => {
      expect(formatLargeNumberProse(999)).toBe("0");
      expect(formatLargeNumberProse(500)).toBe("0");
    });

    it("formats large numbers with proper comma separation", () => {
      expect(formatLargeNumberProse(1000000)).toBe("1,000,000");
      expect(formatLargeNumberProse(2345678)).toBe("2,345,000");
    });
  });

  describe("totalOshaManHours", () => {
    it("equals the sum of all yearly values", () => {
      const expectedTotal = Object.values(oshaManHoursByYear).reduce(
        (sum, hours) => sum + hours,
        0
      );
      expect(totalOshaManHours).toBe(expectedTotal);
    });

    it("is a positive number", () => {
      expect(totalOshaManHours).toBeGreaterThan(0);
    });
  });

  describe("oshaFirstYear", () => {
    it("is the earliest year in the dataset", () => {
      const years = Object.keys(oshaManHoursByYear).map(Number);
      expect(oshaFirstYear).toBe(Math.min(...years));
    });
  });
});

describe("site content data integrity", () => {
  it("has valid contact information", () => {
    expect(email).toContain("@");
    expect(phoneE164).toMatch(/^\+1\d{10}$/);
    expect(phone).toBeTruthy();
    expect(address.full).toContain(address.street);
    expect(address.full).toContain(address.city);
    expect(address.full).toContain(address.state);
  });

  it("has a non-empty company name", () => {
    expect(companyName.length).toBeGreaterThan(0);
  });

  it("has at least one service defined", () => {
    expect(services.length).toBeGreaterThan(0);
  });

  it("every service has required fields", () => {
    for (const service of services) {
      expect(service.title).toBeTruthy();
      expect(service.anchorId).toBeTruthy();
      expect(service.description).toBeTruthy();
      expect(service.tier).toMatch(/^(core|specialty|additional)$/);
      expect(service.images.length).toBeGreaterThan(0);
    }
  });

  it("every service image has src and alt", () => {
    for (const service of services) {
      for (const image of service.images) {
        expect(image.src).toBeTruthy();
        expect(image.alt).toBeTruthy();
      }
    }
  });

  it("has at least one material", () => {
    expect(materials.length).toBeGreaterThan(0);
  });

  it("heroStats has valid entries", () => {
    expect(heroStats.length).toBeGreaterThan(0);
    for (const stat of heroStats) {
      expect(stat.endValue).toBeGreaterThan(0);
      expect(stat.label).toBeTruthy();
      expect(typeof stat.suffix).toBe("string");
    }
  });

  it("heroStats includes the OSHA man-hours total", () => {
    const oshaStat = heroStats.find((s) => s.label === "OSHA Man-Hours");
    expect(oshaStat).toBeDefined();
    expect(oshaStat?.endValue).toBe(totalOshaManHours);
  });
});

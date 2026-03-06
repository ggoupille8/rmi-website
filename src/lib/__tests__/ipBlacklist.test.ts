import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSql } = vi.hoisted(() => ({
  mockSql: vi.fn(),
}));

vi.mock("@vercel/postgres", () => ({
  sql: mockSql,
}));

import { checkAndEnforceBlacklist } from "../ipBlacklist";

describe("checkAndEnforceBlacklist", () => {
  beforeEach(() => {
    mockSql.mockReset();
    // Default: resolve with empty rows so unhandled calls don't throw
    mockSql.mockResolvedValue({ rows: [] });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // --- Early exit ---

  it("returns not blocked for empty IP string", async () => {
    const result = await checkAndEnforceBlacklist("", 0);
    expect(result.blocked).toBe(false);
    expect(mockSql).not.toHaveBeenCalled();
  });

  // --- Already blacklisted ---

  it("returns blocked when IP is in active blacklist", async () => {
    mockSql
      .mockResolvedValueOnce({
        rows: [{ id: 1, reason: "Manual block" }],
      })
      .mockResolvedValue({ rows: [] }); // fire-and-forget UPDATE

    const result = await checkAndEnforceBlacklist("1.2.3.4", 0);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("Manual block");
  });

  it("increments attempt counter when IP is already blocked", async () => {
    mockSql
      .mockResolvedValueOnce({
        rows: [{ id: 1, reason: "Auto-banned: spam" }],
      })
      .mockResolvedValue({ rows: [] });

    await checkAndEnforceBlacklist("1.2.3.4", 0);

    // Second call should be the fire-and-forget UPDATE
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  // --- Rate limit auto-ban ---

  it("auto-bans IP exceeding 10 submissions in 24h", async () => {
    mockSql
      .mockResolvedValueOnce({ rows: [] }) // not already blocked
      .mockResolvedValueOnce({ rows: [{ cnt: "15" }] }) // count > 10
      .mockResolvedValue({}); // INSERT

    const result = await checkAndEnforceBlacklist("5.6.7.8", 50);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("Rate limit exceeded");
  });

  it("does NOT auto-ban at exactly 10 submissions (boundary: >10 required)", async () => {
    mockSql
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: "10" }] });

    const result = await checkAndEnforceBlacklist("5.6.7.8", 20);
    expect(result.blocked).toBe(false);
  });

  it("auto-bans at 11 submissions (boundary)", async () => {
    mockSql
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: "11" }] })
      .mockResolvedValue({});

    const result = await checkAndEnforceBlacklist("5.6.7.8", 20);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("Rate limit exceeded");
  });

  // --- Bot score auto-ban ---

  it("auto-bans IP with bot score >= 80", async () => {
    mockSql
      .mockResolvedValueOnce({ rows: [] }) // not blacklisted
      .mockResolvedValueOnce({ rows: [{ cnt: "2" }] }) // low count
      .mockResolvedValue({}); // INSERT

    const result = await checkAndEnforceBlacklist("9.10.11.12", 85);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("Suspicious activity detected");
  });

  it("auto-bans at exactly bot score 80 (boundary: >=80)", async () => {
    mockSql
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: "1" }] })
      .mockResolvedValue({});

    const result = await checkAndEnforceBlacklist("9.10.11.12", 80);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("Suspicious activity detected");
  });

  it("does NOT auto-ban at bot score 79 (boundary)", async () => {
    mockSql
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: "1" }] });

    const result = await checkAndEnforceBlacklist("9.10.11.12", 79);
    expect(result.blocked).toBe(false);
  });

  // --- Clean IP ---

  it("allows IP with low count and low bot score", async () => {
    mockSql
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: "3" }] });

    const result = await checkAndEnforceBlacklist("192.168.1.1", 20);
    expect(result.blocked).toBe(false);
    expect(result.reason).toBeUndefined();
  });

  // --- Priority / ordering ---

  it("prioritizes rate limit over bot score when both trigger", async () => {
    // Both: count > 10 AND bot score >= 80
    // Rate limit is checked first → should get rate limit reason
    mockSql
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: "20" }] })
      .mockResolvedValue({});

    const result = await checkAndEnforceBlacklist("10.0.0.1", 90);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("Rate limit exceeded");
  });

  // --- Error handling ---

  it("fails open on database error (allows the request)", async () => {
    mockSql.mockRejectedValueOnce(new Error("Connection refused"));

    const result = await checkAndEnforceBlacklist("1.2.3.4", 50);
    expect(result.blocked).toBe(false);
  });

  it("logs error on database failure", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockSql.mockRejectedValueOnce(new Error("timeout"));

    await checkAndEnforceBlacklist("1.2.3.4", 0);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Blacklist check failed:",
      "timeout"
    );
  });

  // --- Edge cases ---

  it("handles missing count field gracefully", async () => {
    mockSql
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{}] }); // no cnt field → defaults to "0"

    const result = await checkAndEnforceBlacklist("1.1.1.1", 10);
    expect(result.blocked).toBe(false);
  });

  it("handles zero-count response", async () => {
    mockSql
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: "0" }] });

    const result = await checkAndEnforceBlacklist("2.2.2.2", 0);
    expect(result.blocked).toBe(false);
  });
});

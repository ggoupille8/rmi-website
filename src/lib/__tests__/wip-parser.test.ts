import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseWipExcel, parseWipWorkbook, parseTabDate } from "../wip-parser";

// ─────────────────────────────────────────────
// Helper: Build a mock WIP Excel workbook buffer
// ─────────────────────────────────────────────

interface MockJobRow {
  jobNumber: string;
  description: string;
  pm: string;
  contractAmount: number;
  changeOrders: number | null;
  pendingCO: number | null;
  revisedContract: number;
  originalEstimate: number;
  estimateChanges: number | null;
  pendingCOEst: number | null;
  revisedEstimate: number;
  grossProfit: number;
  grossMarginPct: number | string | null;
  pctComplete: number;
  earnedRevenue: number;
  costsToDate: number;
  grossProfitToDate: number;
  backlogRevenue: number;
  costsToComplete: number;
  backlogProfit: number;
  billingsToDate: number;
  revBillExcess: number;
  invoicingRemaining: number;
  revenueExcess: number;
  billingsExcess: number;
  hidden?: boolean;
}

function buildMockWorkbook(
  tabName: string,
  jobs: MockJobRow[],
  options?: {
    includeBlankRow?: boolean;
    totalsRow?: Partial<MockJobRow>;
  }
): Buffer {
  const wb = XLSX.utils.book_new();

  // Build rows: headers in rows 1-5, data from row 6
  const rows: (string | number | null)[][] = [];

  // Rows 1-2: file header (not used by parser)
  rows.push(["RMI WIP Report"]);
  rows.push([]);

  // Rows 3-5: column headers (split across 3 rows, not parsed by code)
  rows.push(["Job", "Description", "PM", "Contract", "Change", "Pending CO", "Revised", "Original", "Changes to", "Pending CO", "Revised", "Gross", "Gross", "%", "Earned", "Job Costs", "Gross Profit", "Backlog of", "Costs to", "Profit in", "Job to Date", "Revenue or", "Total Invoicing", null, "Revenue in", "Billings in"]);
  rows.push(["Number", "", "", "Amount", "Orders", "", "Contract", "Estimate", "Estimate", "Estimates", "Estimate", "Profit", "Margin %", "Complete", "Revenue", "to Date", "to Date", "Revenues", "Complete", "Backlog", "Billings", "(Billings)", "Remaining", null, "Excess", "Excess"]);
  rows.push([]);

  // Data rows (starting at row 6 = index 5)
  const hiddenRows: number[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];

    // Insert blank row before this job if requested and it's the middle
    if (options?.includeBlankRow && i === Math.floor(jobs.length / 2)) {
      rows.push([null, null]);
    }

    const rowData: (string | number | null)[] = [
      job.jobNumber,
      job.description,
      job.pm,
      job.contractAmount,
      job.changeOrders,
      job.pendingCO,
      job.revisedContract,
      job.originalEstimate,
      job.estimateChanges,
      job.pendingCOEst,
      job.revisedEstimate,
      job.grossProfit,
      job.grossMarginPct as number | null,
      job.pctComplete,
      job.earnedRevenue,
      job.costsToDate,
      job.grossProfitToDate,
      job.backlogRevenue,
      job.costsToComplete,
      job.backlogProfit,
      job.billingsToDate,
      job.revBillExcess,
      job.invoicingRemaining,
      null, // Column X — unused
      job.revenueExcess,
      job.billingsExcess,
    ];
    rows.push(rowData);

    if (job.hidden) {
      hiddenRows.push(rows.length - 1); // 0-based
    }
  }

  // Totals row
  const totals = options?.totalsRow;
  rows.push([
    null,
    "Totals",
    null,
    totals?.contractAmount ?? 500000,
    totals?.changeOrders ?? 10000,
    totals?.pendingCO ?? 0,
    totals?.revisedContract ?? 510000,
    totals?.originalEstimate ?? 400000,
    totals?.estimateChanges ?? 5000,
    null,
    totals?.revisedEstimate ?? 405000,
    totals?.grossProfit ?? 105000,
    null,
    null,
    totals?.earnedRevenue ?? 300000,
    totals?.costsToDate ?? 240000,
    totals?.grossProfitToDate ?? 60000,
    totals?.backlogRevenue ?? 210000,
    totals?.costsToComplete ?? 165000,
    totals?.backlogProfit ?? 45000,
    totals?.billingsToDate ?? 280000,
    totals?.revBillExcess ?? 20000,
    totals?.invoicingRemaining ?? 230000,
    null,
    totals?.revenueExcess ?? 15000,
    totals?.billingsExcess ?? -5000,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set hidden rows
  if (hiddenRows.length > 0) {
    ws["!rows"] = [];
    for (const idx of hiddenRows) {
      ws["!rows"][idx] = { hidden: true };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, tabName);

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe("parseTabDate", () => {
  it("parses valid tab names", () => {
    const result = parseTabDate("1-31-2026");
    expect(result).not.toBeNull();
    expect(result!.year).toBe(2026);
    expect(result!.month).toBe(1);
    expect(result!.date.getFullYear()).toBe(2026);
    expect(result!.date.getMonth()).toBe(0); // JS months are 0-based
  });

  it("parses double-digit months", () => {
    const result = parseTabDate("12-31-2025");
    expect(result).not.toBeNull();
    expect(result!.year).toBe(2025);
    expect(result!.month).toBe(12);
  });

  it("returns null for non-date tab names", () => {
    expect(parseTabDate("Summary")).toBeNull();
    expect(parseTabDate("Sheet1")).toBeNull();
    expect(parseTabDate("")).toBeNull();
  });

  it("returns null for invalid dates", () => {
    expect(parseTabDate("13-31-2026")).toBeNull(); // month > 12
    expect(parseTabDate("0-15-2026")).toBeNull();  // month < 1
  });
});

describe("parseWipExcel", () => {
  const sampleJobs: MockJobRow[] = [
    {
      jobNumber: "25-0101",
      description: "Ford Dearborn Insulation",
      pm: "GG",
      contractAmount: 150000,
      changeOrders: 5000,
      pendingCO: null,
      revisedContract: 155000,
      originalEstimate: 120000,
      estimateChanges: 2000,
      pendingCOEst: null,
      revisedEstimate: 122000,
      grossProfit: 33000,
      grossMarginPct: 0.213,
      pctComplete: 0.75,
      earnedRevenue: 116250,
      costsToDate: 91500,
      grossProfitToDate: 24750,
      backlogRevenue: 38750,
      costsToComplete: 30500,
      backlogProfit: 8250,
      billingsToDate: 110000,
      revBillExcess: 6250,
      invoicingRemaining: 45000,
      revenueExcess: 6250,
      billingsExcess: 0,
    },
    {
      jobNumber: "26-0201 ", // trailing space — should be trimmed
      description: "GM Warren Paint Booth",
      pm: "RG",
      contractAmount: 350000,
      changeOrders: 5000,
      pendingCO: 0,
      revisedContract: 355000,
      originalEstimate: 280000,
      estimateChanges: 3000,
      pendingCOEst: 0,
      revisedEstimate: 283000,
      grossProfit: 72000,
      grossMarginPct: 0.203,
      pctComplete: 0.25,
      earnedRevenue: 88750,
      costsToDate: 70750,
      grossProfitToDate: 18000,
      backlogRevenue: 266250,
      costsToComplete: 212250,
      backlogProfit: 54000,
      billingsToDate: 80000,
      revBillExcess: 8750,
      invoicingRemaining: 275000,
      revenueExcess: 8750,
      billingsExcess: 0,
    },
    {
      jobNumber: "24-0050",
      description: "Closed Job Example",
      pm: "MD",
      contractAmount: 0,
      changeOrders: 0,
      pendingCO: null,
      revisedContract: 0,
      originalEstimate: 0,
      estimateChanges: null,
      pendingCOEst: null,
      revisedEstimate: 0,
      grossProfit: 0,
      grossMarginPct: "#DIV/0!", // Division by zero — must be null
      pctComplete: 1.0,
      earnedRevenue: 0,
      costsToDate: 0,
      grossProfitToDate: 0,
      backlogRevenue: 0,
      costsToComplete: 0,
      backlogProfit: 0,
      billingsToDate: 0,
      revBillExcess: 0,
      invoicingRemaining: 0,
      revenueExcess: 0,
      billingsExcess: 0,
      hidden: true, // Closed job — hidden in Excel
    },
  ];

  it("parses job data from Excel buffer", () => {
    const buffer = buildMockWorkbook("1-31-2026", sampleJobs);
    const result = parseWipExcel(buffer, "WIP-2026.xlsx");

    expect(result.errors).toHaveLength(0);
    expect(result.snapshots).toHaveLength(3);
    expect(result.fileName).toBe("WIP-2026.xlsx");
  });

  it("extracts correct field values", () => {
    const buffer = buildMockWorkbook("1-31-2026", sampleJobs);
    const result = parseWipExcel(buffer, "test.xlsx");

    const first = result.snapshots[0];
    expect(first.jobNumber).toBe("25-0101");
    expect(first.description).toBe("Ford Dearborn Insulation");
    expect(first.projectManager).toBe("GG");
    expect(first.contractAmount).toBe(150000);
    expect(first.changeOrders).toBe(5000);
    expect(first.grossMarginPct).toBeCloseTo(0.213);
    expect(first.pctComplete).toBe(0.75);
    expect(first.snapshotYear).toBe(2026);
    expect(first.snapshotMonth).toBe(1);
    expect(first.sourceTab).toBe("1-31-2026");
  });

  it("trims trailing spaces from job numbers", () => {
    const buffer = buildMockWorkbook("1-31-2026", sampleJobs);
    const result = parseWipExcel(buffer, "test.xlsx");

    const second = result.snapshots[1];
    expect(second.jobNumber).toBe("26-0201"); // trimmed
  });

  it("converts #DIV/0! to null", () => {
    const buffer = buildMockWorkbook("1-31-2026", sampleJobs);
    const result = parseWipExcel(buffer, "test.xlsx");

    const third = result.snapshots[2];
    expect(third.grossMarginPct).toBeNull();
  });

  it("detects hidden rows", () => {
    // Build workbook in-memory (XLSX.write doesn't preserve !rows hidden metadata)
    const wb = XLSX.utils.book_new();
    const dataRows: (string | number | null)[][] = [
      ["RMI WIP Report"],
      [],
      ["Job"],
      ["Number"],
      [],
      ["25-0101", "Visible Job 1", "GG", 100000],
      ["25-0102", "Visible Job 2", "RG", 200000],
      ["24-0050", "Hidden Closed Job", "MD", 0],
      [null, "Totals", null, 300000],
    ];
    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    // Mark row index 7 (24-0050) as hidden directly on worksheet
    ws["!rows"] = [];
    ws["!rows"][7] = { hidden: true };
    XLSX.utils.book_append_sheet(wb, ws, "1-31-2026");

    const result = parseWipWorkbook(wb, "test.xlsx");

    expect(result.snapshots).toHaveLength(3);
    expect(result.snapshots[0].isHiddenInSource).toBe(false);
    expect(result.snapshots[1].isHiddenInSource).toBe(false);
    expect(result.snapshots[2].isHiddenInSource).toBe(true);
  });

  it("extracts totals row", () => {
    const buffer = buildMockWorkbook("1-31-2026", sampleJobs);
    const result = parseWipExcel(buffer, "test.xlsx");

    expect(result.totals).toHaveLength(1);
    const total = result.totals[0];
    expect(total.snapshotYear).toBe(2026);
    expect(total.snapshotMonth).toBe(1);
    expect(total.contractAmount).toBe(500000);
    expect(total.jobCount).toBe(3);
  });

  it("skips blank rows between data", () => {
    const buffer = buildMockWorkbook("1-31-2026", sampleJobs, {
      includeBlankRow: true,
    });
    const result = parseWipExcel(buffer, "test.xlsx");

    // Should still have exactly 3 snapshots despite the blank row
    expect(result.snapshots).toHaveLength(3);
  });

  it("skips non-date tabs", () => {
    const wb = XLSX.utils.book_new();

    // Add a summary tab (should be skipped)
    const summaryWs = XLSX.utils.aoa_to_sheet([["Summary Data"]]);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // Add a valid date tab with one job
    const dataRows: (string | number | null)[][] = [
      ["RMI WIP Report"],
      [],
      ["Job", "Description", "PM"],
      ["Number", "", ""],
      [],
      ["26-0001", "Test Job", "GG", 100000, 0, 0, 100000, 80000, 0, 0, 80000, 20000, 0.2, 0.5, 50000, 40000, 10000, 50000, 40000, 10000, 48000, 2000, 52000, null, 2000, 0],
      [null, "Totals", null, 100000],
    ];
    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, ws, "2-28-2026");

    const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    const result = parseWipExcel(buffer, "test.xlsx");

    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0].snapshotMonth).toBe(2);
  });

  it("handles multiple tabs (months)", () => {
    const wb = XLSX.utils.book_new();

    for (const tabInfo of [
      { name: "1-31-2026", month: 1 },
      { name: "2-28-2026", month: 2 },
    ]) {
      const dataRows: (string | number | null)[][] = [
        ["RMI WIP Report"],
        [],
        ["Job"],
        ["Number"],
        [],
        ["26-0001", "Test Job", "GG", 100000, 0, 0, 100000, 80000, 0, 0, 80000, 20000, 0.2, 0.5, 50000, 40000, 10000, 50000, 40000, 10000, 48000, 2000, 52000, null, 2000, 0],
        [null, "Totals", null, 100000],
      ];
      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      XLSX.utils.book_append_sheet(wb, ws, tabInfo.name);
    }

    const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    const result = parseWipExcel(buffer, "WIP-2026.xlsx");

    expect(result.snapshots).toHaveLength(2);
    expect(result.totals).toHaveLength(2);
    expect(result.snapshots[0].snapshotMonth).toBe(1);
    expect(result.snapshots[1].snapshotMonth).toBe(2);
  });

  it("handles null/undefined cells gracefully", () => {
    const wb = XLSX.utils.book_new();
    const dataRows: (string | number | null)[][] = [
      ["RMI WIP Report"],
      [],
      ["Job"],
      ["Number"],
      [],
      ["26-0099", "Sparse Job", "SB", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      [null, "Totals", null, 0],
    ];
    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, ws, "3-31-2026");

    const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    const result = parseWipExcel(buffer, "test.xlsx");

    expect(result.snapshots).toHaveLength(1);
    const snap = result.snapshots[0];
    expect(snap.jobNumber).toBe("26-0099");
    expect(snap.contractAmount).toBeNull();
    expect(snap.grossMarginPct).toBeNull();
    expect(snap.pctComplete).toBeNull();
  });

  it("stores pct_complete > 1.0 as-is", () => {
    const wb = XLSX.utils.book_new();
    const dataRows: (string | number | null)[][] = [
      ["RMI WIP Report"],
      [],
      ["Job"],
      ["Number"],
      [],
      ["25-0050", "Over-complete Job", "GG", 100000, 0, 0, 100000, 80000, 0, 0, 80000, 20000, 0.2, 1.15, 115000, 92000, 23000, -15000, -12000, -3000, 110000, 5000, -10000, null, 5000, 0],
      [null, "Totals", null, 100000],
    ];
    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, ws, "1-31-2026");

    const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    const result = parseWipExcel(buffer, "test.xlsx");

    expect(result.snapshots[0].pctComplete).toBe(1.15);
  });
});

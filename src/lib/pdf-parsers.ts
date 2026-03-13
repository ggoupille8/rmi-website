/**
 * Borrowing Base Certificate parser.
 *
 * These PDFs are scanned images (no extractable text), so we use Claude Vision
 * via the Anthropic SDK to extract the structured financial data.
 *
 * Each BBC has a consistent structure:
 *   1. Gross Accounts Receivable as of (date)
 *   2. Less: Accounts over 90 days from invoice
 *   3. Eligible Accounts Receivable
 *   4. Times Advance rate (80%)
 *   5. Accounts Receivable Availability
 *   6. Gross Inventory as of (date)
 *   7. Times Advance rate (50%)
 *   8. Inventory Availability
 *   9. Total Borrowing Base
 *  10. Amount Borrowed as of (date)
 *  11. Excess (Deficit) Availability
 */

import Anthropic from "@anthropic-ai/sdk";

export interface BorrowingBaseResult {
  reportDate: string;          // YYYY-MM-DD (end of month from the "as of" date)
  grossAr: number;
  arOver90: number;        // "Less: Accounts over 90 days"
  eligibleAr: number;
  arAdvanceRate: number;       // decimal, e.g. 0.80
  arAvailability: number;
  grossInventory: number;
  inventoryAdvanceRate: number; // decimal, e.g. 0.50
  inventoryAvailability: number;
  totalBorrowingBase: number;
  amountBorrowed: number;
  excessAvailability: number;
  validation: {
    eligibleArCheck: boolean;   // gross - ineligible ≈ eligible
    arAvailCheck: boolean;      // eligible × rate ≈ availability
    invAvailCheck: boolean;     // inventory × rate ≈ availability
    baseCheck: boolean;         // ar_avail + inv_avail ≈ total base
    excessCheck: boolean;       // total base - borrowed ≈ excess
  };
}

interface ClaudeExtractionResponse {
  report_date: string;
  gross_ar: number;
  ineligible_ar: number;
  eligible_ar: number;
  ar_advance_rate: number;
  ar_availability: number;
  gross_inventory: number;
  inventory_advance_rate: number;
  inventory_availability: number;
  total_borrowing_base: number;
  amount_borrowed: number;
  excess_availability: number;
}

const EXTRACTION_PROMPT = `Extract all financial values from this Borrowing Base Certificate. Return a JSON object with exactly these fields:

{
  "report_date": "YYYY-MM-DD (the date shown after 'Gross Accounts Receivable as of', formatted as end-of-month)",
  "gross_ar": <number - "1. Gross Accounts Receivable as of" amount>,
  "ineligible_ar": <number - "Less: Accounts over 90 days from invoice" amount>,
  "eligible_ar": <number - "Eligible Accounts Receivable" amount>,
  "ar_advance_rate": <number - decimal like 0.80 for 80%>,
  "ar_availability": <number - "Accounts Receivable Availability" amount>,
  "gross_inventory": <number - "2. Gross inventory as of" amount>,
  "inventory_advance_rate": <number - decimal like 0.50 for 50%>,
  "inventory_availability": <number - "Inventory Availability" amount>,
  "total_borrowing_base": <number - "Total Borrowing Base" amount>,
  "amount_borrowed": <number - "Amount Borrowed as of" amount>,
  "excess_availability": <number - "Excess (Deficit) Availability" amount>
}

Rules:
- All monetary amounts are positive numbers (no $ signs, no commas)
- Advance rates as decimals (80% = 0.80, 50% = 0.50)
- Date format YYYY-MM-DD using the last day of the month shown
- Return ONLY the JSON object, no markdown, no explanation`;

function closeTo(a: number, b: number, threshold = 1.0): boolean {
  return Math.abs(a - b) <= threshold;
}

export async function parseBorrowingBase(
  pdfBuffer: Buffer,
  apiKey?: string
): Promise<BorrowingBaseResult> {
  const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is required for BBC parsing (scanned image PDFs)");
  }

  const client = new Anthropic({ apiKey: key });
  const base64Pdf = pdfBuffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Pdf,
            },
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude Vision API");
  }

  let raw: string = textBlock.text.trim();
  // Strip markdown code fences if present
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  let parsed: ClaudeExtractionResponse;
  try {
    parsed = JSON.parse(raw) as ClaudeExtractionResponse;
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${raw.slice(0, 200)}`);
  }

  // Validate the extracted data
  const validation = {
    eligibleArCheck: closeTo(parsed.gross_ar - parsed.ineligible_ar, parsed.eligible_ar),
    arAvailCheck: closeTo(parsed.eligible_ar * parsed.ar_advance_rate, parsed.ar_availability),
    invAvailCheck: closeTo(parsed.gross_inventory * parsed.inventory_advance_rate, parsed.inventory_availability),
    baseCheck: closeTo(parsed.ar_availability + parsed.inventory_availability, parsed.total_borrowing_base),
    excessCheck: closeTo(parsed.total_borrowing_base - parsed.amount_borrowed, parsed.excess_availability),
  };

  return {
    reportDate: parsed.report_date,
    grossAr: parsed.gross_ar,
    arOver90: parsed.ineligible_ar,
    eligibleAr: parsed.eligible_ar,
    arAdvanceRate: parsed.ar_advance_rate,
    arAvailability: parsed.ar_availability,
    grossInventory: parsed.gross_inventory,
    inventoryAdvanceRate: parsed.inventory_advance_rate,
    inventoryAvailability: parsed.inventory_availability,
    totalBorrowingBase: parsed.total_borrowing_base,
    amountBorrowed: parsed.amount_borrowed,
    excessAvailability: parsed.excess_availability,
    validation,
  };
}

/** Detect if a filename is a Borrowing Base Certificate */
export function isBorrowingBaseCert(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.includes("borrowing base");
}

/** Alias for isBorrowingBaseCert */
export const isBorrowingBase = isBorrowingBaseCert;

/** Extract month/year from BBC filename for sorting/deduplication */
export function parseBbcFilenameDate(filename: string): string | null {
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    january: "01", february: "02", march: "03", april: "04",
    june: "06", july: "07", august: "08", september: "09",
    october: "10", november: "11", december: "12",
  };

  // Match patterns like "Jan 24", "Apr 2023", "Dec 25"
  const match = filename.match(/(\w+)\s+(\d{2,4})/i);
  if (!match) return null;

  const monthStr = match[1].toLowerCase();
  const mm = months[monthStr];
  if (!mm) return null;

  let yearStr = match[2];
  if (yearStr.length === 2) {
    yearStr = parseInt(yearStr, 10) >= 50 ? `19${yearStr}` : `20${yearStr}`;
  }

  return `${yearStr}-${mm}`;
}

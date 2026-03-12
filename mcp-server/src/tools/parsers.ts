import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';
import pdfParse from 'pdf-parse';
import { config, resolveSandboxedPath } from '../config.js';

// ---------------------------------------------------------------------------
// read_excel
// ---------------------------------------------------------------------------

export interface ExcelResult {
  fileName: string;
  sheets: string[];
  activeSheet: string;
  headers: string[];
  data: unknown[][];
  totalRows: number;
  truncated: boolean;
  hiddenRows: number[];
}

export async function readExcel(params: {
  path: string;
  sheet?: string;
  range?: string;
  headersRow?: number;
}): Promise<ExcelResult> {
  const absPath = resolveSandboxedPath(params.path);
  const ext = path.extname(absPath).toLowerCase();
  if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
    throw new Error(`Not a spreadsheet file: ${ext}`);
  }

  const stat = await fs.stat(absPath);
  if (stat.size > config.maxFileSize) {
    throw new Error(
      `File is ${(stat.size / 1024 / 1024).toFixed(1)} MB — exceeds the ${config.maxFileSize / 1024 / 1024} MB limit`,
    );
  }

  const buf = await fs.readFile(absPath);
  const workbook = XLSX.read(buf, { type: 'buffer', cellStyles: true });

  const sheetNames = workbook.SheetNames;
  const targetSheet = params.sheet || sheetNames[0];

  if (!sheetNames.includes(targetSheet)) {
    throw new Error(
      `Sheet "${targetSheet}" not found. Available sheets: ${sheetNames.join(', ')}`,
    );
  }

  const worksheet = workbook.Sheets[targetSheet];

  // Detect hidden rows
  const hiddenRows: number[] = [];
  if (worksheet['!rows']) {
    worksheet['!rows'].forEach((row, idx) => {
      if (row?.hidden) hiddenRows.push(idx + 1);
    });
  }

  // Parse range or use full sheet
  const rangeOpt = params.range ? { range: params.range } : undefined;
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    ...rangeOpt,
    defval: '',
  }) as unknown[][];

  // Extract headers from the specified row (default: first row)
  const headersRowIdx = (params.headersRow ?? 1) - 1;
  const headers = headersRowIdx < rawData.length
    ? (rawData[headersRowIdx] as unknown[]).map((h) => String(h ?? ''))
    : [];

  // Determine truncation
  const totalRows = rawData.length;
  const truncated = totalRows > config.maxExcelRows;
  const data = truncated ? rawData.slice(0, config.maxExcelRows) : rawData;

  return {
    fileName: path.basename(absPath),
    sheets: sheetNames,
    activeSheet: targetSheet,
    headers,
    data,
    totalRows,
    truncated,
    hiddenRows,
  };
}

// ---------------------------------------------------------------------------
// read_pdf_text
// ---------------------------------------------------------------------------

export interface PdfResult {
  fileName: string;
  pageCount: number;
  text: string;
  pages: Array<{ pageNumber: number; text: string }>;
}

export async function readPdfText(params: {
  path: string;
  pages?: number[];
}): Promise<PdfResult> {
  const absPath = resolveSandboxedPath(params.path);
  const ext = path.extname(absPath).toLowerCase();
  if (ext !== '.pdf') {
    throw new Error(`Not a PDF file: ${ext}`);
  }

  const stat = await fs.stat(absPath);
  if (stat.size > config.maxFileSize) {
    throw new Error(
      `File is ${(stat.size / 1024 / 1024).toFixed(1)} MB — exceeds the ${config.maxFileSize / 1024 / 1024} MB limit`,
    );
  }

  const buf = await fs.readFile(absPath);

  // pdf-parse returns all text; we split by page using the render callback
  const pageTexts: string[] = [];

  // Custom page renderer to capture per-page text
  function renderPage(pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }): Promise<string> {
    return pageData.getTextContent().then((textContent) => {
      const text = textContent.items.map((item) => item.str).join(' ');
      pageTexts.push(text);
      return text;
    });
  }

  const parsed = await pdfParse(buf, { pagerender: renderPage });

  // Build per-page result
  let pages = pageTexts.map((text, idx) => ({
    pageNumber: idx + 1,
    text: text.trim(),
  }));

  // Filter to requested pages
  if (params.pages && params.pages.length > 0) {
    const requested = new Set(params.pages);
    pages = pages.filter((p) => requested.has(p.pageNumber));
  }

  return {
    fileName: path.basename(absPath),
    pageCount: parsed.numpages,
    text: params.pages ? pages.map((p) => p.text).join('\n\n') : parsed.text,
    pages,
  };
}

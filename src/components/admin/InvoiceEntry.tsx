import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Plus,
  Save,
  X,
  Loader2,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────

interface JobResult {
  id: number;
  job_number: string;
  description: string | null;
  customer_name_raw: string | null;
  tax_status: string;
  tax_exemption_type: string | null;
}

interface MaterialResult {
  id: number;
  description: string;
  unit: string | null;
  taxCategory: string;
  vendorPrice: number | null;
  vendorPriceDate: string | null;
  bookPrice: number | null;
}

interface LineItem {
  id: string;
  materialId: number | null;
  description: string;
  quantity: number;
  pricePerItem: number;
  totalCost: number;
  isSpecialPricing: boolean;
  taxOverride: boolean | null;
  notes: string;
  taxCategory: string;
  isTaxable: boolean;
  taxRate: number;
  taxAmount: number;
  taxReason: string;
  taxTier: string;
}

interface InvoiceRecord {
  id: number;
  invoice_number: string;
  vendor_code: string;
  vendor_name: string;
  job_number: string;
  invoice_date: string;
  subtotal: string;
  tax_amount: string;
  total: string;
  line_item_count: string;
}

interface InvoiceDetail {
  invoice: InvoiceRecord;
  lineItems: Array<{
    id: number;
    description: string;
    quantity: string;
    price_per_item: string;
    total_cost: string;
    is_taxable: boolean;
    tax_rate: string;
    tax_amount: string;
  }>;
}

interface Toast {
  message: string;
  type: "success" | "error";
  id: number;
}

// ── Constants ─────────────────────────────────────────────

const VENDORS = [
  { id: 1, code: "DI", name: "Distribution International" },
  { id: 2, code: "General", name: "General Insulation" },
  { id: 3, code: "ISI", name: "Insulation Solutions Inc" },
  { id: 4, code: "SPS", name: "SPS" },
  { id: 5, code: "Extol", name: "Extol" },
  { id: 6, code: "Hybroco", name: "Hybroco" },
  { id: 7, code: "K-Industrial", name: "K-Industrial" },
  { id: 8, code: "Norkan", name: "Norkan" },
] as const;

const TAX_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  taxable: { bg: "bg-red-500/15", text: "text-red-400", label: "Taxable" },
  exempt: { bg: "bg-green-500/15", text: "text-green-400", label: "Exempt" },
  mixed: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Mixed" },
  unknown: { bg: "bg-white/10", text: "text-slate-400", label: "Unknown" },
};

const TAX_BORDER: Record<string, string> = {
  taxable: "border-red-500/40",
  exempt: "border-green-500/40",
  mixed: "border-amber-500/40",
  unknown: "border-neutral-700",
};

function genId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPrice4(n: number): string {
  return n.toFixed(4);
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────

export default function InvoiceEntry() {
  // ── Header state ──
  const [invoiceDate, setInvoiceDate] = useState(todayString());
  const [vendorId, setVendorId] = useState(1);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [jobInfo, setJobInfo] = useState<JobResult | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobNotFound, setJobNotFound] = useState(false);
  const [jobResults, setJobResults] = useState<JobResult[]>([]);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [taxOverride, setTaxOverride] = useState<"taxable" | "exempt" | null>(null);

  // ── Line item state ──
  const [materialQuery, setMaterialQuery] = useState("");
  const [materialResults, setMaterialResults] = useState<MaterialResult[]>([]);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialResult | null>(null);
  const [quantity, setQuantity] = useState("");
  const [pricePerItem, setPricePerItem] = useState("");
  const [isSpecialPricing, setIsSpecialPricing] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [priceAlert, setPriceAlert] = useState<{
    pctDiff: number;
    totalDiff: number;
    lastPrice: number;
    lastDate: string | null;
  } | null>(null);

  // ── Accumulated line items ──
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // ── History state ──
  const [historyInvoices, setHistoryInvoices] = useState<InvoiceRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyVendorFilter, setHistoryVendorFilter] = useState("");
  const [historyJobFilter, setHistoryJobFilter] = useState("");
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<InvoiceDetail | null>(null);

  // ── UI state ──
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [materialHighlightIdx, setMaterialHighlightIdx] = useState(-1);
  const [jobHighlightIdx, setJobHighlightIdx] = useState(-1);

  // ── Refs ──
  const descriptionRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const jobInputRef = useRef<HTMLInputElement>(null);
  const jobDropdownRef = useRef<HTMLDivElement>(null);
  const materialDropdownRef = useRef<HTMLDivElement>(null);

  // ── Toast helper ──
  const addToast = useCallback((message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // ── Derived ──
  const vendorCode = VENDORS.find((v) => v.id === vendorId)?.code ?? "DI";

  const needsTaxOverride =
    jobInfo !== null &&
    (jobInfo.tax_status === "mixed" || jobInfo.tax_status === "unknown");

  const canAddLineItem =
    materialQuery.trim().length > 0 &&
    quantity !== "" &&
    Number(quantity) > 0 &&
    pricePerItem !== "" &&
    Number(pricePerItem) >= 0 &&
    !(needsTaxOverride && taxOverride === null);

  const subtotal = lineItems.reduce((sum, li) => sum + li.totalCost, 0);
  const taxTotal = lineItems.reduce((sum, li) => sum + li.taxAmount, 0);
  const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;

  // ── Job autocomplete ──
  useEffect(() => {
    if (jobNumber.length < 2) {
      setJobResults([]);
      setShowJobDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setJobLoading(true);
        const res = await fetch(
          `/api/admin/jobs-master?q=${encodeURIComponent(jobNumber)}&limit=8`
        );
        if (!res.ok) {
          setJobResults([]);
          return;
        }
        const data: { jobs: JobResult[] } = await res.json();
        setJobResults(data.jobs ?? []);
        setShowJobDropdown((data.jobs ?? []).length > 0);
        setJobHighlightIdx(-1);
      } catch {
        setJobResults([]);
      } finally {
        setJobLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [jobNumber]);

  // ── Material autocomplete ──
  useEffect(() => {
    if (materialQuery.length < 1 || selectedMaterial) {
      setMaterialResults([]);
      setShowMaterialDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/materials-search?q=${encodeURIComponent(materialQuery)}&vendor=${encodeURIComponent(vendorCode)}`
        );
        if (!res.ok) {
          setMaterialResults([]);
          return;
        }
        const data: { results: MaterialResult[] } = await res.json();
        setMaterialResults(data.results ?? []);
        setShowMaterialDropdown((data.results ?? []).length > 0);
        setMaterialHighlightIdx(-1);
      } catch {
        setMaterialResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [materialQuery, vendorCode, selectedMaterial]);

  // ── Load invoice history ──
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: String(historyPage) });
      if (historyVendorFilter) params.set("vendor", historyVendorFilter);
      if (historyJobFilter) params.set("job", historyJobFilter);

      const res = await fetch(`/api/admin/invoices?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setHistoryInvoices(data.invoices ?? []);
      setHistoryTotal(data.pagination?.total ?? 0);
      setHistoryTotalPages(data.pagination?.totalPages ?? 0);
    } catch {
      addToast("Failed to load invoice history", "error");
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyVendorFilter, historyJobFilter, addToast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        jobDropdownRef.current &&
        !jobDropdownRef.current.contains(e.target as Node) &&
        jobInputRef.current &&
        !jobInputRef.current.contains(e.target as Node)
      ) {
        setShowJobDropdown(false);
      }
      if (
        materialDropdownRef.current &&
        !materialDropdownRef.current.contains(e.target as Node) &&
        descriptionRef.current &&
        !descriptionRef.current.contains(e.target as Node)
      ) {
        setShowMaterialDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Handlers ──

  function selectJob(job: JobResult) {
    setJobNumber(job.job_number);
    setJobInfo(job);
    setJobNotFound(false);
    setShowJobDropdown(false);
    setJobResults([]);

    if (job.tax_status === "taxable") {
      setTaxOverride("taxable");
    } else if (job.tax_status === "exempt") {
      setTaxOverride("exempt");
    } else {
      setTaxOverride(null);
    }

    if (lineItems.length > 0) {
      addToast("Job changed \u2014 tax may need recalculation on existing line items", "error");
    }
  }

  function handleJobBlur() {
    setTimeout(() => {
      if (jobNumber.trim() && !jobInfo) {
        setJobNotFound(true);
        setTaxOverride(null);
      }
      setShowJobDropdown(false);
    }, 200);
  }

  function selectMaterial(mat: MaterialResult) {
    setSelectedMaterial(mat);
    setMaterialQuery(mat.description);
    setShowMaterialDropdown(false);
    setMaterialResults([]);

    if (mat.vendorPrice !== null) {
      setPricePerItem(formatPrice4(Number(mat.vendorPrice)));
    }

    setTimeout(() => quantityRef.current?.focus(), 50);
  }

  function clearMaterialSelection() {
    setSelectedMaterial(null);
    setMaterialQuery("");
    setPricePerItem("");
    setPriceAlert(null);
  }

  function checkPriceAlert(enteredPrice: string) {
    if (!selectedMaterial?.vendorPrice) {
      setPriceAlert(null);
      return;
    }

    const entered = Number(enteredPrice);
    const stored = Number(selectedMaterial.vendorPrice);
    if (stored === 0 || isNaN(entered) || entered === 0) {
      setPriceAlert(null);
      return;
    }

    const pctDiff = Math.abs((entered - stored) / stored) * 100;
    const qty = Number(quantity) || 1;
    const totalDiff = Math.abs(entered - stored) * qty;

    if (pctDiff > 10 || totalDiff > 50) {
      setPriceAlert({
        pctDiff: Math.round(pctDiff * 10) / 10,
        totalDiff: Math.round(totalDiff * 100) / 100,
        lastPrice: stored,
        lastDate: selectedMaterial.vendorPriceDate,
      });
    } else {
      setPriceAlert(null);
    }
  }

  function computeLineItemTax(): {
    isTaxable: boolean;
    taxRate: number;
    taxAmount: number;
    reason: string;
    tier: string;
  } {
    const materialTaxCategory = selectedMaterial?.taxCategory ?? "installed";
    const jobTaxStatus = jobInfo?.tax_status ?? (jobNotFound ? "unknown" : "taxable");
    const resolvedOverride = taxOverride;
    const qty = Number(quantity) || 0;
    const price = Number(pricePerItem) || 0;
    const totalCost = Math.round(qty * price * 100) / 100;

    // Tier 2: Consumable always taxable
    if (materialTaxCategory === "consumable") {
      const taxAmt = Math.round(totalCost * 0.06 * 100) / 100;
      return {
        isTaxable: true,
        taxRate: 0.06,
        taxAmount: taxAmt,
        reason: "PPE/tools always taxable per RAB 2019-15",
        tier: "line_item",
      };
    }

    // Tier 3: Invoice-level override
    if (resolvedOverride !== null) {
      const taxable = resolvedOverride === "taxable";
      const taxAmt = taxable ? Math.round(totalCost * 0.06 * 100) / 100 : 0;
      return {
        isTaxable: taxable,
        taxRate: taxable ? 0.06 : 0,
        taxAmount: taxAmt,
        reason: taxable ? "Invoice marked taxable" : "Invoice marked exempt",
        tier: "invoice",
      };
    }

    // Tier 4: Job default
    if (jobTaxStatus === "taxable") {
      const taxAmt = Math.round(totalCost * 0.06 * 100) / 100;
      return {
        isTaxable: true,
        taxRate: 0.06,
        taxAmount: taxAmt,
        reason: "Job default: taxable",
        tier: "job",
      };
    }
    if (jobTaxStatus === "exempt") {
      return {
        isTaxable: false,
        taxRate: 0,
        taxAmount: 0,
        reason: "Job default: exempt",
        tier: "job",
      };
    }

    // Mixed/unknown without override
    const taxAmt = Math.round(totalCost * 0.06 * 100) / 100;
    return {
      isTaxable: true,
      taxRate: 0.06,
      taxAmount: taxAmt,
      reason:
        jobTaxStatus === "mixed"
          ? "Mixed job without invoice override: defaulting to taxable"
          : "Unknown tax status: defaulting to taxable",
      tier: "job",
    };
  }

  function addLineItem() {
    if (!canAddLineItem) return;

    const errors: Record<string, string> = {};
    if (!materialQuery.trim()) errors.description = "Description is required";
    if (!quantity || Number(quantity) <= 0) errors.quantity = "Quantity must be > 0";
    if (pricePerItem === "" || Number(pricePerItem) < 0) errors.price = "Price is required";

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const qty = Number(quantity);
    const price = Number(pricePerItem);
    const totalCost = Math.round(qty * price * 100) / 100;
    const tax = computeLineItemTax();

    const item: LineItem = {
      id: genId(),
      materialId: selectedMaterial?.id ?? null,
      description: materialQuery.trim(),
      quantity: qty,
      pricePerItem: price,
      totalCost,
      isSpecialPricing,
      taxOverride: null,
      notes,
      taxCategory: selectedMaterial?.taxCategory ?? "installed",
      isTaxable: tax.isTaxable,
      taxRate: tax.taxRate,
      taxAmount: tax.taxAmount,
      taxReason: tax.reason,
      taxTier: tax.tier,
    };

    setLineItems((prev) => [...prev, item]);
    clearLineItemFields();
    setValidationErrors({});

    setTimeout(() => descriptionRef.current?.focus(), 50);
  }

  function clearLineItemFields() {
    setMaterialQuery("");
    setSelectedMaterial(null);
    setQuantity("");
    setPricePerItem("");
    setIsSpecialPricing(false);
    setNotes("");
    setShowNotes(false);
    setPriceAlert(null);
    setValidationErrors({});
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }

  async function saveInvoice() {
    const errors: Record<string, string> = {};
    if (!invoiceNumber.trim()) errors.invoiceNumber = "Invoice number is required";
    if (!jobNumber.trim()) errors.jobNumber = "Job number is required";
    if (!invoiceDate) errors.invoiceDate = "Date is required";

    const itemsToSave = [...lineItems];
    if (materialQuery.trim() && quantity && Number(quantity) > 0 && pricePerItem !== "") {
      const qty = Number(quantity);
      const price = Number(pricePerItem);
      const totalCost = Math.round(qty * price * 100) / 100;
      const tax = computeLineItemTax();

      itemsToSave.push({
        id: genId(),
        materialId: selectedMaterial?.id ?? null,
        description: materialQuery.trim(),
        quantity: qty,
        pricePerItem: price,
        totalCost,
        isSpecialPricing,
        taxOverride: null,
        notes,
        taxCategory: selectedMaterial?.taxCategory ?? "installed",
        isTaxable: tax.isTaxable,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        taxReason: tax.reason,
        taxTier: tax.tier,
      });
    }

    if (itemsToSave.length === 0) {
      errors.lineItems = "At least one line item is required";
    }

    if (needsTaxOverride && taxOverride === null) {
      errors.taxOverride = "Tax status must be selected for this job";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: invoiceNumber.trim(),
          vendorId,
          jobNumber: jobNumber.trim(),
          invoiceDate,
          taxOverride,
          lineItems: itemsToSave.map((li) => ({
            materialId: li.materialId,
            description: li.description,
            quantity: li.quantity,
            pricePerItem: li.pricePerItem,
            isSpecialPricing: li.isSpecialPricing,
            taxOverride: li.taxOverride,
            notes: li.notes || null,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save invoice");
      }

      addToast(
        `Invoice ${invoiceNumber} saved \u2014 ${itemsToSave.length} line item${itemsToSave.length !== 1 ? "s" : ""}`,
        "success"
      );

      setInvoiceNumber("");
      setJobNumber("");
      setJobInfo(null);
      setJobNotFound(false);
      setTaxOverride(null);
      setLineItems([]);
      clearLineItemFields();
      setValidationErrors({});
      setInvoiceDate(todayString());

      loadHistory();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to save invoice",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  function cancelInvoice() {
    if (lineItems.length > 0 || materialQuery.trim()) {
      if (!window.confirm("Discard unsaved line items?")) return;
    }
    setInvoiceNumber("");
    setJobNumber("");
    setJobInfo(null);
    setJobNotFound(false);
    setTaxOverride(null);
    setLineItems([]);
    clearLineItemFields();
    setValidationErrors({});
  }

  async function expandInvoiceDetail(invoiceId: number) {
    if (expandedInvoice === invoiceId) {
      setExpandedInvoice(null);
      setExpandedDetail(null);
      return;
    }

    setExpandedInvoice(invoiceId);
    try {
      const res = await fetch(`/api/admin/invoices?id=${invoiceId}`);
      if (!res.ok) throw new Error("Failed to load");
      const data: InvoiceDetail = await res.json();
      setExpandedDetail(data);
    } catch {
      addToast("Failed to load invoice details", "error");
      setExpandedInvoice(null);
    }
  }

  // ── Keyboard handlers ──

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      addLineItem();
    }
  }

  function handleJobKeyDown(e: React.KeyboardEvent) {
    if (!showJobDropdown || jobResults.length === 0) {
      if (e.key === "Enter") e.preventDefault();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setJobHighlightIdx((prev) => Math.min(prev + 1, jobResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setJobHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (jobHighlightIdx >= 0 && jobHighlightIdx < jobResults.length) {
        e.preventDefault();
        selectJob(jobResults[jobHighlightIdx]);
      }
    } else if (e.key === "Escape") {
      setShowJobDropdown(false);
    }
  }

  function handleMaterialKeyDown(e: React.KeyboardEvent) {
    if (!showMaterialDropdown || materialResults.length === 0) {
      if (e.key === "Enter") e.preventDefault();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMaterialHighlightIdx((prev) =>
        Math.min(prev + 1, materialResults.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMaterialHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (
        materialHighlightIdx >= 0 &&
        materialHighlightIdx < materialResults.length
      ) {
        e.preventDefault();
        selectMaterial(materialResults[materialHighlightIdx]);
      }
    } else if (e.key === "Escape") {
      setShowMaterialDropdown(false);
    }
  }

  const currentTax = computeLineItemTax();

  // ── Render ──

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              t.type === "success"
                ? "bg-green-600/90 text-white"
                : "bg-red-600/90 text-white"
            }`}
          >
            {t.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-col xl:flex-row gap-4">
        {/* LEFT: Invoice Entry Form */}
        <div className="xl:w-[60%] space-y-4">
          {/* Header section */}
          <div
            className={`bg-white/5 backdrop-blur rounded-xl border p-5 space-y-4 transition-colors ${
              jobInfo
                ? TAX_BORDER[jobInfo.tax_status] ?? "border-neutral-700"
                : "border-neutral-700"
            }`}
          >
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
              Invoice Header
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Invoice Date */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={`w-full bg-white/10 border rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    validationErrors.invoiceDate ? "border-red-500" : "border-neutral-700"
                  }`}
                />
                {validationErrors.invoiceDate && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.invoiceDate}</p>
                )}
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Vendor
                </label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(Number(e.target.value))}
                  className="w-full bg-white/10 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {VENDORS.map((v) => (
                    <option key={v.id} value={v.id} className="bg-neutral-900">
                      {v.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Invoice #
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    setValidationErrors((prev) => {
                      const { invoiceNumber: _removed, ...rest } = prev;
                      return rest;
                    });
                  }}
                  placeholder="e.g. INV-12345"
                  className={`w-full bg-white/10 border rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    validationErrors.invoiceNumber ? "border-red-500" : "border-neutral-700"
                  }`}
                />
                {validationErrors.invoiceNumber && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.invoiceNumber}</p>
                )}
              </div>

              {/* Job Number with autocomplete */}
              <div className="relative">
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Job #
                </label>
                <div className="relative">
                  <input
                    ref={jobInputRef}
                    type="text"
                    value={jobNumber}
                    onChange={(e) => {
                      setJobNumber(e.target.value);
                      setJobInfo(null);
                      setJobNotFound(false);
                      setValidationErrors((prev) => {
                        const { jobNumber: _removed, ...rest } = prev;
                        return rest;
                      });
                    }}
                    onBlur={handleJobBlur}
                    onKeyDown={handleJobKeyDown}
                    placeholder="6-digit job #"
                    className={`w-full bg-white/10 border rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      validationErrors.jobNumber ? "border-red-500" : "border-neutral-700"
                    }`}
                  />
                  {jobLoading && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 animate-spin" />
                  )}
                </div>
                {validationErrors.jobNumber && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.jobNumber}</p>
                )}

                {/* Job autocomplete dropdown */}
                {showJobDropdown && jobResults.length > 0 && (
                  <div
                    ref={jobDropdownRef}
                    className="absolute z-30 top-full mt-1 left-0 w-80 max-h-64 overflow-y-auto bg-neutral-900/95 backdrop-blur border border-neutral-700 rounded-lg shadow-xl"
                  >
                    {jobResults.map((job, idx) => {
                      const badge = TAX_BADGE[job.tax_status] ?? TAX_BADGE.unknown;
                      return (
                        <button
                          key={job.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${
                            idx === jobHighlightIdx ? "bg-white/10" : ""
                          }`}
                          onMouseDown={(e) => { e.preventDefault(); selectJob(job); }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-neutral-200">{job.job_number}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-500 truncate">
                            {job.description ?? "\u2014"} &middot; {job.customer_name_raw ?? "\u2014"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Job info display */}
            {jobInfo && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-800">
                <span className="text-xs text-neutral-500">
                  {jobInfo.description ?? "No description"} &middot; {jobInfo.customer_name_raw ?? "Unknown customer"}
                </span>
                {(() => {
                  const badge = TAX_BADGE[jobInfo.tax_status] ?? TAX_BADGE.unknown;
                  return (
                    <span className={`text-xs px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  );
                })()}
                {jobInfo.tax_exemption_type && (
                  <span className="text-xs text-neutral-500">
                    ({jobInfo.tax_exemption_type.replace(/_/g, " ")})
                  </span>
                )}
              </div>
            )}

            {jobNotFound && (
              <div className="flex items-center gap-2 text-amber-400 text-xs pt-2 border-t border-neutral-800">
                <AlertTriangle size={14} />
                Job not in system &mdash; tax status unknown, defaulting to taxable
              </div>
            )}

            {/* Tax Override Toggle */}
            {needsTaxOverride && (
              <div className="pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-amber-400">
                    {jobInfo?.tax_status === "mixed"
                      ? "Mixed job \u2014 select tax status for this invoice:"
                      : "Tax status unclassified \u2014 please select:"}
                  </span>
                  <div className="flex rounded-lg overflow-hidden border border-neutral-600">
                    <button
                      type="button"
                      onClick={() => setTaxOverride("taxable")}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        taxOverride === "taxable"
                          ? "bg-red-500/30 text-red-300"
                          : "bg-white/5 text-neutral-400 hover:bg-white/10"
                      }`}
                    >
                      Taxable
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxOverride("exempt")}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-neutral-600 ${
                        taxOverride === "exempt"
                          ? "bg-green-500/30 text-green-300"
                          : "bg-white/5 text-neutral-400 hover:bg-white/10"
                      }`}
                    >
                      Exempt
                    </button>
                  </div>
                </div>
                {validationErrors.taxOverride && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.taxOverride}</p>
                )}
              </div>
            )}

            {/* Override link for taxable/exempt jobs */}
            {jobInfo && !needsTaxOverride &&
              (jobInfo.tax_status === "taxable" || jobInfo.tax_status === "exempt") && (
                <div className="flex items-center gap-2 text-xs text-neutral-500 pt-2 border-t border-neutral-800">
                  Job is {jobInfo.tax_status}
                  {taxOverride !== null && taxOverride !== jobInfo.tax_status && (
                    <span className="text-amber-400">(overridden to {taxOverride})</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setTaxOverride(jobInfo.tax_status === "taxable" ? "exempt" : "taxable")}
                    className="text-primary-400 hover:text-primary-300 underline"
                  >
                    Override
                  </button>
                  {taxOverride !== null && taxOverride !== jobInfo.tax_status && (
                    <button
                      type="button"
                      onClick={() => setTaxOverride(jobInfo.tax_status === "taxable" ? "taxable" : "exempt")}
                      className="text-neutral-500 hover:text-neutral-400 underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
          </div>

          {/* Line item section */}
          <div className="bg-white/5 backdrop-blur rounded-xl border border-neutral-700 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
              Line Item
            </h2>

            {/* Item Description with autocomplete */}
            <div className="relative">
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Item Description
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  ref={descriptionRef}
                  type="text"
                  value={materialQuery}
                  onChange={(e) => {
                    setMaterialQuery(e.target.value);
                    if (selectedMaterial) {
                      setSelectedMaterial(null);
                      setPricePerItem("");
                      setPriceAlert(null);
                    }
                    setValidationErrors((prev) => {
                      const { description: _removed, ...rest } = prev;
                      return rest;
                    });
                  }}
                  onKeyDown={handleMaterialKeyDown}
                  placeholder="Search materials or type description..."
                  className={`w-full bg-white/10 border rounded-lg pl-9 pr-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    validationErrors.description ? "border-red-500" : "border-neutral-700"
                  }`}
                />
                {selectedMaterial && (
                  <button
                    type="button"
                    onClick={clearMaterialSelection}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {validationErrors.description && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.description}</p>
              )}

              {/* Material autocomplete dropdown */}
              {showMaterialDropdown && materialResults.length > 0 && (
                <div
                  ref={materialDropdownRef}
                  className="absolute z-30 top-full mt-1 left-0 w-full max-h-64 overflow-y-auto bg-neutral-900/95 backdrop-blur border border-neutral-700 rounded-lg shadow-xl"
                >
                  {materialResults.map((mat, idx) => {
                    const isConsumable = mat.taxCategory === "consumable";
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${
                          idx === materialHighlightIdx ? "bg-white/10" : ""
                        }`}
                        onMouseDown={(e) => { e.preventDefault(); selectMaterial(mat); }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-200 flex-1 truncate">{mat.description}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                              isConsumable ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"
                            }`}
                          >
                            {isConsumable ? "consumable" : "installed"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                          {mat.unit && <span>{mat.unit}</span>}
                          {mat.vendorPrice !== null && <span>${Number(mat.vendorPrice).toFixed(4)}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected material info */}
            {selectedMaterial && (
              <div className="flex items-center gap-3 text-xs">
                <span
                  className={`px-2 py-0.5 rounded ${
                    selectedMaterial.taxCategory === "consumable"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-green-500/15 text-green-400"
                  }`}
                >
                  {selectedMaterial.taxCategory}
                </span>
                {selectedMaterial.unit && (
                  <span className="text-neutral-500">Unit: {selectedMaterial.unit}</span>
                )}
                {selectedMaterial.vendorPrice !== null && (
                  <span className="text-neutral-500">
                    Vendor price: ${Number(selectedMaterial.vendorPrice).toFixed(4)}
                    {selectedMaterial.vendorPriceDate && <> (as of {selectedMaterial.vendorPriceDate})</>}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Quantity</label>
                <input
                  ref={quantityRef}
                  type="number"
                  step="any"
                  min="0"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setValidationErrors((prev) => {
                      const { quantity: _removed, ...rest } = prev;
                      return rest;
                    });
                    if (pricePerItem) checkPriceAlert(pricePerItem);
                  }}
                  placeholder="0"
                  className={`w-full bg-white/10 border rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    validationErrors.quantity ? "border-red-500" : "border-neutral-700"
                  }`}
                />
                {validationErrors.quantity && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.quantity}</p>
                )}
              </div>

              {/* Price Per Item */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Price Per Item</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={pricePerItem}
                  onChange={(e) => {
                    setPricePerItem(e.target.value);
                    setValidationErrors((prev) => {
                      const { price: _removed, ...rest } = prev;
                      return rest;
                    });
                  }}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && e.target.value !== "") {
                      setPricePerItem(formatPrice4(val));
                    }
                    checkPriceAlert(e.target.value);
                  }}
                  placeholder="$0.0000"
                  className={`w-full bg-white/10 border rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    validationErrors.price ? "border-red-500" : "border-neutral-700"
                  }`}
                />
                {validationErrors.price && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.price}</p>
                )}
              </div>

              {/* Line Total Preview */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Line Total</label>
                <div className="bg-white/5 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 font-mono">
                  {quantity && pricePerItem
                    ? formatCurrency(Math.round(Number(quantity) * Number(pricePerItem) * 100) / 100)
                    : "$0.00"}
                </div>
              </div>
            </div>

            {/* Price change alert */}
            {priceAlert && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-300">
                    Price changed by {priceAlert.pctDiff}% (${priceAlert.totalDiff.toFixed(2)} total difference)
                  </p>
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    Last price: ${priceAlert.lastPrice.toFixed(4)}
                    {priceAlert.lastDate && <> on {priceAlert.lastDate}</>}
                  </p>
                </div>
                <button type="button" onClick={() => setPriceAlert(null)} className="text-xs text-amber-400 hover:text-amber-300 underline">
                  Dismiss
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSpecialPricing}
                  onChange={(e) => setIsSpecialPricing(e.target.checked)}
                  className="rounded border-neutral-600 bg-white/10 text-primary-500 focus:ring-primary-500"
                />
                Special Pricing &mdash; do not include in pricing book
              </label>
              <button type="button" onClick={() => setShowNotes(!showNotes)} className="text-xs text-primary-400 hover:text-primary-300">
                {showNotes ? "Hide notes" : "Add notes"}
              </button>
            </div>

            {showNotes && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Line item notes (optional)..."
                rows={2}
                className="w-full bg-white/10 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            )}

            {/* Tax indicator */}
            {(materialQuery.trim() || selectedMaterial) && (
              <div
                className={`text-xs px-3 py-2 rounded-lg ${
                  currentTax.isTaxable ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
                }`}
              >
                {currentTax.isTaxable
                  ? `Taxable (6%) \u2014 ${currentTax.reason}`
                  : `Exempt \u2014 ${currentTax.reason}`}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={addLineItem}
                disabled={!canAddLineItem}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-800 disabled:text-neutral-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={14} />
                Add Line Item
                <kbd className="ml-1 text-[10px] bg-white/10 px-1 py-0.5 rounded">Ctrl+Enter</kbd>
              </button>
              <button
                type="button"
                onClick={saveInvoice}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-800 disabled:text-neutral-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Invoice
              </button>
              <button type="button" onClick={clearLineItemFields} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 text-sm rounded-lg transition-colors">
                Clear
              </button>
              <button type="button" onClick={cancelInvoice} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-400 text-sm rounded-lg transition-colors">
                Cancel
              </button>
            </div>

            {validationErrors.lineItems && (
              <p className="text-xs text-red-400">{validationErrors.lineItems}</p>
            )}
          </div>

          {/* Running total table */}
          <div className="bg-white/5 backdrop-blur rounded-xl border border-neutral-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Line Items</h2>
              <span className="text-xs text-neutral-500">
                {lineItems.length} item{lineItems.length !== 1 ? "s" : ""} on this invoice
              </span>
            </div>

            {lineItems.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-neutral-600">
                No line items yet. Add items above.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-neutral-500 uppercase tracking-wider">
                        <th className="text-left px-4 py-2">Description</th>
                        <th className="text-right px-3 py-2">Qty</th>
                        <th className="text-right px-3 py-2">Price</th>
                        <th className="text-right px-3 py-2">Total</th>
                        <th className="text-center px-3 py-2">Tax</th>
                        <th className="text-right px-3 py-2">Tax Amt</th>
                        <th className="w-8 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {lineItems.map((li) => (
                        <tr key={li.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2 text-neutral-200 max-w-[200px] truncate">
                            {li.description}
                            {li.isSpecialPricing && <span className="ml-1 text-[10px] text-amber-400">SP</span>}
                          </td>
                          <td className="text-right px-3 py-2 text-neutral-300 font-mono">{li.quantity}</td>
                          <td className="text-right px-3 py-2 text-neutral-300 font-mono">${li.pricePerItem.toFixed(4)}</td>
                          <td className="text-right px-3 py-2 text-neutral-200 font-mono font-medium">{formatCurrency(li.totalCost)}</td>
                          <td className="text-center px-3 py-2">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                li.isTaxable ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"
                              }`}
                              title={li.taxReason}
                            >
                              {li.isTaxable ? "6%" : "\u2014"}
                            </span>
                          </td>
                          <td className="text-right px-3 py-2 text-neutral-300 font-mono">
                            {li.taxAmount > 0 ? formatCurrency(li.taxAmount) : "\u2014"}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeLineItem(li.id)}
                              className="text-neutral-600 hover:text-red-400 transition-colors p-1"
                              title="Remove"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary footer */}
                <div className="border-t border-neutral-700 px-5 py-3 space-y-1">
                  <div className="flex justify-between text-sm text-neutral-400">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-400">
                    <span>Tax (6%)</span>
                    <span className="font-mono">{formatCurrency(taxTotal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-neutral-100 pt-1 border-t border-neutral-800">
                    <span>Total</span>
                    <span className="font-mono">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Invoice History */}
        <div className="xl:w-[40%]">
          <div className="bg-white/5 backdrop-blur rounded-xl border border-neutral-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Invoice History</h2>
              <p className="text-xs text-neutral-500 mt-1">
                {historyTotal} invoice{historyTotal !== 1 ? "s" : ""} total
              </p>
            </div>

            {/* Filters */}
            <div className="px-4 py-2 border-b border-neutral-800 flex gap-2">
              <select
                value={historyVendorFilter}
                onChange={(e) => { setHistoryVendorFilter(e.target.value); setHistoryPage(1); }}
                className="bg-white/10 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="" className="bg-neutral-900">All vendors</option>
                {VENDORS.map((v) => (
                  <option key={v.code} value={v.code} className="bg-neutral-900">{v.code}</option>
                ))}
              </select>
              <input
                type="text"
                value={historyJobFilter}
                onChange={(e) => { setHistoryJobFilter(e.target.value); setHistoryPage(1); }}
                placeholder="Filter by job #"
                className="bg-white/10 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-500 flex-1"
              />
            </div>

            {/* Invoice list */}
            <div className="max-h-[600px] overflow-y-auto divide-y divide-neutral-800">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="text-neutral-500 animate-spin" />
                </div>
              ) : historyInvoices.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-600">No invoices found</div>
              ) : (
                historyInvoices.map((inv) => (
                  <div key={inv.id}>
                    <button
                      type="button"
                      onClick={() => expandInvoiceDetail(inv.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedInvoice === inv.id ? (
                          <ChevronDown size={12} className="text-neutral-500" />
                        ) : (
                          <ChevronRight size={12} className="text-neutral-500" />
                        )}
                        <span className="text-xs text-neutral-500 font-mono">{inv.invoice_date}</span>
                        <span className="text-xs text-neutral-400">{inv.vendor_code}</span>
                        <span className="text-xs text-neutral-300 font-medium">#{inv.invoice_number}</span>
                        <span className="ml-auto text-xs text-neutral-200 font-mono">{formatCurrency(Number(inv.total))}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-5 mt-0.5">
                        <span className="text-[11px] text-neutral-500">Job {inv.job_number}</span>
                        <span className="text-[11px] text-neutral-600">
                          &middot; {inv.line_item_count} item{Number(inv.line_item_count) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>

                    {expandedInvoice === inv.id && expandedDetail && (
                      <div className="px-6 py-2 bg-white/[0.02] border-t border-neutral-800">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-neutral-600 uppercase tracking-wider">
                              <th className="text-left py-1">Item</th>
                              <th className="text-right py-1">Qty</th>
                              <th className="text-right py-1">Price</th>
                              <th className="text-right py-1">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800/50">
                            {expandedDetail.lineItems.map((li) => (
                              <tr key={li.id}>
                                <td className="py-1 text-neutral-400 max-w-[150px] truncate">{li.description}</td>
                                <td className="text-right py-1 text-neutral-500 font-mono">{li.quantity}</td>
                                <td className="text-right py-1 text-neutral-500 font-mono">${Number(li.price_per_item).toFixed(4)}</td>
                                <td className="text-right py-1 text-neutral-300 font-mono">{formatCurrency(Number(li.total_cost))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex justify-between text-xs font-medium pt-1 border-t border-neutral-800 mt-1">
                          <span className="text-neutral-500">Tax: {formatCurrency(Number(expandedDetail.invoice.tax_amount))}</span>
                          <span className="text-neutral-300">Total: {formatCurrency(Number(expandedDetail.invoice.total))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {historyTotalPages > 1 && (
              <div className="px-4 py-2 border-t border-neutral-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  className="text-xs text-neutral-400 hover:text-neutral-200 disabled:text-neutral-700 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-neutral-500">Page {historyPage} of {historyTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                  disabled={historyPage >= historyTotalPages}
                  className="text-xs text-neutral-400 hover:text-neutral-200 disabled:text-neutral-700 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

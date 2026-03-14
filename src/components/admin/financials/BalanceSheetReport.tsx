import { Printer } from "lucide-react";

interface BsEntry {
  account_number: string | null;
  account_name: string;
  amount: string;
  section: string;
  is_subtotal: boolean;
}

interface BsSnapshot {
  report_date: string;
  total_assets: string;
  total_liabilities: string;
  total_equity: string;
  net_income: string;
  ar_balance: string;
  ar_retainage: string;
  costs_in_excess: string;
  billings_in_excess: string;
}

function num(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === "number" ? val : parseFloat(val) || 0;
}

function fmt(val: string | number | null | undefined): string {
  const n = num(val);
  const abs = Math.abs(n);
  const formatted =
    "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${formatted})` : formatted;
}

function dateLabelLong(dateStr: string): string {
  const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const d = new Date(dateOnly + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

interface Props {
  snapshot: BsSnapshot;
  entries: BsEntry[];
}

export default function BalanceSheetReport({ snapshot, entries }: Props) {
  const totalAssets = num(snapshot.total_assets);
  const totalLiabilities = num(snapshot.total_liabilities);
  const totalEquity = num(snapshot.total_equity);
  const netIncome = num(snapshot.net_income);

  // Check if balance sheet balances (assets = liabilities + equity)
  const liabPlusEquity = totalLiabilities + totalEquity;
  const balanceVariance = Math.abs(totalAssets - liabPlusEquity);
  const isBalanced = balanceVariance < 1;

  return (
    <div className="fin-print-area space-y-5">
      {/* Print header (hidden on screen) */}
      <div className="fin-print-header hidden">
        <h1>Balance Sheet</h1>
        <p>As of {dateLabelLong(snapshot.report_date)}</p>
      </div>

      {/* Header with print button */}
      <div className="flex items-center justify-between fin-no-print">
        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
          Balance Sheet - {dateLabelLong(snapshot.report_date)}
        </h3>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded-md text-neutral-300 hover:bg-neutral-700 transition-colors"
        >
          <Printer size={12} />
          Print
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BsKpi label="Total Assets" value={fmt(snapshot.total_assets)} />
        <BsKpi label="Total Liabilities" value={fmt(snapshot.total_liabilities)} />
        <BsKpi label="Equity" value={fmt(snapshot.total_equity)} />
        <BsKpi label="Net Income" value={fmt(snapshot.net_income)} warn={netIncome < 0} />
      </div>

      {/* Balance check badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            isBalanced
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/15 text-red-400 border border-red-500/20"
          }`}
        >
          {isBalanced
            ? "Assets = Liabilities + Equity"
            : `Variance: ${fmt(balanceVariance)}`}
        </span>
      </div>

      {/* Detail Table */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="px-4 py-3 font-medium w-24">Acct #</th>
                <th className="px-4 py-3 font-medium">Account Name</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const isSection = e.is_subtotal;
                return (
                  <tr
                    key={i}
                    className={
                      isSection
                        ? "bg-neutral-800/40 border-y border-neutral-700/50"
                        : "border-b border-neutral-800/30 hover:bg-neutral-800/20 transition-colors"
                    }
                  >
                    <td
                      className={`px-4 py-2 tabular-nums text-xs ${
                        isSection ? "text-neutral-400 font-medium" : "text-neutral-600"
                      }`}
                    >
                      {e.account_number ?? ""}
                    </td>
                    <td
                      className={`py-2 ${
                        isSection
                          ? "px-4 text-neutral-100 font-semibold text-sm"
                          : "pl-8 pr-4 text-neutral-300"
                      }`}
                    >
                      {e.account_name}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${
                        isSection ? "text-neutral-100 font-semibold" : "text-neutral-300"
                      }`}
                    >
                      {fmt(e.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary footer */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-neutral-500 text-xs uppercase tracking-wider">AR Balance</p>
            <p className="text-neutral-200 tabular-nums font-medium">{fmt(snapshot.ar_balance)}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs uppercase tracking-wider">AR Retainage</p>
            <p className="text-neutral-200 tabular-nums font-medium">{fmt(snapshot.ar_retainage)}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs uppercase tracking-wider">Costs in Excess</p>
            <p className="text-neutral-200 tabular-nums font-medium">{fmt(snapshot.costs_in_excess)}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs uppercase tracking-wider">Billings in Excess</p>
            <p className="text-neutral-200 tabular-nums font-medium">{fmt(snapshot.billings_in_excess)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BsKpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${warn ? "text-red-400" : "text-neutral-100"}`}>
        {value}
      </p>
    </div>
  );
}

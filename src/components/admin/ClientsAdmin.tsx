import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────
interface Client {
  id: number;
  name: string;
  domain: string;
  color: string;
  description: string;
  tier: "high" | "medium" | "low";
  seo_value: number;
  active: boolean;
  sort_order: number;
}

const TIER_LABELS: Record<string, string> = {
  high: "Tier 1 — Anchor (top row, 2–3 logos, largest)",
  medium: "Tier 2 — Featured (middle row, 4–5 logos)",
  low: "Tier 3 — Standard (bottom row, 6–7 logos, smallest)",
};
const TIER_COLORS: Record<string, string> = {
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#6b7280",
};

// ── Shared styles ──────────────────────────────────────
const inputCls =
  "w-full rounded-lg px-3 py-2 text-sm outline-none bg-white/5 border border-white/10 text-slate-200 focus:border-blue-500/60";
const labelCls = "block text-xs uppercase tracking-wider text-slate-500 mb-1";
const btnPrimary =
  "px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40 disabled:cursor-default";

// ── AI fill ────────────────────────────────────────────
interface AIFillResult {
  name?: string;
  domain?: string;
  color?: string;
  description?: string;
  seo_value?: number;
  suggested_tier?: "high" | "medium" | "low";
  tier_reason?: string;
}

async function aiFillClient(companyName: string): Promise<AIFillResult> {
  const res = await fetch("/api/ai/client-fill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: companyName }),
  });
  if (!res.ok) throw new Error("AI fill failed");
  return res.json() as Promise<AIFillResult>;
}

// ── Main component ─────────────────────────────────────
export default function ClientsAdmin() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "add">("list");

  // Add form state
  const emptyForm = {
    name: "",
    domain: "",
    color: "#0066CC",
    description: "",
    tier: "medium" as const,
    seo_value: 70,
  };
  const [form, setForm] = useState(emptyForm);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<{
    tier: string;
    reason: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((data: Client[]) => {
        setClients(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const setField = (k: keyof typeof form, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleAIFill = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiNote(null);
    try {
      const data = await aiFillClient(aiInput.trim());
      setForm((f) => ({
        ...f,
        name: data.name ?? aiInput,
        domain: data.domain ?? "",
        color: data.color ?? "#0066CC",
        description: data.description ?? "",
        seo_value: data.seo_value ?? 70,
        tier: data.suggested_tier ?? "medium",
      }));
      setAiNote({
        tier: data.suggested_tier ?? "",
        reason: data.tier_reason ?? "",
      });
    } catch {
      setAiNote({
        tier: "",
        reason: "Could not auto-fill. Fill in manually.",
      });
    }
    setAiLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.domain.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, seo_value: Number(form.seo_value) }),
    });
    if (res.ok) {
      setForm(emptyForm);
      setAiInput("");
      setAiNote(null);
      setTab("list");
      load();
    } else {
      setError("Failed to save. Check fields and try again.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}" from the showcase?`)) return;
    await fetch("/api/admin/clients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const handleToggleActive = async (client: Client) => {
    await fetch("/api/admin/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: client.id, active: !client.active }),
    });
    load();
  };

  const handleTierChange = async (id: number, tier: string) => {
    await fetch("/api/admin/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, tier }),
    });
    load();
  };

  return (
    <div className="max-w-4xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Client Showcase</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage the tiered logo grid displayed on the public site between
          Projects and the CTA banner.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.08] mb-6">
        {(["list", "add"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="px-5 py-3 text-sm font-semibold transition-colors"
            style={{
              color: tab === t ? "#60a5fa" : "#64748b",
              borderBottom:
                tab === t ? "2px solid #3b82f6" : "2px solid transparent",
              background: "transparent",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {t === "list" ? `All Clients (${clients.length})` : "+ Add Client"}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ── */}
      {tab === "list" && (
        <div>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : (
            (["high", "medium", "low"] as const).map((tier) => {
              const tc = clients.filter((c) => c.tier === tier);
              return (
                <div key={tier} className="mb-8">
                  <div
                    className="text-xs uppercase tracking-widest mb-3 font-semibold"
                    style={{ color: TIER_COLORS[tier] }}
                  >
                    {TIER_LABELS[tier]} — {tc.length} client
                    {tc.length !== 1 ? "s" : ""}
                  </div>
                  {tc.length === 0 && (
                    <p className="text-slate-600 text-sm">
                      No clients in this tier.
                    </p>
                  )}
                  {tc.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between rounded-lg px-4 py-3 mb-2"
                      style={{
                        background: client.active
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(255,255,255,0.01)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        opacity: client.active ? 1 : 0.5,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: client.color }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-200 truncate">
                            {client.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {client.domain} · {client.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                          SEO {client.seo_value}
                        </span>
                        <select
                          value={client.tier}
                          onChange={(e) =>
                            handleTierChange(client.id, e.target.value)
                          }
                          className="text-xs rounded px-2 py-1 bg-white/5 border border-white/10 text-slate-300 outline-none cursor-pointer"
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(client)}
                          className="text-xs px-3 py-1 rounded transition-colors"
                          style={{
                            background: client.active
                              ? "rgba(34,197,94,0.1)"
                              : "rgba(100,116,139,0.15)",
                            color: client.active ? "#4ade80" : "#94a3b8",
                          }}
                        >
                          {client.active ? "Live" : "Hidden"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(client.id, client.name)}
                          className="text-xs px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── ADD TAB ── */}
      {tab === "add" && (
        <div className="space-y-5 max-w-xl">
          {/* AI Fill */}
          <div className="rounded-xl p-4 bg-blue-500/[0.06] border border-blue-500/15">
            <label className={labelCls}>
              AI Auto-Fill — type a company name &amp; press enter
            </label>
            <div className="flex gap-2">
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAIFill();
                }}
                placeholder="e.g. Blue Cross Blue Shield, Amazon, Trinity Health…"
                className={inputCls}
              />
              <button
                type="button"
                onClick={handleAIFill}
                disabled={aiLoading || !aiInput.trim()}
                className={btnPrimary}
                style={{ whiteSpace: "nowrap" }}
              >
                {aiLoading ? "…" : "Fill →"}
              </button>
            </div>
            {aiNote && (
              <p className="mt-2 text-xs text-slate-400">
                {aiNote.tier ? (
                  <>
                    Suggested:{" "}
                    <span
                      style={{
                        color:
                          TIER_COLORS[aiNote.tier] ?? TIER_COLORS["medium"],
                      }}
                      className="font-semibold"
                    >
                      {aiNote.tier.toUpperCase()}
                    </span>{" "}
                    — {aiNote.reason}
                  </>
                ) : (
                  <span className="text-red-400">{aiNote.reason}</span>
                )}
              </p>
            )}
          </div>

          {/* Manual fields */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { key: "name", label: "Company Name *", type: "text" },
                {
                  key: "domain",
                  label: "Domain *",
                  type: "text",
                  placeholder: "ford.com",
                },
                {
                  key: "description",
                  label: "Description (6 words max)",
                  type: "text",
                },
                {
                  key: "seo_value",
                  label: "SEO Value (1–100)",
                  type: "number",
                },
              ] as const
            ).map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input
                  type={type}
                  value={String(form[key])}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={placeholder}
                  className={inputCls}
                  min={type === "number" ? 1 : undefined}
                  max={type === "number" ? 100 : undefined}
                />
              </div>
            ))}
            <div>
              <label className={labelCls}>Tier / Row</label>
              <select
                value={form.tier}
                onChange={(e) =>
                  setField("tier", e.target.value)
                }
                className={inputCls}
                style={{ background: "#0d1520" }}
              >
                <option value="high">High — Top row (largest)</option>
                <option value="medium">Medium — Middle row</option>
                <option value="low">Low — Bottom row (smallest)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Brand Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setField("color", e.target.value)}
                  className="w-10 h-9 rounded cursor-pointer bg-transparent border border-white/10"
                />
                <input
                  value={form.color}
                  onChange={(e) => setField("color", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {form.name && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: form.color }}
              />
              <span className="font-medium text-slate-200">{form.name}</span>
              <span className="text-slate-500 text-xs">{form.domain}</span>
              <span
                className="ml-auto text-xs font-semibold"
                style={{ color: TIER_COLORS[form.tier] }}
              >
                {form.tier.toUpperCase()}
              </span>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !form.name.trim() || !form.domain.trim()}
            className={btnPrimary + " w-full py-3"}
          >
            {saving ? "Saving…" : "Add to Client Showcase"}
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { showToast } from "./Toast";

// ── Types ──────────────────────────────────────────────
interface Client {
  id: number;
  name: string;
  domain: string;
  color: string;
  description: string;
  seo_value: number;
  active: boolean;
  sort_order: number;
  logo_url: string | null;
  logo_type: string;
  is_featured: boolean;
  display_scale: number;
  needs_invert: boolean;
}

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

// ── Logo preview (white-on-dark) ───────────────────────
function LogoPreview({ client }: { client: Client }) {
  if (!client.logo_url) {
    return (
      <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-[10px] text-slate-500">
        —
      </div>
    );
  }

  if (client.logo_type === "text") {
    return (
      <div
        className="w-10 h-10 rounded bg-neutral-900 flex items-center justify-center text-[9px] font-bold text-white leading-tight text-center px-0.5"
        style={{ transform: `scale(${client.display_scale})` }}
      >
        {client.name.split(" ")[0]}
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded bg-neutral-900 flex items-center justify-center p-1">
      <img
        src={client.logo_url}
        alt={client.name}
        className={`max-w-full max-h-full object-contain${client.needs_invert ? " brightness-0 invert" : ""}`}
        style={client.display_scale !== 1 ? { transform: `scale(${client.display_scale})` } : undefined}
      />
    </div>
  );
}

// ── Edit logo modal ────────────────────────────────────
function LogoEditor({
  client,
  onSave,
  onClose,
}: {
  client: Client;
  onSave: (updates: Partial<Client>) => void;
  onClose: () => void;
}) {
  const [logoUrl, setLogoUrl] = useState(client.logo_url ?? "");
  const [logoType, setLogoType] = useState(client.logo_type ?? "svg");
  const [displayScale, setDisplayScale] = useState(client.display_scale ?? 1.0);
  const [needsInvert, setNeedsInvert] = useState(client.needs_invert ?? true);
  const [isFeatured, setIsFeatured] = useState(client.is_featured ?? false);
  const [checking, setChecking] = useState(false);

  const handleAutoDetect = async () => {
    setChecking(true);
    const slug = client.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .replace(/\s+/g, "");
    const cdnUrl = `https://cdn.simpleicons.org/${slug}/white`;
    try {
      const res = await fetch(cdnUrl, { method: "HEAD", mode: "no-cors" });
      if (res.type === "opaque" || res.ok) {
        setLogoUrl(cdnUrl);
        setLogoType("cdn");
        setNeedsInvert(false);
      }
    } catch {
      // CDN not available — keep current values
    }
    setChecking(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-neutral-900 rounded-xl border border-white/10 p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">
          Edit Logo — {client.name}
        </h3>

        {/* Live preview */}
        <div className="flex justify-center p-4 rounded-lg bg-neutral-950 border border-white/5">
          <div className="h-16 flex items-center justify-center">
            {logoUrl ? (
              logoType === "text" ? (
                <span
                  className="text-white font-bold text-xl"
                  style={{ transform: `scale(${displayScale})` }}
                >
                  {client.name}
                </span>
              ) : (
                <img
                  src={logoUrl}
                  alt={client.name}
                  className={`h-12 object-contain${needsInvert ? " brightness-0 invert" : ""}`}
                  style={{ transform: `scale(${displayScale})` }}
                />
              )
            ) : (
              <span className="text-slate-600 text-sm">No logo set</span>
            )}
          </div>
        </div>

        <div>
          <label className={labelCls}>Logo URL</label>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="/images/clients/logo.svg or CDN URL"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Logo Type</label>
            <select
              value={logoType}
              onChange={(e) => setLogoType(e.target.value)}
              className={inputCls}
            >
              <option value="svg">SVG (local)</option>
              <option value="cdn">CDN</option>
              <option value="img">Image</option>
              <option value="text">Text</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Display Scale</label>
            <input
              type="number"
              value={displayScale}
              onChange={(e) => setDisplayScale(Number(e.target.value))}
              step={0.1}
              min={0.1}
              max={5}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={needsInvert}
              onChange={(e) => setNeedsInvert(e.target.checked)}
              className="accent-blue-500"
            />
            Needs invert (dark logos)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="accent-blue-500"
            />
            Featured on landing
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAutoDetect}
            disabled={checking}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors disabled:opacity-40"
          >
            {checking ? "Checking…" : "Auto-detect (SimpleIcons)"}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({
                logo_url: logoUrl || null,
                logo_type: logoType,
                display_scale: displayScale,
                needs_invert: needsInvert,
                is_featured: isFeatured,
              });
              onClose();
            }}
            className={btnPrimary}
          >
            Save Logo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────
export default function ClientsAdmin() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "add">("list");
  const [editingLogo, setEditingLogo] = useState<Client | null>(null);

  // Add form state
  const emptyForm = {
    name: "",
    domain: "",
    color: "#0066CC",
    description: "",
    seo_value: 70,
  };
  const [form, setForm] = useState(emptyForm);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
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
      }));
      setAiNote("Fields populated. Review and adjust before saving.");
    } catch {
      setAiNote("Could not auto-fill. Fill in manually.");
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
      showToast("success", `Client "${form.name}" added`);
    } else {
      setError("Failed to save. Check fields and try again.");
      showToast("error", "Failed to add client");
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
    showToast("success", `"${name}" removed from showcase`);
  };

  const handleToggleActive = async (client: Client) => {
    await fetch("/api/admin/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: client.id, active: !client.active }),
    });
    load();
    showToast("info", `${client.name} ${client.active ? "hidden" : "activated"}`);
  };

  const handleToggleFeatured = async (client: Client) => {
    await fetch("/api/admin/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: client.id, is_featured: !client.is_featured }),
    });
    load();
  };

  const handleSortChange = async (id: number, sort_order: number) => {
    await fetch("/api/admin/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, sort_order }),
    });
    load();
  };

  const handleLogoSave = async (updates: Partial<Client>) => {
    if (!editingLogo) return;
    await fetch("/api/admin/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingLogo.id, ...updates }),
    });
    load();
    showToast("success", "Logo updated");
  };

  return (
    <div className="max-w-4xl">
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
          ) : clients.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No clients yet. Add one using the &quot;+ Add Client&quot; tab.
            </p>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3"
                  style={{
                    background: client.active
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(255,255,255,0.01)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    opacity: client.active ? 1 : 0.5,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setEditingLogo(client)}
                      className="flex-shrink-0 hover:ring-2 hover:ring-blue-500/40 rounded transition-all"
                      title="Edit logo"
                    >
                      <LogoPreview client={client} />
                    </button>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {client.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {client.domain}
                        {client.description ? ` · ${client.description}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                      SEO {client.seo_value}
                    </span>
                    <input
                      type="number"
                      value={client.sort_order}
                      onChange={(e) =>
                        handleSortChange(client.id, Number(e.target.value))
                      }
                      className="w-14 text-xs rounded px-2 py-1 bg-white/5 border border-white/10 text-slate-300 outline-none text-center"
                      title="Sort order"
                      min={0}
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(client)}
                      className="text-xs px-3 py-1 rounded transition-colors"
                      style={{
                        background: client.is_featured
                          ? "rgba(234,179,8,0.1)"
                          : "rgba(100,116,139,0.1)",
                        color: client.is_featured ? "#facc15" : "#64748b",
                      }}
                      title={client.is_featured ? "Remove from landing page" : "Feature on landing page"}
                    >
                      {client.is_featured ? "Featured" : "—"}
                    </button>
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
              <p className="mt-2 text-xs text-slate-400">{aiNote}</p>
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
            ).map((field) => (
              <div key={field.key}>
                <label className={labelCls}>{field.label}</label>
                <input
                  type={field.type}
                  value={String(form[field.key])}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={"placeholder" in field ? field.placeholder : undefined}
                  className={inputCls}
                  min={field.type === "number" ? 1 : undefined}
                  max={field.type === "number" ? 100 : undefined}
                />
              </div>
            ))}
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

      {/* Logo editor modal */}
      {editingLogo && (
        <LogoEditor
          client={editingLogo}
          onSave={handleLogoSave}
          onClose={() => setEditingLogo(null)}
        />
      )}
    </div>
  );
}

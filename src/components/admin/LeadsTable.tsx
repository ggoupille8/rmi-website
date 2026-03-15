import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Trash2, Tag } from "lucide-react";
import LeadDetail from "./LeadDetail";
import { showToast } from "./Toast";

interface ContactMetadata {
  enrichment?: {
    legitimacyScore?: number;
    quality?: "high" | "medium" | "low" | "spam";
  } | null;
  [key: string]: unknown;
}

interface Contact {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  source: string;
  status: string;
  notes: string | null;
  updated_at: string | null;
  forwarded_at: string | null;
  metadata?: ContactMetadata | null;
  category?: string | null;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "forwarded", label: "Forwarded" },
  { value: "archived", label: "Archived" },
];

const CATEGORY_FILTERS = [
  { value: "", label: "All Categories" },
  { value: "lead", label: "Leads" },
  { value: "employment_verification", label: "Employment Verification" },
  { value: "vendor", label: "Vendor" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

const CATEGORY_BADGE: Record<string, string> = {
  lead: "bg-primary-600/20 text-primary-400 border-primary-600/30",
  employment_verification: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  vendor: "bg-cyan-600/20 text-cyan-400 border-cyan-600/30",
  spam: "bg-neutral-700/50 text-neutral-500 border-neutral-700",
  other: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
};

const CATEGORY_LABEL: Record<string, string> = {
  lead: "Lead",
  employment_verification: "Emp. Verify",
  vendor: "Vendor",
  spam: "Spam",
  other: "Other",
};

const STATUS_BADGE: Record<string, string> = {
  new: "bg-primary-600/20 text-primary-400 border-primary-600/30",
  contacted: "bg-green-600/20 text-green-400 border-green-600/30",
  forwarded: "bg-accent-600/20 text-accent-400 border-accent-600/30",
  archived: "bg-neutral-700/50 text-neutral-500 border-neutral-700",
};

const STATUS_CYCLE: Record<string, string> = {
  new: "contacted",
  contacted: "forwarded",
  forwarded: "archived",
  archived: "new",
};

const PAGE_SIZE = 20;

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears !== 1 ? "s" : ""} ago`;
}

function getCompany(contact: Contact): string | null {
  if (contact.metadata && typeof contact.metadata.company === "string" && contact.metadata.company) {
    return contact.metadata.company;
  }
  return null;
}

interface Props {
  initialStatus?: string;
}

export default function LeadsTable({ initialStatus }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
    hasMore: false,
  });
  const [statusFilter, setStatusFilter] = useState(initialStatus || "");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
        setPagination(data.pagination);
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleUpdate = (id: string, newStatus: string, newNotes: string | null, newCategory?: string) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: newStatus, notes: newNotes, ...(newCategory !== undefined ? { category: newCategory } : {}) } : c
      )
    );
  };

  const toggleExpanded = (contactId: string) => {
    setExpandedId((prev) => (prev === contactId ? null : contactId));
  };

  const cycleStatus = async (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    const oldStatus = contact.status;
    const newStatus = STATUS_CYCLE[oldStatus] || "new";

    // Optimistic update
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, status: newStatus } : c))
    );

    try {
      const res = await fetch("/api/admin/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contact.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      showToast("success", `Lead status changed to ${newStatus}`);
    } catch {
      // Revert on failure
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, status: oldStatus } : c))
      );
      showToast("error", "Failed to update lead status");
    }
  };

  const deleteContact = async (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${contact.name}" permanently?`)) return;

    // Optimistic removal
    const prevContacts = contacts;
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
    if (expandedId === contact.id) setExpandedId(null);

    try {
      const res = await fetch(`/api/admin/contacts?id=${contact.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete");
      showToast("success", `"${contact.name}" deleted`);
    } catch {
      // Revert on failure
      setContacts(prevContacts);
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
      showToast("error", "Failed to delete lead");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalPages = Math.ceil(pagination.total / PAGE_SIZE);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Status filter */}
        <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-md p-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleStatusFilter(f.value)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                statusFilter === f.value
                  ? "bg-neutral-800 text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-sm text-neutral-300 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" />
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            className="pl-8 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-sm text-neutral-300 focus:outline-none focus:ring-1 focus:ring-primary-500 appearance-none cursor-pointer"
          >
            {CATEGORY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={fetchContacts}
          disabled={loading}
          className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      {loading && contacts.length === 0 ? (
        <div className="text-center py-12 text-neutral-500 text-sm">
          Loading leads...
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-neutral-500 text-sm">
          No leads found{statusFilter || categoryFilter || search ? " matching your filters" : ""}.
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => {
                  const isExpanded = expandedId === contact.id;
                  const company = getCompany(contact);
                  return (
                    <tr key={contact.id} className="contents">
                      <td colSpan={7} className="p-0">
                        <table className="w-full">
                          <tbody>
                            {/* Main row */}
                            <tr
                              onClick={() => toggleExpanded(contact.id)}
                              className={`border-b border-neutral-800/50 hover:bg-neutral-800/40 cursor-pointer transition-colors ${
                                isExpanded ? "bg-neutral-800/30" : ""
                              }`}
                            >
                              <td className="px-4 py-3 text-sm text-neutral-400" title={getRelativeTime(contact.created_at)}>
                                <span className="cursor-help border-b border-dotted border-neutral-700">
                                  {formatDate(contact.created_at)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-neutral-200">
                                <div className="flex items-center gap-1.5">
                                  <ChevronDown
                                    size={14}
                                    className={`text-neutral-600 transition-transform shrink-0 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                  {contact.name}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-neutral-400">
                                {company || <span className="text-neutral-600">-</span>}
                              </td>
                              <td className="px-4 py-3 text-sm text-neutral-400">
                                {contact.email || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-neutral-400">
                                {contact.phone || "-"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => cycleStatus(contact, e)}
                                    title={`Click to change to "${STATUS_CYCLE[contact.status] || "new"}"`}
                                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded border cursor-pointer hover:opacity-80 transition-opacity ${STATUS_BADGE[contact.status] || STATUS_BADGE.new}`}
                                  >
                                    {contact.status}
                                  </button>
                                  {contact.category && contact.category !== "lead" && (
                                    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${CATEGORY_BADGE[contact.category] || CATEGORY_BADGE.other}`}>
                                      {CATEGORY_LABEL[contact.category] || contact.category}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-3">
                                <button
                                  type="button"
                                  onClick={(e) => deleteContact(contact, e)}
                                  title="Delete lead"
                                  className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                            {/* Accordion detail */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} className="p-0">
                                  <LeadDetail
                                    inline
                                    contact={contact}
                                    onClose={() => setExpandedId(null)}
                                    onUpdate={handleUpdate}
                                  />
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {contacts.map((contact) => {
              const isExpanded = expandedId === contact.id;
              const company = getCompany(contact);
              return (
                <div
                  key={contact.id}
                  className={`bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden transition-colors ${
                    isExpanded ? "ring-1 ring-neutral-700" : ""
                  }`}
                >
                  {/* Card header */}
                  <div
                    onClick={() => toggleExpanded(contact.id)}
                    className="w-full text-left p-3 hover:bg-neutral-800/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <ChevronDown
                          size={14}
                          className={`text-neutral-600 transition-transform shrink-0 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                        <p className="text-sm font-medium text-neutral-200">
                          {contact.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => cycleStatus(contact, e)}
                          title={`Click to change to "${STATUS_CYCLE[contact.status] || "new"}"`}
                          className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded border cursor-pointer hover:opacity-80 transition-opacity ${STATUS_BADGE[contact.status] || STATUS_BADGE.new}`}
                        >
                          {contact.status}
                        </button>
                        {contact.category && contact.category !== "lead" && (
                          <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${CATEGORY_BADGE[contact.category] || CATEGORY_BADGE.other}`}>
                            {CATEGORY_LABEL[contact.category] || contact.category}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => deleteContact(contact, e)}
                          title="Delete lead"
                          className="p-1 text-neutral-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {company && (
                      <p className="text-xs text-accent-400 font-medium ml-5 mb-0.5">
                        {company}
                      </p>
                    )}
                    <p className="text-xs text-neutral-500 ml-5">
                      {contact.email || contact.phone || "No contact info"}
                    </p>
                    <p
                      className="text-xs text-neutral-600 mt-1 ml-5"
                      title={getRelativeTime(contact.created_at)}
                    >
                      {formatDate(contact.created_at)}
                      <span className="text-neutral-700 ml-1.5">
                        ({getRelativeTime(contact.created_at)})
                      </span>
                    </p>
                  </div>

                  {/* Accordion detail */}
                  {isExpanded && (
                    <LeadDetail
                      inline
                      contact={contact}
                      onClose={() => setExpandedId(null)}
                      onUpdate={handleUpdate}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-neutral-500">
                Showing {page * PAGE_SIZE + 1}-
                {Math.min((page + 1) * PAGE_SIZE, pagination.total)} of{" "}
                {pagination.total}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="flex items-center px-2 text-xs text-neutral-500">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={!pagination.hasMore}
                  className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

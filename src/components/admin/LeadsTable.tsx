import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import LeadDetail from "./LeadDetail";

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
  metadata?: ContactMetadata | null;
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
  { value: "archived", label: "Archived" },
];

const STATUS_BADGE: Record<string, string> = {
  new: "bg-primary-600/20 text-primary-400 border-primary-600/30",
  contacted: "bg-green-600/20 text-green-400 border-green-600/30",
  archived: "bg-neutral-700/50 text-neutral-500 border-neutral-700",
};

const PAGE_SIZE = 20;

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
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [page, setPage] = useState(0);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      if (statusFilter) params.set("status", statusFilter);
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
  }, [page, statusFilter, search]);

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

  const handleUpdate = (id: string, newStatus: string, newNotes: string | null) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: newStatus, notes: newNotes } : c
      )
    );
    if (selectedContact?.id === id) {
      setSelectedContact((prev) =>
        prev ? { ...prev, status: newStatus, notes: newNotes } : null
      );
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
          No leads found{statusFilter || search ? " matching your filters" : ""}.
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
                    Email
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className="border-b border-neutral-800/50 hover:bg-neutral-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-neutral-400">
                        {formatDate(contact.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-neutral-200">
                        {contact.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-400">
                        {contact.email || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-400">
                        {contact.phone || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${STATUS_BADGE[contact.status] || STATUS_BADGE.new}`}
                        >
                          {contact.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {contacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setSelectedContact(contact)}
                  className="w-full text-left bg-neutral-900 border border-neutral-800 rounded-lg p-3 hover:bg-neutral-800/60 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium text-neutral-200">
                      {contact.name}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded border ${STATUS_BADGE[contact.status] || STATUS_BADGE.new}`}
                    >
                      {contact.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {contact.email || contact.phone || "No contact info"}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">
                    {formatDate(contact.created_at)}
                  </p>
                </button>
              ))}
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

      {/* Detail Panel */}
      {selectedContact && (
        <LeadDetail
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

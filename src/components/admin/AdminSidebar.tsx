import { useState, useEffect } from "react";
import { LayoutDashboard, Users, BarChart3, Image, Briefcase, TrendingUp, DollarSign, Building2, Shield, Menu, X } from "lucide-react";
import { computeWipAlerts } from "@/lib/wip-alerts";
import type { WipSnapshot } from "./WipJobTable";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Leads", href: "/admin/leads", icon: Users },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Media", href: "/admin/media", icon: Image },
  { label: "Jobs", href: "/admin/jobs", icon: Briefcase },
  { label: "WIP Dashboard", href: "/admin/wip", icon: TrendingUp },
  { label: "Financials", href: "/admin/financials", icon: DollarSign },
  { label: "Clients", href: "/admin/clients", icon: Building2 },
  { label: "Security", href: "/admin/security", icon: Shield },
];

interface Props {
  currentPath: string;
}

export default function AdminSidebar({ currentPath }: Props) {
  const [open, setOpen] = useState(false);
  const [redAlertCount, setRedAlertCount] = useState<number>(0);

  useEffect(() => {
    async function fetchAlertCount() {
      try {
        const monthsRes = await fetch("/api/admin/wip-months");
        if (!monthsRes.ok) return;
        const months: Array<{ year: number; month: number }> = await monthsRes.json();
        if (!months.length) return;
        const latest = months[0];

        const wipRes = await fetch(
          `/api/admin/wip?year=${latest.year}&month=${latest.month}`
        );
        if (!wipRes.ok) return;
        const data: { snapshots?: WipSnapshot[] } = await wipRes.json();
        const alerts = computeWipAlerts(data.snapshots ?? []);
        setRedAlertCount(alerts.filter((a) => a.severity === "red").length);
      } catch {
        // Non-critical — badge just won't show
      }
    }
    fetchAlertCount();
  }, []);

  const isActive = (href: string) => {
    if (href === "/admin") return currentPath === "/admin" || currentPath === "/admin/";
    return currentPath.startsWith(href);
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-md bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-60 bg-neutral-900 border-r border-neutral-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-neutral-800">
          <div className="w-7 h-7 bg-primary-600 rounded flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <span className="text-sm font-semibold text-neutral-200 tracking-wide">
            RMI Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-neutral-600 cursor-not-allowed text-sm"
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider bg-neutral-800 text-neutral-600 px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                </div>
              );
            }
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-primary-600/15 text-primary-400"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.href === "/admin/wip" && redAlertCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {redAlertCount}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-neutral-800">
          <p className="text-[11px] text-neutral-600">
            Resource Mechanical Insulation
          </p>
        </div>
      </aside>
    </>
  );
}

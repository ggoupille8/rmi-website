import { LogOut } from "lucide-react";
import { useState } from "react";

interface Props {
  title: string;
}

export default function AdminHeader({ title }: Props) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {
      // Continue with redirect even if request fails
    }
    window.location.href = "/admin/login";
  };

  return (
    <header className="h-14 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 lg:px-6">
      <h1 className="text-base font-semibold text-neutral-200 pl-10 lg:pl-0">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-xs text-neutral-500">Admin</span>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">
            {loggingOut ? "Signing out..." : "Sign Out"}
          </span>
        </button>
      </div>
    </header>
  );
}

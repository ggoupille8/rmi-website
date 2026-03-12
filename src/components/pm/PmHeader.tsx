import { useState } from "react";

interface PmHeaderProps {
  pmCode: string;
  pmName: string;
  currentMonth: string;
}

export default function PmHeader({ pmCode, pmName, currentMonth }: PmHeaderProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/pm/auth", { method: "DELETE" });
    } catch {
      // Clear cookie failed — redirect anyway
    }
    window.location.href = "/pm";
  }

  return (
    <header className="sticky top-0 z-40 bg-neutral-900 border-b border-neutral-800">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-200">PM Portal</span>
            <span className="text-neutral-600">|</span>
            <span className="text-sm text-neutral-400">{pmName}</span>
            <span className="text-xs font-mono text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
              {pmCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-xs text-neutral-500">{currentMonth}</span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors disabled:opacity-50"
          >
            {loggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </div>
    </header>
  );
}

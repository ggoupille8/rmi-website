import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
}

interface ToastEvent {
  variant: ToastVariant;
  message: string;
  duration?: number;
}

const TOAST_EVENT = "admin-toast";

export function showToast(
  variant: ToastVariant,
  message: string,
  duration = 5000,
): void {
  window.dispatchEvent(
    new CustomEvent<ToastEvent>(TOAST_EVENT, {
      detail: { variant, message, duration },
    }),
  );
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; border: string; text: string; icon: typeof CheckCircle2 }
> = {
  success: {
    bg: "bg-green-950/90",
    border: "border-green-700/50",
    text: "text-green-300",
    icon: CheckCircle2,
  },
  error: {
    bg: "bg-red-950/90",
    border: "border-red-700/50",
    text: "text-red-300",
    icon: AlertCircle,
  },
  warning: {
    bg: "bg-amber-950/90",
    border: "border-amber-700/50",
    text: "text-amber-300",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-blue-950/90",
    border: "border-blue-700/50",
    text: "text-blue-300",
    icon: Info,
  },
};

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const style = VARIANT_STYLES[toast.variant];
  const Icon = style.icon;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    const timer = setTimeout(dismiss, toast.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [dismiss, toast.duration]);

  return (
    <div
      role="alert"
      className={
        "flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-200 " +
        style.bg +
        " " +
        style.border +
        " " +
        (exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0")
      }
      style={{ minWidth: 280, maxWidth: 420 }}
    >
      <Icon size={18} className={style.text + " flex-shrink-0 mt-0.5"} />
      <p className={"text-sm leading-snug flex-1 " + style.text}>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="flex-shrink-0 text-neutral-500 hover:text-neutral-300 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

let toastCounter = 0;

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastEvent>).detail;
      const id = "toast-" + ++toastCounter + "-" + Date.now();
      setToasts((prev) => [...prev, { id, ...detail }]);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}

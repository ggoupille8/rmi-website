import { useState, useEffect, useRef, useCallback } from "react";
import { services, servicesSubtitle } from "../../content/site";
import {
  Workflow,
  Wind,
  Layers,
  Wrench,
  Clock,
  Cylinder,
  Package,
  ClipboardList,
  ShoppingCart,
  X,
  type LucideIcon,
} from "lucide-react";

// Map service anchor IDs to icons
const iconMap: Record<string, LucideIcon> = {
  "ps-bid": ClipboardList,
  piping: Workflow,
  duct: Wind,
  tanks: Cylinder,
  jacketing: Layers,
  supports: Wrench,
  blankets: Package,
  materials: ShoppingCart,
  "247": Clock,
};

export default function Services() {
  const [activeService, setActiveService] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const activeServiceData = activeService
    ? services.find((s) => s.anchorId === activeService)
    : null;

  const closePanel = useCallback(() => {
    setActiveService(null);
    triggerRef.current?.focus();
  }, []);

  const openPanel = (anchorId: string, buttonEl: HTMLButtonElement) => {
    triggerRef.current = buttonEl;
    setActiveService(anchorId);
  };

  // Close on Escape key
  useEffect(() => {
    if (!activeService) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeService, closePanel]);

  // Focus trap
  useEffect(() => {
    if (!activeService || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableSelector =
      'button, a[href], [tabindex]:not([tabindex="-1"])';
    const focusableElements =
      panel.querySelectorAll<HTMLElement>(focusableSelector);
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    // Focus the close button initially
    firstEl?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      // Re-query in case DOM changed
      const els = panel.querySelectorAll<HTMLElement>(focusableSelector);
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [activeService]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (activeService) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeService]);

  const isOpen = activeService !== null;

  return (
    <section
      className="section-padding bg-neutral-800"
      aria-labelledby="services-heading"
    >
      <div className="container-custom">
        {/* Section Header with Stripe */}
        <div className="flex justify-center mb-3">
          <h2
            id="services-heading"
            className="section-header-stripe font-bold tracking-wider text-white uppercase text-2xl sm:text-3xl lg:text-4xl"
          >
            Services
          </h2>
        </div>

        {/* Section Subtitle */}
        <p className="text-center text-neutral-300 text-lg sm:text-xl max-w-5xl mx-auto mb-6">
          {servicesSubtitle}
        </p>

        {/* Services Icon Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((service) => {
            const IconComponent = iconMap[service.anchorId] || Workflow;
            return (
              <button
                key={service.anchorId}
                type="button"
                onClick={(e) => openPanel(service.anchorId, e.currentTarget)}
                className="flex items-center gap-4 p-4 bg-neutral-900 border border-neutral-700 border-l-[3px] border-l-accent-500 hover:border-l-accent-400 hover:bg-neutral-800 transition-all duration-200 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-inset"
              >
                <IconComponent
                  className="w-7 h-7 text-accent-500 flex-shrink-0"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span className="text-sm font-bold text-white uppercase tracking-wide">
                  {service.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slide-in Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
            onClick={closePanel}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-neutral-900 shadow-2xl animate-[slideInRight_300ms_ease-out] flex flex-col"
          >
            {/* Panel Header */}
            <div className="flex items-start justify-between p-6 border-b border-neutral-700">
              <div className="flex items-center gap-3 min-w-0">
                {activeServiceData && (() => {
                  const Icon = iconMap[activeServiceData.anchorId] || Workflow;
                  return (
                    <Icon
                      className="w-8 h-8 text-accent-500 flex-shrink-0"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  );
                })()}
                <h3
                  id="panel-title"
                  className="text-lg font-bold text-white uppercase tracking-wide"
                >
                  {activeServiceData?.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="flex items-center justify-center w-10 h-10 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                aria-label="Close panel"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-neutral-300 leading-relaxed">
                {activeServiceData?.description}
              </p>
            </div>

            {/* Panel Footer */}
            <div className="p-6 border-t border-neutral-700">
              <a
                href="#contact"
                onClick={closePanel}
                className="btn-primary w-full text-center"
              >
                Request a Quote
              </a>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

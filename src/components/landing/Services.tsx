import { useState, useEffect, useRef, useCallback } from "react";
import { services, servicesSubtitle } from "../../content/site";
import {
  Droplets,
  AirVent,
  Cylinder,
  SquareStack,
  Hammer,
  Cog,
  Ruler,
  Package,
  Clock,
  X,
  type LucideIcon,
} from "lucide-react";

// Map service anchor IDs to icons
const iconMap: Record<string, LucideIcon> = {
  piping: Droplets,
  duct: AirVent,
  tanks: Cylinder,
  blankets: SquareStack,
  jacketing: Hammer,
  supports: Cog,
  "ps-bid": Ruler,
  materials: Package,
  "247": Clock,
};

export default function Services() {
  const [activeService, setActiveService] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const activeServiceData = activeService
    ? services.find((s) => s.anchorId === activeService)
    : null;

  const closeModal = useCallback(() => {
    setActiveService(null);
    triggerRef.current?.focus();
  }, []);

  const openModal = (anchorId: string, buttonEl: HTMLButtonElement) => {
    triggerRef.current = buttonEl;
    setActiveService(anchorId);
  };

  // Close on Escape key
  useEffect(() => {
    if (!activeService) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeService, closeModal]);

  // Focus trap
  useEffect(() => {
    if (!activeService || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableSelector =
      'button, a[href], [tabindex]:not([tabindex="-1"])';
    const focusableElements =
      modal.querySelectorAll<HTMLElement>(focusableSelector);
    const firstEl = focusableElements[0];

    // Focus the close button initially
    firstEl?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = modal.querySelectorAll<HTMLElement>(focusableSelector);
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

  // Lock body scroll when modal is open
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
            className="font-bold tracking-wider text-white uppercase text-2xl sm:text-3xl lg:text-4xl"
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
            const IconComponent = iconMap[service.anchorId] || Droplets;
            return (
              <button
                key={service.anchorId}
                type="button"
                onClick={(e) => openModal(service.anchorId, e.currentTarget)}
                className="flex items-center gap-4 p-4 bg-neutral-900 border border-neutral-700 border-l-[3px] border-l-accent-500 hover:border-l-accent-400 hover:bg-neutral-800 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-500/10 transition-all duration-200 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-inset"
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

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md animate-[fadeIn_200ms_ease-out]"
            aria-hidden="true"
          />

          {/* Modal Content */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="relative z-10 max-w-lg w-full mx-4 bg-neutral-900 rounded-2xl border border-neutral-700/50 shadow-2xl shadow-black/50 animate-[modalIn_300ms_ease-out]"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="p-6 sm:p-8">
              {activeServiceData && (() => {
                const Icon = iconMap[activeServiceData.anchorId] || Droplets;
                return (
                  <>
                    {/* Icon with accent glow */}
                    <div className="flex justify-center mb-4">
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-16 h-16 bg-accent-500/20 rounded-full blur-xl" aria-hidden="true" />
                        <Icon
                          className="relative w-12 h-12 text-accent-500"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      id="modal-title"
                      className="text-xl font-bold text-white text-center uppercase tracking-wide"
                    >
                      {activeServiceData.title}
                    </h3>

                    {/* Divider */}
                    <div className="border-t border-neutral-700/50 my-4" />

                    {/* Description */}
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      {activeServiceData.description}
                    </p>

                    {/* CTA */}
                    <div className="mt-6">
                      <a
                        href="#contact"
                        onClick={closeModal}
                        className="btn-primary w-full text-center"
                      >
                        Request a Quote
                      </a>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

import { useState } from "react";
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
  ChevronDown,
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (anchorId: string) => {
    setExpandedId((prev) => (prev === anchorId ? null : anchorId));
  };

  return (
    <section
      className="section-padding bg-neutral-50 dark:bg-neutral-900"
      aria-labelledby="services-heading"
    >
      <div className="container-custom">
        {/* Section Header with Stripe */}
        <div className="flex justify-center mb-4">
          <h2
            id="services-heading"
            className="section-header-stripe font-bold tracking-wider text-neutral-900 dark:text-white uppercase text-2xl sm:text-3xl lg:text-4xl"
          >
            Services
          </h2>
        </div>

        {/* Section Subtitle */}
        <p className="text-center text-neutral-600 dark:text-neutral-300 text-lg sm:text-xl max-w-3xl mx-auto mb-8">
          {servicesSubtitle}
        </p>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service) => {
            const IconComponent = iconMap[service.anchorId] || Workflow;
            const isExpanded = expandedId === service.anchorId;

            return (
              <div
                key={service.anchorId}
                className="group relative flex flex-col bg-white dark:bg-neutral-800 shadow-md border border-neutral-200 dark:border-neutral-700 transition-all duration-300 hover:shadow-lg hover:border-accent-500/40 dark:hover:border-accent-500/40"
              >
                {/* Clickable header */}
                <button
                  type="button"
                  onClick={() => toggle(service.anchorId)}
                  className="flex items-center gap-4 p-5 w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-inset"
                  aria-expanded={isExpanded}
                  aria-controls={`service-${service.anchorId}`}
                >
                  <IconComponent
                    className="w-8 h-8 text-accent-500 flex-shrink-0"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white uppercase tracking-wide flex-1">
                    {service.title}
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 text-neutral-400 dark:text-neutral-500 flex-shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </button>

                {/* Expandable description */}
                <div
                  id={`service-${service.anchorId}`}
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 pt-0">
                      <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

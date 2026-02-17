import { services } from "../../content/site";
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
  type LucideIcon,
} from "lucide-react";

// Map service anchor IDs to icons
const iconMap: Record<string, LucideIcon> = {
  "ps-bid": ClipboardList, // Plan & specification / bidding
  piping: Workflow,         // Piping system/network
  duct: Wind,               // Air/HVAC duct
  tanks: Cylinder,          // Tank/vessel shape
  jacketing: Layers,        // Layered jacketing materials
  supports: Wrench,         // Fabrication/tools
  blankets: Package,        // Removable insulation blankets
  materials: ShoppingCart,  // Material sales
  "247": Clock,             // 24/7 availability
};

// Tag color map
const tagColors: Record<string, string> = {
  "Core Service": "text-accent-500",
  "24/7 Available": "text-emerald-500",
  Specialized: "text-neutral-500 dark:text-neutral-500",
};

export default function Services() {
  return (
    <section
      className="section-padding pt-16 lg:pt-20 bg-neutral-50 dark:bg-neutral-900"
      aria-labelledby="services-heading"
    >
      <div className="container-custom">
        {/* Section Header with Stripe */}
        <div className="flex justify-center mb-12">
          <h2
            id="services-heading"
            className="section-header-stripe font-bold tracking-wider text-neutral-900 dark:text-white uppercase text-2xl sm:text-3xl"
            style={{ letterSpacing: '0.1em' }}
          >
            Services
          </h2>
        </div>

        {/* Section Subtitle */}
        <p className="text-center text-neutral-600 dark:text-neutral-400 text-lg sm:text-xl max-w-3xl mx-auto mb-12">
          Comprehensive mechanical insulation services for commercial and industrial facilities. From routine maintenance to emergency response and custom fabrication — we handle every insulation need.
        </p>

        {/* Services Grid - 3 columns on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service) => {
            const IconComponent = iconMap[service.anchorId] || Workflow;

            return (
              <div
                key={service.anchorId}
                className="group relative flex flex-col h-full bg-white dark:bg-neutral-800 p-6 shadow-md border border-neutral-200 dark:border-neutral-700 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-accent-500/40 dark:hover:border-accent-500/40"
              >
                {/* Tag */}
                {service.tag && (
                  <span
                    className={`absolute top-4 right-4 text-xs font-medium uppercase tracking-wider ${tagColors[service.tag] || "text-neutral-500"}`}
                  >
                    {service.tag}
                  </span>
                )}

                {/* Icon */}
                <div className="mb-4">
                  <IconComponent
                    className="w-10 h-10 text-accent-500 transition-colors duration-300 group-hover:text-accent-400"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
                  {service.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed flex-grow">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

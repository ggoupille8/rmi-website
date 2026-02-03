import { services } from "../../content/site";
import {
  Workflow,
  Wind,
  ShieldAlert,
  Layers,
  Wrench,
  Clock,
  Cylinder,
  Package,
  Snowflake,
  type LucideIcon,
} from "lucide-react";

// Map service anchor IDs to icons - construction/insulation related
const iconMap: Record<string, LucideIcon> = {
  piping: Workflow,       // Piping system/network
  duct: Wind,             // Air/HVAC duct
  "fire-rated": ShieldAlert, // Fire protection/safety
  jacketing: Layers,      // Layered jacketing materials
  supports: Wrench,       // Fabrication/tools
  "247": Clock,           // 24/7 availability
  tanks: Cylinder,        // Tank/vessel shape
  blankets: Package,      // Removable insulation blankets
  cryogenic: Snowflake,   // Cold/cryogenic
};

export default function Services() {
  return (
    <section
      className="section-padding bg-neutral-50 dark:bg-neutral-900"
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

        {/* Services Grid - 3 columns on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service) => {
            const IconComponent = iconMap[service.anchorId] || Gauge;

            return (
              <div
                key={service.anchorId}
                className="relative bg-white dark:bg-neutral-800 p-6 shadow-md hover:shadow-lg transition-shadow duration-300 border border-neutral-200 dark:border-neutral-700"
              >
                {/* Icon */}
                <div className="mb-4">
                  <IconComponent
                    className="w-10 h-10 text-accent-500"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
                  {service.title}
                </h3>

                {/* Description - shortened */}
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
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

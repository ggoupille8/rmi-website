import {
  Droplets,
  Snowflake,
  Fan,
  Flame,
  Cylinder,
  Shield,
  Volume2,
  Gauge,
  ClipboardCheck,
  Store,
  AirVent,
  Settings,
  Calculator,
  Box,
  Cog,
  MapPin,
  Layers,
  DollarSign,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

interface Service {
  title: string;
  description?: string;
  icon: string;
}

interface ServicesProps {
  title?: string;
  subtitle?: string;
  services?: Service[];
}

// Map service titles to appropriate icons - more realistic and specific
const getServiceIcon = (title: string): ComponentType<LucideProps> => {
  const lowerTitle = title.toLowerCase();

  // Check more specific matches first
  if (lowerTitle.includes("plumbing") || lowerTitle.includes("hvac")) {
    return Droplets;
  }
  if (lowerTitle.includes("steam") || lowerTitle.includes("condensate")) {
    return Flame;
  }
  if (
    lowerTitle.includes("thermal") ||
    lowerTitle.includes("cryogenic") ||
    lowerTitle.includes("refrigerant")
  ) {
    return Snowflake;
  }
  if (lowerTitle.includes("outdoor") || lowerTitle.includes("underground")) {
    return MapPin;
  }
  if (
    lowerTitle.includes("grease") ||
    lowerTitle.includes("fume") ||
    lowerTitle.includes("exhaust")
  ) {
    return Fan;
  }
  if (lowerTitle.includes("boiler")) {
    return Flame;
  }
  if (lowerTitle.includes("tank") || lowerTitle.includes("vessel")) {
    return Cylinder;
  }
  if (lowerTitle.includes("personnel") || lowerTitle.includes("protection")) {
    return Shield;
  }
  if (lowerTitle.includes("lagging") || lowerTitle.includes("jacketing")) {
    return Layers;
  }
  if (lowerTitle.includes("removable") || lowerTitle.includes("blanket")) {
    return Box;
  }
  if (lowerTitle.includes("acoustical") || lowerTitle.includes("sound")) {
    return Volume2;
  }
  if (
    lowerTitle.includes("pipe support") ||
    lowerTitle.includes("fabrication")
  ) {
    return Cog;
  }
  if (lowerTitle.includes("value engineering")) {
    return DollarSign;
  }
  if (
    lowerTitle.includes("energy") ||
    lowerTitle.includes("evaluation")
  ) {
    return Calculator;
  }
  if (lowerTitle.includes("maintenance") || lowerTitle.includes("contract")) {
    return ClipboardCheck;
  }
  if (lowerTitle.includes("material") || lowerTitle.includes("resale")) {
    return Store;
  }
  if (lowerTitle.includes("ductwork") || lowerTitle.includes("duct")) {
    return AirVent;
  }
  if (lowerTitle.includes("process piping") || lowerTitle.includes("piping")) {
    return Gauge;
  }
  return Settings;
};

const defaultServices: Service[] = [
  {
    title: "Plumbing & HVAC",
    description: "",
    icon: "",
  },
  {
    title: "Process Piping",
    description: "",
    icon: "",
  },
  {
    title: "Steam/Condensate (Hot & Cold Condensate)",
    description: "",
    icon: "",
  },
  {
    title: "Ductwork",
    description: "",
    icon: "",
  },
  {
    title: "Thermal/Cryogenic/Refrigerant Systems",
    description: "",
    icon: "",
  },
  {
    title: "Outdoor/Underground Piping",
    description: "",
    icon: "",
  },
  {
    title: "Grease Duct/Fume Hood/Generator Exhaust",
    description: "",
    icon: "",
  },
  {
    title: "Boiler Breeching",
    description: "",
    icon: "",
  },
  {
    title: "Tanks/Vessels/Specialty Equipment",
    description: "",
    icon: "",
  },
  {
    title: "Personnel Protection",
    description: "",
    icon: "",
  },
  {
    title: "Lagging/Jacketing Systems",
    description: "",
    icon: "",
  },
  {
    title: "Removable Blankets/Cans",
    description: "",
    icon: "",
  },
  {
    title: "Acoustical/Sound Prevention",
    description: "",
    icon: "",
  },
  {
    title: "Pipe Support Fabrication",
    description: "",
    icon: "",
  },
  {
    title: "Energy Evaluation",
    description: "",
    icon: "",
  },
  {
    title: "Value Engineering",
    description: "",
    icon: "",
  },
  {
    title: "Industrial Maintenance Contracts",
    description: "",
    icon: "",
  },
  {
    title: "Material Resale",
    description: "",
    icon: "",
  },
];

export default function Services({
  title = "Services We Offer",
  subtitle = "From new installs to renovations: piping, ductwork, equipment, and specialty applications for commercial and industrial environments.",
  services = defaultServices,
}: ServicesProps) {
  // DOM PARITY: This component renders identical DOM structure at all breakpoints (375px, 430px, 768px, 1024px, 1440px)
  // - All elements (H2, subtitle, service list, image, borders) always present
  // - No conditional rendering based on screen size
  // - Layout changes handled via CSS only (Grid + clamp())
  // - Visual order swap handled via CSS Grid column positioning (.services-grid utility)
  // - Verify DOM parity: Run scripts/verify-dom-parity.js in browser console
  const normalizedServices = services.reduce<Service[]>((acc, service, index) => {
    if (!service || !service.title) {
      console.error(`Service at index ${index} is missing required title`);
      return acc;
    }
    acc.push(service);
    return acc;
  }, []);
  const columns = 3;
  const columnedServices = Array.from({ length: columns }, (_, columnIndex) =>
    normalizedServices.filter((_, index) => index % columns === columnIndex)
  );

  return (
    <section
      className="relative overflow-hidden pt-0 bg-neutral-50 dark:bg-neutral-900 min-h-[50vh]"
      style={{ paddingBottom: 'clamp(0.5rem, 0.15vw + 0.4rem, 1rem)' }}
      aria-labelledby="services-heading"
    >
      <div className="relative z-10 container-custom w-full max-w-none px-0 sm:px-0 lg:px-0">
        <div className="services-grid grid w-full min-h-[50vh] lg:grid-cols-3 lg:items-stretch" style={{ gap: 'clamp(1.5rem, 0.25vw + 1.25rem, 2rem)' }}>
          {/* Content column - appears first on mobile, second on desktop */}
          <div className="text-left relative min-w-0 px-4 sm:px-6 lg:pl-8 lg:pr-0 lg:col-span-1 lg:col-start-3 lg:row-start-1 h-full flex flex-col">
            <h2
              id="services-heading"
              className="font-bold tracking-tight text-neutral-900 dark:text-white text-left"
              style={{ 
                fontSize: 'clamp(2.25rem, 0.8vw + 1.75rem, 5rem)',
                lineHeight: '1.25'
              }}
            >
              {title}
            </h2>
            <p 
              className="text-neutral-800 dark:text-neutral-100 text-left"
              style={{ 
                marginTop: 'clamp(0.5rem, 0.1vw + 0.4rem, 0.75rem)',
                fontSize: 'clamp(1rem, 0.2vw + 0.8rem, 1.25rem)',
                lineHeight: '1.75'
              }}
            >
              {subtitle}
            </p>

            <div
              className="min-w-0"
              style={{ marginTop: 'clamp(1rem, 0.2vw + 0.8rem, 1.5rem)' }}
              aria-label="Services list"
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {columnedServices.map((column, columnIndex) => (
                  <ul
                    key={`services-column-${columnIndex}`}
                    className="space-y-3"
                  >
                    {column.map((service) => {
                      const IconComponent = getServiceIcon(service.title);
                      return (
                        <li key={service.title} className="flex items-start gap-3">
                          <IconComponent
                            className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0"
                            aria-hidden="true"
                            style={{ strokeWidth: 2.5 }}
                          />
                          <span className="text-sm sm:text-base font-medium leading-tight text-neutral-900 dark:text-neutral-100">
                            {service.title}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ))}
              </div>
              <ul className="sr-only">
                {normalizedServices.map((service, index) => (
                  <li key={`service-${index}`}>{service.title}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Services image column - left on desktop, below on mobile */}
          <div className="relative w-full h-48 sm:h-64 lg:h-full lg:min-h-[50vh] lg:col-span-2 lg:col-start-1 lg:row-start-1">
            <img
              src="/images/services/services-image.jpg"
              alt="Mechanical insulation work"
              className="w-full h-full rounded-none shadow-2xl object-cover object-[left_top] opacity-90"
              loading="lazy"
              width="1920"
              height="1080"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

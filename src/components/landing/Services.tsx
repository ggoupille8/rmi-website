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
import GradientBlendOverlay from "./GradientBlendOverlay";

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
  return (
    <section
      className="relative overflow-hidden pt-0 pb-4 sm:pb-6 lg:pb-8 bg-white dark:bg-neutral-900"
      aria-labelledby="services-heading"
    >
      {/* Top border - extends almost all the way across screen */}
      <div className="absolute top-0 left-[2.5%] right-[2.5%] h-0.5 overflow-hidden z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-600 to-transparent"></div>
      </div>
      
      <div className="container-custom pl-0 lg:pl-8">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 lg:items-stretch">
          {/* Left column - Image (50% of screen, tight to border lines, extends to left edge) */}
          <div className="relative order-2 lg:order-1 -ml-4 sm:-ml-6 lg:-ml-16 xl:-ml-24 2xl:-ml-32 w-[50vw] -mt-4 sm:-mt-6 lg:-mt-8 -mb-4 sm:-mb-6 lg:-mb-8">
            <img
              src="/images/hero/hero-1.jpg"
              alt="Mechanical insulation services"
              className="w-full h-full rounded-lg lg:rounded-l-none shadow-2xl object-cover opacity-95"
              style={{ filter: 'grayscale(5%) contrast(1.02)' }}
              loading="lazy"
              width="1920"
              height="1080"
            />
            {/* White overlay for two-tone effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/5 to-transparent dark:from-neutral-900/15 dark:via-neutral-900/5 rounded-lg lg:rounded-l-none pointer-events-none mix-blend-soft-light" aria-hidden="true"></div>
            {/* Gradient overlay to blend image with content */}
            <GradientBlendOverlay direction="right" />
          </div>

          {/* Right column - Content */}
          <div className="text-left relative order-1 lg:order-2 lg:ml-4 xl:ml-6">
            {/* Accent line decoration */}
            <div
              className="hidden lg:block absolute -right-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 via-primary-500 to-transparent rounded-full"
              aria-hidden="true"
            />
            <h2
              id="services-heading"
              className="heading-2 text-neutral-900 dark:text-white text-left"
            >
              {title}
            </h2>
            <p className="mt-2 text-body text-neutral-800 dark:text-neutral-100 text-left">
              {subtitle}
            </p>

            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {services.map((service, index) => {
                // Runtime assertion to prevent undefined crashes
                if (!service || !service.title) {
                  console.error(
                    `Service at index ${index} is missing required title`
                  );
                  return null;
                }
                const IconComponent = getServiceIcon(service.title);
                // Right column items (odd indices in 2-column grid)
                const isRightColumn = index % 2 === 1;
                return (
                  <li key={index} className={`group ${isRightColumn ? 'sm:ml-8 lg:ml-12' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <IconComponent
                          className="h-6 w-6 sm:h-7 sm:w-7 text-primary-600 dark:text-primary-400"
                          aria-hidden="true"
                          style={{ strokeWidth: 2.5 }}
                        />
                      </div>
                      <span className="text-sm sm:text-base font-medium leading-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {service.title}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      
      {/* Bottom border - extends almost all the way across screen */}
      <div className="absolute bottom-0 left-[2.5%] right-[2.5%] h-0.5 overflow-hidden z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-600 to-transparent"></div>
      </div>
    </section>
  );
}

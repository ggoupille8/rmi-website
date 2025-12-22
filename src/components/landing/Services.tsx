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
  if (
    lowerTitle.includes("energy") ||
    lowerTitle.includes("evaluation") ||
    lowerTitle.includes("budgeting") ||
    lowerTitle.includes("engineering")
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
    title: "Ductwork",
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
    title: "Energy Evaluation/Budgeting/Value Engineering",
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
  // Note: Image location was /images/hero/hero-1.jpg (removed but kept for reference)
  
  return (
    <section
      className="relative overflow-hidden"
      aria-labelledby="services-heading"
    >
      {/* Header section with black background - right aligned */}
      <div className="section-padding-sm bg-neutral-900 dark:bg-neutral-900 relative z-10">
        <div className="container-custom relative z-10">
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left column - larger spacer to push content right */}
            <div className="hidden lg:block lg:col-span-7"></div>
            {/* Right column - content */}
            <div className="lg:col-span-5 max-w-none">
              <h2 id="services-heading" className="heading-2 text-white text-left">
                {title}
              </h2>
              <p className="mt-2 text-body text-neutral-100 text-left">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content section with white background - right aligned */}
      <div className="pt-2 sm:pt-3 lg:pt-4 pb-8 sm:pb-10 lg:pb-12 xl:pb-14 bg-white relative">
        {/* Image - extends full width from left to right edge of viewport, behind content */}
        <div 
          className="hidden lg:block absolute top-0 bottom-0 z-0"
          style={{
            left: "calc(-50vw + 50%)",
            right: "calc(-50vw + 50%)",
            width: "100vw",
          }}
        >
          <img
            src="/images/hero/hero-1.jpg"
            alt="Mechanical insulation services"
            className="w-full h-full object-cover object-left"
            loading="lazy"
            width="1920"
            height="1080"
          />
        </div>
        <div className="container-custom relative z-10">
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left column - larger spacer to push content right */}
            <div className="hidden lg:block lg:col-span-7"></div>
            {/* Right column - services list */}
            <div className="lg:col-span-5 max-w-none">
              <ul className="space-y-1.5">
                {services.map((service, index) => {
                  // Runtime assertion to prevent undefined crashes
                  if (!service || !service.title) {
                    console.error(
                      `Service at index ${index} is missing required title`
                    );
                    return null;
                  }
                  const IconComponent = getServiceIcon(service.title);
                    return (
                      <li
                        key={index}
                        className="group"
                      >
                        <div className="inline-flex items-center gap-2 sm:gap-3 bg-white/80 backdrop-blur-sm rounded-md px-2 py-1 sm:px-3 sm:py-1.5 transition-colors">
                          <div className="flex-shrink-0">
                            <IconComponent
                              className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-500"
                              aria-hidden="true"
                              style={{ strokeWidth: 2.5 }}
                            />
                          </div>
                          <span className="text-base sm:text-lg lg:text-xl font-medium leading-relaxed text-neutral-900 whitespace-nowrap">
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
      </div>
    </section>
  );
}

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

const {
  Wrench,
  Cylinder: PipeIcon,
  Droplets,
  Snowflake,
  Mountain,
  Wind,
  Fan,
  Flame,
  Cylinder,
  Shield,
  Layers,
  Package,
  Volume2,
  Gauge,
  FileText,
  ClipboardCheck,
  Store,
  Thermometer,
  AirVent,
  Hammer,
  Settings,
} = LucideIcons;

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

// Map service titles to appropriate icons
const getServiceIcon = (title: string): LucideIcon => {
  const lowerTitle = title.toLowerCase();
  // Check more specific matches first
  if (lowerTitle.includes("plumbing") || lowerTitle.includes("hvac")) {
    return Thermometer; // Better for HVAC systems
  }
  if (lowerTitle.includes("steam") || lowerTitle.includes("condensate")) {
    return Droplets; // Perfect for steam/condensate
  }
  if (
    lowerTitle.includes("thermal") ||
    lowerTitle.includes("cryogenic") ||
    lowerTitle.includes("refrigerant")
  ) {
    return Snowflake; // Perfect for cold systems
  }
  if (lowerTitle.includes("outdoor") || lowerTitle.includes("underground")) {
    return Mountain; // Good for outdoor/underground
  }
  if (
    lowerTitle.includes("grease") ||
    lowerTitle.includes("fume") ||
    lowerTitle.includes("exhaust")
  ) {
    return Fan; // Perfect for exhaust systems
  }
  if (lowerTitle.includes("boiler")) {
    return Flame; // Perfect for boiler/breeching
  }
  if (lowerTitle.includes("tank") || lowerTitle.includes("vessel")) {
    return Cylinder; // Perfect for tanks/vessels
  }
  if (lowerTitle.includes("personnel") || lowerTitle.includes("protection")) {
    return Shield; // Perfect for protection
  }
  if (lowerTitle.includes("lagging") || lowerTitle.includes("jacketing")) {
    return Layers; // Perfect for layering/jacketing
  }
  if (lowerTitle.includes("removable") || lowerTitle.includes("blanket")) {
    return Package; // Good for removable items
  }
  if (lowerTitle.includes("acoustical") || lowerTitle.includes("sound")) {
    return Volume2; // Perfect for sound prevention
  }
  if (lowerTitle.includes("pipe support")) {
    return Hammer; // Better for fabrication
  }
  if (
    lowerTitle.includes("energy") ||
    lowerTitle.includes("evaluation") ||
    lowerTitle.includes("engineering")
  ) {
    return FileText; // Good for evaluation/engineering
  }
  if (lowerTitle.includes("maintenance") || lowerTitle.includes("contract")) {
    return ClipboardCheck; // Perfect for contracts/maintenance
  }
  if (lowerTitle.includes("material") || lowerTitle.includes("resale")) {
    return Store; // Perfect for material resale
  }
  if (lowerTitle.includes("ductwork") || lowerTitle.includes("duct")) {
    return AirVent; // Better for ductwork than Wind
  }
  if (lowerTitle.includes("process piping") || lowerTitle.includes("piping")) {
    return PipeIcon; // Good for piping
  }
  return Settings; // Default icon - more generic/industrial
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
    title: "Lagging/Jacketing Systems for Outdoor Duct and Piping Systems",
    description: "",
    icon: "",
  },
  {
    title:
      "Removable Blankets/Cans (Pumps, Valves, Strainers, Expansion Joints)",
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
  return (
    <section
      className="section-padding bg-white dark:bg-neutral-900"
      aria-labelledby="services-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="services-heading"
            className="heading-2 text-neutral-900 dark:text-neutral-50"
          >
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800 dark:text-neutral-300">
            {subtitle}
          </p>
        </div>
        <div className="mx-auto mt-10 sm:mt-12">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  className="group flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="flex h-5 w-5 items-center justify-center rounded text-primary-600 transition-colors group-hover:text-primary-700 dark:text-primary-400 dark:group-hover:text-primary-300">
                      <IconComponent className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>
                  <span className="flex-1 break-words text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                    {service.title}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

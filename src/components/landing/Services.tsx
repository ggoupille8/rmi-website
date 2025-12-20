import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

const {
  Wrench,
  Cylinder: PipeIcon,
  Droplets,
  Droplet,
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
  Pipe,
  Building2,
  Factory,
  Zap,
  Calculator,
  WrenchIcon,
  Box,
  Headphones,
  Cog,
  Navigation,
  MapPin,
  Wrap,
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

// Map service titles to appropriate icons - more realistic and specific
const getServiceIcon = (title: string): LucideIcon => {
  const lowerTitle = title.toLowerCase();

  // Check more specific matches first
  if (lowerTitle.includes("plumbing") || lowerTitle.includes("hvac")) {
    return Droplets; // More realistic for plumbing (water) and HVAC (condensation)
  }
  if (lowerTitle.includes("steam") || lowerTitle.includes("condensate")) {
    return Flame; // Perfect for hot steam systems
  }
  if (
    lowerTitle.includes("thermal") ||
    lowerTitle.includes("cryogenic") ||
    lowerTitle.includes("refrigerant")
  ) {
    return Snowflake; // Perfect for cold/cryogenic systems
  }
  if (lowerTitle.includes("outdoor") || lowerTitle.includes("underground")) {
    return MapPin; // More realistic for outdoor/underground location-based installations
  }
  if (
    lowerTitle.includes("grease") ||
    lowerTitle.includes("fume") ||
    lowerTitle.includes("exhaust")
  ) {
    return Fan; // Perfect for exhaust/ventilation systems
  }
  if (lowerTitle.includes("boiler")) {
    return Flame; // Perfect for boiler/breeching (hot systems)
  }
  if (lowerTitle.includes("tank") || lowerTitle.includes("vessel")) {
    return Cylinder; // Perfect for tanks/vessels
  }
  if (lowerTitle.includes("personnel") || lowerTitle.includes("protection")) {
    return Shield; // Perfect for safety/protection
  }
  if (lowerTitle.includes("lagging") || lowerTitle.includes("jacketing")) {
    return Wrap; // More realistic for wrapping/covering systems (lagging/jacketing)
  }
  if (lowerTitle.includes("removable") || lowerTitle.includes("blanket")) {
    return Box; // More realistic for removable blankets/cans
  }
  if (lowerTitle.includes("acoustical") || lowerTitle.includes("sound")) {
    return Volume2; // Perfect for sound prevention
  }
  if (
    lowerTitle.includes("pipe support") ||
    lowerTitle.includes("fabrication")
  ) {
    return Cog; // More realistic for fabrication/mechanical work
  }
  if (
    lowerTitle.includes("energy") ||
    lowerTitle.includes("evaluation") ||
    lowerTitle.includes("budgeting") ||
    lowerTitle.includes("engineering")
  ) {
    return Calculator; // More realistic for evaluation/budgeting/engineering
  }
  if (lowerTitle.includes("maintenance") || lowerTitle.includes("contract")) {
    return ClipboardCheck; // Perfect for maintenance contracts
  }
  if (lowerTitle.includes("material") || lowerTitle.includes("resale")) {
    return Store; // Perfect for material resale
  }
  if (lowerTitle.includes("ductwork") || lowerTitle.includes("duct")) {
    return AirVent; // Perfect for ductwork
  }
  if (lowerTitle.includes("process piping") || lowerTitle.includes("piping")) {
    return Gauge; // More realistic for process piping (pressure/industrial processes)
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
      className="section-padding bg-gradient-to-b from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 relative overflow-hidden"
      aria-labelledby="services-heading"
    >
      {/* Background decorative elements */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(0 0 0) 1px, transparent 0)`,
          backgroundSize: "50px 50px",
        }}
      />
      <div
        className="absolute top-0 right-0 w-96 h-96 bg-primary-200/10 dark:bg-primary-400/5 rounded-full blur-3xl -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-96 h-96 bg-accent-200/10 dark:bg-accent-400/5 rounded-full blur-3xl -z-10"
        aria-hidden="true"
      />

      <div className="container-custom relative z-10">
        <div className="mx-auto max-w-2xl text-center mb-6">
          <h2
            id="services-heading"
            className="heading-2 text-neutral-900 dark:text-neutral-50"
          >
            {title}
          </h2>
          <p className="mt-2 text-body text-neutral-800 dark:text-neutral-300">
            {subtitle}
          </p>
        </div>

        {/* Two-column layout: Image left, Services list right */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* Left Column: Services Image */}
          <div className="hidden lg:block relative">
            <div className="relative w-full h-full min-h-[600px] rounded-2xl overflow-hidden border-2 border-neutral-300 dark:border-neutral-700 shadow-xl bg-neutral-200 dark:bg-neutral-800">
              <img
                src="/images/hero/hero-1.jpg"
                alt="Mechanical insulation services"
                className="w-full h-full object-cover object-center"
                loading="lazy"
                onError={(e) => {
                  console.error("Services image failed to load");
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Subtle gradient overlay for better text contrast if needed */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-neutral-900/10 dark:to-neutral-900/20 pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Right Column: Services List */}
          <div className="lg:pl-4">
            <ul className="space-y-2.5">
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
                  <li key={index} className="group flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/40 text-primary-600 dark:text-primary-400">
                        <IconComponent className="h-7 w-7" aria-hidden="true" />
                      </div>
                    </div>
                    <span className="flex-1 text-xl font-medium leading-relaxed text-neutral-800 dark:text-neutral-200">
                      {service.title}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
